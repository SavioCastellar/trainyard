"""Treino PPO de uma atividade, do zero até o domínio, gravando a "fita" de aprendizado.

A fita é uma sequência de fotos do cérebro (checkpoints) desde a primeira tentativa.
Ela é gravada uma única vez e depois mostrada a todos os jogadores, em trechos.
Atividades com níveis (ver DOMINIO) sobem de nível quando o atleta atinge o domínio da ficha;
cada foto guarda o nível em que foi tirada.

Uso: python ppo_drill.py --minutes 20 --out runs/precisao
     python ppo_drill.py --drill velocidade --minutes 120 --out runs/velocidade
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

# tamanho da observação e das decisões de cada atividade (iguais a sim/src/drills/<nome>.ts)
DRILLS = {"precisao": (5 + 3 * 7 + 16 * 2, (3, 3, 2)), "velocidade": (19 + 12 * 5 + 3 * 16, (16, 3)), "reflexo": (7 + 4 * 5 + 4 * 6 + 1, (3, 3, 3)),
          "controle": (11 + 3 * 7 + 2 * 16, (16, 3)), "forca": (27, (3, 3)), "inteligencia": (8 + 2 * 5 * 6 + 8, (3, 3))}
# domínio por nível: (fração mínima de luzes pisadas, máximo de vermelhas por tentativa); medido, ver a ficha.
# Valor acima de 1 é acertos/entregas por tentativa (Precisão: igual a PRECISION_DOMINIO em precision.ts).
DOMINIO = {"precisao": {1: (26, None), 2: (26, None), 3: (25, None)},
           "velocidade": {1: (0.90, None), 2: (0.86, None), 3: (0.82, 0.4)},
           "reflexo": {1: (0.90, None), 2: (0.95, None), 3: (0.94, None)},
           # controle (Bandeja): marcas por tentativa e bolas caídas por tentativa no lugar das vermelhas
           "controle": {1: (20, 1), 2: (14, 1), 3: (10, 1)},
           # força: hits/lights = entregas por tentativa (a ponte manda lights = 5 marcas)
           "forca": {1: (3.0, None), 2: (1.5, None), 3: (1.0, None)},
           # inteligencia: pontos por tentativa (a ponte manda lights = 1)
           "inteligencia": {1: (17, None), 2: (30, None), 3: (20, None)}}
OBS, ACTS = DRILLS["precisao"]
BRIDGE = os.path.join(os.path.dirname(__file__), "..", "sim", "dist", "src", "drills", "bridge-drill.js")


class Drill:
    def __init__(self, n, seed, drill):
        self.n = n
        self.p = subprocess.Popen(["node", BRIDGE], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
        self._send(1, json.dumps({"nEnvs": n, "seed": seed, "drill": drill}).encode())
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

    def set_level(self, nivel):
        """vale para as próximas tentativas; as que estão no meio terminam no nível antigo"""
        self._send(3, json.dumps({"nivel": nivel}).encode())

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


def save(args, ckpts):
    json.dump({"drill": args.drill, "obs": OBS, "actions": list(ACTS), "hidden": 64, "checkpoints": ckpts}, open(os.path.join(args.out, "checkpoints.json"), "w"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--minutes", type=float, default=20)
    ap.add_argument("--max-steps", type=float, default=6e6)
    ap.add_argument("--n-envs", type=int, default=64)
    ap.add_argument("--steps", type=int, default=128)
    ap.add_argument("--seed", type=int, default=3)
    ap.add_argument("--out", default="runs/precisao")
    ap.add_argument("--drill", default="precisao", choices=list(DRILLS))
    ap.add_argument("--nivel", type=int, default=1, help="nível inicial (para testes; a fita oficial começa no 1)")
    ap.add_argument("--after", type=int, default=60, help="atualizações extras depois de dominar o último nível")
    args = ap.parse_args()
    global OBS, ACTS
    OBS, ACTS = DRILLS[args.drill]
    dominio = DOMINIO.get(args.drill)
    nivel, level_start, mastered_at = args.nivel, 0, None
    torch.set_num_threads(1); torch.manual_seed(args.seed); np.random.seed(args.seed)
    os.makedirs(args.out, exist_ok=True)
    env = Drill(args.n_envs, args.seed, args.drill)
    if nivel > 1: env.set_level(nivel)
    net = Net(); opt = torch.optim.Adam(net.parameters(), lr=3e-4, eps=1e-5)
    n, T = args.n_envs, args.steps
    ckpts = [{"update": 0, "steps": 0, "episodes": 0, "nivel": 1, "layers": snapshot(net)}]
    t0 = time.time(); steps = 0; episodes = 0; update = 0; recent = []; lvl = []  # lvl: tentativas no nível atual
    log = open(os.path.join(args.out, "log.jsonl"), "w")
    while time.time() - t0 < args.minutes * 60 and steps < args.max_steps:
        update += 1
        Bo = np.zeros((T, n, OBS), np.float32); Ba = np.zeros((T, n, len(ACTS)), np.int64)
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
                if e.get("nivel", 1) == nivel:
                    lvl.append(e)
        steps += T * n
        with torch.no_grad():
            lv = net.critic(torch.from_numpy(env.obs.copy())).squeeze(-1).numpy()
        adv = np.zeros_like(Br); g = np.zeros(n, np.float32)
        for t in reversed(range(T)):
            nv = lv if t == T - 1 else Bv[t + 1]; nt = 1 - Bd[t]
            delta = Br[t] + 0.99 * nv * nt - Bv[t]; g = delta + 0.99 * 0.95 * nt * g; adv[t] = g
        ret = adv + Bv
        O = torch.from_numpy(Bo.reshape(-1, OBS)); A = torch.from_numpy(Ba.reshape(-1, len(ACTS))); L = torch.from_numpy(Bl.reshape(-1))
        AD = torch.from_numpy(adv.reshape(-1)); R = torch.from_numpy(ret.reshape(-1)); AD = (AD - AD.mean()) / (AD.std() + 1e-8)
        for _ in range(4):
            perm = torch.randperm(len(O))
            for s in range(0, len(O), 2048):
                i = perm[s:s + 2048]
                nl, ent, v = net.evaluate(O[i], A[i]); ratio = torch.exp(nl - L[i])
                pg = -torch.min(ratio * AD[i], torch.clamp(ratio, 0.8, 1.2) * AD[i]).mean()
                loss = pg + 0.5 * ((v - R[i]) ** 2).mean() - 0.01 * ent.mean()
                opt.zero_grad(); loss.backward(); nn.utils.clip_grad_norm_(net.parameters(), 0.5); opt.step()
        # fotos do cérebro: todas no começo de cada nível (onde a mudança é rápida), depois espaçadas
        u = update - level_start
        if u <= 40 or (u <= 150 and u % 3 == 0) or update % 8 == 0:
            ckpts.append({"update": update, "steps": steps, "episodes": episodes, "nivel": nivel, "layers": snapshot(net)})
        mh = float(np.mean(recent[-200:])) if recent else 0.0
        row = {"update": update, "steps": steps, "episodes": episodes, "mean_hits": round(mh, 2), "min": round((time.time() - t0) / 60, 2)}
        if dominio:
            w = lvl[-300:]
            thr, max_reds = dominio[nivel]
            if thr > 1:
                rate = float(np.mean([e["hits"] for e in w])) if w else 0.0
            else:
                rate = sum(e["hits"] for e in w) / max(1, sum(e["lights"] for e in w))
            reds = float(np.mean([e.get("reds", 0) for e in w])) if w else 0.0
            row.update(nivel=nivel, rate=round(rate, 3), reds=round(reds, 2))
            if mastered_at is None and len(w) >= 300 and rate >= thr and (max_reds is None or reds < max_reds):
                print(f"domínio do nível {nivel}: {f'{rate:.1f} acertos' if thr > 1 else f'{rate:.1%} das luzes'}, {reds:.2f} vermelhas, {episodes} tentativas", flush=True)
                row["dominio"] = nivel
                if nivel < max(dominio):
                    nivel += 1; level_start = update; lvl = []; env.set_level(nivel)
                else:
                    mastered_at = update
        log.write(json.dumps(row) + "\n"); log.flush()
        if update % 10 == 0:
            print(f"update {update} passos {steps} tentativas {episodes} acertos/tentativa {mh:.2f} {row.get('nivel', '')} {row.get('rate', '')} {(time.time()-t0)/60:.1f}min", flush=True)
        if update % 50 == 0:  # ponytail: só guarda as fotos para não perder o treino; retomar exige rodar de novo
            save(args, ckpts)
        if mastered_at is not None and update - mastered_at >= args.after:
            break
    ckpts.append({"update": update, "steps": steps, "episodes": episodes, "nivel": nivel, "layers": snapshot(net)})
    save(args, ckpts)
    env.close()
    print("fim", update, steps, episodes, len(ckpts))


if __name__ == "__main__":
    main()
