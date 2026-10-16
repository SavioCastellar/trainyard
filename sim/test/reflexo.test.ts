import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ReflexoDrill, type Nivel } from '../src/drills/reflexo.js';
import { Rng } from '../src/rng.js';

/** robô que reage: quando uma bola vem, sai para o lado da linha dela; sem bola, volta ao centro */
function reativo(e: ReflexoDrill): [number, number, number] {
  const P = e.player, c = Math.cos(P.h), s = Math.sin(P.h);
  const go = (wx: number, wz: number): [number, number, number] => {
    const f = wx * c + wz * s, l = -wx * s + wz * c;
    return [1, f > 0.3 ? 2 : f < -0.3 ? 0 : 1, l > 0.3 ? 0 : l < -0.3 ? 2 : 1];
  };
  const inc = e.balls.filter(b => (P.x - b.x) * b.vx + (P.z - b.z) * b.vz > 0)
    .sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z))[0];
  if (!inc) return Math.hypot(P.x, P.z) > 0.4 ? go(-P.x, -P.z) : [1, 1, 1];
  const v = Math.hypot(inc.vx, inc.vz), nx = -inc.vz / v, nz = inc.vx / v, off = (P.x - inc.x) * nx + (P.z - inc.z) * nz;
  let sg = Math.abs(off) > 0.05 ? Math.sign(off) : -Math.sign(P.x * nx + P.z * nz || 1);
  if ((P.x * nx + P.z * nz) * sg > 1.6) sg = -sg;
  return go(nx * sg, nz * sg);
}
const parado = (): [number, number, number] => [1, 1, 1];
const circulo = (): [number, number, number] => [2, 2, 1];
const aleatorio = (_: ReflexoDrill, r: Rng): [number, number, number] => [r.int(3), r.int(3), r.int(3)];

function joga(seed: number, nivel: Nivel, f: (e: ReflexoDrill, r: Rng) => [number, number, number]) {
  const e = new ReflexoDrill(seed, true, nivel), r = new Rng(seed + 1);
  while (!e.done) e.step(...f(e, r));
  return e;
}
const taxa = (nivel: Nivel, f: (e: ReflexoDrill, r: Rng) => [number, number, number]) => {
  let h = 0, n = 0; for (let s = 1; s <= 40; s++) { const e = joga(s, nivel, f); h += e.hits; n += e.shots; } return h / n;
};

test('reflexo: mesma semente e mesmas ações geram a mesma tentativa, nos 3 níveis', () => {
  for (const nivel of [1, 2, 3] as Nivel[]) for (let s = 1; s <= 40; s++) {
    const a = joga(s, nivel, aleatorio), b = joga(s, nivel, aleatorio);
    assert.deepEqual(a.events, b.events);
    assert.deepEqual(a.player, b.player);
  }
});

test('reflexo: parado, tremendo ou correndo em círculo leva bolada; reagir ao disparo desvia', () => {
  for (const nivel of [1, 2] as Nivel[]) {
    const r = taxa(nivel, reativo);
    for (const [nome, f] of [['parado', parado], ['círculo', circulo], ['aleatório', aleatorio]] as const)
      assert.ok(taxa(nivel, f) < 0.2 && taxa(nivel, f) < r - 0.25, `nível ${nivel} ${nome} ${taxa(nivel, f)} × reativo ${r}`);
  }
});

test('reflexo: nível 1 só tem o lançador da frente; nível 3 dispara pares', () => {
  for (const ev of joga(3, 1, reativo).events!) if (ev.type === 'fire') assert.equal(ev.launcher, 0);
  const fires = joga(3, 3, reativo).events!.filter(ev => ev.type === 'fire');
  assert.ok(fires.some((ev, i) => i > 0 && ev.t === fires[i - 1].t), 'nenhum par');
});
