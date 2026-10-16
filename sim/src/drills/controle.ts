/**
 * Plataformas de equilíbrio (Controle): uma trilha de 24 plataformas redondas, cada uma sobreposta à
 * anterior, com curvas. O atleta tem embalo (acelera 6/s², freia 9/s², gira 3,2 rad/s), então correr
 * demais numa curva faz ele passar da plataforma. Fora de todas = queda: 1 s no colchão e volta parado
 * ao centro da plataforma mais adiantada que já pisou. +1 por plataforma nova; nenhuma outra recompensa.
 * No nível 3 algumas plataformas deslizam de um lado para o outro e carregam o atleta.
 * Medidas em docs/atividades/controle.md.
 *
 * Observação: velocidade e queda do atleta; para a plataforma atual (a mais adiantada já pisada) e as
 * 4 seguintes: direção (cos, sen) e distância vistas pelo atleta, raio, velocidade no referencial dele
 * e se é móvel.
 * Ações: girar (esq/nada/dir), andar (ré/nada/frente). "Nada" deixa o embalo seguir (atrito leve).
 */
import { Rng } from '../rng.js';

export const CONTROLE = {
  /** a trilha não tem fim: sempre `ahead` plataformas à frente; as que ficam `behind` para trás afundam */
  ahead: 10,
  behind: 6,
  /** metade do lado da área da trilha */
  half: 10,
  playerR: 0.55,
  speed: 4.5,
  back: 1.5,
  accel: 6,
  brake: 9,
  /** atrito com "nada" (m/s²): o embalo quase todo continua */
  coast: 1.5,
  turn: 3.2,
  fall: 1,
  /** distância entre centros vizinhos = overlap × (soma dos raios): as plataformas se sobrepõem um pouco */
  overlap: 0.75,
  /**
   * por nível (índice = nível): raio, curva mínima e máxima (graus) de uma plataforma para a outra,
   * chance de a curva trocar de lado (o resto segue para o mesmo lado e fecha a curva), chance de plataforma móvel
   */
  niveis: [
    null,
    { r: 1.0, minTurn: 0, maxTurn: 30, flip: 0.5, moving: 0 },
    { r: 0.6, minTurn: 45, maxTurn: 90, flip: 0.35, moving: 0 },
    { r: 0.6, minTurn: 45, maxTurn: 90, flip: 0.35, moving: 0.4 },
  ],
  /** deslize da móvel (±, de lado) e período; com ±0,8 da ficha ela quase nunca soltava das vizinhas */
  slide: 1.0,
  period: 3,
  /** domínio por nível (medido, ver a ficha): plataformas por tentativa e quedas por tentativa (menos que)  */
  dominio: [null, { plats: 80, falls: 2 }, { plats: 75, falls: 2 }, { plats: 35, falls: 5 }],
  maxTime: 30,
  dt: 1 / 30,
} as const;

export const CONTROLE_LOOK = 5;
export const CONTROLE_OBS = 2 + CONTROLE_LOOK * 7;
export const CONTROLE_ACTIONS = [3, 3] as const;
export type Nivel = 1 | 2 | 3;

export interface Plat {
  /** centro de base (sem deslize) */
  bx: number; bz: number; r: number;
  /** eixo do deslize (unitário) e fase; ax = az = 0 para fixa */
  ax: number; az: number; phase: number;
  /** posição e velocidade agora */
  x: number; z: number; vx: number; vz: number;
}

export type ControleEvent =
  | { type: 'step'; t: number; plat: number }
  | { type: 'fall'; t: number; x: number; z: number }
  | { type: 'back'; t: number; plat: number };

export class ControleDrill {
  readonly rng: Rng;
  t = 0;
  done = false;
  reward = 0;
  /** plataformas novas alcançadas (a primeira não conta) */
  hits = 0;
  falls = 0;
  /** índice da plataforma mais adiantada já pisada */
  best = 0;
  player = { x: 0, z: 0, h: 0, v: 0, phase: 0, fall: 0 };
  plats: Plat[];
  events: ControleEvent[] | null;

