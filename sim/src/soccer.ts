/**
 * Futebol 2x2.
 *
 * - Física 2D simples (o 3D é só visual): cápsulas para os atletas, bola com atrito.
 * - Atributos mudam apenas o corpo (velocidade, força, precisão...), então atributo maior
 *   é sempre vantagem física.
 * - Habilidades (Chute de longe, Goleiro) liberam ações novas. O cérebro enxerga as
 *   próprias habilidades e as dos adversários, para poder aprender quando usá-las e
 *   como se defender delas.
 */
import { Rng } from './rng.js';

export const ATTRS = ['vel', 'chute', 'prec', 'ctrl', 'refl', 'fol'] as const;
export type AttrName = (typeof ATTRS)[number];
export type Attrs = Record<AttrName, number>;

export const SKILLS = ['longShot', 'keeper'] as const;
export type SkillName = (typeof SKILLS)[number];
export type Skills = Record<SkillName, number>; // nível 0 (não tem) a 3

export interface PlayerSpec {
  attrs: Attrs;
  skills: Skills;
}

export const CFG = {
  W: 15, H: 9, goalHalf: 3, goalDepth: 2, dt: 1 / 30,
  pr: 0.6, br: 0.38, friction: 0.9, wallBounce: 0.75,
  turn: 5.5, back: 0.5, kickReach: 0.4, kickCd: 0.4,
  longRange: 10,                       // além disso, só o Chute de longe funciona bem
  diveCd: 2, diveTime: 0.3, diveRecover: 0.5, keeperZone: 6,
} as const;

/* atributos -> números da física */
export const speedOf = (a: Attrs) => 5.1 + 1.0 * a.vel;
export const kickMaxOf = (a: Attrs) => 9 + 8 * a.chute;
export const aimNoiseOf = (a: Attrs) => 0.03 + 0.5 * (1 - a.prec);
export const delayOf = (a: Attrs) => Math.round((1 - a.refl) * 2);   // atraso de 0 a 2 passos (0–67 ms)
export const drainOf = (a: Attrs) => 0.007 + 0.012 * (1 - a.fol);
export const rating = (a: Attrs) => Math.round(30 + 65 * (ATTRS.reduce((s, k) => s + a[k], 0) / ATTRS.length));

/** Ação de cada atleta: [deslocamento 0 ré/1 parado/2 frente, giro 0 esq/1 reto/2 dir, chute 0 nada/1 toque/2 chute, mergulho 0/1] */
export const ACTION_DIMS = [3, 3, 3, 2] as const;
export const ACT_SIZE = ACTION_DIMS.length;
export const IDLE_ACTION = [1, 1, 0, 0];
export const OBS_SIZE = 51;
const WALL_RAYS = 8;

export type MatchEvent =
  | { type: 'kick'; t: number; i: number; x: number; z: number; speed: number; shot: boolean; long: boolean; onTarget: boolean }
  | { type: 'goal'; t: number; team: number; scorer: number }
  | { type: 'dive'; t: number; i: number }
  | { type: 'save'; t: number; i: number }
  | { type: 'reset'; t: number }
  | { type: 'end'; t: number };

export interface PlayerStats {
  touches: number; shots: number; longShots: number; onTarget: number; goals: number;
  dives: number; saves: number; maxKick: number; maxSpeed: number;
}

export interface Player {
  i: number; team: number; role: number; spec: PlayerSpec;
  x: number; z: number; h: number; v: number;
  kickCd: number; kickAnim: number; diveCd: number; diveT: number; diveDir: number; downT: number;
  stamina: number; queue: number[][]; act: number[]; phase: number;
  st: PlayerStats;
}

export interface TeamStats { poss: number; depthSum: number; depthTime: number; shotsFaced: number; longShotsFaced: number; }

export interface MatchOptions {
  maxTime?: number;      // segundos
  untilGoal?: boolean;   // termina no primeiro gol (treino)
  record?: boolean;      // guarda eventos (partidas assistidas)
  liveRestart?: boolean; // recoloca a bola no meio se ela ficar parada (partidas assistidas)
}

const DIAG = Math.hypot(2 * CFG.W, 2 * CFG.H);
const newStats = (): PlayerStats => ({ touches: 0, shots: 0, longShots: 0, onTarget: 0, goals: 0, dives: 0, saves: 0, maxKick: 0, maxSpeed: 0 });

