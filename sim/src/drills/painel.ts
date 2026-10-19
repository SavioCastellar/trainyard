/**
 * Painel de luzes (Velocidade): o piso tem 12 placas que acendem. O atleta precisa pisar na
 * placa verde antes que ela apague. +1 por verde pisada a tempo; nenhuma outra recompensa.
 * No nível 3 acendem também 2 vermelhas; pisar numa deixa o atleta 1 s parado (custo natural).
 * Medidas em docs/atividades/velocidade.md.
 *
 * Movimento padrão (`movimento.ts`): direção + ritmo, com embalo; atributos do atleta da fita.
 * Observação (no referencial do mundo, como as ações): atleta (posição, velocidade, direção, parado);
 * centro, verde e vermelhas (posição relativa); para cada placa, cor, tempo restante e posição relativa.
 * Todas as placas são visíveis: é uma sala pequena e a luz no piso se vê de qualquer lugar.
 * Ações: [direção 0..15, ritmo 0..2].
 */
import { Rng } from '../rng.js';
import { Corpo, novoCorpo, fisica, Fisica, moverCorpo, limitarCirculo, espelhar, ATLETA_FITA, ACOES_MOVIMENTO, AtributosMovimento } from '../movimento.js';

const ang = (k: number) => (k * Math.PI) / 4;
export const PAINEL = {
  arenaR: 7,
  playerR: 0.55,
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

export const PAINEL_OBS = 19 + PAINEL.pads.length * 5;
export const PAINEL_ACTIONS = ACOES_MOVIMENTO;
export type Nivel = 1 | 2 | 3;

/** 0 apagada, 1 verde, 2 vermelha */
export type PadState = 0 | 1 | 2;
export type PainelEvent =
  | { type: 'on'; t: number; pad: number; red: number[] }
  | { type: 'hit'; t: number; pad: number }
  | { type: 'miss'; t: number; pad: number }
  | { type: 'red'; t: number; pad: number };

export class PainelDrill {
  readonly rng: Rng;
  t = 0;
  done = false;
  reward = 0;
  hits = 0;
  /** luzes verdes encerradas (pisadas ou apagadas) */
  lights = 0;
  reds = 0;
  /** corpo do atleta (movimento padrão) e o mesmo estado no formato antigo, para as páginas */
  corpo: Corpo = novoCorpo();
  readonly fis: Fisica;
  player = { x: 0, z: 0, h: 0, v: 0, u: 0, phase: 0, frozen: 0 };
  state: PadState[] = PAINEL.pads.map(() => 0);
  green = -1;
  /** vermelhas acesas (nível 3) */
  redPads: number[] = [];
  /** tempo restante da luz acesa, ou da pausa até a próxima */
  timer: number = PAINEL.gap;
  events: PainelEvent[] | null;
  private inPad = -1;

  constructor(seed: number, record = false, readonly nivel: Nivel = 1, atributos: AtributosMovimento = ATLETA_FITA) {
    this.rng = new Rng(seed);
    this.events = record ? [] : null;
    this.fis = fisica(atributos);
  }

  private padAt(x: number, z: number) {
    const P = PAINEL.pads;
    for (let i = 0; i < P.length; i++) if (Math.hypot(x - P[i].x, z - P[i].z) < PAINEL.padR) return i;
    return -1;
  }

  private lightUp() {
    const n = this.nivel === 1 ? 4 : PAINEL.pads.length;
    let g = this.rng.int(n - (this.green >= 0 && this.green < n ? 1 : 0));
    if (this.green >= 0 && g >= this.green) g++;
    this.green = g; this.state[g] = 1; this.timer = PAINEL.window[this.nivel];
    const red: number[] = this.redPads = [];
    if (this.nivel === 3) {
      // em metade das luzes, uma vermelha cai no caminho entre o atleta e a verde (se houver placa ali)
      if (this.rng.next() < PAINEL.redOnPath) {
        const P = this.player, G = PAINEL.pads[g], vx = G.x - P.x, vz = G.z - P.z, L2 = vx * vx + vz * vz;
        let best = -1, bd: number = PAINEL.padR + PAINEL.playerR;
        PAINEL.pads.forEach((q, i) => {
          if (i === g || i === this.inPad || L2 < 1e-6) return;
          const t = ((q.x - P.x) * vx + (q.z - P.z) * vz) / L2, d = Math.hypot(P.x + vx * t - q.x, P.z + vz * t - q.z);
          if (t > 0.1 && t < 0.9 && d < bd) { best = i; bd = d; }
        });
        if (best >= 0) { red.push(best); this.state[best] = 2; }
      }
      while (red.length < PAINEL.reds) {
        const r = this.rng.int(PAINEL.pads.length);
        if (r !== g && !red.includes(r)) { red.push(r); this.state[r] = 2; }
      }
    }
    this.events?.push({ type: 'on', t: this.t, pad: g, red });
  }

  private lightsOut(type: 'hit' | 'miss') {
    this.events?.push({ type, t: this.t, pad: this.green });
    this.state.fill(0); this.redPads = []; this.timer = PAINEL.gap; this.lights++;
  }

  observe(out: Float32Array, off = 0) {
    const P = this.player, C = this.corpo, R = PAINEL.arenaR, vm = this.fis.velMax;
    out[off] = C.x / R; out[off + 1] = C.z / R; out[off + 2] = C.vx / vm; out[off + 3] = C.vz / vm;
    out[off + 4] = Math.cos(C.h); out[off + 5] = Math.sin(C.h); out[off + 6] = P.frozen > 0 ? 1 : 0;
    const lit = this.green >= 0 && this.state[this.green] === 1, tl = lit ? this.timer / PAINEL.window[this.nivel] : 0;
    out[off + 7] = -C.x / R; out[off + 8] = -C.z / R;
    const g = PAINEL.pads[this.green];
    out[off + 9] = lit ? 1 : 0; out[off + 10] = lit ? (g.x - C.x) / R : 0; out[off + 11] = lit ? (g.z - C.z) / R : 0; out[off + 12] = tl;
    // as 2 vermelhas, da mais perto para a mais longe
    const reds = this.redPads.map(i => PAINEL.pads[i]).sort((a, b) => Math.hypot(a.x - C.x, a.z - C.z) - Math.hypot(b.x - C.x, b.z - C.z));
    for (let k = 0; k < PAINEL.reds; k++) {
      const q = reds[k], o = off + 13 + k * 3;
      out[o] = q ? 1 : 0; out[o + 1] = q ? (q.x - C.x) / R : 0; out[o + 2] = q ? (q.z - C.z) / R : 0;
    }
    PAINEL.pads.forEach((p, i) => {
      const o = off + 19 + i * 5, st = this.state[i];
      out[o] = st === 1 ? 1 : 0; out[o + 1] = st === 2 ? 1 : 0; out[o + 2] = st ? tl : 0;
      out[o + 3] = (p.x - C.x) / R; out[o + 4] = (p.z - C.z) / R;
    });
  }

  /** ações = [direção 0..15, ritmo 0..2] */
  step(direcao: number, ritmo: number) {
    this.reward = 0;
    if (this.done) return;
    const dt = PAINEL.dt, P = this.player, C = this.corpo;
    if (P.frozen > 0) { P.frozen -= dt; C.vx = C.vz = 0; C.w = C.aFrente = C.aLado = 0; }
    else {
      moverCorpo(C, this.fis, direcao, ritmo, dt);
      limitarCirculo(C, PAINEL.arenaR - PAINEL.playerR);
    }
    espelhar(C, P);
    const pad = this.padAt(P.x, P.z), entered = pad >= 0 && pad !== this.inPad;
    this.inPad = pad;
    const lit = this.green >= 0 && this.state[this.green] === 1;
    if (lit && pad === this.green) {
      this.reward = 1; this.hits++; this.lightsOut('hit');
    } else if (entered && this.state[pad] === 2) {
      this.reds++; P.frozen = PAINEL.freeze; C.vx = C.vz = 0; espelhar(C, P);
      this.events?.push({ type: 'red', t: this.t, pad });
    }
    this.timer -= dt;
    if (this.timer <= 0) {
      if (this.state.some(s => s)) this.lightsOut('miss');
      else this.lightUp();
    }
    this.t += dt;
    if (this.t >= PAINEL.maxTime) this.done = true;
  }
}
