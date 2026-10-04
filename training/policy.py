"""Cérebro do atleta: uma rede pequena com 4 "cabeças" de decisão (andar, girar, chutar, mergulhar)."""
from __future__ import annotations

import json

import numpy as np
import torch
import torch.nn as nn
from torch.distributions import Categorical

from simenv import ACTION_DIMS, OBS_SIZE

HIDDEN = 128


class Policy(nn.Module):
    def __init__(self):
        super().__init__()
        self.actor = nn.Sequential(nn.Linear(OBS_SIZE, HIDDEN), nn.Tanh(), nn.Linear(HIDDEN, HIDDEN), nn.Tanh(), nn.Linear(HIDDEN, sum(ACTION_DIMS)))
        self.critic = nn.Sequential(nn.Linear(OBS_SIZE, HIDDEN), nn.Tanh(), nn.Linear(HIDDEN, HIDDEN), nn.Tanh(), nn.Linear(HIDDEN, 1))
        with torch.no_grad():
            self.actor[-1].weight.mul_(0.01)
            self.critic[-1].weight.mul_(1.0)

    def dists(self, obs):
        logits = self.actor(obs)
        return [Categorical(logits=l) for l in torch.split(logits, ACTION_DIMS, dim=-1)]

    def act(self, obs, greedy: bool = False):
        ds = self.dists(obs)
        a = torch.stack([d.probs.argmax(-1) if greedy else d.sample() for d in ds], -1)
        logp = sum(d.log_prob(a[..., k]) for k, d in enumerate(ds))
        return a, logp

    def evaluate(self, obs, a):
        ds = self.dists(obs)
        logp = sum(d.log_prob(a[..., k]) for k, d in enumerate(ds))
        ent = sum(d.entropy() for d in ds)
        return logp, ent, self.critic(obs).squeeze(-1)

    def value(self, obs):
        return self.critic(obs).squeeze(-1)


def export_actor_json(policy: Policy, path: str):
    """Pesos do ator em JSON, para rodar no navegador e no servidor sem dependências."""
    layers = []
    for m in policy.actor:
        if isinstance(m, nn.Linear):
            layers.append({"w": np.round(m.weight.detach().numpy(), 5).tolist(), "b": np.round(m.bias.detach().numpy(), 5).tolist()})
    with open(path, "w") as f:
        json.dump({"obs": OBS_SIZE, "actions": list(ACTION_DIMS), "activation": "tanh", "layers": layers}, f)
