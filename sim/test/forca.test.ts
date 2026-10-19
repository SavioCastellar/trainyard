import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ForcaDrill, FORCA, type Nivel } from '../src/drills/forca.js';
import { Rng } from '../src/rng.js';

type A = [number, number];
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * robô que empurra: vai para trás do trenó e empurra; com `steer` corrige o rumo empurrando fora do centro;
 * com `pausa` para de empurrar 0,6 s a cada 1,5 s (quem não aprendeu a empurrar sem parar)
 */
function empurrador(steer: boolean, pausa = false) {
  let pushing = 0, resting = 0, backing = false;
  return (e: ForcaDrill): A => {
    const P = e.player, S = e.sled, ca = Math.cos(S.a), sa = Math.sin(S.a);
    const err = wrap(Math.atan2(-S.z, 2.5) - S.a);
    const lzc = steer ? Math.max(-0.3, Math.min(0.3, -err * 0.8)) : 0;
    const dx = P.x - S.x, dz = P.z - S.z, lx = dx * ca + dz * sa, lz = -dx * sa + dz * ca;
    const toWorld = (x: number, z: number) => [S.x + x * ca - z * sa, S.z + x * sa + z * ca];
    const aligned = e.contact || (lx < -0.9 && Math.abs(lz - lzc) < 0.25);
    let tgt: number[];
    if (aligned) tgt = toWorld(lx + 2, lzc);
    else if (lx > -0.9) tgt = Math.abs(lz) > 1 ? toWorld(-1.8, Math.sign(lz) * 1.2) : toWorld(lx, (Math.sign(lz) || 1) * 1.4);
    else tgt = toWorld(-1.8, lzc);
    const ae = wrap(Math.atan2(tgt[1] - P.z, tgt[0] - P.x) - P.h);
    const turn = ae > 0.08 ? 2 : ae < -0.08 ? 0 : 1;
    let move = Math.abs(ae) < 0.6 ? 2 : 1;
    // trenó travado: recua e vem de novo com velocidade (arranque)
    if (S.locked && e.contact) backing = true;
    if (backing) { if (!S.locked || lx < -2.1) backing = false; else return [1, 0]; }
    if (pausa && aligned) {
      if (resting > 0) { resting -= FORCA.dt; move = 1; }
      else if ((pushing += FORCA.dt) > 1.5) { pushing = 0; resting = 0.6; }
    }
    return [turn, move];
  };
}
const parado = (): A => [1, 1];
const frente = (): A => [1, 2];
const circulo = (): A => [2, 2];
const aleatorio = (_: ForcaDrill, r: Rng): A => [r.int(3), r.int(3)];

function joga(seed: number, nivel: Nivel, f: (e: ForcaDrill, r: Rng) => A) {
  const e = new ForcaDrill(seed, true, nivel), r = new Rng(seed + 1);
  while (!e.done) e.step(...f(e, r));
  return e;
}
/** entregas por tentativa (marcas / 5, conta entrega parcial), média de 30 sementes */
const entregas = (nivel: Nivel, mk: () => (e: ForcaDrill, r: Rng) => A) => {
  let h = 0; for (let s = 1; s <= 30; s++) h += joga(s, nivel, mk()).hits; return h / 30 / 5;
};

test('forca: mesma semente e mesmas ações geram a mesma tentativa, nos 3 níveis', () => {
  for (const nivel of [1, 2, 3] as Nivel[]) for (let s = 1; s <= 20; s++) {
    const a = joga(s, nivel, aleatorio), b = joga(s, nivel, aleatorio);
    assert.deepEqual(a.events, b.events);
    assert.deepEqual(a.sled, b.sled);
  }
});

test('forca: ações constantes não levam o trenó; empurrar pelo centro e corrigir o rumo leva', () => {
  const m: Record<string, number[]> = {};
  const robos = { parado: () => parado, frente: () => frente, circulo: () => circulo, aleatorio: () => aleatorio,
    'sem rumo': () => empurrador(false), pausando: () => empurrador(true, true), contínuo: () => empurrador(true) };
  for (const [nome, mk] of Object.entries(robos)) m[nome] = ([1, 2, 3] as Nivel[]).map(n => +entregas(n, mk).toFixed(2));
  console.log('entregas por tentativa (níveis 1, 2, 3):', m);
  for (const n of [0, 1, 2]) {
    for (const k of ['parado', 'frente', 'circulo', 'aleatorio']) assert.ok(m[k][n] < 0.3, `${k} nível ${n + 1}: ${m[k][n]}`);
    assert.ok(m['contínuo'][n] > m['sem rumo'][n], `nível ${n + 1}: corrigir o rumo tem que ajudar`);
  }
  // nos níveis 2 e 3, parar de empurrar custa caro
  for (const n of [1, 2]) assert.ok(m['pausando'][n] < m['contínuo'][n] * 0.75, `nível ${n + 1}: pausar ${m['pausando'][n]} × contínuo ${m['contínuo'][n]}`);
});

test('forca: trenó pesado travado não sai com o atleta encostado; sai com arranque', () => {
  const e = new ForcaDrill(1, true, 2);
  Object.assign(e.player, { x: e.sled.x - 0.6 - 0.56, z: 0, h: 0, v: 0 });
  for (let i = 0; i < 30; i++) e.step(1, 2);
  assert.ok(e.sled.locked && e.sled.x === FORCA.sledStart, 'encostado não destrava');
  Object.assign(e.player, { x: e.sled.x - 2, z: 0, h: 0, v: 0 });
  for (let i = 0; i < 30; i++) e.step(1, 2);
  assert.ok(e.events!.some(ev => ev.type === 'break') && e.sled.x > FORCA.sledStart, 'arranque destrava');
});
