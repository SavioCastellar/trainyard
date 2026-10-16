// Dias até cada especialidade treinando só os atributos dela (média de 30 atletas), por nível do CT.
// Uso: node dist/scripts/especialidades.js [treinos por dia]
import { ESPECIALIDADES, ATIVIDADES, novoAtleta, treinar, virarDia, Atributo } from '../src/jogo.js';

const T = Number(process.argv[2] ?? 2), N = 30;
console.log(`${T} treinos por dia, só nos atributos da especialidade (forma 100)`);
console.log('especialidade   CT0   CT1   CT2   CT3');
for (const e of ESPECIALIDADES) {
  const req = Object.entries(e.requisito) as [Atributo, number][];
  if (req.some(([k]) => !ATIVIDADES[k].lancamento)) { console.log(`${e.nome.padEnd(14)}  sem treino no lançamento (${req.map(([k]) => k).join(', ')})`); continue; }
  const cols = [0, 1, 2, 3].map(ct => {
    let soma = 0;
    for (let s = 1; s <= N; s++) {
      const a = novoAtleta(s); a.forma = 100;
      let dia = 0;
      while (!a.especialidades.includes(e.id) && dia < 400) {
        dia++;
        for (let t = 0; t < T; t++) {
          const [k] = req.reduce((m, r) => (a.atrib[r[0]] - r[1] < a.atrib[m[0]] - m[1] ? r : m));
          treinar(a, k, ct);
        }
        virarDia(a); a.forma = 100;
      }
      soma += dia;
    }
    return (soma / N).toFixed(0).padStart(5);
  });
  console.log(`${e.nome.padEnd(14)} ${cols.join(' ')}`);
}
