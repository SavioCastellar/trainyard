/**
 * Treino de Precisão: três estações, uma por nível (pedido do Savio, 2026-10-20). Em todas, +1 por acerto e
 * nenhuma outra recompensa. Medidas em docs/atividades/precisao.md.
 *
 * 1 · Derrubar: 3 pilhas de garrafões espalhadas pelo campo. A máquina solta a bola perto do atleta (2 a 4 m);
 *     ele vai até ela, chuta e derruba a pilha; ela é montada de novo em outro lugar.
 * 2 · Minigols: 4 minigols na linha do fundo; só um vale por vez (luz acesa em cima), por pouco tempo. Uma
 *     máquina solta a bola num ponto sorteado: o atleta corre até ela e chuta no gol que vale. Com a bola no ar,
 *     o tempo do gol para (não troca de gol com a bola a caminho). Gol nos outros não vale.
 * 3 · Alvo deslizante: um alvo corre num trilho ao longo da parede, de uma ponta à outra. O atleta pega a bola
 *     com a mão e ARREMESSA (para não ser um treino só de futebol); é preciso mirar à frente do alvo.
 *
 * Lançar (chute ou arremesso) só quase parado e com o corpo virado para a direção escolhida.
 *
 * Nos níveis 2 e 3 o atleta não passa da linha de arremesso (a 6,5 m da parede).
 *
 * Movimento padrão (`movimento.ts`): direção (16) e ritmo (3); parado, o corpo vira para a direção escolhida.
 * O lançamento (chute ou arremesso) sai na direção escolhida com ajuste fino de −10°, −5°, 0, +5° ou +10°, desde
 * que o corpo esteja virado até 60° para ela (o corpo vira sozinho para a direção escolhida).
 *
 * Observação (referencial do mundo, como as ações): pode lançar agora, velocidade e direção do corpo, posição
 * no campo, qual estação (nível), se está com a bola na mão; a bola a buscar (posição relativa, distância e
 * direção "no idioma das ações"); para cada alvo (até 3): aceso, posição relativa ao ponto de onde a bola vai
 * sair, distância, quanto ele foge da direção de 22,5° mais perto (para o ajuste fino), se o corpo está virado
 * para ele (cos), tempo aceso restante, velocidade, e a direção dele "no idioma das ações". As pilhas vêm da mais
 * perto para a mais longe.
 * Ações: [direção 0..15, ritmo 0..2, lançar 0..5] (0 = não lança; 1..5 = lança com −10°, −5°, 0, +5°, +10°).
 */
import { Rng } from '../rng.js';
import { Corpo, novoCorpo, fisica, Fisica, moverCorpo, limitarRetangulo, espelhar, ATLETA_FITA, ACOES_MOVIMENTO, AtributosMovimento, DIRECOES, direcaoComoAcao, difAngulo, anguloDirecao, direcaoDoAngulo } from '../movimento.js';

export const PRECISION = {
  /** campo: x de −hx a hx, z de −hz (parede) a hz */
  hx: 10,
  hz: 8,
  playerR: 0.55,
  ballR: 0.25,
  /** ajuste fino do lançamento em relação à direção do corpo (rad) */
  ajustes: [-10, -5, 0, 5, 10].map(g => (g * Math.PI) / 180),
  aimNoise: 0.02,
  /** só lança se o corpo estiver a menos disto (rad) da direção escolhida: 60° */
  virado: Math.PI / 3,
  /** só lança quase parado (m/s): precisão é parar, mirar e lançar. Sem isso o atleta chutava na direção em que
   *  vinha correndo até a bola e nunca aprendia a mirar (teste de 5 min: 12% no alvo, igual ao acaso) */
  parado: 1.2,
  /** intervalo mínimo entre lançamentos */
  kickCd: 0.9,
  /** chute: velocidade e atrito da bola rolando (some ao parar abaixo de 1,5/s) */
  kickSpeed: 15,
  ballFriction: 0.55,
  /** nível 1: pilhas */
  pilhas: 3,
  pilhaR: 0.6,
  /** níveis 2 e 3: linha de arremesso (o atleta não passa de z = linha), área onde a bola aparece, alcance */
  linha: -1.5,
  bolaZ: [-0.5, 6] as const,
  bolaX: 7,
  /** nível 1: a bola cai a esta distância do atleta (perto, para o nível ser rápido) */
  bolaPerto: [1.2, 2.5] as const,
  alcance: 1.1,
  pegar: 0.8,
  respawn: 0.6,
  /** nível 2: minigols na linha do fundo (centros em x) e meia-boca (até a trave); tempo valendo e pausa até o
   *  próximo. Eram 6 painéis de 1,8 na parede: o atleta errava metade, um terço porque o painel apagava com a bola no ar */
  gols: [-6, -2, 2, 6],
  golMeio: 1.25,
  golFundo: 0.8,
  /** trave: a bola que passa a menos disto do poste bate e volta */
  trave: 0.1,
  lit: 4.0,
  dark: 0.35,
  /** nível 3: arremesso (velocidade da mão; soma o embalo do corpo) e alvo no trilho */
  throwSpeed: 13,
  alvoR: 0.75,
  trilho: 7.5,
  alvoVel: 2.4,
  maxTime: 30,
  dt: 1 / 30,
} as const;

