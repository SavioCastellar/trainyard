/**
 * Treino de Precisão: o atleta fica numa arena circular e precisa acertar alvos que
 * aparecem em lugares aleatórios, chutando bolas. Cada acerto vale +1; o alvo some e
 * reaparece em outro lugar. Não existe nenhuma outra recompensa: tudo o que o atleta
 * aprende vem de descobrir sozinho como acertar.
 *
 * Níveis (docs/atividades/precisao.md): 1 alvos fixos; 2 cada alvo fica aceso só 3 s e troca de
 * lugar (bola em alvo apagado não conta); 3 os alvos deslizam em trilhos circulares ao redor do centro.
 *
 * Movimento padrão (`movimento.ts`, docs/migracao-movimento.md): o atleta escolhe direção (16) e ritmo (3),
 * com embalo; parado, o corpo vira para a direção escolhida. Como 16 direções (22,5°) são grossas demais
 * para mirar, o chute tem ajuste fino: chutar com −10°, −5°, 0, +5° ou +10° em relação ao corpo.
 *
 * Observação (referencial do mundo, como as ações): chute pronto, velocidade e direção do corpo, centro;
 * para cada alvo: aceso, posição relativa, distância, quanto falta virar o corpo para ele (sen, cos),
 * tempo aceso restante (nível 2) e velocidade (nível 3); a direção de cada alvo "no idioma das ações"
 * (16 cada); e os 16 raios em volta do corpo (alvos acesos e borda).
 * Ações: [direção 0..15, ritmo 0..2, chute 0..5] (0 = não chuta; 1..5 = chuta com −10°, −5°, 0, +5°, +10°).
 */
import { Rng } from '../rng.js';
import { Corpo, novoCorpo, fisica, Fisica, moverCorpo, limitarCirculo, espelhar, ATLETA_FITA, ACOES_MOVIMENTO, AtributosMovimento, DIRECOES, direcaoComoAcao, difAngulo } from '../movimento.js';

export const PRECISION = {
  arenaR: 12,
  targets: 3,
  targetR: 0.7,
  playerR: 0.55,
  ballR: 0.32,
  kickSpeed: 15,
  /** ajuste fino do chute em relação à direção do corpo (rad): 5 opções de −10° a +10° */
  ajustes: [-10, -5, 0, 5, 10].map(g => (g * Math.PI) / 180),
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

/** 7 do atleta + 9 por alvo + 16 direções por alvo + 2 por raio */
export const PRECISION_OBS = 7 + PRECISION.targets * 9 + PRECISION.targets * DIRECOES + PRECISION.rays * 2;
export const PRECISION_ACTIONS = [...ACOES_MOVIMENTO, 6] as const;
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
  /** corpo do atleta (movimento padrão) e o mesmo estado no formato antigo, para as páginas */
  corpo: Corpo;
  readonly fis: Fisica;
  player = { x: 0, z: 0, h: 0, v: 0, u: 0, cd: 0, phase: 0, kickAnim: 0 };
  ball: { x: number; z: number; vx: number; vz: number; live: boolean } = { x: 0, z: 0, vx: 0, vz: 0, live: false };
  targets: Target[] = [];
  events: PrecisionEvent[] | null;
  /** recompensa do último passo */
  reward = 0;

  constructor(seed: number, record = false, readonly nivel: Nivel = 1, atributos: AtributosMovimento = ATLETA_FITA) {
    this.rng = new Rng(seed);
    this.events = record ? [] : null;
    this.fis = fisica(atributos);
    this.corpo = novoCorpo(0, 0, this.rng.next() * Math.PI * 2);
    espelhar(this.corpo, this.player);
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
    const C = this.corpo, R = PRECISION.arenaR, vm = this.fis.velMax, c = Math.cos(C.h), s = Math.sin(C.h);
    out[off] = this.player.cd <= 0 && !this.ball.live ? 1 : 0;
    out[off + 1] = C.vx / vm; out[off + 2] = C.vz / vm; out[off + 3] = c; out[off + 4] = s;
    out[off + 5] = -C.x / R; out[off + 6] = -C.z / R;
    const nt = PRECISION.targets, od = off + 7 + nt * 9;
    this.targets.forEach((t, k) => {
      const o = off + 7 + k * 9;
      if (t.off > 0) { out.fill(0, o, o + 9); direcaoComoAcao(out, od + k * DIRECOES, 0, 0, false); return; }
      const dx = t.x - C.x, dz = t.z - C.z, da = difAngulo(C.h, Math.atan2(dz, dx));
      out[o] = 1; out[o + 1] = dx / R; out[o + 2] = dz / R; out[o + 3] = Math.hypot(dx, dz) / R;
      // quanto falta virar o corpo para o alvo: é o que decide o ajuste fino do chute
      out[o + 4] = Math.sin(da); out[o + 5] = Math.cos(da);
      out[o + 6] = this.nivel === 2 ? t.on / PRECISION.lit : 1;
      out[o + 7] = -Math.sin(t.a) * t.dir; out[o + 8] = Math.cos(t.a) * t.dir; // velocidade / railSpeed
      direcaoComoAcao(out, od + k * DIRECOES, dx, dz);
    });
    const L = PRECISION.rayLen, o = od + nt * DIRECOES;
    for (let k = 0; k < PRECISION.rays; k++) {
      const a = C.h + (k * 2 * Math.PI) / PRECISION.rays, dx = Math.cos(a), dz = Math.sin(a);
      let best: number = L;
      for (const t of this.targets) {
        if (t.off > 0) continue;
        const mx = C.x - t.x, mz = C.z - t.z, b = mx * dx + mz * dz, cc = mx * mx + mz * mz - PRECISION.targetR ** 2;
        if (cc > 0 && b > 0) continue;
        const disc = b * b - cc;
        if (disc < 0) continue;
        best = Math.min(best, Math.max(0, -b - Math.sqrt(disc)));
      }
      const bw = C.x * dx + C.z * dz, cw = C.x * C.x + C.z * C.z - R * R;
      out[o + k * 2] = best < L ? 1 - best / L : 0;
      out[o + k * 2 + 1] = 1 - Math.min(L, -bw + Math.sqrt(Math.max(0, bw * bw - cw))) / L;
    }
  }

  /** ações = [direção 0..15, ritmo 0..2, chute 0..5] (0 = não chuta; 1..5 = ajuste fino de −10° a +10°) */
  step(direcao: number, ritmo: number, chute: number) {
    this.reward = 0;
    if (this.done) return;
    const dt = PRECISION.dt, P = this.player, B = this.ball, C = this.corpo;
    moverCorpo(C, this.fis, direcao, ritmo, dt);
    limitarCirculo(C, PRECISION.arenaR - PRECISION.playerR);
    espelhar(C, P);
    if (P.cd > 0) P.cd -= dt;
    if (P.kickAnim > 0) P.kickAnim -= dt;
    if (chute >= 1 && P.cd <= 0 && !B.live) {
      const h = C.h + PRECISION.ajustes[chute - 1], a = h + this.rng.gauss() * PRECISION.aimNoise;
      B.x = C.x + Math.cos(h) * (PRECISION.playerR + PRECISION.ballR);
      B.z = C.z + Math.sin(h) * (PRECISION.playerR + PRECISION.ballR);
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
