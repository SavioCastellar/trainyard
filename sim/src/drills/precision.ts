/**
 * Treino de Precisão: o atleta fica numa arena circular e precisa acertar alvos que
 * aparecem em lugares aleatórios, chutando bolas. Cada acerto vale +1; o alvo some e
 * reaparece em outro lugar. Não existe nenhuma outra recompensa: tudo o que o atleta
 * aprende vem de descobrir sozinho como acertar.
 *
 * Níveis (docs/atividades/precisao.md): 1 alvos fixos; 2 cada alvo fica aceso só 3 s e troca de
 * lugar (bola em alvo apagado não conta); 3 os alvos deslizam em trilhos circulares ao redor do centro.
 *
 * Observação: "posso chutar agora?", velocidade, distância e direção do centro; para cada alvo:
 * aceso, direção (cos, sen) e distância vistos pelo atleta, tempo aceso restante e velocidade
 * no referencial do atleta (aprendizado 19: direção separada da distância generaliza entre níveis);
 * e os 16 raios da versão de 1 nível (alvos acesos e borda).
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
  /** nível 2: tempo aceso de cada alvo e pausa apagado antes de reaparecer
   *  (a ficha propunha 3,0 s; com 3,0 s ignorar o tempo custa só 2 acertos, ver docs/atividades/precisao.md) */
  lit: 2.0,
  dark: 0.3,
  /** nível 3: velocidade dos alvos nos trilhos (a ficha propunha 1,5; com 2,0 a antecipação fica visível) */
  railSpeed: 2.0,
  /** raios em volta do atleta que detectam alvos acesos e a borda (o "alvo na linha do chute" sai de graça) */
  rays: 16,
  rayLen: 16,
  maxTime: 30,
  dt: 1 / 30,
} as const;

export const PRECISION_OBS = 5 + PRECISION.targets * 7 + PRECISION.rays * 2;
export const PRECISION_ACTIONS = [3, 3, 2] as const;
export type Nivel = 1 | 2 | 3;
/** domínio por nível, em acertos por tentativa: entre o robô sem e com o comportamento do nível
 *  (sim/test/precisao.test.ts); igual ao DOMINIO do training/ppo_drill.py */
export const PRECISION_DOMINIO: Record<Nivel, number> = { 1: 26, 2: 26, 3: 25 };

export type PrecisionEvent =
  | { type: 'kick'; t: number; x: number; z: number; h: number }
  | { type: 'hit'; t: number; target: number; x: number; z: number }
  | { type: 'miss'; t: number; x: number; z: number }
  | { type: 'spawn'; t: number; target: number; x: number; z: number }
  | { type: 'off'; t: number; target: number };

/** on: tempo aceso restante (Infinity fora do nível 2); off > 0: apagado, esperando reaparecer;
 *  a, r, dir: ângulo, raio e sentido no trilho (nível 3) */
export interface Target { x: number; z: number; age: number; on: number; off: number; a: number; r: number; dir: number }

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

  constructor(seed: number, record = false, readonly nivel: Nivel = 1) {
    this.rng = new Rng(seed);
    this.events = record ? [] : null;
    this.player.h = this.rng.next() * Math.PI * 2;
    for (let i = 0; i < PRECISION.targets; i++) this.targets.push(this.spawnTarget(i));
    // nível 2: os alvos começam defasados (1, 2 e 3 s acesos) para nunca apagarem juntos
    if (nivel === 2) this.targets.forEach((t, i) => { t.on = (PRECISION.lit * (i + 1)) / PRECISION.targets; });
  }

  private spawnTarget(i: number): Target {
    const P = this.player;
    for (let tries = 0; tries < 50; tries++) {
      const a = this.rng.next() * Math.PI * 2, d = 3.5 + this.rng.next() * (PRECISION.arenaR - 5);
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.hypot(x - P.x, z - P.z) < 3) continue;
      if (this.targets.some((t, k) => k !== i && Math.hypot(t.x - x, t.z - z) < 2.5)) continue;
      this.events?.push({ type: 'spawn', t: this.t, target: i, x, z });
      return this.made(x, z, a, d);
    }
    return this.made(6, 0, 0, 6);
  }

  private made(x: number, z: number, a: number, r: number): Target {
    const dir = this.nivel === 3 ? (this.rng.next() < 0.5 ? 1 : -1) : 0;
    return { x, z, age: 0, on: this.nivel === 2 ? PRECISION.lit : Infinity, off: 0, a, r, dir };
  }

  observe(out: Float32Array, off = 0) {
    const P = this.player, R = PRECISION.arenaR, c = Math.cos(P.h), s = Math.sin(P.h);
    const look = (o: number, dx: number, dz: number) => {
      const f = dx * c + dz * s, l = -dx * s + dz * c, d = Math.hypot(f, l);
      out[o] = d > 1e-6 ? f / d : 1; out[o + 1] = d > 1e-6 ? l / d : 0; out[o + 2] = d / R;
    };
    out[off] = P.cd <= 0 && !this.ball.live ? 1 : 0;
    out[off + 1] = P.v / PRECISION.speed;
    look(off + 2, -P.x, -P.z);
    this.targets.forEach((t, k) => {
      const o = off + 5 + k * 7;
      if (t.off > 0) { out.fill(0, o, o + 7); return; }
      out[o] = 1; look(o + 1, t.x - P.x, t.z - P.z);
      out[o + 4] = this.nivel === 2 ? t.on / PRECISION.lit : 1;
      const vx = -Math.sin(t.a) * t.dir, vz = Math.cos(t.a) * t.dir; // velocidade / railSpeed
      out[o + 5] = vx * c + vz * s; out[o + 6] = -vx * s + vz * c;
    });
    const L = PRECISION.rayLen, o = off + 5 + PRECISION.targets * 7;
    for (let k = 0; k < PRECISION.rays; k++) {
      const a = P.h + (k * 2 * Math.PI) / PRECISION.rays, dx = Math.cos(a), dz = Math.sin(a);
      let best: number = L;
      for (const t of this.targets) {
        if (t.off > 0) continue;
        const mx = P.x - t.x, mz = P.z - t.z, b = mx * dx + mz * dz, cc = mx * mx + mz * mz - PRECISION.targetR ** 2;
        if (cc > 0 && b > 0) continue;
        const disc = b * b - cc;
        if (disc < 0) continue;
        best = Math.min(best, Math.max(0, -b - Math.sqrt(disc)));
      }
      const bw = P.x * dx + P.z * dz, cw = P.x * P.x + P.z * P.z - R * R;
      out[o + k * 2] = best < L ? 1 - best / L : 0;
      out[o + k * 2 + 1] = 1 - Math.min(L, -bw + Math.sqrt(Math.max(0, bw * bw - cw))) / L;
    }
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
          if (t.off <= 0 && Math.hypot(B.x - t.x, B.z - t.z) < PRECISION.targetR + PRECISION.ballR) {
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
    this.targets.forEach((t, i) => {
      t.age += dt;
      if (t.dir) { t.a += (t.dir * PRECISION.railSpeed * dt) / t.r; t.x = Math.cos(t.a) * t.r; t.z = Math.sin(t.a) * t.r; }
      if (t.off > 0) { if ((t.off -= dt) <= 0) this.targets[i] = this.spawnTarget(i); }
      else if ((t.on -= dt) <= 0) { t.off = PRECISION.dark; this.events?.push({ type: 'off', t: this.t, target: i }); }
    });
    this.t += dt;
    if (this.t >= PRECISION.maxTime) this.done = true;
  }
}
