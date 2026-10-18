/**
 * Compara o movimento antigo e o novo no Laboratório de movimento, com pilotos escritos à mão.
 * Uso: node dist/scripts/movimento.js [tentativas]
 */
import { Rng } from '../src/rng.js';
import { DECISAO_QUADROS } from '../src/movimento.js';
import { LaboratorioMovimento, LAB } from '../src/drills/laboratorio-movimento.js';
import { pilotoNovo, pilotoAntigo } from '../src/drills/pilotos-movimento.js';

const N = +(process.argv[2] ?? 40);
function rodar(modo: 'novo' | 'antigo', hab: number, periodo: number, abertura = 75) {
  let pontos = 0, girando = 0, trocas = 0;
  for (let e = 0; e < N; e++) {
    const lab = new LaboratorioMovimento(1000 + e, false, { meiaAberturaVisao: (abertura * Math.PI) / 180 });
    const rng = new Rng(5000 + e), a = [0, 0]; let q = 0, sinalAnt = 0;
    while (!lab.done) {
      if (q++ % periodo === 0) (modo === 'novo' ? pilotoNovo : pilotoAntigo)(lab, rng, hab, a);
      modo === 'novo' ? lab.step(a[0], a[1]) : lab.stepAntigo(a[0], a[1]);
      const s = Math.sign(lab.corpo.w); if (s && sinalAnt && s !== sinalAnt) trocas++; if (s) sinalAnt = s;
    }
    pontos += lab.pontos; girando += lab.tempoGirando;
  }
  return { pontosMin: +(pontos / N * 60 / LAB.maxTime).toFixed(1), girandoPct: +(girando / N / LAB.maxTime * 100).toFixed(1), trocasGiroPorMin: +(trocas / N * 60 / LAB.maxTime).toFixed(0) };
}
const linhas: Record<string, unknown> = {};
for (const hab of [1, 0.7, 0.3]) {
  linhas[`antigo · hab ${hab} · decide 1`] = rodar('antigo', hab, 1);
  linhas[`novo · hab ${hab} · decide 1`] = rodar('novo', hab, 1);
  linhas[`novo · hab ${hab} · decide ${DECISAO_QUADROS}`] = rodar('novo', hab, DECISAO_QUADROS);
}
linhas['novo · hab 1 · decide 4 · visão 360°'] = rodar('novo', 1, 4, 180);
console.table(linhas);
