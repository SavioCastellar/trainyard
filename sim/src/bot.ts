/**
 * Adversário programado à mão (sem IA), usado como régua: um cérebro treinado
 * precisa vencê-lo com folga.
 * O jogador mais perto da bola ataca; o outro fica entre a bola e o próprio gol.
 */
import { CFG, Match } from './soccer.js';

function steer(p: { x: number; z: number; h: number }, tx: number, tz: number) {
  const want = Math.atan2(tz - p.z, tx - p.x);
  let d = want - p.h;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  const turn = d > 0.12 ? 2 : d < -0.12 ? 0 : 1;
  const move = Math.abs(d) < 1.3 ? 2 : 1;
  return { turn, move, diff: d };
}

export function botActions(m: Match, team: number, out: Int32Array | number[]) {
  const b = m.ball, W = CFG.W;
  const ps = m.players.filter(p => p.team === team);
  const s = team === 0 ? 1 : -1, gx = s * W, ownX = -s * W;
  const dist = (p: { x: number; z: number }) => Math.hypot(b.x - p.x, b.z - p.z);
  const att = dist(ps[0]) <= dist(ps[1]) ? ps[0] : ps[1];
  for (const p of ps) {
    const o = p.i * 4;
    let tx: number, tz: number, kick = 0, dive = 0;
    if (p === att) {
      // posiciona atrás da bola, alinhado com o gol adversário
      const ax = gx - b.x, az = -b.z, al = Math.hypot(ax, az) || 1;
      tx = b.x - (ax / al) * 0.9; tz = b.z - (az / al) * 0.9;
      if (dist(p) < 1.6) { tx = b.x; tz = b.z; }
      const goalDist = Math.hypot(gx - b.x, b.z);
      if (dist(p) < 1.5) kick = goalDist < 11 || (goalDist < 15 && p.spec.skills.longShot > 0) ? 2 : 1;
    } else {
      tx = ownX + (b.x - ownX) * 0.35; tz = b.z * 0.35;
      if (dist(p) < 1.4) kick = 1;
      if (p.spec.skills.keeper > 0 && -s * b.vx > 6 && Math.abs(b.x - ownX) < 7) dive = 1;
    }
    const st = steer(p, tx, tz);
    out[o] = st.move; out[o + 1] = st.turn; out[o + 2] = kick; out[o + 3] = dive;
  }
}
