import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PainelDrill, PAINEL, type Nivel } from '../src/drills/painel.js';
import { Rng } from '../src/rng.js';
import { pilotoPainel } from '../src/drills/pilotos-movimento.js';
import { DECISAO_QUADROS } from '../src/movimento.js';

/** robô simples (piloto escrito à mão, movimento padrão): corre para a verde; sem luz, volta ao centro */
function robo(e: PainelDrill, r: Rng): [number, number] {
  const out = [0, 0]; pilotoPainel(e, r, 1, out); return [out[0], out[1]];
}

function joga(seed: number, nivel: Nivel, acoes: (e: PainelDrill, r: Rng) => [number, number]) {
  const e = new PainelDrill(seed, true, nivel), r = new Rng(seed + 1);
  let a: [number, number] = [0, 0], q = 0;
  while (!e.done) { if (q++ % DECISAO_QUADROS === 0) a = acoes(e, r); e.step(...a); }
  return e;
}
const aleatorio = (_: PainelDrill, r: Rng): [number, number] => [r.int(16), r.int(3)];

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
