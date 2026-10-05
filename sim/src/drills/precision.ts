/**
 * Treino de Precisão: o atleta fica numa arena circular e precisa acertar alvos que
 * aparecem em lugares aleatórios, chutando bolas. Cada acerto vale +1; o alvo some e
 * reaparece em outro lugar. Não existe nenhuma outra recompensa: tudo o que o atleta
 * aprende vem de descobrir sozinho como acertar.
 *
 * Sensores (como no ML-Agents): raios em volta do atleta que detectam alvos e a borda,
 * mais "posso chutar agora?" e a própria velocidade.
 * Ações: girar (esq/nada/dir), andar (ré/parado/frente), chutar (não/sim).
 */
import { Rng } from '../rng.js';

export const PRECISION = {
  arenaR: 12,
  targets: 3,
  targetR: 0.7,
  playerR: 0.55,
  ballR: 0.32,
  speed: 4.5,
  turn: 3.2,             // giro lento de propósito: mirar exige planejamento
  kickSpeed: 15,
  kickCd: 0.9,
  ballFriction: 0.55,
  aimNoise: 0.035,
  rays: 16,
  rayLen: 16,
  maxTime: 30,
  dt: 1 / 30,
} as const;

export const PRECISION_OBS = PRECISION.rays * 2 + 3;
export const PRECISION_ACTIONS = [3, 3, 2] as const;

export type PrecisionEvent =
  | { type: 'kick'; t: number; x: number; z: number; h: number }
  | { type: 'hit'; t: number; target: number; x: number; z: number }
  | { type: 'miss'; t: number; x: number; z: number }
  | { type: 'spawn'; t: number; target: number; x: number; z: number };

export interface Target { x: number; z: number; age: number }

export class PrecisionDrill {
  readonly rng: Rng;
  t = 0;
  done = false;
  hits = 0;
  kicks = 0;
  player = { x: 0, z: 0, h: 0, v: 0, cd: 0, phase: 0, kickAnim: 0 };
  ball: { x: number; z: number; vx: number; vz: number; live: boolean } = { x: 0, z: 0, vx: 0, vz: 0, live: false };
  targets: Target[] = [];
  events: PrecisionEvent[] | null;
  /** recompensa do último passo */
  reward = 0;

  constructor(seed: number, record = false) {
    this.rng = new Rng(seed);
    this.events = record ? [] : null;
    this.player.h = this.rng.next() * Math.PI * 2;
    for (let i = 0; i < PRECISION.targets; i++) this.targets.push(this.spawnTarget(i));
  }

  private spawnTarget(i: number): Target {
    const P = this.player;
    for (let tries = 0; tries < 50; tries++) {
      const a = this.rng.next() * Math.PI * 2, d = 3.5 + this.rng.next() * (PRECISION.arenaR - 5);
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.hypot(x - P.x, z - P.z) < 3) continue;
      if (this.targets.some((t, k) => k !== i && Math.hypot(t.x - x, t.z - z) < 2.5)) continue;
      this.events?.push({ type: 'spawn', t: this.t, target: i, x, z });
      return { x, z, age: 0 };
    }
    return { x: 6, z: 0, age: 0 };
  }

  observe(out: Float32Array, off = 0) {
    const P = this.player, L = PRECISION.rayLen, R = PRECISION.arenaR;
    for (let k = 0; k < PRECISION.rays; k++) {
      const a = P.h + (k * 2 * Math.PI) / PRECISION.rays, dx = Math.cos(a), dz = Math.sin(a);
      let best: number = L;
      for (const t of this.targets) {
        const mx = P.x - t.x, mz = P.z - t.z, b = mx * dx + mz * dz, c = mx * mx + mz * mz - PRECISION.targetR ** 2;
        if (c > 0 && b > 0) continue;
        const disc = b * b - c;
        if (disc < 0) continue;
        const tt = Math.max(0, -b - Math.sqrt(disc));
        if (tt < best) best = tt;
      }
      const bw = P.x * dx + P.z * dz, cw = P.x * P.x + P.z * P.z - R * R;
      const wall = Math.min(L, -bw + Math.sqrt(Math.max(0, bw * bw - cw)));
      out[off + k * 2] = best < L ? 1 - best / L : 0;
      out[off + k * 2 + 1] = 1 - wall / L;
    }
    const b = off + PRECISION.rays * 2;
    out[b] = P.cd <= 0 && !this.ball.live ? 1 : 0;
    out[b + 1] = P.v / PRECISION.speed;
    out[b + 2] = Math.hypot(P.x, P.z) / R;
  }

  /** action = [girar 0..2, andar 0..2, chutar 0..1] */
  step(turn: number, move: number, kick: number) {
    this.reward = 0;
    if (this.done) return;
    const dt = PRECISION.dt, P = this.player, B = this.ball;
    P.h += (turn - 1) * PRECISION.turn * dt;
    const target = move === 2 ? PRECISION.speed : move === 0 ? -PRECISION.speed * 0.5 : 0;
    P.v += (target - P.v) * Math.min(1, dt * 6);
    P.x += Math.cos(P.h) * P.v * dt; P.z += Math.sin(P.h) * P.v * dt;
    const lim = PRECISION.arenaR - PRECISION.playerR, d = Math.hypot(P.x, P.z);
    if (d > lim) { P.x *= lim / d; P.z *= lim / d; }
    P.phase += Math.abs(P.v) * dt * 2.4;
    if (P.cd > 0) P.cd -= dt;
    if (P.kickAnim > 0) P.kickAnim -= dt;
    if (kick === 1 && P.cd <= 0 && !B.live) {
      const a = P.h + this.rng.gauss() * PRECISION.aimNoise;
      B.x = P.x + Math.cos(P.h) * (PRECISION.playerR + PRECISION.ballR);
      B.z = P.z + Math.sin(P.h) * (PRECISION.playerR + PRECISION.ballR);
      B.vx = Math.cos(a) * PRECISION.kickSpeed; B.vz = Math.sin(a) * PRECISION.kickSpeed;
      B.live = true; P.cd = PRECISION.kickCd; P.kickAnim = 0.25; this.kicks++;
      this.events?.push({ type: 'kick', t: this.t, x: B.x, z: B.z, h: a });
    }
    if (B.live) {
      const f = Math.exp(-PRECISION.ballFriction * dt);
      B.vx *= f; B.vz *= f;
      // avança em subpassos para a bola rápida não atravessar o alvo
      const sub = 3;
      for (let s = 0; s < sub && B.live; s++) {
        B.x += (B.vx * dt) / sub; B.z += (B.vz * dt) / sub;
        for (let i = 0; i < this.targets.length; i++) {
          const t = this.targets[i];
          if (Math.hypot(B.x - t.x, B.z - t.z) < PRECISION.targetR + PRECISION.ballR) {
            this.reward += 1; this.hits++; B.live = false;
            this.events?.push({ type: 'hit', t: this.t, target: i, x: t.x, z: t.z });
            this.targets[i] = this.spawnTarget(i);
            break;
          }
        }
      }
      if (B.live && (Math.hypot(B.x, B.z) > PRECISION.arenaR + 1 || Math.hypot(B.vx, B.vz) < 1.5)) {
        B.live = false;
        this.events?.push({ type: 'miss', t: this.t, x: B.x, z: B.z });
      }
    }
    for (const t of this.targets) t.age += dt;
    this.t += dt;
    if (this.t >= PRECISION.maxTime) this.done = true;
  }
}