export const PRECISION_ALVOS = 3;
/** 11 do atleta + 4 + 16 da bola a buscar + 9 por alvo + 16 direções por alvo */
export const PRECISION_OBS = 11 + 4 + DIRECOES + PRECISION_ALVOS * 9 + PRECISION_ALVOS * DIRECOES;
export const PRECISION_ACTIONS = [...ACOES_MOVIMENTO, 6] as const;
export type Nivel = 1 | 2 | 3;
/** domínio por nível, em acertos por tentativa (medido com os pilotos, ver a ficha); igual ao DOMINIO do ppo_drill.py */
export const PRECISION_DOMINIO: Record<Nivel, number> = { 1: 11, 2: 6, 3: 8 };

export type PrecisionEvent =
  | { type: 'kick'; t: number; x: number; z: number; h: number; mao: boolean }
  | { type: 'hit'; t: number; target: number; x: number; z: number }
  | { type: 'miss'; t: number; x: number; z: number; parede: boolean; gol?: number; trave?: boolean }
  | { type: 'spawn'; t: number; target: number; x: number; z: number }
  | { type: 'ball'; t: number; x: number; z: number }
  | { type: 'pick'; t: number }
  | { type: 'on'; t: number; target: number };

/** alvo genérico: pilha (nível 1), gol que vale (nível 2) ou alvo do trilho (nível 3) */
export interface Target { x: number; z: number; on: number; vx: number }

export class PrecisionDrill {
  readonly rng: Rng;
  t = 0;
  done = false;
  hits = 0;
  kicks = 0;
  reward = 0;
  corpo: Corpo;
  readonly fis: Fisica;
  player = { x: 0, z: 0, h: 0, v: 0, u: 0, cd: 0, phase: 0, kickAnim: 0 };
  /** bola em voo/rolando (live) */
  ball = { x: 0, z: 0, vx: 0, vz: 0, live: false, mao: false };
  /** bola a buscar (níveis 2 e 3): parada no chão; `espera` > 0 enquanto a máquina não solta a próxima */
  solta = { x: 0, z: 0, existe: false, espera: 0 };
  /** nível 3: o atleta está com a bola na mão */
  naMao = false;
  /** nível 1: as pilhas */
  pilhas: Target[] = [];
  /** nível 2: gol que vale (−1 = nenhum), tempo restante e pausa até o próximo */
  gol = -1;
  golOn = 0;
  golOff = 0;
  /** nível 3: posição e sentido do alvo no trilho */
  alvo = { x: 0, dir: 1 };
  events: PrecisionEvent[] | null;

  constructor(seed: number, record = false, readonly nivel: Nivel = 1, atributos: AtributosMovimento = ATLETA_FITA) {
    this.rng = new Rng(seed);
    this.events = record ? [] : null;
    this.fis = fisica(atributos);
    const P = PRECISION;
    if (nivel === 1) {
      this.corpo = novoCorpo(0, 0, this.rng.next() * Math.PI * 2);
      for (let i = 0; i < P.pilhas; i++) this.pilhas.push(this.novaPilha(i));
      this.soltarBola();
    } else {
      // começa atrás da linha, de frente para a parede
      this.corpo = novoCorpo(this.rng.range(-4, 4), this.rng.range(3, 6), -Math.PI / 2);
      this.soltarBola();
      if (nivel === 2) this.acender();
      else { this.alvo.x = this.rng.range(-P.trilho, P.trilho); this.alvo.dir = this.rng.next() < 0.5 ? -1 : 1; }
    }
    espelhar(this.corpo, this.player);
  }

