import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  novoAtleta, treinar, trabalhar, comprar, equipar, virarDia, atributoEsporte, convocar, habilidades,
  atualizarEspecialidades, nivelAtividade,
} from '../src/jogo.js';
import { simularTemporada, simularLiga, classificacao } from '../src/jogo-balanco.js';

test('temporada e liga se repetem exatamente com a mesma semente', () => {
  for (const p of ['dedicado', 'casual', 'abandono']) assert.deepEqual(simularTemporada(p, 3).dias, simularTemporada(p, 3).dias);
  const a = simularLiga(4), b = simularLiga(4);
  assert.deepEqual(a.partidas, b.partidas);
  assert.deepEqual(a.moeda, b.moeda);
});

test('limite de 5 ações por dia e salário decrescente no mesmo dia', () => {
  const a = novoAtleta(1);
  const pagos = [0, 1, 2, 3].map(() => trabalhar(a, 'monitor').liquido);
  assert.ok(pagos[0] > pagos[1] && pagos[1] > pagos[2]);
  treinar(a, 'precisao');
  assert.throws(() => trabalhar(a, 'monitor'), /Sem ações/);
  virarDia(a);
  assert.equal(trabalhar(a, 'monitor').liquido, pagos[0]);
});

test('atividade sobe de nível a cada 3 sessões; atividade fora do lançamento não treina', () => {
  const a = novoAtleta(1);
  for (let i = 0; i < 3; i++) treinar(a, 'forca');
  assert.equal(nivelAtividade(a, 'forca'), 2);
  assert.throws(() => treinar(a, 'folego'), /não está disponível/);
});

test('equipamento soma ao atributo do esporte depois de adaptar, só na sua modalidade', () => {
  const a = novoAtleta(2);
  a.creditos = 1000;
  comprar(a, 'futebol-calcado-3');
  equipar(a, 0);
  const antes = atributoEsporte(a, 'futebol', 'finalizacao');
  for (let d = 0; d < 4; d++) { trabalhar(a, 'monitor'); virarDia(a); }
  assert.ok(atributoEsporte(a, 'futebol', 'finalizacao') > antes + 9);
  const semKit = (0.6 * a.atrib.forca + 0.4 * a.atrib.precisao) * (0.8 + 0.2 * a.forma / 100);
  assert.equal(atributoEsporte(a, 'queimada', 'arremesso'), semKit);
});

test('especialidade: conquista no requisito, perde só abaixo da margem; habilidades somam nível', () => {
  const a = novoAtleta(3);
  a.atrib.reflexo = 85;
  assert.deepEqual(atualizarEspecialidades(a), ['paredao']);
  assert.equal(habilidades(a, 'futebol').goleiro, 2); // base 1 + Paredão
  assert.equal(habilidades(a, 'futebol').chuteLonge, undefined);
  a.atrib.reflexo = 81; atualizarEspecialidades(a);
  assert.deepEqual(a.especialidades, ['paredao']);
  a.atrib.reflexo = 79; atualizarEspecialidades(a);
  assert.deepEqual(a.especialidades, []);
  a.atrib.velocidade = 85; atualizarEspecialidades(a);
  a.atrib.reflexo = 85; atualizarEspecialidades(a);
  assert.equal(habilidades(a, 'queimada').esquiva, 2); // Velocista + Paredão
});

test('só é convocado quem fez alguma ação no dia', () => {
  const forte = novoAtleta(3), fraco = novoAtleta(4);
  for (const k of Object.keys(forte.atrib) as (keyof typeof forte.atrib)[]) forte.atrib[k] = 90;
  trabalhar(fraco, 'monitor');
  assert.deepEqual(convocar([forte, fraco], 'futebol'), [1]);
});

test('treino focado chega a especialidade; sumir derruba a força', () => {
  const esp = simularTemporada('especialista', 5), ded = simularTemporada('dedicado', 5), sum = simularTemporada('abandono', 5);
  assert.ok(esp.primeiraEspecialidade !== null, "especialista sem especialidade na temporada");
  assert.ok(sum.dias[23].forca < ded.dias[23].forca - 5);
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
