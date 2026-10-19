import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Rng } from '../src/rng.js';
import { fisica, novoCorpo, moverCorpo, DIRECOES } from '../src/movimento.js';
import { LaboratorioMovimento } from '../src/drills/laboratorio-movimento.js';
import { pilotoNovo } from '../src/drills/pilotos-movimento.js';

function rodar(seed: number) {
  const lab = new LaboratorioMovimento(seed, true), rng = new Rng(seed * 7), a = [0, 0];
  let q = 0;
  while (!lab.done) { if (q++ % 4 === 0) pilotoNovo(lab, rng, 0.8, a); lab.step(a[0], a[1]); }
  return lab;
}

test('laboratório de movimento: mesma semente, mesmo resultado', () => {
  for (let s = 1; s <= 50; s++) {
    const a = rodar(s), b = rodar(s);
    assert.equal(a.pontos, b.pontos);
    assert.equal(a.corpo.x, b.corpo.x);
    assert.deepEqual(a.events, b.events);
  }
});

test('mais Controle = curva mais fechada na mesma velocidade', () => {
  const raio = (controle: number) => {
    const f = fisica({ velocidade: 50, controle }), c = novoCorpo(0, 0, 0);
    for (let i = 0; i < 90; i++) moverCorpo(c, f, 0, 2);          // embala para frente (+x)
    const x0 = c.x;
    for (let i = 0; i < 20; i++) moverCorpo(c, f, DIRECOES / 4, 2); // manda virar 90° (+z)
    return c.x - x0;                                                // quanto "passou" antes de virar
  };
  assert.ok(raio(90) < raio(10));
});

test('mais Velocidade = mais rápido no fim da reta', () => {
  const vel = (velocidade: number) => {
    const f = fisica({ velocidade, controle: 50 }), c = novoCorpo();
    for (let i = 0; i < 120; i++) moverCorpo(c, f, 0, 2);
    return c.vx;
  };
  assert.ok(vel(90) > vel(10) + 1);
});
