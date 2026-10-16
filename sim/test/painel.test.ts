import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PainelDrill, PAINEL, type Nivel } from '../src/drills/painel.js';
import { Rng } from '../src/rng.js';

/** robô simples: corre para a verde; sem luz, volta ao centro */
function robo(e: PainelDrill): [number, number] {
  const P = e.player, lit = e.state[e.green] === 1;
  const g = lit ? PAINEL.pads[e.green] : { x: 0, z: 0 };
  const dx = g.x - P.x, dz = g.z - P.z;
  if (!lit && Math.hypot(dx, dz) < 0.5) return [1, 1];
  let da = Math.atan2(dz, dx) - P.h;
  da = Math.atan2(Math.sin(da), Math.cos(da));
  return [Math.abs(da) < 0.08 ? 1 : da > 0 ? 2 : 0, Math.abs(da) < 1.2 ? 2 : 1];
}

function joga(seed: number, nivel: Nivel, acoes: (e: PainelDrill, r: Rng) => [number, number]) {
  const e = new PainelDrill(seed, true, nivel), r = new Rng(seed + 1);
  while (!e.done) e.step(...acoes(e, r));
  return e;
}
const aleatorio = (_: PainelDrill, r: Rng): [number, number] => [r.int(3), r.int(3)];

test('painel: mesma semente e mesmas ações geram a mesma tentativa, nos 3 níveis', () => {
  for (const nivel of [1, 2, 3] as Nivel[]) for (let s = 1; s <= 50; s++) {
    const a = joga(s, nivel, aleatorio), b = joga(s, nivel, aleatorio);
    assert.deepEqual(a.events, b.events);
    assert.deepEqual(a.player, b.player);
    assert.equal(a.hits, b.hits);
  }
});

test('painel: andar a esmo quase não pisa luzes; o robô pisa quase todas no nível 1', () => {
  let esmo = 0, bot = 0, luzes = 0;
  for (let s = 1; s <= 30; s++) { esmo += joga(s, 1, aleatorio).hits; const e = joga(s, 1, robo); bot += e.hits; luzes += e.lights; }
  assert.ok(esmo / 30 < 2, `a esmo ${esmo / 30}`);
  assert.ok(bot / luzes > 0.9, `robô ${bot}/${luzes}`);
});

test('painel: nível 1 só usa o anel interno; nível 3 acende 2 vermelhas fora da verde', () => {
  for (const ev of joga(5, 1, robo).events!) if (ev.type === 'on') { assert.ok(ev.pad < 4); assert.equal(ev.red.length, 0); }
  for (const ev of joga(5, 3, robo).events!) if (ev.type === 'on') { assert.equal(ev.red.length, 2); assert.ok(!ev.red.includes(ev.pad)); }
});