  private novaPilha(i: number): Target {
    const P = PRECISION, C = this.corpo;
    for (let tries = 0; tries < 60; tries++) {
      const x = this.rng.range(-P.hx + 1.5, P.hx - 1.5), z = this.rng.range(-P.hz + 1.5, P.hz - 1.5);
      if (Math.hypot(x - C.x, z - C.z) < 3.5) continue;
      if (this.pilhas.some((t, k) => k !== i && Math.hypot(t.x - x, t.z - z) < 2.5)) continue;
      this.events?.push({ type: 'spawn', t: this.t, target: i, x, z });
      return { x, z, on: Infinity, vx: 0 };
    }
    return { x: 6, z: 0, on: Infinity, vx: 0 };
  }

  /** a máquina solta uma bola parada num ponto sorteado (longe do atleta) */
  private soltarBola() {
    const P = PRECISION, C = this.corpo, S = this.solta;
    for (let tries = 0; tries < 60; tries++) {
      let x: number, z: number;
      if (this.nivel === 1) {
        // perto do atleta, dentro do campo e fora das pilhas
        const a = this.rng.range(-Math.PI, Math.PI), d = this.rng.range(P.bolaPerto[0], P.bolaPerto[1]);
        x = C.x + Math.cos(a) * d; z = C.z + Math.sin(a) * d;
        if (tries < 50 && (Math.abs(x) > P.hx - 1 || Math.abs(z) > P.hz - 1 || this.pilhas.some(t => Math.hypot(t.x - x, t.z - z) < 1.6))) continue;
        x = Math.max(-P.hx + 1, Math.min(P.hx - 1, x)); z = Math.max(-P.hz + 1, Math.min(P.hz - 1, z));
      } else {
        x = this.rng.range(-P.bolaX, P.bolaX); z = this.rng.range(P.bolaZ[0], P.bolaZ[1]);
        if (tries < 50 && Math.hypot(x - C.x, z - C.z) < 2.5) continue;
      }
      S.x = x; S.z = z; break;
    }
    S.existe = true; S.espera = 0;
    this.events?.push({ type: 'ball', t: this.t, x: S.x, z: S.z });
  }

  private acender() {
    const n = PRECISION.gols.length;
    let k = this.rng.int(n - (this.gol >= 0 ? 1 : 0));
    if (this.gol >= 0 && k >= this.gol) k++;
    this.gol = k; this.golOn = PRECISION.lit; this.golOff = 0;
    this.events?.push({ type: 'on', t: this.t, target: k });
  }

  /** alvos como o atleta os vê (até 3): pilhas, o gol que vale ou o alvo do trilho */
  alvos(): Target[] {
    const P = PRECISION;
    // pilhas da mais perto para a mais longe (de onde a bola vai sair): o primeiro alvo é sempre o mais fácil
    if (this.nivel === 1) { const O = this.origem(); return [...this.pilhas].sort((p, q) => Math.hypot(p.x - O.x, p.z - O.z) - Math.hypot(q.x - O.x, q.z - O.z)); }
    if (this.nivel === 2) return this.gol >= 0 && this.golOn > 0 ? [{ x: P.gols[this.gol], z: -P.hz + P.golFundo, on: this.golOn, vx: 0 }] : [];
    return [{ x: this.alvo.x, z: -P.hz, on: Infinity, vx: this.alvo.dir * P.alvoVel }];
  }

  /** de onde a bola vai sair: a bola no chão (níveis 1 e 2) ou a mão (nível 3) */
  origem() {
    const C = this.corpo;
    return this.nivel < 3 && this.solta.existe ? { x: this.solta.x, z: this.solta.z } : { x: C.x, z: C.z };
  }

  /** pode lançar agora? */
  pronto() {
    const C = this.corpo, P = this.player, B = this.ball, S = this.solta;
    if (B.live) return false;
    if (this.nivel < 3) return P.cd <= 0 && S.existe && Math.hypot(S.x - C.x, S.z - C.z) < PRECISION.alcance;
    return this.naMao;
  }

