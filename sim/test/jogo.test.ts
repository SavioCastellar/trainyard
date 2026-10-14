import { test } from 'node:test';
import assert from 'node:assert/strict';
import { novoAtleta, treinar, trabalhar, comprar, equipar, virarDia, efetivo, REGRAS } from '../src/jogo.js';
import { simularTemporada } from '../src/jogo-balanco.js';

test('temporada se repete exatamente com a mesma semente', () => {
  for (const p of ['dedicado', 'casual', 'abandono']) assert.deepEqual(simularTemporada(p, 3).dias, simularTemporada(p, 3).dias);
});

test('limite de 5 ações por dia', () => {
  const a = novoAtleta(1);
  for (let i = 0; i < REGRAS.acoesPorDia; i++) treinar(a, 'chute');
  assert.throws(() => trabalhar(a, 'monitor'), /Sem ações/);
  virarDia(a);
  trabalhar(a, 'monitor');
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

test('treino focado chega a título; sumir derruba a força', () => {
  const esp = simularTemporada('especialista', 5), ded = simularTemporada('dedicado', 5), sum = simularTemporada('abandono', 5);
  assert.ok(esp.primeiroTitulo !== null && esp.primeiroTitulo < 35);
  assert.ok(sum.dias[23].forca < ded.dias[23].forca - 10);
  assert.ok(sum.dias[23].forma === 0);
});
