// Compara o modelo de resultado das regras (chanceVitoria) com o futebol simulado de verdade (robôs).
// Força do jogo (0–100) vira atributo da física (0–1). Uso: node dist/scripts/calibrar.js [partidas]
import { Match, flatSpec } from '../src/soccer.js';
import { botActions } from '../src/bot.js';
import { chanceVitoria, EMPATE } from '../src/jogo.js';

const N = Number(process.argv[2] ?? 60);
const base = 45;
console.log('dif  sim:V/E/D            modelo:V/E/D        gols/partida');
for (const dif of [0, 5, 10, 15, 20, 30]) {
  let v = 0, e = 0, d = 0, gols = 0;
  for (let s = 0; s < N; s++) {
    const hi = flatSpec((base + dif / 2) / 100), lo = flatSpec((base - dif / 2) / 100), lado = s % 2;
    const m = new Match(lado ? [lo, lo, hi, hi] : [hi, hi, lo, lo], 5000 + s, { maxTime: 90 });
    const a = new Int32Array(16);
    while (!m.done) { botActions(m, 0, a); botActions(m, 1, a); m.step(a); }
    const x = m.score[lado], y = m.score[1 - lado];
    gols += x + y;
    if (x > y) v++; else if (x === y) e++; else d++;
  }
  const p = chanceVitoria(base + dif / 2, base - dif / 2);
  const pct = (n: number) => (100 * n / N).toFixed(0).padStart(3) + '%';
  const mod = (n: number) => (100 * n).toFixed(0).padStart(3) + '%';
  console.log(`${String(dif).padStart(3)}  ${pct(v)} ${pct(e)} ${pct(d)}   ${mod(p)} ${mod(EMPATE)} ${mod(1 - p - EMPATE)}   ${(gols / N).toFixed(1)}`);
}
