// Relatório de N ligas completas (6 atléticas × ${MEMBROS} membros · ${DUPLAS} dupla(s) por rodada · preparo ${PREPARO} · vantagem ${VANTAGEM ? 'sim' : 'não'}, 42 dias): pontuação, convocação e economia.
// Uso: node dist/scripts/liga.js [ligas] [membros] [duplas] [pontos de preparo] [vantagem 0|1] (padrão: regras atuais)
import { simularLiga, classificacao, PERFIS, FIM_FASE_REGULAR, Livro } from '../src/jogo-balanco.js';
import { especialidades, REGRAS } from '../src/jogo.js';

const N = Number(process.argv[2] ?? 200), MEMBROS = Number(process.argv[3] ?? 12), DUPLAS = Number(process.argv[4] ?? REGRAS.duplasPorRodada), PREPARO = Number(process.argv[5] ?? REGRAS.pontosPreparo), VANTAGEM = (process.argv[6] ?? (REGRAS.vantagemCampanha ? '1' : '0')) === '1';
const pct = (x: number) => (100 * x).toFixed(1) + '%';
const f1 = (x: number) => x.toFixed(1);
let decisivos = 0, zebras = 0, empates = 0, regulares = 0, difF = 0;
let campeaoLider = 0, campeaoMaisEngajado = 0, liderMaisEngajado = 0, spearman = 0, ptsLider = 0, ptsUltimo = 0, zebrasPO = 0, decisivosPO = 0;
const rankPorEng = Array(6).fill(0);
const porPerfil: Record<string, { n: number; conv: number; saldo: number; tit: number; forca: number }> = {};
let livroTotal: Livro = {}, moedaFim = 0, caixaFim = 0, melhorias = 0, membros = 0, gini = 0;
const diaMelhoria: number[] = [];

for (let s = 1; s <= N; s++) {
  const L = simularLiga(s, { membros: MEMBROS, duplas: DUPLAS, preparo: PREPARO, vantagem: VANTAGEM });
  for (const p of L.partidas) {
    if (p.fase === 'regular') { regulares++; if (p.res === 'e') empates++; difF += Math.abs(p.fa - p.fb); }
    if (p.res === 'e' || p.fa === p.fb) continue;
    const forteVenceu = (p.res === 'v') === (p.fa > p.fb);
    if (p.fase === 'regular') { decisivos++; if (!forteVenceu) zebras++; } else { decisivosPO++; if (!forteVenceu) zebrasPO++; }
  }
  const ord = classificacao(L.ats);
  ord.forEach((k, pos) => rankPorEng[k] += pos + 1);
  const n = ord.length;
  spearman += 1 - 6 * ord.reduce((acc, k, pos) => acc + (pos - (n - 1 - k)) ** 2, 0) / (n * (n * n - 1));
  if (L.campeao === L.lider) campeaoLider++;
  if (L.campeao === n - 1) campeaoMaisEngajado++;
  if (L.lider === n - 1) liderMaisEngajado++;
  ptsLider += L.ats[ord[0]].pts; ptsUltimo += L.ats[ord[n - 1]].pts;
  for (const at of L.ats) {
    melhorias += at.ct + at.dm;
    for (const m of at.membros) {
      const q = (porPerfil[m.perfil] ??= { n: 0, conv: 0, saldo: 0, tit: 0, forca: 0 });
      q.n++; q.conv += m.convocacoes; q.saldo += m.atleta.creditos; q.tit += especialidades(m.atleta).length ? 1 : 0;
      membros++;
    }
  }
  for (const [k, v] of Object.entries(L.livro)) livroTotal[k] = (livroTotal[k] ?? 0) + v;
  moedaFim += L.moeda.at(-1)!; caixaFim += L.caixas.at(-1)!;
  const sald = L.ats.flatMap(at => at.membros.map(m => m.atleta.creditos)).sort((a, b) => a - b);
  const tot = sald.reduce((a, b) => a + b, 0);
  gini += tot ? sald.reduce((acc, x, i) => acc + (2 * (i + 1) - sald.length - 1) * x, 0) / (sald.length * tot) : 0;
  const d = L.caixas.findIndex((_, i) => i > 0 && L.caixas[i] < L.caixas[i - 1]);
  if (d >= 0) diaMelhoria.push(d + 1);
}

