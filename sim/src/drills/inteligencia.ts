/**
 * Circuito de decisão (Inteligência): pela quadra há postos acesos, cada um com um valor (1, 2 ou 3)
 * e um tempo para apagar. O atleta não pega todos e precisa escolher. + o valor do posto pisado;
 * nenhuma outra recompensa. Nível 2: postos com valores que apagam e divisórias baixas no meio.
 * Nível 3: postos azuis ou laranja; o painel diz qual cor vale (troca a cada 8 s); a outra vale 0.
 * Medidas em docs/atividades/inteligencia.md.
 *
 * Observação: atleta (posição, direção, velocidade); painel (tem cor, tempo até a troca); para cada
 * posto, do mais perto ao mais longe: aceso, direção (cos, sen) e distância vistos pelo atleta, valor,
 * tempo restante, cor em relação ao painel (+1 vale, -1 não vale, 0 sem cor); 8 sensores de distância.
 * Ações: girar (esq/nada/dir), andar (ré/parado/frente).
 */
import { Rng } from '../rng.js';

export const INTELIGENCIA = {
  halfW: 8,
  halfH: 6,
  playerR: 0.55,
  speed: 4.5,
  turn: 3.2,
  postR: 0.6,
  wallLen: 4,
  /** meia espessura da divisória */
  wallT: 0.15,
  /** por nível (índice = nível): postos acesos, valores possíveis (sorteio), tempo para apagar [mín, máx] por valor (0 = não apaga), divisórias, cores */
  niveis: [
    null,
    { posts: 3, values: [1], life: [[0, 0], [0, 0], [0, 0], [0, 0]], walls: 0, colors: false },
    { posts: 5, values: [1, 2, 3], life: [[0, 0], [3, 6], [3, 6], [3, 6]], walls: 3, colors: false },
    { posts: 5, values: [1, 2, 3], life: [[0, 0], [3, 6], [3, 6], [3, 6]], walls: 3, colors: true },
  ],
  swap: 8,
  /** pausa entre uma leva de postos e a próxima (a próxima só acende quando todos foram pisados ou apagaram) */
  gap: 0.5,
  /** distância [mín, máx] do atleta em que nasce o posto, por valor (quanto mais vale, mais longe) */
  spawnAway: [[0, 0], [1.5, 5], [3, 8], [5, 20]],
  sensors: 8,
  sensorMax: 10,
  maxTime: 30,
  dt: 1 / 30,
} as const;

const MAXP = 5;
export const INTELIGENCIA_OBS = 7 + MAXP * 7 + INTELIGENCIA.sensors;
export const INTELIGENCIA_ACTIONS = [3, 3] as const;
export type Nivel = 1 | 2 | 3;

/** cor: 0 sem cor, 1 azul, 2 laranja */
export interface Post { id: number; x: number; z: number; value: number; life: number; life0: number; color: number; on: boolean }
export interface Wall { x1: number; z1: number; x2: number; z2: number }
export type InteligenciaEvent =
  | { type: 'spawn'; t: number; post: number; id: number; x: number; z: number; value: number; life: number; color: number }
  | { type: 'take'; t: number; post: number; id: number; pts: number }
  | { type: 'expire'; t: number; post: number; id: number }
  | { type: 'swap'; t: number; color: number }
  | { type: 'wave'; t: number; n: number };

const segDist = (px: number, pz: number, w: Wall) => {
  const vx = w.x2 - w.x1, vz = w.z2 - w.z1, t = Math.max(0, Math.min(1, ((px - w.x1) * vx + (pz - w.z1) * vz) / (vx * vx + vz * vz)));
  return { d: Math.hypot(px - w.x1 - vx * t, pz - w.z1 - vz * t), cx: w.x1 + vx * t, cz: w.z1 + vz * t };
};

export class InteligenciaDrill {
  readonly rng: Rng;
  t = 0;
  done = false;
  reward = 0;
  /** pontos da tentativa */
  points = 0;
  /** postos pisados (qualquer valor) */
  taken = 0;
  /** postos pisados da cor errada (nível 3) */
  wrong = 0;
  expired = 0;
  player = { x: 0, z: 0, h: 0, v: 0, phase: 0 };
  posts: Post[] = [];
  walls: Wall[] = [];
  /** cor que vale (nível 3), 0 nos outros */
  active = 0;
  swapIn: number = INTELIGENCIA.swap;
  /** levas acesas */
  waves = 0;
  private gapIn = 0;
  events: InteligenciaEvent[] | null;
  private nextId = 0;
  private cfg;

