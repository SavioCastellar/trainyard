/**
 * Trenó de carga (Força): o atleta empurra um trenó por uma pista de 15 com marcas a cada 3.
 * +1 por marca que o trenó cruza; na linha final o trenó volta ao início. Nenhuma outra recompensa.
 * O trenó só anda enquanto o atleta empurra (encostado e andando para a frente): a força vai pelo
 * ponto de contato, então empurrar fora do centro faz o trenó girar. Sair da largura da pista
 * devolve o trenó ao início, e as marcas já cruzadas nesta volta não contam de novo.
 * Nível 2: trenó pesado; parado, ele trava (atrito parado) e só sai do lugar com um arranque
 * (o atleta precisa chegar andando rápido). Nível 3: pesado e com rampa no meio; solto na subida,
 * escorrega para trás.
 * Medidas em docs/atividades/forca.md.
 *
 * Física: o atleta acelera até a velocidade pedida (força = 4·(velocidade alvo − velocidade));
 * o contato é um choque sem quique no ponto de contato (impulso com massa e giro do trenó).
 * O trenó tem atrito constante + arrasto proporcional à velocidade; a rampa puxa para trás.
 *
 * Observação: atleta (posição, direção, velocidade); trenó (posição, ângulo, velocidades, travado);
 * traseira e centro do trenó vistos pelo atleta (direção cos/sen + distância); ângulo do trenó em
 * relação ao atleta; contato (encostado, ponto na traseira); distância até a próxima marca; rampa.
 * Ações: girar (esq/nada/dir), andar (ré/parado/frente).
 */
import { Rng } from '../rng.js';

export const FORCA = {
  length: 15,
  halfWidth: 2,
  markEvery: 3,
  sledW: 1.2,
  sledH: 0.8,
  sledStart: 1.2,
  playerR: 0.55,
  speed: 4.5,
  back: 0.5,
  turn: 3.2,
  accel: 4,
  playerM: 1,
  /** rampa (nível 3): trecho [x0, x1] da pista, altura só visual */
  ramp: { x0: 5, x1: 10, h: 1 },
  /**
   * por nível (índice = nível): massa, atrito constante, arrasto (por velocidade), velocidade mínima que
   * um choque precisa dar ao trenó parado para destravar (0 = não trava), força da rampa (0 = sem rampa)
   */
  niveis: [
    null,
    { m: 1, fk: 3, c: 2, vBreak: 0, g: 0 },
    { m: 3, fk: 3.6, c: 8, vBreak: 0.7, g: 0 },
    { m: 3, fk: 3.6, c: 8, vBreak: 0.7, g: 7.2 },
  ],
  maxTime: 30,
  dt: 1 / 30,
} as const;

export const FORCA_OBS = 27;
export const FORCA_ACTIONS = [3, 3] as const;
export type Nivel = 1 | 2 | 3;

export type ForcaEvent =
  | { type: 'mark'; t: number; mark: number }
  | { type: 'deliver'; t: number }
  | { type: 'out'; t: number }
  | { type: 'break'; t: number }
  | { type: 'lock'; t: number };

const HW = FORCA.sledW / 2, HH = FORCA.sledH / 2;
const INERTIA = (FORCA.sledW ** 2 + FORCA.sledH ** 2) / 12;

export class ForcaDrill {
  readonly rng: Rng;
  t = 0;
  done = false;
  reward = 0;
  /** marcas cruzadas */
  hits = 0;
  /** entregas (trenó na linha final) */
  delivered = 0;
  /** saídas da pista */
  outs = 0;
  /** vezes que o trenó travou parado (níveis 2 e 3) */
  locks = 0;
  player = { x: 0, z: 0, h: 0, v: 0, phase: 0, push: false };
  sled = { x: 0, z: 0, a: 0, vx: 0, vz: 0, w: 0, locked: false };
  /** próxima marca (1..5); a 5ª é a linha final */
  next = 1;
  /** ponto de contato na traseira, no referencial do trenó (lx, lz), ou null */
  contact: { lx: number; lz: number } | null = null;
  events: ForcaEvent[] | null;

  constructor(seed: number, record = false, readonly nivel: Nivel = 1) {
    this.rng = new Rng(seed);
    this.events = record ? [] : null;
    this.reset();
  }

