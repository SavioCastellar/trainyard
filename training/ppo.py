"""Treino PPO com self-play em liga para o futebol 2x2.

Cada ambiente é uma partida 2x2. O time A é sempre o cérebro atual. O time B pode ser:
  - o próprio cérebro atual ("self", e aí os 4 atletas geram experiência),
  - uma versão antiga do cérebro ("past", tirada da liga de versões salvas),
  - o robô programado ("bot", régua fixa para medir progresso).
Atributos e habilidades são sorteados a cada partida, para o cérebro aprender a jogar
com qualquer corpo e contra qualquer combinação de habilidades.

Uso: python ppo.py --minutes 60 --out runs/exp1
"""
from __future__ import annotations

import argparse
import copy
import json
import os
import random
import time

import numpy as np
import torch

from policy import Policy, export_actor_json
from simenv import OBS_SIZE, SimEnv


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--minutes", type=float, default=60)
    ap.add_argument("--n-envs", type=int, default=48)
    ap.add_argument("--bot-envs", type=int, default=8)
    ap.add_argument("--steps", type=int, default=128)
    ap.add_argument("--lr", type=float, default=3e-4)
    ap.add_argument("--gamma", type=float, default=0.995)
    ap.add_argument("--lam", type=float, default=0.95)
    ap.add_argument("--clip", type=float, default=0.2)
    ap.add_argument("--ent", type=float, default=0.005)
    ap.add_argument("--epochs", type=int, default=4)
    ap.add_argument("--minibatch", type=int, default=4096)
    ap.add_argument("--self-prob", type=float, default=0.6)
    ap.add_argument("--snapshot-every", type=int, default=15)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--out", default="runs/exp1")
    ap.add_argument("--resume", default="")
    ap.add_argument("--bot-skill", type=float, default=0.3)
    args = ap.parse_args()

    torch.set_num_threads(1)
    random.seed(args.seed); np.random.seed(args.seed); torch.manual_seed(args.seed)
    os.makedirs(args.out, exist_ok=True)
    log = open(os.path.join(args.out, "log.jsonl"), "a")

    n, nb, T = args.n_envs, args.bot_envs, args.steps
    bot_skill = args.bot_skill
    env = SimEnv(n, seed=args.seed, maxTime=30, untilGoal=True, skillProb=0.5, botSkill=bot_skill,
                 shaping={"progress": 1.0, "touch": 0.02, "approach": 1.0, "onTarget": 0.1})
    env.configure([{"bot": i < nb} for i in range(n)])
    env.reset()

    policy = Policy()
    if args.resume:
        policy.load_state_dict(torch.load(args.resume))
    opt = torch.optim.Adam(policy.parameters(), lr=args.lr, eps=1e-5)
    pool = [copy.deepcopy(policy.state_dict())]
    past = Policy()
    mode = np.array(["bot" if i < nb else ("self" if random.random() < args.self_prob else "past") for i in range(n)])

    t0 = time.time(); steps_done = 0; update = 0; last_bump = 0
    ep_hist: list[dict] = []
    while time.time() - t0 < args.minutes * 60:
        update += 1
        past.load_state_dict(random.choice(pool))
        B_obs = np.zeros((T, n, 4, OBS_SIZE), np.float32)
        B_act = np.zeros((T, n, 4, 4), np.int64)
        B_logp = np.zeros((T, n, 4), np.float32)
        B_val = np.zeros((T, n, 4), np.float32)
        B_rew = np.zeros((T, n, 4), np.float32)
        B_done = np.zeros((T, n), np.float32)
        B_mask = np.zeros((T, n, 4), bool)
        for t in range(T):
            o = torch.from_numpy(env.obs.copy())
            with torch.no_grad():
                a, lp = policy.act(o)
                v = policy.value(o)
                past_idx = np.where(mode == "past")[0]
                if len(past_idx):
                    ap_, _ = past.act(o[past_idx][:, 2:])
                    a[past_idx, 2:] = ap_
            B_obs[t] = o.numpy(); B_act[t] = a.numpy(); B_logp[t] = lp.numpy(); B_val[t] = v.numpy()
            B_mask[t, :, :2] = True
            B_mask[t, :, 2:] = (mode == "self")[:, None]
            _, r, d, info = env.step(a.numpy())
            B_rew[t] = r; B_done[t] = d
            for i in np.where(d)[0]:
                if i >= nb:
                    mode[i] = "self" if random.random() < args.self_prob else "past"
            for e in info:
                e["mode"] = "bot" if e["env"] < nb else None
                ep_hist.append(e)
        steps_done += T * n
        with torch.no_grad():
            last_v = policy.value(torch.from_numpy(env.obs.copy())).numpy()
        adv = np.zeros_like(B_rew); gae = np.zeros((n, 4), np.float32)
        for t in reversed(range(T)):
            nv = last_v if t == T - 1 else B_val[t + 1]
            nonterm = (1.0 - B_done[t])[:, None]
            delta = B_rew[t] + args.gamma * nv * nonterm - B_val[t]
            gae = delta + args.gamma * args.lam * nonterm * gae
            adv[t] = gae
        ret = adv + B_val
        m = B_mask.reshape(-1)
        obs_f = torch.from_numpy(B_obs.reshape(-1, OBS_SIZE)[m])
        act_f = torch.from_numpy(B_act.reshape(-1, 4)[m])
        logp_f = torch.from_numpy(B_logp.reshape(-1)[m])
        adv_f = torch.from_numpy(adv.reshape(-1)[m]); ret_f = torch.from_numpy(ret.reshape(-1)[m])
        adv_f = (adv_f - adv_f.mean()) / (adv_f.std() + 1e-8)
        N = len(obs_f); stats = []
        for _ in range(args.epochs):
            perm = torch.randperm(N)
            for s in range(0, N, args.minibatch):
                idx = perm[s : s + args.minibatch]
                nlp, ent, v = policy.evaluate(obs_f[idx], act_f[idx])
                ratio = torch.exp(nlp - logp_f[idx])
                pg = -torch.min(ratio * adv_f[idx], torch.clamp(ratio, 1 - args.clip, 1 + args.clip) * adv_f[idx]).mean()
                vl = 0.5 * ((v - ret_f[idx]) ** 2).mean()
                loss = pg + 0.5 * vl - args.ent * ent.mean()
                opt.zero_grad(); loss.backward()
                torch.nn.utils.clip_grad_norm_(policy.parameters(), 0.5)
                opt.step()
                stats.append((pg.item(), vl.item(), ent.mean().item()))
        if update % args.snapshot_every == 0:
            pool.append(copy.deepcopy(policy.state_dict())); pool = pool[-20:]
        # métricas
        recent = ep_hist[-400:]
        bot_eps = [e for e in recent if e["mode"] == "bot"]
        rec = {
            "update": update, "min": round((time.time() - t0) / 60, 2), "steps": steps_done,
            "sps": round(steps_done * 4 / (time.time() - t0)),
            "bot_win": round(np.mean([e["score"][0] > e["score"][1] for e in bot_eps]), 3) if bot_eps else None,
            "bot_loss": round(np.mean([e["score"][0] < e["score"][1] for e in bot_eps]), 3) if bot_eps else None,
            "goal_rate": round(np.mean([sum(e["score"]) > 0 for e in recent]), 3) if recent else None,
            "ep_len": round(np.mean([e["t"] for e in recent]), 2) if recent else None,
            "pg": round(np.mean([s[0] for s in stats]), 4), "vl": round(np.mean([s[1] for s in stats]), 4), "ent": round(np.mean([s[2] for s in stats]), 3),
        }
        # currículo: quando o cérebro vence o robô com frequência, o robô fica mais forte
        if rec["bot_win"] is not None and rec["bot_win"] > 0.55 and bot_skill < 1.0 and update - last_bump > 20:
            bot_skill = min(1.0, round(bot_skill + 0.1, 2)); env.set_bot_skill(bot_skill); last_bump = update
            ep_hist = [e for e in ep_hist if e["mode"] != "bot"]
        rec["bot_skill"] = bot_skill
        log.write(json.dumps(rec) + "\n"); log.flush()
        if update % 5 == 0 or update == 1:
            print(rec, flush=True)
        if update % 25 == 0:
            torch.save(policy.state_dict(), os.path.join(args.out, "policy.pt"))
            torch.save(pool, os.path.join(args.out, "pool.pt"))
    torch.save(policy.state_dict(), os.path.join(args.out, "policy.pt"))
    torch.save(pool, os.path.join(args.out, "pool.pt"))
    export_actor_json(policy, os.path.join(args.out, "actor.json"))
    env.close()
    print("fim", update, steps_done)


if __name__ == "__main__":
    main()
