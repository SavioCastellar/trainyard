"""Treino PPO do Treino de Precisão, do zero até o domínio, gravando a "fita" de aprendizado.

A fita é uma sequência de fotos do cérebro (checkpoints) desde a primeira tentativa.
Ela é gravada uma única vez e depois mostrada a todos os jogadores, em trechos.

Uso: python ppo_drill.py --minutes 20 --out runs/precisao
"""
from __future__ import annotations

import argparse
import json
import os
import struct
import subprocess
import time

import numpy as np
import torch
import torch.nn as nn
from torch.distributions import Categorical

OBS = 16 * 2 + 3
ACTS = (3, 3, 2)
BRIDGE = os.path.join(os.path.dirname(__file__), "..", "sim", "dist", "src", "drills", "bridge-drill.js")
EP_STEPS = 900


class Drill:
    def __init__(self, n, seed):
        self.n = n
        self.p = subprocess.Popen(["node", BRIDGE], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
        self._send(1, json.dumps({"nEnvs": n, "seed": seed}).encode())
        self.obs, *_ = self._recv()

    def _send(self, op, data):
        self.p.stdin.write(struct.pack("<IB", len(data) + 1, op) + data); self.p.stdin.flush()

    def _read(self, k):
        d = self.p.stdout.read(k)
        if d is None or len(d) != k:
            raise RuntimeError("ponte encerrada")
        return d

    def _recv(self):
        (size,) = struct.unpack("<I", self._read(4)); body = self._read(size)
        (jl,) = struct.unpack_from("<I", body, 0); info = json.loads(body[4:4 + jl]); o = 4 + jl
        obs = np.frombuffer(body, np.float32, self.n * OBS, o).reshape(self.n, OBS); o += self.n * OBS * 4
        rew = np.frombuffer(body, np.float32, self.n, o); o += self.n * 4
        done = np.frombuffer(body, np.uint8, self.n, o).astype(bool)
        return obs, rew, done, info

    def step(self, a):
        self._send(2, np.ascontiguousarray(a, np.int32).tobytes())
        self.obs, r, d, info = self._recv()
        return self.obs, r, d, info

    def close(self):
        self._send(9, b"")


class Net(nn.Module):
    def __init__(self, hidden=64):
        super().__init__()
        self.actor = nn.Sequential(nn.Linear(OBS, hidden), nn.Tanh(), nn.Linear(hidden, hidden), nn.Tanh(), nn.Linear(hidden, sum(ACTS)))
        self.critic = nn.Sequential(nn.Linear(OBS, hidden), nn.Tanh(), nn.Linear(hidden, hidden), nn.Tanh(), nn.Linear(hidden, 1))
        with torch.no_grad():
            self.actor[-1].weight.mul_(0.01)

    def dists(self, o):
        return [Categorical(logits=l) for l in torch.split(self.actor(o), ACTS, dim=-1)]

    def act(self, o):
        ds = self.dists(o); a = torch.stack([d.sample() for d in ds], -1)
        return a, sum(d.log_prob(a[:, k]) for k, d in enumerate(ds))

    def evaluate(self, o, a):
        ds = self.dists(o)
        return sum(d.log_prob(a[:, k]) for k, d in enumerate(ds)), sum(d.entropy() for d in ds), self.critic(o).squeeze(-1)


def snapshot(net: Net):
    """Pesos do ator, quantizados em 16 bits por camada (fiéis e pequenos)."""
    layers = []
    for m in net.actor:
        if isinstance(m, nn.Linear):
            w = m.weight.detach().numpy().astype(np.float32); b = m.bias.detach().numpy().astype(np.float32)
            s = float(max(np.abs(w).max(), np.abs(b).max(), 1e-6)) / 32767
            layers.append({"in": w.shape[1], "out": w.shape[0], "scale": s,
                           "w": np.round(w / s).astype(np.int16).tobytes().hex(), "b": np.round(b / s).astype(np.int16).tobytes().hex()})
    return layers


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--minutes", type=float, default=20)
    ap.add_argument("--max-steps", type=float, default=6e6)
    ap.add_argument("--n-envs", type=int, default=64)
    ap.add_argument("--steps", type=int, default=128)
    ap.add_argument("--seed", type=int, default=3)
    ap.add_argument("--out", default="runs/precisao")
    args = ap.parse_args()
    torch.set_num_threads(1); torch.manual_seed(args.seed); np.random.seed(args.seed)
    os.makedirs(args.out, exist_ok=True)
    env = Drill(args.n_envs, args.seed)
    net = Net(); opt = torch.optim.Adam(net.parameters(), lr=3e-4, eps=1e-5)
    n, T = args.n_envs, args.steps
    ckpts = [{"update": 0, "steps": 0, "episodes": 0, "layers": snapshot(net)}]
    t0 = time.time(); steps = 0; episodes = 0; update = 0; recent = []
    log = open(os.path.join(args.out, "log.jsonl"), "w")
    while time.time() - t0 < args.minutes * 60 and steps < args.max_steps:
        update += 1
        Bo = np.zeros((T, n, OBS), np.float32); Ba = np.zeros((T, n, 3), np.int64)
        Bl = np.zeros((T, n), np.float32); Bv = np.zeros((T, n), np.float32); Br = np.zeros((T, n), np.float32); Bd = np.zeros((T, n), np.float32)
        for t in range(T):
            o = torch.from_numpy(env.obs.copy())
            with torch.no_grad():
                a, lp = net.act(o); v = net.critic(o).squeeze(-1)
            Bo[t] = o.numpy(); Ba[t] = a.numpy(); Bl[t] = lp.numpy(); Bv[t] = v.numpy()
            _, r, d, info = env.step(a.numpy())
            Br[t] = r; Bd[t] = d
            for e in info:
                recent.append(e["hits"]); episodes += 1
        steps += T * n
        with torch.no_grad():
            lv = net.critic(torch.from_numpy(env.obs.copy())).squeeze(-1).numpy()
        adv = np.zeros_like(Br); g = np.zeros(n, np.float32)
        for t in reversed(range(T)):
            nv = lv if t == T - 1 else Bv[t + 1]; nt = 1 - Bd[t]
            delta = Br[t] + 0.99 * nv * nt - Bv[t]; g = delta + 0.99 * 0.95 * nt * g; adv[t] = g
        ret = adv + Bv
        O = torch.from_numpy(Bo.reshape(-1, OBS)); A = torch.from_numpy(Ba.reshape(-1, 3)); L = torch.from_numpy(Bl.reshape(-1))
        AD = torch.from_numpy(adv.reshape(-1)); R = torch.from_numpy(ret.reshape(-1)); AD = (AD - AD.mean()) / (AD.std() + 1e-8)
        for _ in range(4):
            perm = torch.randperm(len(O))
            for s in range(0, len(O), 2048):
                i = perm[s:s + 2048]
                nl, ent, v = net.evaluate(O[i], A[i]); ratio = torch.exp(nl - L[i])
                pg = -torch.min(ratio * AD[i], torch.clamp(ratio, 0.8, 1.2) * AD[i]).mean()
                loss = pg + 0.5 * ((v - R[i]) ** 2).mean() - 0.01 * ent.mean()
                opt.zero_grad(); loss.backward(); nn.utils.clip_grad_norm_(net.parameters(), 0.5); opt.step()
        # fotos do cérebro: todas no começo (onde a mudança é rápida), depois espaçadas
        if update <= 40 or (update <= 150 and update % 3 == 0) or update % 8 == 0:
            ckpts.append({"update": update, "steps": steps, "episodes": episodes, "layers": snapshot(net)})
        mh = float(np.mean(recent[-200:])) if recent else 0.0
        log.write(json.dumps({"update": update, "steps": steps, "episodes": episodes, "mean_hits": round(mh, 2), "min": round((time.time() - t0) / 60, 2)}) + "\n"); log.flush()
        if update % 10 == 0:
            print(f"update {update} passos {steps} tentativas {episodes} acertos/tentativa {mh:.2f} {(time.time()-t0)/60:.1f}min", flush=True)
    ckpts.append({"update": update, "steps": steps, "episodes": episodes, "layers": snapshot(net)})
    json.dump({"obs": OBS, "actions": list(ACTS), "hidden": 64, "checkpoints": ckpts}, open(os.path.join(args.out, "checkpoints.json"), "w"))
    env.close()
    print("fim", update, steps, episodes, len(ckpts))


if __name__ == "__main__":
    main()