console.log(`\n=== ${N} ligas · 6 atléticas × ${MEMBROS} membros · ${DUPLAS} dupla(s) por rodada · preparo ${PREPARO} · vantagem ${VANTAGEM ? 'sim' : 'não'} · ${FIM_FASE_REGULAR} rodadas + mata-mata ===`);
console.log('\nPONTUAÇÃO');
console.log(`  empates na fase regular       ${pct(empates / regulares)}`);
console.log(`  zebras (mais fraco vence)     ${pct(zebras / decisivos)} regular · ${pct(zebrasPO / decisivosPO)} mata-mata`);
console.log(`  diferença média de força      ${f1(difF / regulares)}`);
console.log(`  pontos do líder / do último   ${f1(ptsLider / N)} / ${f1(ptsUltimo / N)} (máx ${FIM_FASE_REGULAR * (3 * DUPLAS + PREPARO)})`);
console.log(`  posição média por engajamento ${rankPorEng.map((r, k) => `${String.fromCharCode(65 + k)}:${f1(r / N)}`).join('  ')}  (A menos ativa, F mais ativa)`);
console.log(`  Spearman engajamento × posição ${f1(spearman / N)}`);
console.log(`  líder = mais engajada         ${pct(liderMaisEngajado / N)}`);
console.log(`  campeão = mais engajada       ${pct(campeaoMaisEngajado / N)}`);
console.log(`  campeão = líder da fase       ${pct(campeaoLider / N)}`);

console.log('\nCONVOCAÇÃO E PROGRESSÃO POR PERFIL (por atleta)');
for (const [id, q] of Object.entries(porPerfil))
  console.log(`  ${PERFIS[id].nome.padEnd(14)} n=${String(q.n).padStart(5)}  convocações ${f1(q.conv / q.n).padStart(5)}  com especialidade ${pct(q.tit / q.n).padStart(6)}  saldo final ${f1(q.saldo / q.n).padStart(7)}`);

console.log('\nECONOMIA (média por atleta na temporada)');
const pm = (k: string) => f1((livroTotal[k] ?? 0) / membros).padStart(8);
const entradas = ['salario', 'oficial', 'amistoso', 'expedicao'], saidas = ['equipamento', 'reparo', 'preparador', 'medico'];
const somaE = entradas.reduce((s, k) => s + (livroTotal[k] ?? 0), 0), somaS = saidas.reduce((s, k) => s + (livroTotal[k] ?? 0), 0);
for (const k of entradas) console.log(`  + ${k.padEnd(12)} ${pm(k)}  (${pct((livroTotal[k] ?? 0) / somaE)})`);
for (const k of saidas) console.log(`  - ${k.padEnd(12)} ${pm(k)}  (${pct((livroTotal[k] ?? 0) / somaS)})`);
console.log(`  saídas / entradas             ${pct(somaS / somaE)}`);
console.log(`  saldo final médio             ${f1(moedaFim / N / (6 * MEMBROS))}   Gini dos saldos ${(gini / N).toFixed(2)}`);
console.log(`  caixa da atlética: entrou ${f1((livroTotal.caixaEntrada ?? 0) / N / 6)}  melhorias ${f1(melhorias / N / 6)}  sobra ${f1(caixaFim / N / 6)}  1ª melhoria ~dia ${diaMelhoria.length ? f1(diaMelhoria.reduce((a, b) => a + b, 0) / diaMelhoria.length) : '—'} (${pct(diaMelhoria.length / N)} das ligas)`);
