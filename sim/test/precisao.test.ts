import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PrecisionDrill, PRECISION_DOMINIO as D, type Nivel } from '../src/drills/precision.js';
import { Rng } from '../src/rng.js';
import { pilotoPrecisao } from '../src/drills/pilotos-movimento.js';
import { DECISAO_QUADROS } from '../src/movimento.js';

type Acoes = [number, number, number];
type Politica = (e: PrecisionDrill, r: Rng) => Acoes;
/** robô (piloto escrito à mão, movimento padrão): vira parado para o alvo mais rápido de acertar e chuta com o ajuste fino.
 *  tempo: no nível 2 ignora alvos que vão apagar antes da bola chegar; antecipa: no nível 3 mira à frente do alvo. */
const mira = (o: { tempo?: boolean; antecipa?: boolean } = {}): Politica => (e, r) => {
  const out = [0, 0, 0]; pilotoPrecisao(e, r, 1, out, { tempo: !!o.tempo, antecipa: !!o.antecipa }); return out as Acoes;
};
const parado: Politica = () => [0, 0, 3];
const gira: Politica = e => [(Math.round(e.t * 4)) % 16, 0, 3];
const aleatorio: Politica = (_, r) => [r.int(16), r.int(3), r.int(6)];

function joga(seed: number, nivel: Nivel, f: Politica) {
  const e = new PrecisionDrill(seed, true, nivel), r = new Rng(seed + 1);
  let a: Acoes = [0, 0, 0], q = 0;
  while (!e.done) { if (q++ % DECISAO_QUADROS === 0) a = f(e, r); e.step(...a); }
  return e;
}
const media = (nivel: Nivel, f: Politica, n = 40) => {
  let h = 0; for (let s = 1; s <= n; s++) h += joga(s, nivel, f).hits; return h / n;
};

test('precisão: mesma semente e mesmas ações geram a mesma tentativa, nos 3 níveis', () => {
  for (const nivel of [1, 2, 3] as Nivel[]) for (let s = 1; s <= 30; s++) {
    const a = joga(s, nivel, aleatorio), b = joga(s, nivel, aleatorio);
    assert.deepEqual(a.events, b.events);
    assert.deepEqual(a.player, b.player);
  }
});

test('precisão: nível 1 não apaga alvos, nível 2 apaga, nível 3 move', () => {
  assert.ok(joga(5, 1, aleatorio).events!.every(ev => ev.type !== 'off'));
  assert.ok(joga(5, 2, aleatorio).events!.some(ev => ev.type === 'off'));
  const e = new PrecisionDrill(5, false, 3), x0 = e.targets.map(t => t.x);
  for (let i = 0; i < 30; i++) e.step(0, 0, 0);
  e.targets.forEach((t, i) => { assert.notEqual(t.x, x0[i]); assert.ok(Math.abs(Math.hypot(t.x, t.z) - t.r) < 1e-9); });
});

test('precisão: o ajuste fino muda a direção do chute', () => {
  const dirs = [1, 3, 5].map(k => { const e = new PrecisionDrill(9, true, 1); e.step(0, 0, k); return (e.events!.find(ev => ev.type === 'kick') as { h: number }).h; });
  assert.ok(dirs[0] < dirs[1] && dirs[1] < dirs[2], JSON.stringify(dirs));
});

test('precisão: o domínio de cada nível fica entre o robô sem e com o comportamento do nível', () => {
  const sem = { 1: () => media(1, aleatorio), 2: () => media(2, mira()), 3: () => media(3, mira()) };
  const com = { 1: () => media(1, mira()), 2: () => media(2, mira({ tempo: true })), 3: () => media(3, mira({ antecipa: true })) };
  for (const n of [1, 2, 3] as Nivel[]) {
    const a = sem[n](), b = com[n]();
    assert.ok(a < D[n] - 0.4 && D[n] < b - 1.5, `nível ${n}: sem ${a} domínio ${D[n]} com ${b}`);
    for (const f of [parado, gira, aleatorio]) assert.ok(media(n, f) < 7, `nível ${n} ação constante ${media(n, f)}`);
  }
});