  constructor(seed: number, record = false, readonly nivel: Nivel = 1) {
    this.rng = new Rng(seed);
    this.events = record ? [] : null;
    this.cfg = INTELIGENCIA.niveis[nivel]!;
    this.player.h = this.rng.range(-Math.PI, Math.PI);
    for (let i = 0; i < this.cfg.walls; i++) this.addWall();
    if (this.cfg.colors) this.active = 1 + this.rng.int(2);
    this.wave();
  }

  private wave() {
    this.posts = []; this.waves++;
    this.events?.push({ type: 'wave', t: this.t, n: this.waves });
    for (let i = 0; i < this.cfg.posts; i++) this.spawn(i);
  }

  private addWall() {
    const I = INTELIGENCIA, r = this.rng;
    for (let k = 0; ; k++) {
      const a = r.int(2) * Math.PI / 2, cx = r.range(-5, 5), cz = r.range(-3, 3), dx = Math.cos(a) * I.wallLen / 2, dz = Math.sin(a) * I.wallLen / 2;
      const w = { x1: cx - dx, z1: cz - dz, x2: cx + dx, z2: cz + dz };
      // longe do ponto de partida e sem encostar nas outras (para não fechar um beco)
      const ok = segDist(0, 0, w).d > 1.6 && this.walls.every(o =>
        Math.min(segDist(w.x1, w.z1, o).d, segDist(w.x2, w.z2, o).d, segDist(o.x1, o.z1, w).d, segDist(o.x2, o.z2, w).d) > 2);
      if (ok || k > 50) { this.walls.push(w); return; }
    }
  }

  private spawn(slot: number) {
    const I = INTELIGENCIA, r = this.rng, c = this.cfg, P = this.player;
    const value = c.values[r.int(c.values.length)];
    let x = 0, z = 0;
    for (let k = 0; k < 60; k++) {
      x = r.range(-I.halfW + 0.8, I.halfW - 0.8); z = r.range(-I.halfH + 0.8, I.halfH - 0.8);
      const d = Math.hypot(x - P.x, z - P.z), [a, b] = I.spawnAway[value];
      if (d > a && d < b && this.walls.every(w => segDist(x, z, w).d > I.postR + I.playerR + 0.1)
        && this.posts.every(p => Math.hypot(p.x - x, p.z - z) > 2 * I.postR + 0.6)) break;
    }
    const [l0, l1] = c.life[value], life = l1 ? r.range(l0, l1) : 0;
    const p: Post = { id: this.nextId++, x, z, value, life, life0: life, color: c.colors ? 1 + r.int(2) : 0, on: true };
    this.posts[slot] = p;
    this.events?.push({ type: 'spawn', t: this.t, post: slot, id: p.id, x, z, value, life, color: p.color });
  }

  /** valor do posto agora (0 se for da cor que não vale) */
  worth(p: Post) { return p.color && p.color !== this.active ? 0 : p.value; }

  /** distância do atleta até a parede ou divisória mais próxima na direção `a` (absoluta) */
  ray(a: number) {
    const I = INTELIGENCIA, P = this.player, dx = Math.cos(a), dz = Math.sin(a);
    let best: number = I.sensorMax;
    if (dx > 1e-9) best = Math.min(best, (I.halfW - P.x) / dx); else if (dx < -1e-9) best = Math.min(best, (-I.halfW - P.x) / dx);
    if (dz > 1e-9) best = Math.min(best, (I.halfH - P.z) / dz); else if (dz < -1e-9) best = Math.min(best, (-I.halfH - P.z) / dz);
    for (const w of this.walls) {
      const ex = w.x2 - w.x1, ez = w.z2 - w.z1, den = dx * ez - dz * ex;
      if (Math.abs(den) < 1e-9) continue;
      const qx = w.x1 - P.x, qz = w.z1 - P.z, t = (qx * ez - qz * ex) / den, u = (qx * dz - qz * dx) / den;
      if (t > 0 && u >= 0 && u <= 1) best = Math.min(best, t);
    }
    return best;
  }

