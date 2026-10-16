import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ControleDrill, CONTROLE, type Nivel } from '../src/drills/controle.js';
import { Rng } from '../src/rng.js';

type Robo = (e: ControleDrill, r: Rng) => [number, number];
const ang = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** deslize previsto da plataforma daqui a `dt` s (0 = fixa) */
function desvio(p: ControleDrill['plats'][number], dt: number) {
  if (!p.ax && !p.az) return 0;
  const w = 2 * Math.PI / CONTROLE.period, o = (p.x - p.bx) * p.ax + (p.z - p.bz) * p.az, ov = p.vx * p.ax + p.vz * p.az;
  return o * Math.cos(w * dt) + (ov / w) * Math.sin(w * dt);
}

/** robô que mira a próxima plataforma; com `freia`, chega na curva devagar; com `espera`, só atravessa quando a móvel está alinhada */
function mira(freia: boolean, espera = false): Robo {
  return e => {
    const P = e.player, cur = e.plats[e.best], n = e.plats[e.best + 1], n2 = e.plats[e.best + 2];
    // espera: só atravessa se, quando chegar na divisa, as duas plataformas vão estar sobrepostas
    const em = (p: typeof n, dt: number) => { const o = desvio(p, dt); return [p.bx + p.ax * o, p.bz + p.az * o]; };
    const chega = Math.max(0.3, Math.hypot(n.x - P.x, n.z - P.z) / Math.max(1.5, P.v) * 0.6);
    const [ax, az] = em(cur, chega), [bx, bz] = em(n, chega);
    const fora = espera && (cur.ax || cur.az || n.ax || n.az) && Math.hypot(ax - bx, az - bz) > (cur.r + n.r) * 0.8;
    const alvo = fora ? cur : n;
    const err = ang(Math.atan2(alvo.z - P.z, alvo.x - P.x) - P.h), d = Math.hypot(alvo.x - P.x, alvo.z - P.z);
    const turn = err > 0.08 ? 2 : err < -0.08 ? 0 : 1;
    if (!freia) return [turn, 2];
    let v: number;
    if (fora) v = d < 0.15 ? 0 : Math.min(1, d * 2); // espera no centro da plataforma atual
    else {
      // velocidade alvo: devagar se precisa virar muito agora ou na próxima plataforma
      const curva = n2 ? Math.abs(ang(Math.atan2(n2.z - n.z, n2.x - n.x) - Math.atan2(n.z - P.z, n.x - P.x))) : 0;
      const vCurva = curva < 0.3 ? CONTROLE.speed : Math.min(CONTROLE.speed, 1.2 + 1.2 / curva);
      v = Math.min(Math.sqrt(vCurva ** 2 + 2 * CONTROLE.brake * 0.6 * Math.max(0, d - n.r * 0.5)), CONTROLE.speed);
    }
    if (Math.abs(err) > 0.5) v = Math.min(v, 0.6);
    return [turn, P.v > v + 0.3 ? 0 : P.v < v ? 2 : 1];
  };
}
const parado: Robo = () => [1, 1];
const frente: Robo = () => [1, 2];
const circulo: Robo = () => [2, 2];
const aleatorio: Robo = (_, r) => [r.int(3), r.int(3)];

function joga(seed: number, nivel: Nivel, f: Robo) {
  const e = new ControleDrill(seed, true, nivel), r = new Rng(seed + 1);
  while (!e.done) e.step(...f(e, r));
  return e;
}
test('controle: mesma semente e mesmas ações geram a mesma tentativa, nos 3 níveis', () => {
  for (const nivel of [1, 2, 3] as Nivel[]) for (let s = 1; s <= 20; s++) {
    const a = joga(s, nivel, aleatorio), b = joga(s, nivel, aleatorio);
    assert.deepEqual(a.events, b.events);
    assert.deepEqual(a.player, b.player);
  }
});

test('controle: trilha sem fim, sobreposta às vizinhas e dentro da área', () => {
  for (const nivel of [1, 2, 3] as Nivel[]) for (let s = 1; s <= 20; s++) {
    const e = joga(s, nivel, mira(true, true)), P = e.plats;
    assert.ok(P.length > e.best + CONTROLE.ahead - 1);
    P.forEach((p, i) => {
      assert.ok(Math.abs(p.bx) <= CONTROLE.half && Math.abs(p.bz) <= CONTROLE.half);
      if (i) assert.ok(Math.hypot(p.bx - P[i - 1].bx, p.bz - P[i - 1].bz) < p.r + P[i - 1].r);
    });
  }
});

test('controle: o domínio de cada nível fica entre o robô sem e com o comportamento do nível', () => {
  const m = (n: Nivel, f: Robo) => { let h = 0, q = 0; for (let s = 1; s <= 40; s++) { const e = joga(s, n, f); h += e.hits; q += e.falls; } return { h: h / 40, q: q / 40 }; };
  const passa = (n: Nivel, r: { h: number; q: number }) => r.h >= CONTROLE.dominio[n]!.plats && r.q < CONTROLE.dominio[n]!.falls;
  const robos = { parado, frente, circulo, aleatorio, mira: mira(false), freia: mira(true), espera: mira(true, true) };
  const r = Object.fromEntries(([1, 2, 3] as Nivel[]).map(n => [n, Object.fromEntries(Object.entries(robos).map(([k, f]) => [k, m(n, f)]))]));
  if (process.env.MEDIR) console.log(JSON.stringify(r));
  for (const n of [1, 2, 3] as Nivel[]) for (const k of ['parado', 'frente', 'circulo', 'aleatorio'])
    assert.ok(!passa(n, r[n][k]), `nível ${n}: ${k} não pode dominar`);
  assert.ok(passa(1, r[1].mira), 'nível 1: mirar a próxima domina');
  assert.ok(!passa(2, r[2].mira) && passa(2, r[2].freia), 'nível 2: só domina quem freia antes da curva');
  // nível 3: quem não espera a móvel cai demais; o robô que espera cai pouco (o atleta treinado precisa também ser rápido)
  assert.ok(!passa(3, r[3].freia) && r[3].espera.q < CONTROLE.dominio[3]!.falls, 'nível 3: só domina quem espera a móvel');
});