  private get N() { return FORCA.niveis[this.nivel]!; }
  onRamp(x = this.sled.x) { return this.N.g > 0 && x > FORCA.ramp.x0 && x < FORCA.ramp.x1; }

  /** trenó no início, travado se o nível trava; atleta num ponto qualquer em volta dele */
  private reset() {
    const S = this.sled, P = this.player, r = this.rng;
    Object.assign(S, { x: FORCA.sledStart, z: 0, a: 0, vx: 0, vz: 0, w: 0, locked: this.N.vBreak > 0 });
    const th = r.next() * Math.PI * 2, d = 2 + r.next();
    P.x = Math.max(-2.5, S.x + Math.cos(th) * d); P.z = Math.sin(th) * d; P.h = r.next() * Math.PI * 2 - Math.PI; P.v = 0;
    this.contact = null;
  }

  observe(out: Float32Array, off = 0) {
    const P = this.player, S = this.sled, c = Math.cos(P.h), s = Math.sin(P.h);
    const look = (o: number, dx: number, dz: number) => {
      const f = dx * c + dz * s, l = -dx * s + dz * c, d = Math.hypot(f, l);
      out[o] = d > 1e-6 ? f / d : 1; out[o + 1] = d > 1e-6 ? l / d : 0; out[o + 2] = d / 5;
    };
    const ca = Math.cos(S.a), sa = Math.sin(S.a);
    out[off] = P.x / FORCA.length; out[off + 1] = P.z / FORCA.halfWidth; out[off + 2] = c; out[off + 3] = s; out[off + 4] = P.v / FORCA.speed;
    out[off + 5] = S.x / FORCA.length; out[off + 6] = S.z / FORCA.halfWidth; out[off + 7] = ca; out[off + 8] = sa;
    out[off + 9] = (S.vx * c + S.vz * s) / 2.5; out[off + 10] = (-S.vx * s + S.vz * c) / 2.5; out[off + 11] = S.w / 3;
    out[off + 12] = S.locked ? 1 : 0;
    look(off + 13, S.x - ca * HW - P.x, S.z - sa * HW - P.z); // traseira
    look(off + 16, S.x - P.x, S.z - P.z); // centro
    out[off + 19] = Math.cos(S.a - P.h); out[off + 20] = Math.sin(S.a - P.h);
    const C = this.contact;
    out[off + 21] = C ? 1 : 0; out[off + 22] = C ? C.lx / HW : 0; out[off + 23] = C ? C.lz / HH : 0;
    out[off + 24] = (this.next * FORCA.markEvery - S.x) / FORCA.markEvery;
    out[off + 25] = this.onRamp() ? 1 : 0;
    out[off + 26] = this.N.g > 0 ? Math.min(1, Math.max(-1, (S.x - FORCA.ramp.x0) / (FORCA.ramp.x1 - FORCA.ramp.x0))) : -1;
  }

