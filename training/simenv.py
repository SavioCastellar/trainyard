"""Cliente Python da ponte com a simulação em TypeScript (sim/src/bridge.ts).

A física roda em Node; o Python só envia ações e recebe observações, recompensas e
resumos das partidas encerradas. Assim existe uma única implementação do jogo.
"""
from __future__ import annotations

import json
import os
import struct
import subprocess

import numpy as np

OBS_SIZE = 51
ACTION_DIMS = (3, 3, 3, 2)
BRIDGE = os.path.join(os.path.dirname(__file__), "..", "sim", "dist", "src", "bridge.js")


class SimEnv:
    """Vários ambientes de futebol 2x2 (4 atletas cada) rodando num processo Node."""

    def __init__(self, n_envs: int, seed: int = 0, **cfg):
        self.n = n_envs
        self.proc = subprocess.Popen(["node", BRIDGE], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
        self._send(1, json.dumps({"nEnvs": n_envs, "seed": seed, **cfg}).encode())
        self.obs, _, _, _ = self._recv()

    def _send(self, op: int, payload: bytes):
        self.proc.stdin.write(struct.pack("<IB", len(payload) + 1, op) + payload)
        self.proc.stdin.flush()

    def _read(self, n: int) -> bytes:
        data = self.proc.stdout.read(n)
        if data is None or len(data) != n:
            raise RuntimeError("a ponte com a simulação foi encerrada")
        return data

    def _recv(self):
        (size,) = struct.unpack("<I", self._read(4))
        body = self._read(size)
        (jlen,) = struct.unpack_from("<I", body, 0)
        info = json.loads(body[4 : 4 + jlen])
        off = 4 + jlen
        n_obs = self.n * 4 * OBS_SIZE
        obs = np.frombuffer(body, np.float32, n_obs, off).reshape(self.n, 4, OBS_SIZE)
        off += n_obs * 4
        rew = np.frombuffer(body, np.float32, self.n * 4, off).reshape(self.n, 4)
        off += self.n * 4 * 4
        done = np.frombuffer(body, np.uint8, self.n, off).astype(bool)
        return obs, rew, done, info

    def step(self, actions: np.ndarray):
        """actions: (n_envs, 4 atletas, 4) inteiros."""
        self._send(2, np.ascontiguousarray(actions, dtype=np.int32).tobytes())
        self.obs, rew, done, info = self._recv()
        return self.obs, rew, done, info

    def configure(self, envs: list[dict]):
        """Por ambiente: {"bot": True} faz o time B ser o robô programado; {"specs": [...]} fixa atributos/habilidades."""
        self._send(3, json.dumps({"envs": envs}).encode())

    def set_bot_skill(self, v: float):
        """Força do robô (0 = quase parado, 1 = robô completo), para o currículo."""
        self._send(5, json.dumps({"botSkill": v}).encode())

    def reset(self):
        self._send(4, b"")
        self.obs, _, _, _ = self._recv()
        return self.obs

    def close(self):
        try:
            self._send(9, b"")
            self.proc.wait(timeout=2)
        except Exception:
            self.proc.kill()
