// Economia em várias temporadas por perfil (média de 50 atletas): node dist/scripts/economia.js [temporadas]
import { PERFIS, simularTemporada, DIAS_TEMPORADA } from '../src/jogo-balanco.js';

const T = Number(process.argv[2] ?? 3), N = 50;
for (const prep of [false, true]) {
  console.log(`\n${prep ? 'COM' : 'SEM'} sessão com preparador — saldo ao fim de cada temporada · força final · gasto com preparador por temporada`);
  for (const id of Object.keys(PERFIS)) {
    const rs = Array.from({ length: N }, (_, s) => simularTemporada(id, s + 1, T, prep));
    const med = (f: (r: typeof rs[0]) => number) => rs.reduce((s, r) => s + f(r), 0) / N;
    const saldos = Array.from({ length: T }, (_, t) => med(r => r.dias[(t + 1) * DIAS_TEMPORADA - 1].creditos).toFixed(0).padStart(6));
    const forcas = Array.from({ length: T }, (_, t) => med(r => r.dias[(t + 1) * DIAS_TEMPORADA - 1].forca).toFixed(1));
    console.log(`  ${PERFIS[id].nome.padEnd(14)} saldo ${saldos.join(' →')}   força ${forcas.join(' → ')}   preparador ${(med(r => r.livro.preparador ?? 0) / T).toFixed(0)}`);
  }
}
