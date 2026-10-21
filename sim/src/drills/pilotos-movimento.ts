/**
 * Pilotos escritos à mão para o Laboratório de movimento. NÃO são cérebros treinados: servem para
 * ver o movimento antes de retreinar. `habilidade` (0–1) mistura decisões ao acaso, imitando um
 * cérebro no começo (0) ou no fim (1) do treino.
 */
import { Rng } from '../rng.js';
import { DIRECOES, RITMOS, direcaoDoAngulo, difAngulo } from '../movimento.js';
import { LaboratorioMovimento } from './laboratorio-movimento.js';
import { PainelDrill, PAINEL } from './painel.js';
import { BandejaDrill, BANDEJA } from './bandeja.js';
import { PrecisionDrill, PRECISION } from './precision.js';

/** Movimento novo: vai na direção do alvo visto (ou lembrado); sem informação, procura virando. */
export function pilotoNovo(lab: LaboratorioMovimento, rng: Rng, habilidade: number, out: number[]) {
  if (rng.next() > habilidade) { out[0] = rng.int(DIRECOES); out[1] = rng.int(RITMOS); return; }
  const c = lab.corpo;
  const m = lab.ve() ? lab.alvo : lab.memoria;
  if (m) {
    out[0] = direcaoDoAngulo(Math.atan2(m.z - c.z, m.x - c.x));
    out[1] = 2;
    return;
  }
  const dCentro = Math.hypot(c.x, c.z);
  if (dCentro > 4) { out[0] = direcaoDoAngulo(Math.atan2(-c.z, -c.x)); out[1] = 1; }
  else { out[0] = direcaoDoAngulo(c.h + (Math.PI * 3) / 4); out[1] = 0; }
}

/** Movimento antigo: só "vê" pelos 16 raios; se nenhum raio pega o alvo, gira procurando. */
export function pilotoAntigo(lab: LaboratorioMovimento, rng: Rng, habilidade: number, out: number[]) {
  if (rng.next() > habilidade) { out[0] = rng.int(3); out[1] = rng.int(3); return; }
  const k = lab.raioAntigo();
  if (k < 0) { out[0] = 2; out[1] = 1; return; }            // gira parado procurando
  const ang = difAngulo(0, (k * 2 * Math.PI) / 16);
  if (Math.abs(ang) < 0.2) { out[0] = 1; out[1] = 2; }      // alvo em frente: corre
  else { out[0] = ang > 0 ? 2 : 0; out[1] = Math.abs(ang) < 0.8 ? 2 : 1; }
}

/** Painel (Velocidade): corre para a verde desviando das vermelhas; sem luz, volta ao centro. */
export function pilotoPainel(e: PainelDrill, rng: Rng, habilidade: number, out: number[]) {
  if (rng.next() > habilidade) { out[0] = rng.int(DIRECOES); out[1] = rng.int(RITMOS); return; }
  const c = e.corpo, lit = e.green >= 0 && e.state[e.green] === 1;
  if (!lit) {
    const d = Math.hypot(c.x, c.z);
    out[0] = direcaoDoAngulo(Math.atan2(-c.z, -c.x)); out[1] = d > 1.2 ? 1 : 0;
    return;
  }
  const g = PAINEL.pads[e.green];
  let ang = Math.atan2(g.z - c.z, g.x - c.x);
  const dist = Math.hypot(g.x - c.x, g.z - c.z);
  // vermelha perto da reta até a verde: desvia para o lado oposto a ela
  for (const r of e.redPads) {
    const q = PAINEL.pads[r], qx = q.x - c.x, qz = q.z - c.z, ao = Math.atan2(qz, qx), dq = Math.hypot(qx, qz);
    const lado = difAngulo(ang, ao);
    if (dq < dist && dq < 3 && Math.abs(lado) < 0.6) ang -= Math.sign(lado || 1) * 0.7;
  }
  out[0] = direcaoDoAngulo(ang); out[1] = 2;
}

/**
 * Bandeja (Controle). Estilos para medir a atividade: 'corre' (sempre em corrida para a marca), 'trote'
 * (sempre trotando), 'apressado' (o esperto que não liga para lombada) e 'esperto' (corre na reta, trota antes de curva fechada e de lombada e, com a bola
 * perto da beira, segura o ritmo e a direção em que já está para não mexer mais nela).
 */
