/**
 * Pilotos escritos à mão para o Laboratório de movimento. NÃO são cérebros treinados: servem para
 * ver o movimento antes de retreinar. `habilidade` (0–1) mistura decisões ao acaso, imitando um
 * cérebro no começo (0) ou no fim (1) do treino.
 */
import { Rng } from '../rng.js';
import { DIRECOES, RITMOS, direcaoDoAngulo, difAngulo } from '../movimento.js';
import { LaboratorioMovimento } from './laboratorio-movimento.js';
import { PainelDrill, PAINEL } from './painel.js';

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
