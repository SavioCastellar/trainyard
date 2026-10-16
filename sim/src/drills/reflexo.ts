/**
 * Painel de reação (Reflexo): o piso tem 12 placas que acendem. O atleta precisa pisar na
 * placa verde antes que ela apague. +1 por verde pisada a tempo; nenhuma outra recompensa.
 * No nível 3 acendem também 2 vermelhas; pisar numa deixa o atleta 1 s parado (custo natural).
 * Medidas em docs/atividades/reflexo.md.
 *
 * Observação: atleta (posição, direção, velocidade, parado); centro, verde e vermelhas vistas pelo atleta
 * (direção e distância); para cada placa, cor, tempo restante e posição relativa (frente/lado).
 * Ações: girar (esq/nada/dir), andar (ré/parado/frente).
 */
import { Rng } from '../rng.js';

const ang = (k: number) => (k * Math.PI) / 4;
export const REFLEXO = {
  arenaR: 7,
  playerR: 0.55,
  speed: 4.5,
  turn: 3.2,
  padR: 0.6,
  /** 0..3 anel interno (raio 2,5, a 45°, 135°…), 4..11 anel externo (raio 5,5, a cada 45° desde 0°) */
  pads: [
    ...[1, 3, 5, 7].map(k => ({ x: Math.cos(ang(k)) * 2.5, z: Math.sin(ang(k)) * 2.5 })),
    ...[0, 1, 2, 3, 4, 5, 6, 7].map(k => ({ x: Math.cos(ang(k)) * 5.5, z: Math.sin(ang(k)) * 5.5 })),
  ],
  /** janela da luz por nível (índice = nível) */
  window: [0, 4.0, 2.5, 2.5],
  gap: 0.4,
  reds: 2,
  /** chance de uma das vermelhas cair no caminho até a verde */
  redOnPath: 0.5,
  freeze: 1,
  maxTime: 30,
  dt: 1 / 30,
} as const;

export const REFLEXO_OBS = 22 + REFLEXO.pads.length * 5;
export const REFLEXO_ACTIONS = [3, 3] as const;
export type Nivel = 1 | 2 | 3;

/** 0 apagada, 1 verde, 2 vermelha */
export type PadState = 0 | 1 | 2;
export type ReflexoEvent =
  | { type: 'on'; t: number; pad: number; red: number[] }
  | { type: 'hit'; t: number; pad: number }
  | { type: 'miss'; t: number; pad: number }
  | { type: 'red'; t: number; pad: number };

export class ReflexoDrill {
  readonly rng: Rng;
  t = 0;
  done = false;
  reward = 0;
  hits = 0;
  /** luzes verdes encerradas (pisadas ou apagadas) */
  lights = 0;
  reds = 0;
  player = { x: 0, z: 0, h: 0, v: 0, phase: 0, frozen: 0 };
  state: PadState[] = REFLEXO.pads.map(() => 0);
  green = -1;
  /** vermelhas acesas (nível 3) */
  redPads: number[] = [];
  /** tempo restante da luz acesa, ou da pausa até a próxima */
  timer: number = REFLEXO.gap;
  events: ReflexoEvent[] | null;
  private inPad = -1;

  constructor(seed: number, record = false, readonly nivel: Nivel = 1) {
    this.rng = new Rng(seed);
    this.events = record ? [] : null;
  }

  private padAt(x: number, z: number) {
    const P = REFLEXO.pads;
    for (let i = 0; i < P.length; i++) if (Math.hypot(x - P[i].x, z - P[i].z) < REFLEXO.padR) return i;
    return -1;
  }

  private lightUp() {
    const n = this.nivel === 1 ? 4 : REFLEXO.pads.length;
    let g = this.rng.int(n - (this.green >= 0 && this.green < n ? 1 : 0));
    if (this.green >= 0 && g >= this.green) g++;
    this.green = g; this.state[g] = 1; this.timer = REFLEXO.window[this.nivel];
    const red: number[] = this.redPads = [];
    if (this.nivel === 3) {
      // em metade das luzes, uma vermelha cai no caminho entre o atleta e a verde (se houver placa ali)
      if (this.rng.next() < REFLEXO.redOnPath) {
        const P = this.player, G = REFLEXO.pads[g], vx = G.x - P.x, vz = G.z - P.z, L2 = vx * vx + vz * vz;
        let best = -1, bd: number = REFLEXO.padR + REFLEXO.playerR;
        REFLEXO.pads.forEach((q, i) => {
          if (i === g || i === this.inPad || L2 < 1e-6) return;
          const t = ((q.x - P.x) * vx + (q.z - P.z) * vz) / L2, d = Math.hypot(P.x + vx * t - q.x, P.z + vz * t - q.z);
          if (t > 0.1 && t < 0.9 && d < bd) { best = i; bd = d; }
        });
        if (best >= 0) { red.push(best); this.state[best] = 2; }
      }
      while (red.length < REFLEXO.reds) {
        const r = this.rng.int(REFLEXO.pads.length);
        if (r !== g && !red.includes(r)) { red.push(r); this.state[r] = 2; }
      }
    }
    this.events?.push({ type: 'on', t: this.t, pad: g, red });
  }