export class Match {
  readonly rng: Rng;
  readonly players: Player[];
  readonly ball = { x: 0, z: 0, vx: 0, vz: 0 };
  readonly opts: Required<MatchOptions>;
  readonly teamStats: TeamStats[] = [0, 1].map(() => ({ poss: 0, depthSum: 0, depthTime: 0, shotsFaced: 0, longShotsFaced: 0 }));
  t = 0;
  score = [0, 0];
  done = false;
  pause = 0;
  idle = 0;
  lastTouch = -1;
  events: MatchEvent[] | null;
  /** resultado do último passo, usado pelo cálculo de recompensa */
  goalTeam = -1;
  touched = [false, false, false, false];
  /** atleta que chutou no alvo neste passo (-1 se ninguém) */
  lastKickOnTarget = -1;

  constructor(specs: PlayerSpec[], seed: number, opts: MatchOptions = {}) {
    if (specs.length !== 4) throw new Error('futebol 2x2 precisa de 4 atletas');
    this.rng = new Rng(seed);
    this.opts = { maxTime: 30, untilGoal: false, record: false, liveRestart: false, ...opts };
    this.events = this.opts.record ? [] : null;
    this.players = specs.map((spec, i) => ({
      i, team: i < 2 ? 0 : 1, role: i % 2, spec: { attrs: { ...spec.attrs }, skills: { ...spec.skills } },
      x: 0, z: 0, h: 0, v: 0, kickCd: 0, kickAnim: 0, diveCd: 0, diveT: 0, diveDir: 0, downT: 0,
      stamina: 1, queue: [], act: [...IDLE_ACTION], phase: 0, st: newStats(),
    }));
    this.kickoff();
  }

  private ev(e: MatchEvent) { if (this.events) this.events.push(e); }

  kickoff() {
    const spots = [[-5, -2.8], [-9, 2.2], [5, 2.8], [9, -2.2]];
    for (const p of this.players) {
      const [x, z] = spots[p.i];
      p.x = x + (this.rng.next() - 0.5) * 1.2;
      p.z = z + (this.rng.next() - 0.5) * 1.2;
      p.h = Math.atan2(-p.z, -p.x) + (this.rng.next() - 0.5) * 0.4;
      p.v = 0; p.kickCd = 0; p.diveT = 0; p.downT = 0;
      p.queue = Array.from({ length: delayOf(p.spec.attrs) }, () => [...IDLE_ACTION]);
    }
    const b = this.ball;
    b.x = 0; b.z = (this.rng.next() - 0.5) * 2; b.vx = 0; b.vz = 0;
    this.idle = 0; this.lastTouch = -1;
  }

  /** Escreve a observação do atleta i em out[off..off+OBS_SIZE), no referencial do próprio time. */
  observe(i: number, out: Float32Array, off = 0) {
    const p = this.players[i], W = CFG.W, H = CFG.H, b = this.ball;
    const s = p.team === 0 ? 1 : -1;
    const px = s * p.x, pz = s * p.z, ph = p.h + (s < 0 ? Math.PI : 0);
    const cph = Math.cos(ph), sph = Math.sin(ph);
    const rel = (mx: number, mz: number, k: number) => {
      const dx = mx - px, dz = mz - pz, a = Math.atan2(dz, dx) - ph;
      out[off + k] = Math.sin(a); out[off + k + 1] = Math.cos(a); out[off + k + 2] = Math.min(1, Math.hypot(dx, dz) / DIAG);
    };
    rel(s * b.x, s * b.z, 0);
    const bvx = s * b.vx, bvz = s * b.vz;
    out[off + 3] = (bvx * cph + bvz * sph) / 15;
    out[off + 4] = (-bvx * sph + bvz * cph) / 15;
    const mate = this.players[p.team * 2 + (1 - p.role)];
    rel(s * mate.x, s * mate.z, 5);
    const o1 = this.players[(1 - p.team) * 2], o2 = this.players[(1 - p.team) * 2 + 1];
    const d1 = (o1.x - p.x) ** 2 + (o1.z - p.z) ** 2, d2 = (o2.x - p.x) ** 2 + (o2.z - p.z) ** 2;
    const [n1, n2] = d1 <= d2 ? [o1, o2] : [o2, o1];
    rel(s * n1.x, s * n1.z, 8);
    rel(s * n2.x, s * n2.z, 11);
    rel(-W, 0, 14);
    rel(W, 0, 17);
    out[off + 20] = px / W; out[off + 21] = pz / H; out[off + 22] = p.v / 6.1;
    out[off + 23] = p.role ? 1 : -1;
    out[off + 24] = s * b.x / W; out[off + 25] = s * b.z / H;
    for (let k = 0; k < WALL_RAYS; k++) {
      const a = ph + (k * 2 * Math.PI) / WALL_RAYS, dx = Math.cos(a), dz = Math.sin(a);
      const tx = dx > 1e-6 ? (W - px) / dx : dx < -1e-6 ? (-W - px) / dx : Infinity;
      const tz = dz > 1e-6 ? (H - pz) / dz : dz < -1e-6 ? (-H - pz) / dz : Infinity;
      out[off + 26 + k] = 1 - Math.min(Math.min(tx, tz), 10) / 10;
    }
    let k = off + 34;
    for (const a of ATTRS) out[k++] = p.spec.attrs[a] * 2 - 1;
    out[k++] = p.stamina * 2 - 1;
    for (const who of [p, mate, n1, n2]) for (const sk of SKILLS) out[k++] = who.spec.skills[sk] / 3;
    const ownGoalDist = Math.hypot(p.x + s * W, p.z);
    out[k++] = p.spec.skills.keeper > 0 && p.diveCd <= 0 && ownGoalDist < CFG.keeperZone ? 1 : 0;
    out[k++] = p.kickCd <= 0 ? 1 : 0;
  }

