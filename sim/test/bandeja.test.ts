import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BandejaDrill, type Nivel } from '../src/drills/bandeja.js';
import { Rng } from '../src/rng.js';
import { pilotoBandeja } from '../src/drills/pilotos-movimento.js';
import { DECISAO_QUADROS } from '../src/movimento.js';

type Estilo = 'corre' | 'trote' | 'esperto' | 'apressado';
function joga(seed: number, nivel: Nivel, acoes: (e: BandejaDrill, r: Rng) => [number, number]) {
  const e = new BandejaDrill(seed, true, nivel), r = new Rng(seed + 1);
  let a: [number, number] = [0, 0], q = 0;
  while (!e.done) { if (q++ % DECISAO_QUADROS === 0) a = acoes(e, r); e.step(...a); }
  return e;
}
const aleatorio = (_: BandejaDrill, r: Rng): [number, number] => [r.int(16), r.int(3)];
const piloto = (estilo: Estilo) => (e: BandejaDrill, r: Rng): [number, number] => { const o = [0, 0]; pilotoBandeja(e, r, 1, o, estilo); return [o[0], o[1]]; };
function media(nivel: Nivel, estilo: Estilo, n = 30) {
  let m = 0, q = 0;
  for (let s = 1; s <= n; s++) { const e = joga(s, nivel, piloto(estilo)); m += e.hits; q += e.drops; }
  return { marcas: m / n, quedas: q / n };
}

test('bandeja: mesma semente e mesmas ações geram a mesma tentativa, nos 3 níveis', () => {
  for (const nivel of [1, 2, 3] as Nivel[]) for (let s = 1; s <= 30; s++) {
    const a = joga(s, nivel, aleatorio), b = joga(s, nivel, aleatorio);
    assert.deepEqual(a.events, b.events);
    assert.deepEqual(a.ball, b.ball);
  }
});

test('bandeja: o circuito é o mesmo para a mesma semente, faça o atleta o que fizer', () => {
  const a = joga(7, 3, aleatorio), b = joga(7, 3, piloto('esperto'));
  const n = Math.min(a.marks.length, b.marks.length);
  assert.deepEqual(a.marks.slice(0, n), b.marks.slice(0, n));
});

test('bandeja: a esmo não chega a lugar nenhum', () => {
  let m = 0; for (let s = 1; s <= 20; s++) m += joga(s, 1, aleatorio).hits;
  assert.ok(m / 20 < 2, `a esmo ${m / 20}`);
});

test('bandeja: quem corre sem cuidado derruba a bola; o esperto quase nunca (no 3, quem não tira o pé na lombada derruba)', () => {
  const n1c = media(1, 'corre'), n1e = media(1, 'esperto');
  assert.ok(n1c.quedas > 1.2 && n1e.quedas < 0.6, JSON.stringify({ n1c, n1e }));
  const n2c = media(2, 'corre'), n2t = media(2, 'trote'), n2e = media(2, 'esperto');
  assert.ok(n2c.quedas > 4 && n2t.quedas > 0.6 && n2e.quedas < 0.5 && n2e.marcas > n2t.marcas, JSON.stringify({ n2c, n2t, n2e }));
  const n3c = media(3, 'corre'), n3a = media(3, 'apressado'), n3e = media(3, 'esperto');
  assert.ok(n3c.quedas > 5 && n3a.quedas > n3e.quedas + 3 && n3e.quedas < 1.2, JSON.stringify({ n3c, n3a, n3e }));
});

test('bandeja: nível 2 é slalom de portas em zigue-zague; nível 3 tem lombadas largas', () => {
  const e2 = joga(3, 2, piloto('esperto'));
  assert.ok(e2.marks.slice(1).every(m => m.porta));
  assert.ok(e2.hits > 5);
  const e3 = joga(3, 3, piloto('esperto'));
  assert.ok(e3.marks.filter(m => m.lomb).length >= 4);
});
