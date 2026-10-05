/**
 * Monta a "fita" do Treino de Precisão a partir dos checkpoints do treino:
 * avalia cada foto do cérebro em tentativas com sementes fixas, escolhe ~60 fotos
 * bem distribuídas ao longo do aprendizado e detecta os marcos para a narração.
 * Uso: node dist/scripts/make-tape.js checkpoints.json saida-tape.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { PrecisionDrill, PRECISION_OBS, PRECISION_ACTIONS } from '../src/drills/precision.js';
import { Rng } from '../src/rng.js';

interface Layer { in: number; out: number; scale: number; w: string; b: string }
interface Ckpt { update: number; steps: number; episodes: number; layers: Layer[] }
const src = JSON.parse(readFileSync(process.argv[2], 'utf8')) as { checkpoints: Ckpt[] };

const i16 = (hex: string) => { const b = Buffer.from(hex, 'hex'); return new Int16Array(b.buffer, b.byteOffset, b.byteLength / 2); };
function makeBrain(layers: Layer[]) {
  const W = layers.map(l => Float32Array.from(i16(l.w), v => v * l.scale));
  const B = layers.map(l => Float32Array.from(i16(l.b), v => v * l.scale));
  const bufs = [new Float32Array(layers[0].in), ...layers.map(l => new Float32Array(l.out))];
  return (obs: Float32Array, rng: Rng, out: number[]) => {
    bufs[0].set(obs);
    layers.forEach((l, k) => {
      const x = bufs[k], y = bufs[k + 1];
      for (let j = 0; j < l.out; j++) { let s = B[k][j]; for (let i = 0; i < l.in; i++) s += W[k][j * l.in + i] * x[i]; y[j] = k < layers.length - 1 ? Math.tanh(s) : s; }
    });
    const lg = bufs[bufs.length - 1]; let o = 0;
    PRECISION_ACTIONS.forEach((n, h) => {
      let m = -Infinity; for (let i = 0; i < n; i++) m = Math.max(m, lg[o + i]);
      let z = 0; for (let i = 0; i < n; i++) z += Math.exp(lg[o + i] - m);
      let u = rng.next() * z, pick = n - 1;
      for (let i = 0; i < n; i++) { u -= Math.exp(lg[o + i] - m); if (u <= 0) { pick = i; break; } }
      out[h] = pick; o += n;
    });
  };
}

function evaluate(c: Ckpt, n = 16) {
  const brain = makeBrain(c.layers), obs = new Float32Array(PRECISION_OBS), a = [0, 0, 0];
  let hits = 0, kicks = 0, best = 0;
  for (let e = 0; e < n; e++) {
    const env = new PrecisionDrill(9000 + e), rng = new Rng(7000 + e);
    while (!env.done) { env.observe(obs); brain(obs, rng, a); env.step(a[0], a[1], a[2]); }
    hits += env.hits; kicks += env.kicks; best = Math.max(best, env.hits);
  }
  return { hits: hits / n, kicks: kicks / n, acc: kicks ? hits / kicks : 0, best };
}

const evals = src.checkpoints.map(c => ({ c, ...evaluate(c) }));
const maxHits = Math.max(...evals.map(e => e.hits));
// escolha: sempre o começo e o fim; no meio, uma foto sempre que o desempenho muda o suficiente
const picked = [evals[0]];
for (const e of evals.slice(1, -1)) {
  const last = picked[picked.length - 1];
  if (Math.abs(e.hits - last.hits) >= maxHits / 70 || e.c.episodes - last.c.episodes > 400) picked.push(e);
}
picked.push(evals[evals.length - 1]);

const marks: { ck: number; text: string }[] = [];
const firstWhere = (f: (e: typeof picked[0]) => boolean) => picked.findIndex(f);
const add = (i: number, text: string) => { if (i >= 0 && !marks.some(m => m.ck === i)) marks.push({ ck: i, text }); };
add(0, 'Primeira tentativa: ele ainda não sabe o que é um alvo. Chuta para qualquer lado.');
add(firstWhere(e => e.acc >= 0.15), 'Começou a virar na direção dos alvos antes de chutar.');
add(firstWhere(e => e.hits >= 5), 'Já acerta 5 alvos por tentativa.');
add(firstWhere(e => e.kicks < picked[0].kicks * 0.9 && e.acc > 0.3), 'Parou de chutar a esmo: agora espera a mira ficar boa.');
add(firstWhere(e => e.hits >= 10), 'Dois dígitos: 10 acertos por tentativa.');
add(firstWhere(e => e.acc >= 0.6), 'Mais da metade dos chutes vai no alvo.');
add(firstWhere(e => e.hits >= 20), '20 acertos por tentativa. Virou máquina.');
add(firstWhere(e => e.hits >= maxHits * 0.95), 'Domínio: perto do máximo que este exercício permite.');
marks.sort((a, b) => a.ck - b.ck);

const tape = {
  exercise: 'precisao', title: 'Treino de Precisão',
  dims: { obs: PRECISION_OBS, actions: [...PRECISION_ACTIONS], layers: src.checkpoints[0].layers.map(l => [l.in, l.out]) },
  totalEpisodes: picked[picked.length - 1].c.episodes,
  checkpoints: picked.map(e => ({
    episodes: e.c.episodes, steps: e.c.steps, hits: +e.hits.toFixed(2), kicks: +e.kicks.toFixed(1), acc: +e.acc.toFixed(3), best: e.best,
    scales: e.c.layers.map(l => l.scale),
    w: Buffer.concat(e.c.layers.flatMap(l => [Buffer.from(l.w, 'hex'), Buffer.from(l.b, 'hex')])).toString('base64'),
  })),
  milestones: marks,
};
writeFileSync(process.argv[3], JSON.stringify(tape));
console.log('fotos', picked.length, 'de', evals.length, '| acertos: início', picked[0].hits.toFixed(1), 'fim', picked[picked.length - 1].hits.toFixed(1), '| precisão: início', (picked[0].acc * 100).toFixed(0) + '%', 'fim', (picked[picked.length - 1].acc * 100).toFixed(0) + '%');
console.log('marcos:', marks.map(m => `${m.ck}: ${m.text}`).join('\n  '));
console.log('tamanho', (JSON.stringify(tape).length / 1024).toFixed(0), 'KB');