  observe(out: Float32Array, off = 0) {
    const P = PRECISION, C = this.corpo, R = 10, vm = this.fis.velMax, S = this.solta;
    out[off] = this.pronto() ? 1 : 0;
    out[off + 1] = C.vx / vm; out[off + 2] = C.vz / vm; out[off + 3] = Math.cos(C.h); out[off + 4] = Math.sin(C.h);
    out[off + 5] = C.x / P.hx; out[off + 6] = C.z / P.hz;
    out[off + 7] = this.nivel === 1 ? 1 : 0; out[off + 8] = this.nivel === 2 ? 1 : 0; out[off + 9] = this.nivel === 3 ? 1 : 0;
    out[off + 10] = this.naMao ? 1 : 0;
    // bola a buscar
    const b = off + 11, buscar = S.existe && !this.naMao;
    out[b] = buscar ? 1 : 0;
    out[b + 1] = buscar ? (S.x - C.x) / R : 0; out[b + 2] = buscar ? (S.z - C.z) / R : 0; out[b + 3] = buscar ? Math.hypot(S.x - C.x, S.z - C.z) / R : 0;
    direcaoComoAcao(out, b + 4, S.x - C.x, S.z - C.z, buscar);
    // alvos, vistos de onde a bola vai sair
    const A = this.alvos(), o0 = b + 4 + DIRECOES, od = o0 + PRECISION_ALVOS * 9, O = this.origem();
    for (let k = 0; k < PRECISION_ALVOS; k++) {
      const t = A[k], o = o0 + k * 9;
      if (!t) { out.fill(0, o, o + 9); direcaoComoAcao(out, od + k * DIRECOES, 0, 0, false); continue; }
      const dx = t.x - O.x, dz = t.z - O.z, at = Math.atan2(dz, dx), da = difAngulo(C.h, at);
      // quanto o alvo foge da direção (de 22,5°) mais perto dele: é o que o ajuste fino corrige
      const res = difAngulo(anguloDirecao(direcaoDoAngulo(at)), at);
      out[o] = 1; out[o + 1] = dx / R; out[o + 2] = dz / R; out[o + 3] = Math.hypot(dx, dz) / R;
      out[o + 4] = res / (Math.PI / DIRECOES); out[o + 5] = Math.cos(da);
      out[o + 6] = Number.isFinite(t.on) ? t.on / P.lit : 1;
      out[o + 7] = t.vx / P.alvoVel; out[o + 8] = 0;
      direcaoComoAcao(out, od + k * DIRECOES, dx, dz);
    }
  }

  /** ações = [direção 0..15, ritmo 0..2, lançar 0..5] (0 = não lança; 1..5 = ajuste fino de −10° a +10°) */
  step(direcao: number, ritmo: number, lancar: number) {
    this.reward = 0;
    if (this.done) return;
    const P = PRECISION, dt = P.dt, Pl = this.player, B = this.ball, C = this.corpo, S = this.solta;
    moverCorpo(C, this.fis, direcao, ritmo, dt);
    limitarRetangulo(C, P.hx, P.hz, P.playerR);
    if (this.nivel > 1 && C.z < P.linha) { C.z = P.linha; C.vz = Math.max(0, C.vz); }
    espelhar(C, Pl);
    if (Pl.cd > 0) Pl.cd -= dt;
    if (Pl.kickAnim > 0) Pl.kickAnim -= dt;
    // nível 3: pega a bola encostando nela
    if (this.nivel === 3 && S.existe && !this.naMao && Math.hypot(S.x - C.x, S.z - C.z) < P.pegar) {
      this.naMao = true; S.existe = false; this.events?.push({ type: 'pick', t: this.t });
    }
    // lança na direção escolhida (+ ajuste fino), desde que o corpo já esteja mais ou menos virado para ela
    const dirLanc = anguloDirecao(direcao);
    if (lancar >= 1 && this.pronto() && Math.abs(difAngulo(C.h, dirLanc)) < P.virado && Math.hypot(C.vx, C.vz) < P.parado) {
      const h = dirLanc + P.ajustes[lancar - 1], a = h + this.rng.gauss() * P.aimNoise;
      if (this.nivel === 3) {
        // arremesso: sai da mão, com o embalo do corpo
        B.x = C.x + Math.cos(h) * 0.5; B.z = C.z + Math.sin(h) * 0.5;
        B.vx = Math.cos(a) * P.throwSpeed + C.vx; B.vz = Math.sin(a) * P.throwSpeed + C.vz; B.mao = true;
        this.naMao = false;
      } else {
        const O = this.origem();
        B.x = O.x; B.z = O.z;
        B.vx = Math.cos(a) * P.kickSpeed; B.vz = Math.sin(a) * P.kickSpeed; B.mao = false;
        S.existe = false;
      }
      B.live = true; Pl.cd = P.kickCd; Pl.kickAnim = 0.25; this.kicks++;
      this.events?.push({ type: 'kick', t: this.t, x: B.x, z: B.z, h: a, mao: B.mao });
    }
    if (B.live) this.voar();
    // máquina de bolas: solta a próxima logo depois do lançamento, para o atleta já ir buscar
    if (!S.existe && !this.naMao) {
      S.espera += dt;
      if (S.espera >= P.respawn) this.soltarBola();
    }
    // gols (nível 2; o tempo para com a bola no ar) e alvo do trilho (nível 3)
    if (this.nivel === 2) {
      if (this.golOn > 0) { if (!B.live) this.golOn -= dt; if (this.golOn <= 0) this.golOff = P.dark; }
      else if ((this.golOff -= dt) <= 0) this.acender();
    } else if (this.nivel === 3) {
      const A = this.alvo; A.x += A.dir * P.alvoVel * dt;
      if (A.x > P.trilho) { A.x = 2 * P.trilho - A.x; A.dir = -1; } else if (A.x < -P.trilho) { A.x = -2 * P.trilho - A.x; A.dir = 1; }
    }
    this.t += dt;
    if (this.t >= P.maxTime) this.done = true;
  }

