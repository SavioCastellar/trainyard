/**
 * Bandeja (Controle): o atleta leva uma bandeja com uma bola em cima por um circuito sem fim de marcas no
 * chão. A bandeja é um pouco côncava: a bola fica no meio quando o atleta anda constante, mas toda
 * arrancada, freada ou curva empurra a bola para o lado contrário (como num ônibus). Se ela passa da
 * beira, cai: o atleta fica 1,5 s parado pegando outra. +1 por marca alcançada com a bola; nenhuma
 * outra recompensa. Medidas em docs/atividades/controle.md.
 *
 * O que dá forma ao atributo Controle: aceleração, frenagem e curva do movimento padrão (`movimento.ts`)
 * são exatamente o que empurra a bola. Mais controle = arranca e freia mais forte, mas também consegue
 * fazer curva mais fechada sem passar do ponto.
 *
 * Níveis: 1 bandeja funda, curvas suaves; 2 bandeja rasa, curvas fechadas; 3 como o 2 com lombadas
 * no caminho (passar rápido por cima faz a bola pular).
 *
 * Observação (referencial do mundo, como as ações): velocidade e direção do corpo, bola na bandeja
 * (posição e velocidade), empurrão que a bola está sentindo agora, parado; as 3 próximas marcas
 * (posição relativa) e se há lombada antes delas (e onde); a direção da próxima e da seguinte "no idioma
 * das ações". Ações: [direção 0..15, ritmo 0..2].
 */
import { Rng } from '../rng.js';
import { Corpo, novoCorpo, fisica, Fisica, moverCorpo, limitarRetangulo, espelhar, ATLETA_FITA, ACOES_MOVIMENTO, AtributosMovimento, DIRECOES, direcaoComoAcao } from '../movimento.js';

export const BANDEJA = {
  /** metade do lado da área das marcas; o atleta fica preso numa área um pouco maior */
  half: 9,
  wall: 12,
  playerR: 0.55,
  /** raio da marca: chegou quando o centro do atleta entra nela */
  markR: 0.7,
  /** sempre `ahead` marcas à frente */
  ahead: 4,
  /** raio útil da bandeja (até a bola cair) */
  trayR: 0.3,
  ballR: 0.07,
  /** bola rolando sente 5/7 da aceleração (rolamento) */
  roll: 5 / 7,
  /**
   * por nível (índice = nível): distância entre marcas, curva mínima e máxima (graus) de uma para a outra,
   * chance de a curva trocar de lado, w = quão funda é a bandeja (frequência do vai e vem, rad/s),
   * c = atrito da bola, lombada = chance de uma lombada entre duas marcas
   */
  niveis: [
    null,
    { minD: 3.5, maxD: 5, minTurn: 0, maxTurn: 35, flip: 0.5, w: 6, c: 3, lombada: 0 },
    { minD: 2.8, maxD: 4.2, minTurn: 50, maxTurn: 110, flip: 0.4, w: 5, c: 3, lombada: 0 },
    { minD: 4, maxD: 6, minTurn: 20, maxTurn: 80, flip: 0.4, w: 5, c: 3, lombada: 0.7 },
  ],
  /** lombada: largura (atravessada no caminho), espessura e quanto a bola pula por (m/s)² de velocidade */
  bumpW: 2.4,
  bumpD: 0.35,
  bumpKick: 0.12,
  /** tempo parado depois de derrubar a bola */
  drop: 1.5,
  maxTime: 30,
  dt: 1 / 30,
} as const;

export const BANDEJA_LOOK = 3;
/** 11 do atleta e da bola + 5 por marca vista + 2 × 16 direções (próxima marca e a seguinte) */
export const BANDEJA_OBS = 11 + BANDEJA_LOOK * 5 + 2 * DIRECOES;
export const BANDEJA_ACTIONS = ACOES_MOVIMENTO;
export type Nivel = 1 | 2 | 3;

export interface Marca {
  x: number; z: number;
  /** lombada no caminho da marca anterior até esta (centro e direção do caminho), ou null */
  lomb: { x: number; z: number; ux: number; uz: number } | null;
}

export type BandejaEvent =
  | { type: 'mark'; t: number; mark: number }
  | { type: 'drop'; t: number; x: number; z: number; vx: number; vz: number; bx: number; bz: number }
  | { type: 'bump'; t: number; kick: number }
  | { type: 'ball'; t: number };