  constructor(seed: number, record = false, readonly nivel: Nivel = 1) {
    this.rng = new Rng(seed);
    this.events = record ? [] : null;
    const r = this.N.r, lim = CONTROLE.half - r, x = this.rng.range(-lim / 2, lim / 2), z = this.rng.range(-lim / 2, lim / 2);
    this.plats = [{ bx: x, bz: z, r, ax: 0, az: 0, phase: 0, x, z, vx: 0, vz: 0 }];
    this.head = this.rng.range(-Math.PI, Math.PI);
    this.sign = this.rng.next() < 0.5 ? -1 : 1;
    this.grow();
    this.place(0);
    const p1 = this.plats[1];
    this.player.h = Math.atan2(p1.z - this.player.z, p1.x - this.player.x);
  }

  private get N() { return CONTROLE.niveis[this.nivel]!; }
  private head: number;
  private sign: number;

  /** primeira plataforma ainda de pé (as que ficam mais de `behind` para trás afundam) */
  get first() { return Math.max(0, this.best - CONTROLE.behind); }

  /**
   * estende a trilha até `ahead` plataformas à frente da mais adiantada: curvas limitadas, dentro da área e
   * sem encostar nas plataformas de pé não vizinhas. Se encurralada, aceita qualquer curva; em último caso ignora a folga.
   */
  private grow() {
    const C = CONTROLE, N = this.N, rng = this.rng, P = this.plats, r = N.r, step = C.overlap * 2 * r, lim = C.half - r;
    /** menor distância entre o centro (x, z) e o trajeto do deslize de p */
    const gap = (p: Plat, x: number, z: number) => {
      const o = Math.max(-C.slide, Math.min(C.slide, (x - p.bx) * p.ax + (z - p.bz) * p.az));
      return Math.hypot(p.bx + p.ax * o - x, p.bz + p.az * o - z);
    };
    while (P.length <= this.best + C.ahead) {
      const k = P.length, prev = P[k - 1], prevMov = !!(prev.ax || prev.az);
      let mov = k > 1 && !prevMov && rng.next() < N.moving;
      for (let tries = 0; ; tries++) {
        if (tries === 60) mov = false; // a móvel não coube: vira fixa
        // em volta da móvel a trilha é quase reta, para ela soltar das duas vizinhas nas pontas do deslize
        const reta = mov || prevMov, free = tries >= 90 || (tries >= 30 && !reta);
        const mag = (free ? rng.range(0, 180) : reta ? rng.range(0, 20) : rng.range(N.minTurn, N.maxTurn)) * Math.PI / 180;
        const sg = free ? (rng.next() < 0.5 ? -1 : 1) : rng.next() < N.flip ? -this.sign : this.sign, nh = this.head + sg * mag;
        const nx = prev.bx + Math.cos(nh) * step, nz = prev.bz + Math.sin(nh) * step;
        const ax = mov ? -Math.sin(nh) : 0, az = mov ? Math.cos(nh) : 0, me = { bx: nx, bz: nz, ax, az } as Plat;
        if (Math.abs(nx) > lim || Math.abs(nz) > lim) continue;
        if (mov && (Math.abs(nx) + C.slide > lim + r || Math.abs(nz) + C.slide > lim + r)) continue;
        if (tries < 120 && P.slice(this.first, k - 1).some(p => Math.min(gap(p, nx, nz), gap(me, p.bx, p.bz)) < p.r + r + 0.05)) continue;
        // a móvel desliza de lado (perpendicular à chegada): nas pontas solta das vizinhas
        const p: Plat = { bx: nx, bz: nz, r, ax, az, phase: mov ? rng.range(0, 2 * Math.PI) : 0, x: nx, z: nz, vx: 0, vz: 0 };
        P.push(p); this.slide([p], this.t);
        this.head = nh; this.sign = sg;
        break;
      }
    }
  }

