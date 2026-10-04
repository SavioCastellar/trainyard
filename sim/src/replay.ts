/**
 * Partida oficial: roda no servidor, com semente registrada, e gera um replay compacto
 * que o navegador toca. Quem quiser auditar pode rodar de novo com a mesma semente,
 * os mesmos atletas e o mesmo cérebro e comparar o resultado.
 */
import { Brain } from './brain.js';
import { Rng } from './rng.js';
import { Match, MatchEvent, OBS_SIZE, PlayerSpec } from './soccer.js';

export interface Replay {
  v: 1;
  seed: number;
  fps: number;
  specs: PlayerSpec[];
  score: number[];
  /** por quadro: bola x,z e, para cada atleta, x, z, direção, flags (chute/mergulho/caído) — inteiros de 16 bits */
  frames: string; // base64 de Int16Array
  nFrames: number;
  events: MatchEvent[];
}

export interface OfficialMatchInput {
  seed: number;
  specs: PlayerSpec[];         // 4 atletas: time A (0,1) e time B (2,3)
  brains: [Brain, Brain];      // cérebro de cada time (normalmente o mesmo)
  maxTime?: number;
}

const PER_FRAME = 2 + 4 * 4;

export function runOfficialMatch(input: OfficialMatchInput): { replay: Replay; match: Match } {
  const m = new Match(input.specs, input.seed, { maxTime: input.maxTime ?? 90, record: true, liveRestart: true });
  const decide = new Rng(input.seed ^ 0x5bd1e995);   // sorteio das decisões, também com semente
  const obs = new Float32Array(4 * OBS_SIZE);
  const act = new Int32Array(16);
  const total = Math.ceil((input.maxTime ?? 90) * 30) + 2;
  const frames = new Int16Array(total * PER_FRAME);
  let f = 0;
  const snap = () => {
    if (f >= total) return;
    const o = f * PER_FRAME;
    frames[o] = Math.round(m.ball.x * 100); frames[o + 1] = Math.round(m.ball.z * 100);
    m.players.forEach((p, k) => {
      const q = o + 2 + k * 4;
      frames[q] = Math.round(p.x * 100); frames[q + 1] = Math.round(p.z * 100);
      frames[q + 2] = Math.round((((p.h % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI) * 1000);
      frames[q + 3] = (p.kickAnim > 0 ? 1 : 0) | (p.diveT > 0 ? 2 : 0) | (p.downT > 0 ? 4 : 0);
    });
    f++;
  };
  snap();
  while (!m.done) {
    for (let k = 0; k < 4; k++) {
      m.observe(k, obs, k * OBS_SIZE);
      input.brains[k < 2 ? 0 : 1].act(obs, k * OBS_SIZE, act, k * 4, decide);
    }
    m.step(act);
    snap();
  }
  const used = frames.subarray(0, f * PER_FRAME);
  const replay: Replay = {
    v: 1, seed: input.seed, fps: 30, specs: input.specs, score: [...m.score],
    frames: Buffer.from(used.buffer, used.byteOffset, used.byteLength).toString('base64'),
    nFrames: f, events: m.events ?? [],
  };
  return { replay, match: m };
}
