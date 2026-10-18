/**
 * Lançadores (Reflexo): o atleta fica num tapete redondo; lançadores na borda da estação piscam e
 * disparam bolas de espuma nele. +1 por bola que passa sem acertar; nenhuma outra recompensa.
 * Levar uma bolada deixa o atleta 1 s atordoado (custo natural).
 * A bola mira onde o atleta vai estar (posição + velocidade × tempo de voo): ficar parado ou correr
 * sem parar não adianta; escapa quem muda de direção depois do disparo.
 * Medidas em docs/atividades/reflexo.md.
 *
 * Observação: atleta (posição, direção, velocidades, atordoado); para cada lançador: aviso aceso,
 * tempo até o disparo, direção (cos, sen) e distância vistos pelo atleta; para as 4 bolas mais
 * perto: direção e distância vistas pelo atleta e velocidade no referencial dele; giro dos lançadores.
 * Ações: girar (esq/nada/dir), andar (ré/parado/frente), passo lateral (esq/nada/dir).
 */
import { Rng } from '../rng.js';

export const REFLEXO = {
  matR: 3,
  launcherR: 9,
  playerR: 0.55,
  ballR: 0.3,
  speed: 4.5,
  side: 3.5,
  turn: 3.2,
  stun: 1,
  /** por nível (índice = nível): lançadores ativos (ângulos), velocidade da bola, intervalo entre disparos, aviso,
   *  chance de par, giro dos lançadores em volta do tapete (rad/s; o sentido troca a cada 2–5 s) */
  niveis: [
    null,
    { launchers: [0], ballSpeed: 9, every: 2.0, warn: 1.0, pair: 0, orbit: 0 },
    { launchers: [0, Math.PI / 2, Math.PI, -Math.PI / 2], ballSpeed: 12, every: 1.6, warn: 0.5, pair: 0, orbit: 0 },
    { launchers: [0, Math.PI / 2, Math.PI, -Math.PI / 2], ballSpeed: 12, every: 1.6, warn: 0.5, pair: 0.4, orbit: 0.4 },
  ],
  /** no par, a segunda bola mira essa distância para um dos lados da primeira (fecha a rota de fuga) */
  pairOffset: 1.4,
  /** a mira prevê as ações do atleta quando ele as repete há pelo menos isso (s) */
  steady: 0.3,
  maxBalls: 4,
  maxTime: 30,
  dt: 1 / 30,
} as const;

export const REFLEXO_OBS = 7 + 4 * 5 + REFLEXO.maxBalls * 6 + 1;
export const REFLEXO_ACTIONS = [3, 3, 3] as const;
export type Nivel = 1 | 2 | 3;

export type ReflexoEvent =
  | { type: 'warn'; t: number; launcher: number }
  | { type: 'fire'; t: number; launcher: number; ball: number }
  | { type: 'hit'; t: number; ball: number; x: number; z: number }
  | { type: 'dodge'; t: number; ball: number };

export interface Ball { id: number; x: number; z: number; vx: number; vz: number; from: number }
export interface Launcher { x: number; z: number; a: number; warn: number; pair: boolean }

type Body = { x: number; z: number; h: number; v: number; u: number; stun: number };
/** um passo da física do atleta com as ações [girar, andar, lateral] */
function moveBody(P: Body, [turn, fwd, side]: number[], coast = false) {
  const dt = REFLEXO.dt, k = coast ? 0 : Math.min(1, dt * 6);
  if (P.stun > 0) { P.stun -= dt; P.v = 0; P.u = 0; return; }
  if (!coast) P.h += (turn - 1) * REFLEXO.turn * dt;
  P.v += ((fwd === 2 ? REFLEXO.speed : fwd === 0 ? -REFLEXO.speed * 0.5 : 0) - P.v) * k;
  P.u += ((side - 1) * -REFLEXO.side - P.u) * k;
  P.x += (Math.cos(P.h) * P.v - Math.sin(P.h) * P.u) * dt;
  P.z += (Math.sin(P.h) * P.v + Math.cos(P.h) * P.u) * dt;
  const lim = REFLEXO.matR - REFLEXO.playerR, d = Math.hypot(P.x, P.z);
  if (d > lim) { P.x *= lim / d; P.z *= lim / d; }
}

export class ReflexoDrill {
  readonly rng: Rng;
  t = 0;
  done = false;
  reward = 0;
  /** bolas desviadas */
  hits = 0;
  /** bolas encerradas (desviadas ou que acertaram) */
  shots = 0;
  /** boladas levadas */
  struck = 0;
  player = { x: 0, z: 0, h: 0, v: 0, u: 0, phase: 0, stun: 0 };
  launchers: Launcher[];
  balls: Ball[] = [];
  events: ReflexoEvent[] | null;
  private next: number;
  private last = [1, 1, 1];
  private same = 0;
  /** sentido do giro dos lançadores (nível 3) e tempo até trocar */
  spin = 1;
  private flip = 3;
  private ids = 0;

  constructor(seed: number, record = false, readonly nivel: Nivel = 1) {
    this.rng = new Rng(seed);
    this.events = record ? [] : null;
    const N = REFLEXO.niveis[nivel]!;
    this.launchers = N.launchers.map(a => ({ x: Math.cos(a) * REFLEXO.launcherR, z: Math.sin(a) * REFLEXO.launcherR, a, warn: 0, pair: false }));
    this.next = 0.6;
  }

  private get N() { return REFLEXO.niveis[this.nivel]!; }