  /** Avança 1/30 s. `actions` tem 4 inteiros por atleta (ver ACTION_DIMS). */
  step(actions: ArrayLike<number>) {
    this.goalTeam = -1;
    this.lastKickOnTarget = -1;
    this.touched.fill(false);
    if (this.done) return;
    const dt = CFG.dt, P = this.players, b = this.ball, W = CFG.W, H = CFG.H, rng = this.rng;
    if (this.pause > 0) {
      this.pause -= dt;
      for (const p of P) p.stamina = Math.min(1, p.stamina + dt * 0.03);
      if (this.pause <= 0) this.kickoff();
      this.t += dt;
      this.checkEnd();
      return;
    }
    // reflexo: a ação escolhida agora só vale depois de alguns passos
    for (const p of P) {
      const a = [actions[p.i * 4], actions[p.i * 4 + 1], actions[p.i * 4 + 2], actions[p.i * 4 + 3]];
      p.queue.push(a);
      p.act = p.queue.shift()!;
    }
    // movimento
    for (const p of P) {
      const A = p.spec.attrs, a = p.act;
      if (p.kickCd > 0) p.kickCd -= dt;
      if (p.kickAnim > 0) p.kickAnim -= dt;
      if (p.diveCd > 0) p.diveCd -= dt;
      const s = p.team === 0 ? 1 : -1;
      // mergulho do Goleiro
      if (a[3] === 1 && p.spec.skills.keeper > 0 && p.diveCd <= 0 && p.downT <= 0 && p.diveT <= 0 &&
          Math.hypot(p.x + s * W, p.z) < CFG.keeperZone) {
        p.diveT = CFG.diveTime; p.diveCd = CFG.diveCd; p.diveDir = Math.sign(b.z - p.z) || 1; p.st.dives++;
        this.ev({ type: 'dive', t: this.t, i: p.i });
      }
      if (p.diveT > 0) {
        p.diveT -= dt;
        p.z += p.diveDir * (7 + 1.5 * p.spec.skills.keeper) * dt;
        p.v = 0;
        if (p.diveT <= 0) p.downT = CFG.diveRecover;
      } else if (p.downT > 0) {
        p.downT -= dt; p.v *= 0.8;
      } else {
        const vmax = speedOf(A) * (0.62 + 0.38 * p.stamina);
        p.h += (a[1] - 1) * CFG.turn * dt;
        const target = a[0] === 2 ? vmax : a[0] === 0 ? -vmax * CFG.back : 0;
        p.v += (target - p.v) * Math.min(1, dt * (4.5 + 2 * A.vel));
        p.x += Math.cos(p.h) * p.v * dt;
        p.z += Math.sin(p.h) * p.v * dt;
      }
      p.phase += Math.abs(p.v) * dt * 2.4;
      const effort = Math.min(1, Math.abs(p.v) / speedOf(A));
      p.stamina = Math.max(0, Math.min(1, p.stamina - effort * effort * drainOf(A) * dt + (1 - effort) * 0.02 * dt));
      if (Math.abs(p.v) > p.st.maxSpeed) p.st.maxSpeed = Math.abs(p.v);
    }
    // colisões entre atletas e com as bordas
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
      const a = P[i], c = P[j], dx = c.x - a.x, dz = c.z - a.z, m = 2 * CFG.pr, d2 = dx * dx + dz * dz;
      if (d2 < m * m && d2 > 1e-8) { const d = Math.sqrt(d2), q = (m - d) / 2 / d; a.x -= dx * q; a.z -= dz * q; c.x += dx * q; c.z += dz * q; }
    }
    for (const p of P) {
      const lx = W - CFG.pr, lz = H - CFG.pr;
      p.x = Math.max(-lx, Math.min(lx, p.x));
      p.z = Math.max(-lz, Math.min(lz, p.z));
    }
    // bola: chute, defesa e contato
    for (const p of P) {
      const A = p.spec.attrs, a = p.act, s = p.team === 0 ? 1 : -1;
      const dx = b.x - p.x, dz = b.z - p.z, d = Math.hypot(dx, dz) || 1e-4, nx = dx / d, nz = dz / d;
      const fx = Math.cos(p.h), fz = Math.sin(p.h);
      const reach = CFG.pr + CFG.br + (p.diveT > 0 ? 0.45 + 0.15 * p.spec.skills.keeper : 0);
      if (a[2] > 0 && p.kickCd <= 0 && p.downT <= 0 && p.diveT <= 0 && d < reach + CFG.kickReach && nx * fx + nz * fz > 0.5) {
        this.kick(p, a[2]);
        continue;
      }
      if (d < reach) {
        b.x = p.x + nx * reach; b.z = p.z + nz * reach;
        // defesa: bola indo em direção ao próprio gol durante o mergulho
        if (p.diveT > 0 && -s * b.vx > 2) {
          const sp = Math.max(6, Math.hypot(b.vx, b.vz) * 0.6);
          b.vx = s * sp * 0.8; b.vz = nz * sp * 0.6 + rng.gauss() * 1.5;
          p.st.saves++; this.touch(p, false); this.ev({ type: 'save', t: this.t, i: p.i });
          continue;
        }
        const pvx = fx * p.v, pvz = fz * p.v;
        const rel = (b.vx - pvx) * nx + (b.vz - pvz) * nz;
        if (rel < 0) {
          b.vx -= 1.4 * rel * nx; b.vz -= 1.4 * rel * nz;
          const sl = 0.15 + 0.9 * (1 - A.ctrl);
          b.vx += rng.gauss() * sl; b.vz += rng.gauss() * sl;
        }
        if (nx * fx + nz * fz > 0.4 && p.v > 0.5) {
          const k = 0.1 + A.ctrl * 0.2;
          b.vx += (pvx * 1.08 - b.vx) * k; b.vz += (pvz * 1.08 - b.vz) * k;
        }
        this.touch(p, false);
      }
    }
    // movimento da bola
    const f = Math.exp(-CFG.friction * dt);
    b.vx *= f; b.vz *= f;
    const sp = Math.hypot(b.vx, b.vz);
    if (sp > 26) { b.vx *= 26 / sp; b.vz *= 26 / sp; }
    b.x += b.vx * dt; b.z += b.vz * dt;
    const br = CFG.br, GH = CFG.goalHalf;
    const inMouth = Math.abs(b.z) < GH - br * 0.5;
    if (Math.abs(b.x) > W - br && !(inMouth || Math.abs(b.x) > W)) {
      b.x = Math.sign(b.x) * (W - br); b.vx = -b.vx * CFG.wallBounce;
    }
    if (Math.abs(b.x) > W) {
      if (Math.abs(b.z) > GH - br) { b.z = Math.sign(b.z) * (GH - br); b.vz = -b.vz * CFG.wallBounce; }
      if (Math.abs(b.x) > W + br) { this.goal(b.x > 0 ? 0 : 1); this.t += dt; this.checkEnd(); return; }
    } else if (Math.abs(b.z) > H - br) {
      b.z = Math.sign(b.z) * (H - br); b.vz = -b.vz * CFG.wallBounce;
    }
    // estatísticas de posse e de profundidade defensiva
    if (this.lastTouch >= 0) {
      const att = P[this.lastTouch].team, def = 1 - att;
      this.teamStats[att].poss += dt;
      const s = def === 0 ? 1 : -1;
      const depth = Math.min(...P.filter(q => q.team === def).map(q => s * q.x + W));
      this.teamStats[def].depthSum += depth * dt; this.teamStats[def].depthTime += dt;
    }
    this.idle = sp < 0.3 ? this.idle + dt : 0;
    if (this.opts.liveRestart && this.idle > 7) { this.kickoff(); this.ev({ type: 'reset', t: this.t }); }
    this.t += dt;
    this.checkEnd();
  }

  private kick(p: Player, kind: number) {
    const A = p.spec.attrs, b = this.ball, rng = this.rng, W = CFG.W;
    let ang: number, pw: number, shot = false, long = false;
    if (kind === 1) {
      ang = p.h + rng.gauss() * aimNoiseOf(A) * 0.5;
      pw = 7;
    } else {
      const gx = p.team === 0 ? W : -W, gdx = gx - b.x, gdz = -b.z * 0.6 + rng.gauss() * 0.8;
      const gAng = Math.atan2(gdz, gdx), gDist = Math.hypot(gx - b.x, b.z);
      let dAng = gAng - p.h; dAng = Math.atan2(Math.sin(dAng), Math.cos(dAng));
      shot = Math.abs(dAng) < 0.9;
      long = shot && gDist > CFG.longRange;
      let assist = shot ? 0.05 + 0.85 * A.prec : 0, noise = aimNoiseOf(A);
      pw = kickMaxOf(A);
      if (long) {
        const L = p.spec.skills.longShot;
        if (L > 0) { pw += 1.5 * L; noise *= 1 - 0.2 * L; }
        else { pw = Math.min(pw, 10); assist *= 0.3; noise *= 2; }
      }
      ang = p.h + dAng * assist + rng.gauss() * noise;
    }
    const kx = Math.cos(ang), kz = Math.sin(ang);
    b.vx = kx * pw + kx * Math.max(0, p.v) * 0.3;
    b.vz = kz * pw + kz * Math.max(0, p.v) * 0.3;
    p.kickCd = CFG.kickCd; p.kickAnim = 0.25;
    const speed = Math.hypot(b.vx, b.vz);
    if (speed > p.st.maxKick) p.st.maxKick = speed;
    let onTarget = false;
    if (shot) {
      const gx = p.team === 0 ? W : -W, tt = (gx - b.x) / kx;
      onTarget = kx * Math.sign(gx) > 0 && tt > 0 && Math.abs(b.z + kz * tt) < CFG.goalHalf - 0.2;
      p.st.shots++; if (long) p.st.longShots++; if (onTarget) { p.st.onTarget++; this.lastKickOnTarget = p.i; }
      this.teamStats[1 - p.team].shotsFaced++; if (long) this.teamStats[1 - p.team].longShotsFaced++;
    }
    this.touch(p, true);
    this.ev({ type: 'kick', t: this.t, i: p.i, x: b.x, z: b.z, speed, shot, long, onTarget });
  }

  private touch(p: Player, _kick: boolean) {
    p.st.touches++;
    this.touched[p.i] = true;
    this.lastTouch = p.i;
  }

  private goal(team: number) {
    this.score[team]++;
    this.goalTeam = team;
    const sc = this.lastTouch >= 0 ? this.players[this.lastTouch] : null;
    if (sc && sc.team === team) sc.st.goals++;
    this.ev({ type: 'goal', t: this.t, team, scorer: this.lastTouch });
    if (this.opts.untilGoal) { this.done = true; return; }
    this.pause = 2.2; this.ball.vx = 0; this.ball.vz = 0;
  }

  private checkEnd() {
    if (!this.done && this.t >= this.opts.maxTime) { this.done = true; this.ev({ type: 'end', t: this.t }); }
  }
}

/* ---------- utilidades para treino e testes ---------- */

export function randomSpec(rng: Rng, skillProb = 0.5): PlayerSpec {
  const attrs = Object.fromEntries(ATTRS.map(k => [k, rng.next()])) as Attrs;
  const lvl = () => (rng.next() < skillProb ? 1 + rng.int(3) : 0);
  return { attrs, skills: { longShot: lvl(), keeper: lvl() } };
}

export function flatSpec(v: number, skills: Partial<Skills> = {}): PlayerSpec {
  return { attrs: Object.fromEntries(ATTRS.map(k => [k, v])) as Attrs, skills: { longShot: 0, keeper: 0, ...skills } };
}
