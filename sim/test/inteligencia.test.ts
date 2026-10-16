import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InteligenciaDrill, INTELIGENCIA as I, type Nivel, type Post, type Wall } from '../src/drills/inteligencia.js';
import { Rng } from '../src/rng.js';

type Robo = (e: InteligenciaDrill, r: Rng) => [number, number];

/** se a reta até o alvo cruza uma divisória, passa pela ponta mais curta dela */
function via(e: InteligenciaDrill, tx: number, tz: number) {
  const P = e.player, m = I.playerR + I.wallT + 0.15;
  const cross = (w: Wall) => {
    const ex = w.x2 - w.x1, ez = w.z2 - w.z1, dx = tx - P.x, dz = tz - P.z, den = dx * ez - dz * ex;
    if (Math.abs(den) < 1e-9) return false;
    const qx = w.x1 - P.x, qz = w.z1 - P.z, t = (qx * ez - qz * ex) / den, u = (qx * dz - qz * dx) / den;
    const L = Math.hypot(ex, ez), k = m / L;
    return t > 0 && t < 1 && u > -k && u < 1 + k;
  };
  const w = e.walls.find(cross);
  if (!w) return { x: tx, z: tz, len: Math.hypot(tx - P.x, tz - P.z) };
  const L = Math.hypot(w.x2 - w.x1, w.z2 - w.z1), ux = (w.x2 - w.x1) / L, uz = (w.z2 - w.z1) / L, o = m + 0.4;
  const ends = [{ x: w.x1 - ux * o, z: w.z1 - uz * o }, { x: w.x2 + ux * o, z: w.z2 + uz * o }]
    .map(p => ({ ...p, len: Math.hypot(p.x - P.x, p.z - P.z) + Math.hypot(tx - p.x, tz - p.z) }));
  return ends[0].len < ends[1].len ? ends[0] : ends[1];
}
function vai(e: InteligenciaDrill, x: number, z: number): [number, number] {
  const P = e.player, w = via(e, x, z);
  let d = Math.atan2(w.z - P.z, w.x - P.x) - P.h; d = Math.atan2(Math.sin(d), Math.cos(d));
  return [Math.abs(d) < 0.08 ? 1 : d > 0 ? 2 : 0, Math.abs(d) < 0.9 ? 2 : 1];
}
export const eta = (e: InteligenciaDrill, p: Post) => {
  const P = e.player, w = via(e, p.x, p.z);
  let d = Math.atan2(w.z - P.z, w.x - P.x) - P.h; d = Math.atan2(Math.sin(d), Math.cos(d));
  return w.len / I.speed + Math.abs(d) / I.turn + 0.25;
};
/** escolhe o posto de maior nota e corre para ele; só troca de alvo se o novo for bem melhor */
const alvo = new WeakMap<InteligenciaDrill, number>();
export const robo = (nota: (e: InteligenciaDrill, p: Post) => number): Robo => e => {
  const on = e.posts.filter(p => p.on);
  if (!on.length) return [1, 1];
  let best = on.reduce((a, p) => (nota(e, p) > nota(e, a) ? p : a));
  const cur = on.find(p => p.id === alvo.get(e));
  if (cur && nota(e, cur) > 0 && nota(e, best) < nota(e, cur) * 1.25) best = cur;
  alvo.set(e, best.id);
  return vai(e, best.x, best.z);
};
export const alcanca = (e: InteligenciaDrill, p: Post) => !p.life0 || eta(e, p) < p.life;
/** valor que o posto terá quando o atleta chegar (a cor pode trocar no caminho) */
const valorNaChegada = (e: InteligenciaDrill, p: Post) =>
  !p.color ? p.value : (p.color === e.active) !== (eta(e, p) > e.swapIn) ? p.value : 0;