export class BandejaDrill {
  readonly rng: Rng;
  /** sorteio do pulo da bola na lombada, separado: o circuito é o mesmo para a mesma semente, faça o atleta o que fizer */
  private readonly rngPulo: Rng;
  t = 0;
  done = false;
  reward = 0;
  /** marcas alcançadas com a bola */
  hits = 0;
  drops = 0;
  /** índice da próxima marca */
  next = 1;
  corpo: Corpo;
  readonly fis: Fisica;
  player = { x: 0, z: 0, h: 0, v: 0, u: 0, phase: 0, frozen: 0 };
  /** bola na bandeja: posição e velocidade relativas ao centro da bandeja (referencial do mundo) */
  ball = { x: 0, z: 0, vx: 0, vz: 0 };
  /** empurrão sentido pela bola no último passo (m/s²) */
  push = { x: 0, z: 0 };
  marks: Marca[];
  events: BandejaEvent[] | null;
  private head: number;
  private sign: number;
  private onBump = -1;

  constructor(seed: number, record = false, readonly nivel: Nivel = 1, atributos: AtributosMovimento = ATLETA_FITA) {
    this.rng = new Rng(seed);
    this.rngPulo = new Rng(seed ^ 0x5bd1e995);
    this.events = record ? [] : null;
    this.fis = fisica(atributos);
    const lim = BANDEJA.half / 2, x = this.rng.range(-lim, lim), z = this.rng.range(-lim, lim);
    this.head = this.rng.range(-Math.PI, Math.PI);
    this.sign = this.rng.next() < 0.5 ? -1 : 1;
    this.marks = [{ x, z, lomb: null }];
    this.grow();
    const m1 = this.marks[1];
    this.corpo = novoCorpo(x, z, Math.atan2(m1.z - z, m1.x - x));
    espelhar(this.corpo, this.player);
  }

  private get N() { return BANDEJA.niveis[this.nivel]!; }

  /** estende o circuito: curvas limitadas pelo nível, dentro da área; encurralado, aceita qualquer curva */
  private grow() {
    const B = BANDEJA, N = this.N, rng = this.rng, M = this.marks;
    while (M.length <= this.next + B.ahead) {
      const prev = M[M.length - 1];
      for (let tries = 0; ; tries++) {
        const free = tries >= 40;
        const mag = (free ? rng.range(0, 180) : rng.range(N.minTurn, N.maxTurn)) * Math.PI / 180;
        const sg = free ? (rng.next() < 0.5 ? -1 : 1) : rng.next() < N.flip ? -this.sign : this.sign;
        const nh = this.head + sg * mag, d = rng.range(N.minD, N.maxD);
        const nx = prev.x + Math.cos(nh) * d, nz = prev.z + Math.sin(nh) * d;
        if (Math.abs(nx) > B.half || Math.abs(nz) > B.half) continue;
        // marca nova não cai em cima das últimas
        if (M.slice(-4, -1).some(m => Math.hypot(m.x - nx, m.z - nz) < 2 * B.markR + 0.6)) continue;
        let lomb: Marca['lomb'] = null;
        if (N.lombada > 0 && M.length > 1 && rng.next() < N.lombada) {
          const f = rng.range(0.4, 0.6);
          lomb = { x: prev.x + (nx - prev.x) * f, z: prev.z + (nz - prev.z) * f, ux: Math.cos(nh), uz: Math.sin(nh) };
        }
        M.push({ x: nx, z: nz, lomb });
        this.head = nh; this.sign = sg;
        break;
      }
    }
  }

  /** índice da lombada (marca dona) sob o atleta, ou -1 */
  private bumpUnder() {
    const C = this.corpo, B = BANDEJA;
    for (let i = Math.max(1, this.next - 1); i <= this.next; i++) {
      const L = this.marks[i]?.lomb; if (!L) continue;
      const dx = C.x - L.x, dz = C.z - L.z, along = dx * L.ux + dz * L.uz, side = -dx * L.uz + dz * L.ux;
      if (Math.abs(along) < B.bumpD / 2 + 0.05 && Math.abs(side) < B.bumpW / 2) return i;
    }
    return -1;
  }