  private lightsOut(type: 'hit' | 'miss') {
    this.events?.push({ type, t: this.t, pad: this.green });
    this.state.fill(0); this.redPads = []; this.timer = REFLEXO.gap; this.lights++;
  }

  observe(out: Float32Array, off = 0) {
    const P = this.player, R = REFLEXO.arenaR, c = Math.cos(P.h), s = Math.sin(P.h);
    out[off] = P.x / R; out[off + 1] = P.z / R; out[off + 2] = c; out[off + 3] = s;
    out[off + 4] = P.v / REFLEXO.speed; out[off + 5] = P.frozen > 0 ? 1 : 0;
    const lit = this.green >= 0 && this.state[this.green] === 1, tl = lit ? this.timer / REFLEXO.window[this.nivel] : 0;
    // centro e verde acesa vistos pelo atleta: direção (cos, sen do ângulo) e distância. A direção vale
    // para qualquer placa, então o "correr para a luz" aprendido no anel interno serve para o externo.
    const look = (o: number, dx: number, dz: number) => {
      const f = dx * c + dz * s, l = -dx * s + dz * c, d = Math.hypot(f, l);
      out[o] = d > 1e-6 ? f / d : 1; out[o + 1] = d > 1e-6 ? l / d : 0; out[o + 2] = d / R;
    };
    look(off + 6, -P.x, -P.z);
    const g = REFLEXO.pads[this.green];
    out[off + 9] = lit ? 1 : 0; out[off + 13] = tl;
    if (lit) look(off + 10, g.x - P.x, g.z - P.z); else out[off + 10] = out[off + 11] = out[off + 12] = 0;
    // as 2 vermelhas, da mais perto para a mais longe
    const reds = this.redPads.map(i => REFLEXO.pads[i]).sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z));
    for (let k = 0; k < REFLEXO.reds; k++) {
      const q = reds[k], o = off + 14 + k * 4;
      out[o] = q ? 1 : 0;
      if (q) look(o + 1, q.x - P.x, q.z - P.z); else out[o + 1] = out[o + 2] = out[o + 3] = 0;
    }
    REFLEXO.pads.forEach((p, i) => {
      const o = off + 22 + i * 5, dx = p.x - P.x, dz = p.z - P.z, st = this.state[i];
      out[o] = st === 1 ? 1 : 0; out[o + 1] = st === 2 ? 1 : 0; out[o + 2] = st ? tl : 0;
      out[o + 3] = (dx * c + dz * s) / R; out[o + 4] = (-dx * s + dz * c) / R;
    });
  }

  /** ações = [girar 0..2, andar 0..2] */
  step(turn: number, move: number) {
    this.reward = 0;
    if (this.done) return;
    const dt = REFLEXO.dt, P = this.player;
    if (P.frozen > 0) { P.frozen -= dt; P.v = 0; }
    else {
      P.h += (turn - 1) * REFLEXO.turn * dt;
      const target = move === 2 ? REFLEXO.speed : move === 0 ? -REFLEXO.speed * 0.5 : 0;
      P.v += (target - P.v) * Math.min(1, dt * 6);
      P.x += Math.cos(P.h) * P.v * dt; P.z += Math.sin(P.h) * P.v * dt;
      const lim = REFLEXO.arenaR - REFLEXO.playerR, d = Math.hypot(P.x, P.z);
      if (d > lim) { P.x *= lim / d; P.z *= lim / d; }
      P.phase += Math.abs(P.v) * dt * 2.4;
    }
    const pad = this.padAt(P.x, P.z), entered = pad >= 0 && pad !== this.inPad;
    this.inPad = pad;
    const lit = this.green >= 0 && this.state[this.green] === 1;
    if (lit && pad === this.green) {
      this.reward = 1; this.hits++; this.lightsOut('hit');
    } else if (entered && this.state[pad] === 2) {
      this.reds++; P.frozen = REFLEXO.freeze; P.v = 0;
      this.events?.push({ type: 'red', t: this.t, pad });
    }
    this.timer -= dt;
    if (this.timer <= 0) {
      if (this.state.some(s => s)) this.lightsOut('miss');
      else this.lightUp();
    }
    this.t += dt;
    if (this.t >= REFLEXO.maxTime) this.done = true;
  }
}
