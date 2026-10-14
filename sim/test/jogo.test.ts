import { test } from 'node:test';
import assert from 'node:assert/strict';
import { novoAtleta, treinar, trabalhar, comprar, equipar, virarDia, efetivo, convocar, REGRAS } from '../src/jogo.js';
import { simularTemporada, simularLiga, classificacao } from '../src/jogo-balanco.js';

test('temporada e liga se repetem exatamente com a mesma semente', () => {
  for (const p of ['dedicado', 'casual', 'abandono']) assert.deepEqual(simularTemporada(p, 3).dias, simularTemporada(p, 3).dias);
  const a = simularLiga(4), b = simularLiga(4);
  assert.deepEqual(a.partidas, b.partidas);
  assert.deepEqual(a.moeda, b.moeda);
});

test('limite de 5 ações por dia e salário decrescente no mesmo dia', () => {
  const a = novoAtleta(1);
  const pagos = [0, 1, 2, 3].map(() => trabalhar(a, 'monitor').liquido + 0);
  assert.ok(pagos[0] > pagos[1] && pagos[1] > pagos[2]);
  treinar(a, 'chute');
  assert.throws(() => trabalhar(a, 'monitor'), /Sem ações/);
  virarDia(a);
  assert.equal(trabalhar(a, 'monitor').liquido, pagos[0]);
});

test('equipamento só vale depois de adaptar e só na sua modalidade', () => {
  const a = novoAtleta(2);
  a.creditos = 1000;
  comprar(a, 'futebol-calcado-3');
  equipar(a, 0);
  const antes = efetivo(a, 'chute', 'futebol');
  for (let d = 0; d < 4; d++) { trabalhar(a, 'monitor'); virarDia(a); }
  assert.ok(efetivo(a, 'chute', 'futebol') > antes + 9);
  assert.equal(efetivo(a, 'chute', 'queimada'), a.atrib.chute * (0.8 + 0.2 * a.forma / 100));
});

test('só é convocado quem fez alguma ação no dia', () => {
  const forte = novoAtleta(3), fraco = novoAtleta(4);
  for (const k of Object.keys(forte.atrib) as (keyof typeof forte.atrib)[]) forte.atrib[k] = 90;
  trabalhar(fraco, 'monitor');
  assert.deepEqual(convocar([forte, fraco], 'futebol'), [1]);
});

test('treino focado chega a título; sumir derruba a força', () => {
  const esp = simularTemporada('especialista', 5), ded = simularTemporada('dedicado', 5), sum = simularTemporada('abandono', 5);
  assert.ok(esp.primeiroTitulo !== null && esp.primeiroTitulo < 35);
  assert.ok(sum.dias[23].forca < ded.dias[23].forca - 10);
  assert.ok(sum.dias[23].forma === 0);
});

test('liga: atlética mais ativa termina na frente na média; dinheiro não dispara', () => {
  let posMais = 0, posMenos = 0, saldo = 0;
  const N = 40;
  for (let s = 1; s <= N; s++) {
    const L = simularLiga(s), ord = classificacao(L.ats);
    posMais += ord.indexOf(5); posMenos += ord.indexOf(0);
    saldo += L.moeda.at(-1)! / 72;
  }
  assert.ok(posMais / N < 2 && posMenos / N > 3.5, `posições ${posMais / N} × ${posMenos / N}`);
  assert.ok(saldo / N < 1500, `saldo médio ${saldo / N}`);
});
