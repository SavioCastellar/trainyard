import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PrecisionDrill, PRECISION, PRECISION_DOMINIO as D, type Nivel } from '../src/drills/precision.js';
import { Rng } from '../src/rng.js';

type Acoes = [number, number, number];
/** tempo de voo da bola até a distância d (Infinity se ela para antes) */
const voo = (d: number) => { const k = 1 - (d * PRECISION.ballFriction) / PRECISION.kickSpeed; return k > 0.1 ? -Math.log(k) / PRECISION.ballFriction : Infinity; };
const angulo = (P: { x: number; z: number; h: number }, x: number, z: number) => { const a = Math.atan2(z - P.z, x - P.x) - P.h; return Math.atan2(Math.sin(a), Math.cos(a)); };

/** robô parado no lugar que gira até o alvo mais rápido de acertar e chuta.
 *  tempo: no nível 2 ignora alvos que vão apagar antes da bola chegar; antecipa: no nível 3 mira à frente do alvo. */
function mira(e: PrecisionDrill, { tempo = false, antecipa = false } = {}): Acoes {
  const P = e.player;
  let best: { da: number; d: number; custo: number } | null = null;
  for (const t of e.targets) {
    if (t.off > 0) continue;
    let x = t.x, z = t.z, da = 0, d = 0, custo = 0;
    for (let k = 0; k < (antecipa ? 4 : 1); k++) {
      da = angulo(P, x, z); d = Math.hypot(x - P.x, z - P.z); custo = Math.abs(da) / PRECISION.turn + voo(d);
      if (antecipa && t.dir) { const a = t.a + (t.dir * PRECISION.railSpeed * custo) / t.r; x = Math.cos(a) * t.r; z = Math.sin(a) * t.r; }
    }
    if (tempo && t.on < custo + 0.15) continue;
    if (!best || custo < best.custo) best = { da, d, custo };
  }
  if (!best) return [1, 1, 0];
  const ok = Math.abs(best.da) < Math.min(0.5, 0.6 / best.d);
  return [Math.abs(best.da) < 0.05 ? 1 : best.da > 0 ? 2 : 0, 1, ok ? 1 : 0];
}
const parado = (): Acoes => [1, 1, 1];
const gira = (): Acoes => [2, 1, 1];
const aleatorio = (_: PrecisionDrill, r: Rng): Acoes => [r.int(3), r.int(3), r.int(2)];

function joga(seed: number, nivel: Nivel, f: (e: PrecisionDrill, r: Rng) => Acoes) {
  const e = new PrecisionDrill(seed, true, nivel), r = new Rng(seed + 1);
  while (!e.done) e.step(...f(e, r));
  return e;
}
const media = (nivel: Nivel, f: (e: PrecisionDrill, r: Rng) => Acoes, n = 40) => {
  let h = 0; for (let s = 1; s <= n; s++) h += joga(s, nivel, f).hits; return h / n;
};

test('precisão: mesma semente e mesmas ações geram a mesma tentativa, nos 3 níveis', () => {
  for (const nivel of [1, 2, 3] as Nivel[]) for (let s = 1; s <= 30; s++) {
    const a = joga(s, nivel, aleatorio), b = joga(s, nivel, aleatorio);
    assert.deepEqual(a.events, b.events);
    assert.deepEqual(a.player, b.player);
  }
});

test('precisão: nível 1 é o de antes (padrão), nível 2 apaga alvos, nível 3 move', () => {
  assert.deepEqual(joga(5, 1, aleatorio).events, (() => { const e = new PrecisionDrill(5, true), r = new Rng(6); while (!e.done) e.step(...aleatorio(e, r)); return e.events; })());
  assert.ok(joga(5, 1, aleatorio).events!.every(ev => ev.type !== 'off'));
  assert.ok(joga(5, 2, aleatorio).events!.some(ev => ev.type === 'off'));
  const e = new PrecisionDrill(5, false, 3), x0 = e.targets.map(t => t.x);
  for (let i = 0; i < 30; i++) e.step(1, 1, 0);
  e.targets.forEach((t, i) => { assert.notEqual(t.x, x0[i]); assert.ok(Math.abs(Math.hypot(t.x, t.z) - t.r) < 1e-9); });
});

test('precisão: o domínio de cada nível fica entre o robô sem e com o comportamento do nível', () => {
  const sem = { 1: () => media(1, aleatorio), 2: () => media(2, e => mira(e)), 3: () => media(3, e => mira(e)) };
  const com = { 1: () => media(1, e => mira(e)), 2: () => media(2, e => mira(e, { tempo: true })), 3: () => media(3, e => mira(e, { antecipa: true })) };
  for (const n of [1, 2, 3] as Nivel[]) {
    const a = sem[n](), b = com[n]();
    assert.ok(a < D[n] - 0.8 && D[n] < b - 1.5, `nível ${n}: sem ${a} domínio ${D[n]} com ${b}`);
    for (const f of [parado, gira, aleatorio]) assert.ok(media(n, f) < 7, `nível ${n} ação constante ${media(n, f)}`);
  }
});