  private slide(P: Plat[], t: number) {
    const w = 2 * Math.PI / CONTROLE.period, A = CONTROLE.slide;
    for (const p of P) {
      if (!p.ax && !p.az) continue;
      const o = A * Math.sin(w * t + p.phase), v = A * w * Math.cos(w * t + p.phase);
      p.x = p.bx + p.ax * o; p.z = p.bz + p.az * o; p.vx = p.ax * v; p.vz = p.az * v;
    }
  }

  /** atleta parado no centro da plataforma i */
  private place(i: number) {
    const P = this.player, p = this.plats[i];
    P.x = p.x; P.z = p.z; P.v = 0; P.fall = 0;
  }

  /** índice da plataforma sob o atleta (a mais adiantada), ou -1 */
  under(): number {
    const P = this.player;
    for (let i = this.plats.length - 1; i >= this.first; i--) {
      const p = this.plats[i];
      if (Math.hypot(P.x - p.x, P.z - p.z) < p.r) return i;
    }
    return -1;
  }

  observe(out: Float32Array, off = 0) {
    const P = this.player, c = Math.cos(P.h), s = Math.sin(P.h), L = 6;
    out[off] = P.v / CONTROLE.speed; out[off + 1] = P.fall > 0 ? 1 : 0;
    for (let k = 0; k < CONTROLE_LOOK; k++) {
      const p = this.plats[this.best + k], o = off + 2 + k * 7;
      if (!p) { out.fill(0, o, o + 7); continue; }
      const dx = p.x - P.x, dz = p.z - P.z, f = dx * c + dz * s, l = -dx * s + dz * c, d = Math.hypot(f, l);
      out[o] = d > 1e-6 ? f / d : 1; out[o + 1] = d > 1e-6 ? l / d : 0; out[o + 2] = d / L;
      out[o + 3] = p.r;
      out[o + 4] = (p.vx * c + p.vz * s) / 2; out[o + 5] = (-p.vx * s + p.vz * c) / 2;
      out[o + 6] = p.ax || p.az ? 1 : 0;
    }
  }

  /** ações = [girar 0..2 (0 = esquerda), andar 0..2 (0 = ré, 2 = frente)] */
  step(turn: number, move: number) {
    this.reward = 0;
    if (this.done) return;
    const C = CONTROLE, dt = C.dt, P = this.player;
    const on = P.fall > 0 ? -1 : this.under(); // plataforma onde estava antes de mover
    this.slide(this.plats, this.t + dt);
    if (P.fall > 0) {
      P.fall -= dt;
      if (P.fall <= 0) { this.place(this.best); this.events?.push({ type: 'back', t: this.t, plat: this.best }); }
    } else {
      P.h += (turn - 1) * C.turn * dt;
      if (move === 2) P.v = Math.min(C.speed, P.v + (P.v < 0 ? C.brake : C.accel) * dt);
      else if (move === 0) P.v = Math.max(-C.back, P.v - (P.v > 0 ? C.brake : C.accel) * dt);
      else P.v = P.v > 0 ? Math.max(0, P.v - C.coast * dt) : Math.min(0, P.v + C.coast * dt);
      // a plataforma móvel carrega quem está em cima
      const carry = on >= 0 ? this.plats[on] : null;
      P.x += Math.cos(P.h) * P.v * dt + (carry ? carry.vx * dt : 0);
      P.z += Math.sin(P.h) * P.v * dt + (carry ? carry.vz * dt : 0);
      P.phase += Math.abs(P.v) * dt * 2.4;
      const i = this.under();
      if (i < 0) {
        P.fall = C.fall; P.v = 0; this.falls++;
        this.events?.push({ type: 'fall', t: this.t, x: P.x, z: P.z });
      } else if (i > this.best) {
        this.reward = i - this.best; this.hits += i - this.best; this.best = i;
        this.events?.push({ type: 'step', t: this.t, plat: i });
        this.grow();
      }
    }
    this.t += dt;
    if (this.t >= C.maxTime) this.done = true;
  }
}
