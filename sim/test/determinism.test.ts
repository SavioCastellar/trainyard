import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Match, randomSpec, flatSpec } from '../src/soccer.js';
import { Rng } from '../src/rng.js';
import { botActions } from '../src/bot.js';

function playBots(seed: number) {
  const r = new Rng(seed);
  const specs = [0, 1, 2, 3].map(() => randomSpec(r));
  const m = new Match(specs, seed, { maxTime: 60, record: true });
  const a = new Int32Array(16);
  while (!m.done) { botActions(m, 0, a); botActions(m, 1, a); m.step(a); }
  return m;
}

test('mesma semente e mesmas ações geram exatamente a mesma partida', () => {
  for (let s = 1; s <= 200; s++) {
    const a = playBots(s), b = playBots(s);
    assert.deepEqual(a.score, b.score);
    assert.equal(a.ball.x, b.ball.x);
    assert.equal(a.ball.z, b.ball.z);
    assert.deepEqual(a.events, b.events);
  }
});

test('sementes diferentes geram partidas diferentes', () => {
  const finals = new Set<string>();
  for (let s = 1; s <= 50; s++) { const m = playBots(s); finals.add(`${m.ball.x.toFixed(6)}:${m.ball.z.toFixed(6)}`); }
  assert.ok(finals.size > 45);
});

test('robô com atributos altos vence robô com atributos baixos na maioria das vezes', () => {
  let w = 0, l = 0;
  for (let s = 0; s < 60; s++) {
    const hi = flatSpec(0.8), lo = flatSpec(0.3), side = s % 2;
    const specs = side === 0 ? [hi, hi, lo, lo] : [lo, lo, hi, hi];
    const m = new Match(specs, 1000 + s, { maxTime: 60 });
    const a = new Int32Array(16);
    while (!m.done) { botActions(m, 0, a); botActions(m, 1, a); m.step(a); }
    const x = m.score[side], y = m.score[1 - side];
    if (x > y) w++; else if (x < y) l++;
  }
  assert.ok(w > l * 2, `alto ${w} × baixo ${l}`);
});
