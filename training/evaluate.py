"""Bateria de testes do cérebro treinado (experimento 1 da prova de conceito).

Mede se o cérebro:
  1. vence o robô programado;
  2. usa o Chute de longe quando tem;
  3. muda a defesa (fica mais recuado) contra quem tem Chute de longe;
  4. usa o Goleiro para defender chutes;
  5. dá vantagem a quem tem mais atributos e habilidades (monotonicidade).

Uso: python evaluate.py runs/exp1/policy.pt
"""
from __future__ import annotations

import json
import sys

import numpy as np
import torch

from policy import Policy
from simenv import SimEnv

ATTRS = ["vel", "chute", "prec", "ctrl", "refl", "fol"]


def spec(v=0.5, long=0, keeper=0, **over):
    a = {k: v for k in ATTRS}; a.update(over)
    return {"attrs": a, "skills": {"longShot": long, "keeper": keeper}}


def play(policy, A, B, n=96, bot=False, max_time=60, seed=7, swap=True):
    """Joga n partidas; metade com os lados trocados. Devolve resumos do ponto de vista do time A."""
    env = SimEnv(n, seed=seed, maxTime=max_time, untilGoal=False, skillProb=0, liveRestart=True)
    cfgs = []
    for i in range(n):
        flip = swap and not bot and i % 2 == 1
        cfgs.append({"bot": bot, "specs": (B + A) if flip else (A + B), "flip": flip})
    env.configure([{k: v for k, v in c.items() if k != "flip"} for c in cfgs])
    env.reset()
    got: dict[int, dict] = {}
    while len(got) < n:
        with torch.no_grad():
            a, _ = policy.act(torch.from_numpy(env.obs.copy()))
        _, _, _, info = env.step(a.numpy())
        for e in info:
            if e["env"] not in got:
                got[e["env"]] = e
    env.close()
    out = []
    for i, e in got.items():
        f = cfgs[i]["flip"]
        a_idx, b_idx = ((2, 3), (0, 1)) if f else ((0, 1), (2, 3))
        ta, tb = (1, 0) if f else (0, 1)
        out.append({
            "gf": e["score"][ta], "ga": e["score"][tb],
            "depthA": e["teams"][ta]["depth"], "depthB": e["teams"][tb]["depth"],
            "pA": [e["players"][k] for k in a_idx], "pB": [e["players"][k] for k in b_idx],
        })
    return out


def wdl(res):
    w = np.mean([r["gf"] > r["ga"] for r in res]); d = np.mean([r["gf"] == r["ga"] for r in res])
    return {"vitoria": round(float(w), 3), "empate": round(float(d), 3), "derrota": round(float(1 - w - d), 3),
            "gols_pro": round(float(np.mean([r["gf"] for r in res])), 2), "gols_contra": round(float(np.mean([r["ga"] for r in res])), 2)}


def team_sum(res, side, key):
    return sum(p[key] for r in res for p in r[side])


def main(path):
    torch.set_num_threads(1)
    pol = Policy(); pol.load_state_dict(torch.load(path)); pol.eval()
    R = {}

    # 1. contra o robô
    R["1_contra_robo"] = wdl(play(pol, [spec(), spec()], [spec(), spec()], bot=True))

    # 2. uso do Chute de longe
    with_long = play(pol, [spec(long=3), spec(long=3)], [spec(), spec()])
    no_long = play(pol, [spec(), spec()], [spec(), spec()])
    share = lambda res: team_sum(res, "pA", "longShots") / max(1, team_sum(res, "pA", "shots"))
    R["2_chute_de_longe"] = {
        "parcela_de_chutes_de_longe_com_habilidade": round(share(with_long), 3),
        "parcela_de_chutes_de_longe_sem_habilidade": round(share(no_long), 3),
        "chutes_de_longe_por_partida_com": round(team_sum(with_long, "pA", "longShots") / len(with_long), 2),
        "chutes_de_longe_por_partida_sem": round(team_sum(no_long, "pA", "longShots") / len(no_long), 2),
    }

    # 3. defesa recua contra quem tem Chute de longe? (distância do defensor mais recuado até o próprio gol)
    vs_long = play(pol, [spec(), spec()], [spec(long=3), spec(long=3)])
    vs_none = no_long
    dmean = lambda res: float(np.mean([r["depthA"] for r in res if r["depthA"] is not None]))
    R["3_defesa_contra_chute_de_longe"] = {
        "profundidade_media_contra_quem_tem": round(dmean(vs_long), 3),
        "profundidade_media_contra_quem_nao_tem": round(dmean(vs_none), 3),
        "diferenca": round(dmean(vs_long) - dmean(vs_none), 3),
    }

    # 4. Goleiro
    keep = play(pol, [spec(keeper=3), spec(keeper=3)], [spec(long=3), spec(long=3)])
    R["4_goleiro"] = {
        "mergulhos_por_partida": round(team_sum(keep, "pA", "dives") / len(keep), 2),
        "defesas_por_partida": round(team_sum(keep, "pA", "saves") / len(keep), 2),
        "gols_sofridos_com_goleiro": round(float(np.mean([r["ga"] for r in keep])), 2),
        "gols_sofridos_sem_goleiro": round(float(np.mean([r["ga"] for r in vs_long])), 2),
    }

    # 5. monotonicidade
    R["5_valor_das_habilidades"] = {
        "chute_de_longe_3_vs_nada": wdl(with_long),
        "goleiro_3_vs_nada_contra_chute_de_longe": wdl(play(pol, [spec(keeper=3), spec(keeper=3)], [spec(long=3), spec(long=3)])) ,
    }
    R["6_atributos"] = {
        "0.75_vs_0.45": wdl(play(pol, [spec(.75), spec(.75)], [spec(.45), spec(.45)])),
        "0.75_vs_0.25": wdl(play(pol, [spec(.75), spec(.75)], [spec(.25), spec(.25)])),
        "0.75_vs_0.60": wdl(play(pol, [spec(.75), spec(.75)], [spec(.6), spec(.6)])),
    }
    per = {}
    for k in ATTRS:
        res = play(pol, [spec(.6, **{k: .95})] * 2, [spec(.6, **{k: .15})] * 2, n=64)
        w = wdl(res); per[k] = f"{w['vitoria']:.2f} V / {w['derrota']:.2f} D"
    R["7_atributo_alto_vs_baixo"] = per
    print(json.dumps(R, ensure_ascii=False, indent=2))
    with open(path.replace("policy.pt", "eval.json"), "w") as f:
        json.dump(R, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main(sys.argv[1])
