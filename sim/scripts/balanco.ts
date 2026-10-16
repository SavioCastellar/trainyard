// Imprime o balanço da temporada por perfil (média de 50 sementes): node dist/scripts/balanco.js
import { PERFIS, simularTemporada } from '../src/jogo-balanco.js';

const N = 50;
for (const id of Object.keys(PERFIS)) {
  const rs = Array.from({ length: N }, (_, s) => simularTemporada(id, s + 1));
  const med = (f: (r: typeof rs[0]) => number) => (rs.reduce((s, r) => s + f(r), 0) / N).toFixed(1);
  const comTitulo = rs.filter(r => r.primeiraEspecialidade !== null);
  const dia = (d: number) => med(r => r.dias[d - 1].forca);
  console.log(`${PERFIS[id].nome.padEnd(14)} força d7 ${dia(7)} d21 ${dia(21)} d42 ${dia(42)} | maior ${med(r => r.dias[41].maior)}`
    + ` | especialidade ${comTitulo.length}/${N} dia ${comTitulo.length ? (comTitulo.reduce((s, r) => s + r.primeiraEspecialidade!, 0) / comTitulo.length).toFixed(0) : '-'}`
    + ` | ganho ${med(r => r.ganho)} kit ${med(r => r.gastoKit)} médico ${med(r => r.gastoMedico)} saldo ${med(r => r.dias[41].creditos)} kitNível ${med(r => r.dias[41].kit)}`);
}