export const ROBOS: Record<string, Robo> = {
  parado: () => [1, 1],
  frente: () => [1, 2],
  circulo: () => [2, 2],
  aleatorio: (_, r) => [r.int(3), r.int(3)],
  /** o mais perto, sem olhar valor nem tempo */
  perto: robo((e, p) => -eta(e, p)),
  /** o mais perto que ainda dá tempo de pegar, sem olhar valor */
  pertoVivo: robo((e, p) => (alcanca(e, p) ? 100 : 0) - eta(e, p)),
  /** valor por tempo, só os que dá tempo de pegar; sem olhar a cor */
  daltonico: robo((e, p) => (alcanca(e, p) ? p.value / (eta(e, p) + 0.6) : -eta(e, p) / 100)),
  /** valor por tempo, com a cor na hora da chegada */
  /** valor por tempo, mas sem olhar se dá tempo */
  semRelogio: robo((e, p) => valorNaChegada(e, p) / (eta(e, p) + 0.6)),
  esperto: robo((e, p) => (alcanca(e, p) ? valorNaChegada(e, p) / (eta(e, p) + 0.6) : -1) - eta(e, p) / 100),
};

export function joga(seed: number, nivel: Nivel, f: Robo) {
  const e = new InteligenciaDrill(seed, true, nivel), r = new Rng(seed + 1);
  while (!e.done) e.step(...f(e, r));
  return e;
}
export const media = (nivel: Nivel, f: Robo, n = 40) => {
  let s = 0; for (let k = 1; k <= n; k++) s += joga(k, nivel, f).points; return s / n;
};

test('inteligencia: mesma semente e mesmas ações geram a mesma tentativa, nos 3 níveis', () => {
  for (const nivel of [1, 2, 3] as Nivel[]) for (let s = 1; s <= 30; s++) {
    const a = joga(s, nivel, ROBOS.aleatorio), b = joga(s, nivel, ROBOS.aleatorio);
    assert.deepEqual(a.events, b.events);
    assert.deepEqual(a.player, b.player);
  }
});

/** domínio por nível (pontos por tentativa); igual ao DOMINIO do training/ppo_drill.py */
const DOMINIO = { 1: 17, 2: 30, 3: 20 };

test('inteligencia: ação constante não pontua; o domínio fica entre o robô sem e com o comportamento do nível', () => {
  const m = (n: Nivel, k: string) => media(n, ROBOS[k]);
  for (const n of [1, 2, 3] as Nivel[]) for (const k of ['parado', 'frente', 'circulo', 'aleatorio'])
    assert.ok(m(n, k) < 3, `nível ${n} ${k} ${m(n, k)}`);
  // nível 1: ir até um posto; nível 2: escolher pelo valor (o mais perto não basta); nível 3: ler a cor do painel
  const faixas: [Nivel, string, string][] = [[1, 'aleatorio', 'perto'], [2, 'perto', 'esperto'], [3, 'daltonico', 'esperto']];
  for (const [n, sem, com] of faixas)
    assert.ok(m(n, sem) < DOMINIO[n] - 2 && DOMINIO[n] < m(n, com) - 2, `nível ${n}: ${sem} ${m(n, sem)} · domínio ${DOMINIO[n]} · ${com} ${m(n, com)}`);
});

test('inteligencia: pisar um posto apaga a leva; nível 1 sem divisórias nem cor, nível 3 troca a cor a cada 8 s', () => {
  const a = joga(2, 1, ROBOS.perto);
  assert.equal(a.walls.length, 0);
  assert.ok(a.events!.every(ev => ev.type !== 'spawn' || (ev.value === 1 && ev.color === 0 && ev.life === 0)));
  const c = joga(2, 3, ROBOS.esperto), ev = c.events!;
  assert.equal(c.walls.length, 3);
  assert.equal(ev.filter(e => e.type === 'swap').length, 3);
  assert.ok(!ev.filter(e => e.type === 'take' || e.type === 'wave').map(e => e.type).join().includes('take,take'));
});