  private arm() {
    const L = this.launchers, i = this.rng.int(L.length);
    L[i].warn = this.N.warn;
    L[i].pair = false;
    this.events?.push({ type: 'warn', t: this.t, launcher: i });
    if (L.length > 1 && this.rng.next() < this.N.pair) {
      let j = this.rng.int(L.length - 1); if (j >= i) j++;
      L[j].warn = this.N.warn; L[j].pair = true;
      this.events?.push({ type: 'warn', t: this.t, launcher: j });
    }
  }

  private fire(i: number) {
    const L = this.launchers[i], P = this.player, sp = this.N.ballSpeed;
    // mira onde o atleta vai estar no fim do voo: se ele repete as mesmas ações há um tempo, simula a mesma
    // física com elas; se está trocando de ação, supõe que segue com a velocidade que tem agora
    const tf = Math.hypot(P.x - L.x, P.z - L.z) / sp, q = { ...P }, steady = this.same >= REFLEXO.steady;
    for (let t = 0; t < tf; t += REFLEXO.dt) moveBody(q, this.last, !steady);
    let ax = q.x, az = q.z;
    if (L.pair) {
      const side = this.rng.next() < 0.5 ? -1 : 1, dx = ax - L.x, dz = az - L.z, d = Math.hypot(dx, dz) || 1;
      ax += (-dz / d) * REFLEXO.pairOffset * side; az += (dx / d) * REFLEXO.pairOffset * side;
    }
    const dx = ax - L.x, dz = az - L.z, d = Math.hypot(dx, dz) || 1;
    const b: Ball = { id: this.ids++, x: L.x, z: L.z, vx: (dx / d) * sp, vz: (dz / d) * sp, from: i };
    if (this.balls.length >= REFLEXO.maxBalls) this.balls.shift();
    this.balls.push(b);
    this.events?.push({ type: 'fire', t: this.t, launcher: i, ball: b.id });
  }

  observe(out: Float32Array, off = 0) {
    const P = this.player, R = REFLEXO.launcherR, c = Math.cos(P.h), s = Math.sin(P.h);
    out[off] = P.x / REFLEXO.matR; out[off + 1] = P.z / REFLEXO.matR; out[off + 2] = c; out[off + 3] = s;
    out[off + 4] = P.v / REFLEXO.speed; out[off + 5] = P.u / REFLEXO.side; out[off + 6] = P.stun > 0 ? 1 : 0;
    const look = (o: number, dx: number, dz: number) => {
      const f = dx * c + dz * s, l = -dx * s + dz * c, d = Math.hypot(f, l);
      out[o] = d > 1e-6 ? f / d : 1; out[o + 1] = d > 1e-6 ? l / d : 0; out[o + 2] = d / R;
    };
    for (let k = 0; k < 4; k++) {
      const L = this.launchers[k], o = off + 7 + k * 5;
      if (!L) { out.fill(0, o, o + 5); continue; }
      out[o] = L.warn > 0 ? 1 : 0; out[o + 1] = L.warn / 1;
      look(o + 2, L.x - P.x, L.z - P.z);
    }
    const near = [...this.balls].sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z));
    for (let k = 0; k < REFLEXO.maxBalls; k++) {
      const b = near[k], o = off + 27 + k * 6;
      if (!b) { out.fill(0, o, o + 6); continue; }
      out[o] = 1; look(o + 1, b.x - P.x, b.z - P.z);
      out[o + 4] = (b.vx * c + b.vz * s) / 12; out[o + 5] = (-b.vx * s + b.vz * c) / 12;
    }
    out[off + 27 + REFLEXO.maxBalls * 6] = this.spin * this.N.orbit / 0.4;
  }

  /** ações = [girar 0..2, andar 0..2, passo lateral 0..2 (0 = esquerda)] */
  step(turn: number, move: number, side: number) {
    this.reward = 0;
    if (this.done) return;
    const dt = REFLEXO.dt, P = this.player;
    this.same = turn === this.last[0] && move === this.last[1] && side === this.last[2] ? this.same + dt : 0;
    this.last = [turn, move, side];
    moveBody(P, this.last);
    P.phase += (Math.abs(P.v) + Math.abs(P.u)) * dt * 2.4;
    // lançadores: giram em volta do tapete (nível 3), avisam e disparam
    if (this.N.orbit) {
      this.flip -= dt;
      if (this.flip <= 0) { this.spin = -this.spin; this.flip = 2 + this.rng.next() * 3; }
      for (const L of this.launchers) {
        L.a += this.spin * this.N.orbit * dt;
        L.x = Math.cos(L.a) * REFLEXO.launcherR; L.z = Math.sin(L.a) * REFLEXO.launcherR;
      }
    }
    this.next -= dt;
    if (this.next <= 0) { this.arm(); this.next = this.N.every; }
    this.launchers.forEach((L, i) => {
      if (L.warn <= 0) return;
      L.warn -= dt;
      if (L.warn <= 0) { L.warn = 0; this.fire(i); }
    });
    // bolas
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      b.x += b.vx * dt; b.z += b.vz * dt;
      if (Math.hypot(b.x - P.x, b.z - P.z) < REFLEXO.ballR + REFLEXO.playerR) {
        this.balls.splice(i, 1); this.shots++; this.struck++; P.stun = REFLEXO.stun; P.v = 0; P.u = 0;
        this.events?.push({ type: 'hit', t: this.t, ball: b.id, x: b.x, z: b.z });
      } else if (Math.hypot(b.x, b.z) > REFLEXO.launcherR + 0.5 && b.x * b.vx + b.z * b.vz > 0) {
        this.balls.splice(i, 1); this.shots++; this.hits++; this.reward += 1;
        this.events?.push({ type: 'dodge', t: this.t, ball: b.id });
      }
    }
    this.t += dt;
    if (this.t >= REFLEXO.maxTime) this.done = true;
  }
}
