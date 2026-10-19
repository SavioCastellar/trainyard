/**
 * Laboratório de movimento: quadra com um ponto de cada vez. O atleta precisa alcançar o ponto;
 * ao alcançar, aparece outro. Serve para ver e ajustar o movimento padrão (`movimento.ts`) antes
 * de retreinar as atividades. Recompensa (quando for treinado): +1 por ponto.
 */
import { Rng } from '../rng.js';
import {
  Corpo, novoCorpo, fisica, Fisica, AtributosMovimento, moverCorpo, limitarRetangulo, enxerga,
  DT, ACOES_MOVIMENTO,
} from '../movimento.js';

export const LAB = {
  meiaLargura: 12,
  meiaProfundidade: 7,
  raioAtleta: 0.55,
  raioPonto: 0.6,
  distanciaMinima: 4,
  maxTime: 45,
  alcanceVisao: 30,
  dt: DT,
} as const;

export const LAB_OBS = 12;
export const LAB_ACOES = ACOES_MOVIMENTO;

export type LabEvento =
  | { type: 'ponto'; t: number; x: number; z: number }
  | { type: 'novo'; t: number; x: number; z: number };

export interface LabOpcoes { atributos?: AtributosMovimento; meiaAberturaVisao?: number }

export class LaboratorioMovimento {
  readonly rng: Rng;
  readonly fis: Fisica;
  readonly meiaAbertura: number;
  t = 0; done = false; reward = 0; pontos = 0;
  /** tempo (s) girando no lugar: quase parado e virando rápido */
  tempoGirando = 0;
  corpo: Corpo;
  alvo = { x: 0, z: 0 };
  /** última posição em que o alvo foi visto (memória curta para quando sai do cone) */
  memoria: { x: number; z: number; idade: number } | null = null;
  events: LabEvento[] | null;

  constructor(seed: number, record = false, op: LabOpcoes = {}) {
    this.rng = new Rng(seed);
    this.events = record ? [] : null;
    this.fis = fisica(op.atributos ?? { velocidade: 50, controle: 50 });
    this.meiaAbertura = op.meiaAberturaVisao ?? (75 * Math.PI) / 180;
    this.corpo = novoCorpo(0, 0, this.rng.next() * Math.PI * 2);
    this.novoAlvo();
  }

  private novoAlvo() {
    const c = this.corpo, L = LAB;
    for (let i = 0; i < 50; i++) {
      const x = this.rng.range(-L.meiaLargura + 1.5, L.meiaLargura - 1.5), z = this.rng.range(-L.meiaProfundidade + 1.2, L.meiaProfundidade - 1.2);
      if (Math.hypot(x - c.x, z - c.z) >= L.distanciaMinima) { this.alvo = { x, z }; break; }
    }
    this.events?.push({ type: 'novo', t: this.t, ...this.alvo });
  }

  ve() { return enxerga(this.corpo, this.alvo.x, this.alvo.z, this.meiaAbertura, LAB.alcanceVisao); }

  observe(out: Float32Array, off = 0) {
    const c = this.corpo, f = this.fis, ve = this.ve();
    out[off] = c.vx / f.velMax; out[off + 1] = c.vz / f.velMax;
    out[off + 2] = Math.cos(c.h); out[off + 3] = Math.sin(c.h);
    out[off + 4] = c.x / LAB.meiaLargura; out[off + 5] = c.z / LAB.meiaProfundidade;
    const m = ve ? { x: this.alvo.x, z: this.alvo.z, idade: 0 } : this.memoria;
    out[off + 6] = ve ? 1 : 0;
    out[off + 7] = m ? 1 : 0;
    out[off + 8] = m ? (m.x - c.x) / LAB.alcanceVisao : 0;
    out[off + 9] = m ? (m.z - c.z) / LAB.alcanceVisao : 0;
    out[off + 10] = m ? Math.min(1, m.idade / 3) : 1;
    out[off + 11] = 1 - this.t / LAB.maxTime;
  }

  /** ação = [direção 0..15, ritmo 0..2] */
  step(direcao: number, ritmo: number) {
    this.reward = 0;
    if (this.done) return;
    moverCorpo(this.corpo, this.fis, direcao, ritmo, DT);
    this.depois();
  }

  /**
   * Movimento ANTIGO (controles de tanque do Treino de Precisão), só para comparação:
   * girar 0..2 (esq/nada/dir) a 3,2 rad/s; andar 0..2 (ré/parado/frente) a 4,5 m/s.
   */
  stepAntigo(girar: number, andar: number) {
    this.reward = 0;
    if (this.done) return;
    const c = this.corpo, sp0 = Math.hypot(c.vx, c.vz);
    const vAtual = (c.vx * Math.cos(c.h) + c.vz * Math.sin(c.h)) || 0;
    c.w = (girar - 1) * 3.2; c.h += c.w * DT;
    const alvo = andar === 2 ? 4.5 : andar === 0 ? -2.25 : 0;
    const v = vAtual + (alvo - vAtual) * Math.min(1, DT * 6);
    c.vx = Math.cos(c.h) * v; c.vz = Math.sin(c.h) * v;
    c.x += c.vx * DT; c.z += c.vz * DT; c.passada += Math.abs(v) * DT;
    c.aFrente = (Math.abs(v) - sp0) / DT; c.aLado = 0;
    this.depois();
  }

  /** Visão ANTIGA: 16 raios finos; devolve o índice do raio que bate no alvo (0 = em frente) ou -1. */
  raioAntigo() {
    const c = this.corpo; let melhor = -1, dist = Infinity;
    for (let k = 0; k < 16; k++) {
      const a = c.h + (k * 2 * Math.PI) / 16, dx = Math.cos(a), dz = Math.sin(a);
      const mx = c.x - this.alvo.x, mz = c.z - this.alvo.z, b = mx * dx + mz * dz, cc = mx * mx + mz * mz - LAB.raioPonto ** 2;
      if (b > 0 && cc > 0) continue;
      const disc = b * b - cc; if (disc < 0) continue;
      const tt = -b - Math.sqrt(disc);
      if (tt < dist && tt < 16) { dist = tt; melhor = k; }
    }
    return melhor;
  }

  private depois() {
    const c = this.corpo;
    limitarRetangulo(c, LAB.meiaLargura, LAB.meiaProfundidade, LAB.raioAtleta);
    if (Math.hypot(c.vx, c.vz) < 0.5 && Math.abs(c.w) > 1.5) this.tempoGirando += DT;
    if (this.ve()) this.memoria = { x: this.alvo.x, z: this.alvo.z, idade: 0 };
    else if (this.memoria) this.memoria.idade += DT;
    if (Math.hypot(c.x - this.alvo.x, c.z - this.alvo.z) < LAB.raioPonto + LAB.raioAtleta * 0.5) {
      this.reward = 1; this.pontos++;
      this.events?.push({ type: 'ponto', t: this.t, ...this.alvo });
      this.memoria = null;
      this.novoAlvo();
    }
    this.t += DT;
    if (this.t >= LAB.maxTime) this.done = true;
  }
}