  /** ações = [girar 0..2, andar 0..2 (0 = ré, 2 = frente)] */
  step(turn: number, move: number) {
    this.reward = 0;
    if (this.done) return;
    const dt = FORCA.dt, P = this.player, S = this.sled, N = this.N;
    // atleta
    P.h += (turn - 1) * FORCA.turn * dt;
    if (P.h > Math.PI) P.h -= 2 * Math.PI; else if (P.h < -Math.PI) P.h += 2 * Math.PI;
    const want = move === 2 ? FORCA.speed : move === 0 ? -FORCA.speed * FORCA.back : 0;
    P.v += (want - P.v) * Math.min(1, FORCA.accel * dt);
    let vx = Math.cos(P.h) * P.v, vz = Math.sin(P.h) * P.v;
    P.x += vx * dt; P.z += vz * dt;
    P.push = false; this.contact = null;
    // contato atleta × trenó (círculo × retângulo girado)
    const ca = Math.cos(S.a), sa = Math.sin(S.a), dx = P.x - S.x, dz = P.z - S.z;
    const lx = dx * ca + dz * sa, lz = -dx * sa + dz * ca;
    const qx = Math.max(-HW, Math.min(HW, lx)), qz = Math.max(-HH, Math.min(HH, lz));
    let nlx = lx - qx, nlz = lz - qz, d = Math.hypot(nlx, nlz), pen = FORCA.playerR - d;
    if (pen > 0) {
      if (d > 1e-6) { nlx /= d; nlz /= d; }
      else if (HW - Math.abs(lx) < HH - Math.abs(lz)) { nlx = Math.sign(lx) || 1; nlz = 0; pen = FORCA.playerR + HW - Math.abs(lx); }
      else { nlx = 0; nlz = Math.sign(lz) || 1; pen = FORCA.playerR + HH - Math.abs(lz); }
      const nx = nlx * ca - nlz * sa, nz = nlx * sa + nlz * ca; // normal do trenó para o atleta
      const rx = qx * ca - qz * sa, rz = qx * sa + qz * ca; // ponto de contato a partir do centro
      if (qx <= -HW + 1e-6) this.contact = { lx: qx, lz: qz };
      P.x += nx * pen; P.z += nz * pen;
      // só empurra quem anda para a frente; parado ou de ré, o trenó apenas o afasta
      const vn = (vx - (S.vx - S.w * rz)) * nx + (vz - (S.vz + S.w * rx)) * nz;
      if (move === 2 && vn < 0) {
        const rn = rx * nz - rz * nx;
        const j = -vn / (1 / FORCA.playerM + 1 / N.m + (rn * rn) / (N.m * INERTIA));
        const svx = S.vx - (j * nx) / N.m, svz = S.vz - (j * nz) / N.m;
        if (S.locked && Math.hypot(svx, svz) < N.vBreak) {
          vx -= vn * nx; vz -= vn * nz; // trenó travado: é uma parede
        } else {
          if (S.locked) { S.locked = false; this.events?.push({ type: 'break', t: this.t }); }
          S.vx = svx; S.vz = svz; S.w -= (rn * j) / (N.m * INERTIA);
          vx += (j * nx) / FORCA.playerM; vz += (j * nz) / FORCA.playerM;
          P.push = true;
        }
        P.v = vx * Math.cos(P.h) + vz * Math.sin(P.h);
      }
    }
    P.x = Math.max(-3, Math.min(FORCA.length + 2, P.x)); P.z = Math.max(-3.5, Math.min(3.5, P.z));
    P.phase += Math.abs(P.v) * dt * 2.4;
    // trenó: rampa, atrito e arrasto
    if (!S.locked) {
      if (this.onRamp()) S.vx -= (N.g / N.m) * dt;
      const sp = Math.hypot(S.vx, S.vz), dv = ((N.fk + N.c * sp) / N.m) * dt;
      if (dv >= sp) { S.vx = 0; S.vz = 0; } else { S.vx *= 1 - dv / sp; S.vz *= 1 - dv / sp; }
      const dw = ((N.fk * 0.3 + N.c * 0.1 * Math.abs(S.w)) / (N.m * INERTIA)) * dt;
      S.w = Math.abs(S.w) <= dw ? 0 : S.w - Math.sign(S.w) * dw;
      S.x += S.vx * dt; S.z += S.vz * dt; S.a += S.w * dt;
      if (N.vBreak > 0 && !this.onRamp() && Math.hypot(S.vx, S.vz) < 0.05 && Math.abs(S.w) < 0.1) {
        Object.assign(S, { vx: 0, vz: 0, w: 0, locked: true }); this.locks++;
        this.events?.push({ type: 'lock', t: this.t });
      }
    }
    // marcas, linha final, saída da pista
    while (this.next <= 5 && S.x >= this.next * FORCA.markEvery) {
      this.hits++; this.reward += 1;
      this.events?.push({ type: 'mark', t: this.t, mark: this.next });
      this.next++;
    }
    // a saída devolve o trenó ao início sem zerar as marcas: as já cruzadas não pagam de novo
    if (this.next > 5) { this.delivered++; this.events?.push({ type: 'deliver', t: this.t }); this.reset(); this.next = 1; }
    else if (Math.abs(S.z) > FORCA.halfWidth || S.x < -1) { this.outs++; this.events?.push({ type: 'out', t: this.t }); this.reset(); }
    this.t += dt;
    if (this.t >= FORCA.maxTime) this.done = true;
  }
}