  observe(out: Float32Array, off = 0) {
    const I = INTELIGENCIA, P = this.player, c = Math.cos(P.h), s = Math.sin(P.h), D = 2 * I.halfW;
    out[off] = P.x / I.halfW; out[off + 1] = P.z / I.halfH; out[off + 2] = c; out[off + 3] = s;
    out[off + 4] = P.v / I.speed; out[off + 5] = this.active ? 1 : 0; out[off + 6] = this.active ? this.swapIn / I.swap : 0;
    // postos do mais perto ao mais longe, vistos pelo atleta (direção separada da distância: aprendizado 19)
    const order = this.posts.filter(p => p.on).map(p => ({ p, d: Math.hypot(p.x - P.x, p.z - P.z) })).sort((a, b) => a.d - b.d);
    for (let k = 0; k < MAXP; k++) {
      const o = off + 7 + k * 7, q = order[k];
      if (!q) { out.fill(0, o, o + 7); continue; }
      const { p, d } = q, dx = p.x - P.x, dz = p.z - P.z, f = dx * c + dz * s, l = -dx * s + dz * c;
      out[o] = 1; out[o + 1] = d > 1e-6 ? f / d : 1; out[o + 2] = d > 1e-6 ? l / d : 0; out[o + 3] = d / D;
      out[o + 4] = p.value / 3; out[o + 5] = p.life0 ? p.life / 10 : 1;
      out[o + 6] = p.color ? (p.color === this.active ? 1 : -1) : 0;
    }
    for (let k = 0; k < I.sensors; k++) out[off + 7 + MAXP * 7 + k] = this.ray(P.h + (k * 2 * Math.PI) / I.sensors) / I.sensorMax;
  }

  /** ações = [girar 0..2, andar 0..2] */
  step(turn: number, move: number) {
    this.reward = 0;
    if (this.done) return;
    const I = INTELIGENCIA, dt = I.dt, P = this.player;
    P.h += (turn - 1) * I.turn * dt;
    const target = move === 2 ? I.speed : move === 0 ? -I.speed * 0.5 : 0;
    P.v += (target - P.v) * Math.min(1, dt * 6);
    P.x += Math.cos(P.h) * P.v * dt; P.z += Math.sin(P.h) * P.v * dt;
    // divisórias: empurra o atleta para fora; a quadra limita
    for (const w of this.walls) {
      const { d, cx, cz } = segDist(P.x, P.z, w), m = I.playerR + I.wallT;
      if (d < m && d > 1e-9) { P.x = cx + (P.x - cx) * m / d; P.z = cz + (P.z - cz) * m / d; }
    }
    P.x = Math.max(-I.halfW + I.playerR, Math.min(I.halfW - I.playerR, P.x));
    P.z = Math.max(-I.halfH + I.playerR, Math.min(I.halfH - I.playerR, P.z));
    P.phase += Math.abs(P.v) * dt * 2.4;

    this.posts.forEach((p, i) => {
      if (!p.on) return;
      if (Math.hypot(p.x - P.x, p.z - P.z) < I.postR) {
        const pts = this.worth(p);
        this.reward += pts; this.points += pts; this.taken++; if (p.color && !pts) this.wrong++;
        // pisar num posto apaga os outros da leva: cada leva é uma escolha
        this.posts.forEach(q => (q.on = false)); this.events?.push({ type: 'take', t: this.t, post: i, id: p.id, pts });
      } else if (p.life0 && (p.life -= dt) <= 0) {
        p.on = false; this.expired++; this.events?.push({ type: 'expire', t: this.t, post: i, id: p.id });
      }
    });
    if (this.posts.every(p => !p.on) && (this.gapIn += dt) >= I.gap) { this.gapIn = 0; this.wave(); }
    if (this.active && (this.swapIn -= dt) <= 0) {
      this.active = 3 - this.active; this.swapIn = I.swap;
      this.events?.push({ type: 'swap', t: this.t, color: this.active });
    }
    this.t += dt;
    if (this.t >= I.maxTime) this.done = true;
  }
}
