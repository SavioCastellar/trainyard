/**
 * Confere a antecipação no nível 3 da Precisão: para cada foto de uma fita, joga tentativas e mede,
 * nos chutes que acertam, quanto o chute vai à frente do alvo (ângulo no sentido do trilho, em graus)
 * e a que distância o atleta chuta.
 * Uso: node dist/scripts/lead-check.js fitas/precisao.json
 */
import { readFileSync } from 'node:fs';
import { PrecisionDrill, PRECISION_OBS } from '../src/drills/precision.js';
import { Rng } from '../src/rng.js';

const tape = JSON.parse(readFileSync(process.argv[2], 'utf8'));
function brain(ck: any) {
  const b = Buffer.from(ck.w, 'base64'), all = new Int16Array(b.buffer, b.byteOffset, b.byteLength / 2);
  let off = 0;
  const L = tape.dims.layers.map(([nin, nout]: number[], k: number) => {
    const w = Float32Array.from(all.subarray(off, off + nin * nout), v => v * ck.scales[k]); off += nin * nout;
    const bb = Float32Array.from(all.subarray(off, off + nout), v => v * ck.scales[k]); off += nout;
    return { nin, nout, w, b: bb, y: new Float32Array(nout) };
  });
  return (obs: Float32Array, rng: Rng, out: number[]) => {
    let x: Float32Array = obs;
    L.forEach((l: any, k: number) => { for (let j = 0; j < l.nout; j++) { let s = l.b[j]; for (let i = 0; i < l.nin; i++) s += l.w[j * l.nin + i] * x[i]; l.y[j] = k < L.length - 1 ? Math.tanh(s) : s; } x = l.y; });
    let o = 0;
    tape.dims.actions.forEach((n: number, h: number) => {
      let m = -Infinity; for (let i = 0; i < n; i++) m = Math.max(m, x[o + i]);
      let z = 0; for (let i = 0; i < n; i++) z += Math.exp(x[o + i] - m);
      let u = rng.next() * z, pick = n - 1; for (let i = 0; i < n; i++) { u -= Math.exp(x[o + i] - m); if (u <= 0) { pick = i; break; } }
      out[h] = pick; o += n;
    });
  };
}
const idx = tape.checkpoints.map((c: any, i: number) => i).filter((i: number) => tape.checkpoints[i].nivel === 3);
for (const i of [idx[0] - 1, idx[0], idx[Math.floor(idx.length / 2)], idx[idx.length - 1]]) {
  const f = brain(tape.checkpoints[i]), obs = new Float32Array(PRECISION_OBS), a = [0, 0, 0];
  let lead = 0, dist = 0, n = 0, hits = 0;
  for (let s = 0; s < 24; s++) {
    const e = new PrecisionDrill(9000 + s, false, 3), r = new Rng(7000 + s);
    let pend: { lead: number; d: number } | null = null;
    while (!e.done) {
      e.observe(obs); f(obs, r, a);
      const k0 = e.kicks, h0 = e.hits, P = e.player;
      // alvo mais perto da linha do chute, no instante do chute
      const snap = e.targets.map(t => ({ ...t }));
      e.step(a[0], a[1], a[2]);
      if (e.kicks > k0) {
        let best = Infinity;
        for (const t of snap) {
          if (!t.dir) continue;
          let da = Math.atan2(t.z - P.z, t.x - P.x) - P.h; da = Math.atan2(Math.sin(da), Math.cos(da));
          if (Math.abs(da) < Math.abs(best)) {
            best = da;
            // à frente = chute girado da direção do alvo para o lado em que ele anda
            const ux = t.x - P.x, uz = t.z - P.z, vx = -Math.sin(t.a) * t.dir, vz = Math.cos(t.a) * t.dir;
            const cv = Math.sign(ux * vz - uz * vx) || 1;
            pend = { lead: -da * cv * 180 / Math.PI, d: Math.hypot(ux, uz) };
          }
        }
      }
      if (e.hits > h0 && pend) { lead += pend.lead; dist += pend.d; n++; pend = null; }
    }
    hits += e.hits;
  }
  console.log(`foto ${i} nível ${tape.checkpoints[i].nivel ?? 1}: ${(hits / 24).toFixed(1)} acertos no nível 3, chute ${(lead / n).toFixed(1)}° à frente, a ${(dist / n).toFixed(1)} m`);
}