  /** bola em movimento: rola com atrito (chute) ou voa reto (arremesso); acerta pilha, gol ou alvo do trilho */
  private voar() {
    const P = PRECISION, dt = P.dt, B = this.ball;
    if (!B.mao) { const f = Math.exp(-P.ballFriction * dt); B.vx *= f; B.vz *= f; }
    const sub = 3;
    for (let s = 0; s < sub && B.live; s++) {
      B.x += (B.vx * dt) / sub; B.z += (B.vz * dt) / sub;
      if (this.nivel === 1) {
        for (let i = 0; i < this.pilhas.length; i++) {
          const t = this.pilhas[i];
          if (Math.hypot(B.x - t.x, B.z - t.z) < P.pilhaR + P.ballR) {
            this.acerto(i, t.x, t.z); this.pilhas[i] = this.novaPilha(i); return;
          }
        }
      }
      if (this.nivel === 2 && B.z <= -P.hz + P.golFundo + P.ballR) {
        // chegou na linha dos minigols: na trave volta; dentro do gol que vale é gol; nos outros bate na rede e não vale
        const zg = -P.hz + P.golFundo;
        for (let k = 0; k < P.gols.length; k++) {
          const dx = Math.abs(B.x - P.gols[k]);
          if (Math.abs(dx - P.golMeio) < P.trave) { B.live = false; this.events?.push({ type: 'miss', t: this.t, x: B.x, z: zg, parede: false, gol: k, trave: true }); return; }
          if (dx < P.golMeio - P.trave) {
            if (k === this.gol && this.golOn > 0) { this.acerto(k, P.gols[k], zg); this.golOn = 0; this.golOff = P.dark; return; }
            B.live = false; this.events?.push({ type: 'miss', t: this.t, x: B.x, z: zg, parede: false, gol: k }); return;
          }
        }
      }
      if (B.z <= -P.hz + P.ballR) {
        // chegou na parede
        B.z = -P.hz + P.ballR;
        if (this.nivel === 3 && Math.abs(B.x - this.alvo.x) < P.alvoR + P.ballR) { this.acerto(0, this.alvo.x, -P.hz); return; }
        B.live = false; this.events?.push({ type: 'miss', t: this.t, x: B.x, z: B.z, parede: true }); return;
      }
    }
    if (B.live && (Math.abs(B.x) > P.hx + 1 || Math.abs(B.z) > P.hz + 1 || (!B.mao && Math.hypot(B.vx, B.vz) < 1.5))) {
      B.live = false; this.events?.push({ type: 'miss', t: this.t, x: B.x, z: B.z, parede: false });
    }
  }

  private acerto(target: number, x: number, z: number) {
    this.reward += 1; this.hits++; this.ball.live = false;
    this.events?.push({ type: 'hit', t: this.t, target, x, z });
  }
}