export function pilotoBandeja(e: BandejaDrill, rng: Rng, habilidade: number, out: number[], estilo: 'corre' | 'trote' | 'esperto' | 'apressado' = 'esperto') {
  if (rng.next() > habilidade) { out[0] = rng.int(DIRECOES); out[1] = rng.int(RITMOS); return; }
  const c = e.corpo, m0 = e.marks[e.next], m1 = e.marks[e.next + 1];
  // porta (slalom): mira um pouco antes do meio dela e, chegando, um pouco depois, para cruzar por dentro
  let tx = m0.x, tz = m0.z;
  if (m0.porta) {
    const a = (c.x - m0.x) * m0.porta.ux + (c.z - m0.z) * m0.porta.uz, k = a < -1.2 ? -0.5 : 0.8;
    tx += m0.porta.ux * k; tz += m0.porta.uz * k;
  }
  const ang = Math.atan2(tz - c.z, tx - c.x), d = Math.hypot(m0.x - c.x, m0.z - c.z);
  out[0] = direcaoDoAngulo(ang);
  if (estilo === 'corre' || estilo === 'trote') { out[1] = estilo === 'corre' ? 2 : 1; return; }
  const b = e.ball, solta = Math.hypot(b.x, b.z) / BANDEJA.trayR, sp = Math.hypot(c.vx, c.vz);
  if (solta > 0.6 && sp > 0.5) {
    // segura: continua na direção e no ritmo de agora
    out[0] = direcaoDoAngulo(Math.atan2(c.vz, c.vx)); out[1] = sp > e.fis.velMax * 0.75 ? 2 : 1; return;
  }
  // parado com a bola balançando: espera ela assentar antes de sair
  // slalom: vai direto na porta, trotando (correr no zigue-zague balança a bola demais para um piloto simples)
  if (m0.porta) { out[1] = 1; return; }
  if (sp < 0.4 && solta > 0.35) { out[1] = 0; return; }
  const curva = Math.abs(difAngulo(ang, Math.atan2(m1.z - m0.z, m1.x - m0.x)));
  // trecho com lombada: trota o trecho inteiro (frear de novo logo antes da próxima deixaria a bola balançando)
  if (m0.lomb && estilo === 'esperto') { out[1] = 1; return; }
  // volta fechada (vai e vem): freia antes e entra na marca devagar
  if (curva > 2 && d < 1.3 + sp * sp / 10) { out[1] = sp > 1.1 ? 0 : 1; return; }
  // vira aos poucos: no máximo uma direção (22,5°) por decisão em corrida, duas trotando
  const vang = Math.atan2(c.vz, c.vx), falta = difAngulo(vang, ang);
  const lento = (curva > 0.8 && d < 2.6) || Math.abs(falta) > 0.5;
  out[1] = lento ? 1 : 2;
  if (sp > 1) {
    const passo = (lento ? 2 : 1) * Math.PI / 8;
    out[0] = direcaoDoAngulo(vang + Math.max(-passo, Math.min(passo, falta)));
  }
}

/** tempo de voo da bola chutada (rolando) até a distância d (Infinity se ela para antes) */
export const vooPrecisao = (d: number) => { const k = 1 - (d * PRECISION.ballFriction) / PRECISION.kickSpeed; return k > 0.1 ? -Math.log(k) / PRECISION.ballFriction : Infinity; };

/**
 * Precisão. Nível 1: escolhe a pilha mais rápida de derrubar, vira parado e chuta com o ajuste fino.
 * Nível 2: corre até um ponto atrás da bola (na linha do painel aceso), para, vira e chuta; se o painel vai
 * apagar antes da bola chegar, espera o próximo (`tempo`). Nível 3: pega a bola, para e arremessa à frente
 * do alvo do trilho (`antecipa`).
 */