  observe(out: Float32Array, off = 0) {
    const C = this.corpo, vm = this.fis.velMax, B = BANDEJA, b = this.ball, L = 6;
    out[off] = C.vx / vm; out[off + 1] = C.vz / vm; out[off + 2] = Math.cos(C.h); out[off + 3] = Math.sin(C.h);
    out[off + 4] = b.x / B.trayR; out[off + 5] = b.z / B.trayR; out[off + 6] = b.vx / 2; out[off + 7] = b.vz / 2;
    out[off + 8] = this.push.x / 10; out[off + 9] = this.push.z / 10; out[off + 10] = this.player.frozen > 0 ? 1 : 0;
    for (let k = 0; k < BANDEJA_LOOK; k++) {
      const m = this.marks[this.next + k], o = off + 11 + k * 5;
      out[o] = (m.x - C.x) / L; out[o + 1] = (m.z - C.z) / L;
      out[o + 2] = m.lomb ? 1 : 0; out[o + 3] = m.lomb ? (m.lomb.x - C.x) / L : 0; out[o + 4] = m.lomb ? (m.lomb.z - C.z) / L : 0;
    }
    const d = off + 11 + BANDEJA_LOOK * 5, m0 = this.marks[this.next], m1 = this.marks[this.next + 1];
    direcaoComoAcao(out, d, m0.x - C.x, m0.z - C.z);
    direcaoComoAcao(out, d + DIRECOES, m1.x - m0.x, m1.z - m0.z);
  }

  /** ações = [direção 0..15, ritmo 0..2] */
  step(direcao: number, ritmo: number) {
    this.reward = 0;
    if (this.done) return;
    const B = BANDEJA, N = this.N, dt = B.dt, P = this.player, C = this.corpo, b = this.ball;
    if (P.frozen > 0) {
      P.frozen -= dt; C.vx = C.vz = 0; C.w = C.aFrente = C.aLado = 0;
      if (P.frozen <= 0) { b.x = b.z = b.vx = b.vz = 0; this.events?.push({ type: 'ball', t: this.t }); }
      this.push.x = this.push.z = 0;
    } else {
      const vx0 = C.vx, vz0 = C.vz;
      moverCorpo(C, this.fis, direcao, ritmo, dt);
      limitarRetangulo(C, B.wall, B.wall, B.playerR);
      // a bola sente a aceleração do corpo ao contrário (e só 5/7, rolando)
      const ax = (C.vx - vx0) / dt, az = (C.vz - vz0) / dt;
      this.push.x = -B.roll * ax; this.push.z = -B.roll * az;
      // lombada: ao subir nela, a bola pula proporcional à velocidade ao quadrado, para a frente e um pouco de lado
      const bu = this.bumpUnder();
      if (bu >= 0 && bu !== this.onBump) {
        const sp2 = C.vx * C.vx + C.vz * C.vz, k = B.bumpKick * sp2, sp = Math.sqrt(sp2) || 1;
        const lado = this.rngPulo.range(-0.6, 0.6);
        b.vx += k * (C.vx / sp - lado * C.vz / sp); b.vz += k * (C.vz / sp + lado * C.vx / sp);
        this.events?.push({ type: 'bump', t: this.t, kick: k });
      }
      this.onBump = bu;
      const w2 = N.w * N.w;
      b.vx += (this.push.x - w2 * b.x - N.c * b.vx) * dt; b.vz += (this.push.z - w2 * b.z - N.c * b.vz) * dt;
      b.x += b.vx * dt; b.z += b.vz * dt;
      if (Math.hypot(b.x, b.z) > B.trayR) {
        this.drops++; P.frozen = B.drop;
        this.events?.push({ type: 'drop', t: this.t, x: C.x, z: C.z, vx: C.vx + b.vx, vz: C.vz + b.vz, bx: b.x, bz: b.z });
        C.vx = C.vz = 0;
      } else {
        const m = this.marks[this.next];
        if (Math.hypot(C.x - m.x, C.z - m.z) < B.markR) {
          this.reward = 1; this.hits++;
          this.events?.push({ type: 'mark', t: this.t, mark: this.next });
          this.next++; this.grow();
        }
      }
    }
    espelhar(C, P);
    this.t += dt;
    if (this.t >= B.maxTime) this.done = true;
  }
}