export function pilotoPrecisao(e: PrecisionDrill, rng: Rng, habilidade: number, out: number[], { tempo = false, antecipa = true } = {}) {
  if (rng.next() > habilidade) { out[0] = rng.int(DIRECOES); out[1] = rng.int(RITMOS); out[2] = rng.next() < 0.3 ? 1 + rng.int(5) : 0; return; }
  const c = e.corpo, P = PRECISION, sp = Math.hypot(c.vx, c.vz);
  out[2] = 0;
  const vai = (x: number, z: number, perto: number) => {
    const d = Math.hypot(x - c.x, z - c.z);
    out[0] = direcaoDoAngulo(Math.atan2(z - c.z, x - c.x)); out[1] = d > 3 ? 2 : d > perto ? 1 : 0;
    return d;
  };
  /** parado e quase virado para o ângulo `a`: lança com o ajuste fino que deixa a mira mais perto */
  const mira = (a: number, d: number) => {
    out[0] = direcaoDoAngulo(a); out[1] = 0;
    const falta = difAngulo(c.h, a);
    if (sp < 0.6 && Math.abs(falta) < (12.5 * Math.PI) / 180 && Math.abs(c.w) < 1.5 && e.pronto()) {
      let k = 0, m = Infinity;
      P.ajustes.forEach((aj, i) => { const err = Math.abs(falta - aj); if (err < m) { m = err; k = i; } });
      if (m < Math.min(0.1, 0.6 / d)) out[2] = k + 1;
    }
  };
  const S = e.solta;
  if (e.nivel === 1) {
    if (!S.existe) { out[0] = direcaoDoAngulo(c.h); out[1] = 0; return; }
    // a pilha mais fácil vista da bola: perto e sem precisar dar a volta na bola
    let best: { a: number; d: number; custo: number } | null = null;
    for (const t of e.pilhas) {
      const a = Math.atan2(t.z - S.z, t.x - S.x), d = Math.hypot(t.x - S.x, t.z - S.z);
      const px = S.x - Math.cos(a) * 0.6, pz = S.z - Math.sin(a) * 0.6, ir = Math.hypot(px - c.x, pz - c.z);
      const custo = ir / 3 + vooPrecisao(d);
      if (!best || custo < best.custo) best = { a, d, custo };
    }
    if (!best) return;
    const px = S.x - Math.cos(best.a) * 0.6, pz = S.z - Math.sin(best.a) * 0.6;
    if (Math.hypot(px - c.x, pz - c.z) > 0.35) { vai(px, pz, 0.2); return; }
    mira(best.a, best.d);
    return;
  }
  if (e.nivel === 2) {
    if (!S.existe) { vai(c.x, Math.max(c.z, 2), 0.3); return; }
    // alvo: painel aceso (ou o do meio, esperando o próximo acender)
    const lit = e.painel >= 0 && e.painelOn > 0, tx = lit ? P.paineis[e.painel] : 0, tz = -P.hz;
    const a = Math.atan2(tz - S.z, tx - S.x), dB = Math.hypot(tx - S.x, tz - S.z);
    // fica 0,6 atrás da bola, na linha do chute
    const px = S.x - Math.cos(a) * 0.6, pz = S.z - Math.sin(a) * 0.6;
    if (Math.hypot(px - c.x, pz - c.z) > 0.35) { vai(px, pz, 0.2); return; }
    if (!lit || (tempo && e.painelOn < vooPrecisao(dB) + 0.6)) { out[0] = direcaoDoAngulo(a); out[1] = 0; return; }
    mira(a, dB);
    return;
  }
  // nível 3: pega a bola, para e arremessa à frente do alvo (a bola voa reta a 13/s)
  if (!e.naMao) { if (S.existe) vai(S.x, S.z, 0); else { out[0] = direcaoDoAngulo(c.h); out[1] = 0; } return; }
  let tx = e.alvo.x, dir = e.alvo.dir;
  const tz = -P.hz + P.ballR;
  if (antecipa) for (let k = 0; k < 4; k++) {
    const tv = Math.hypot(tx - c.x, tz - c.z) / P.throwSpeed;
    // posição do alvo depois de tv segundos, com as voltas no fim do trilho
    let x = e.alvo.x + e.alvo.dir * P.alvoVel * tv; dir = e.alvo.dir;
    for (let r = 0; r < 3; r++) { if (x > P.trilho) { x = 2 * P.trilho - x; dir = -1; } else if (x < -P.trilho) { x = -2 * P.trilho - x; dir = 1; } }
    tx = x;
  }
  mira(Math.atan2(tz - c.z, tx - c.x), Math.hypot(tx - c.x, tz - c.z));
}
