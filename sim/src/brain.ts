/**
 * Executa o cérebro treinado (exportado em JSON pelo Python) sem nenhuma dependência.
 * Roda igual no servidor e no navegador.
 */
import { Rng } from './rng.js';
import { ACTION_DIMS, OBS_SIZE } from './soccer.js';

export interface ActorWeights {
  obs: number;
  actions: number[];
  activation: 'tanh';
  layers: { w: number[][]; b: number[] }[];
}

export class Brain {
  private readonly W: Float32Array[];
  private readonly B: Float32Array[];
  private readonly sizes: number[];
  private readonly bufs: Float32Array[];

  constructor(weights: ActorWeights) {
    if (weights.obs !== OBS_SIZE) throw new Error(`cérebro espera ${weights.obs} entradas, a simulação gera ${OBS_SIZE}`);
    this.W = weights.layers.map(l => Float32Array.from(l.w.flat()));
    this.B = weights.layers.map(l => Float32Array.from(l.b));
    this.sizes = [weights.obs, ...weights.layers.map(l => l.b.length)];
    this.bufs = this.sizes.map(n => new Float32Array(n));
  }

  /** Escolhe as 4 decisões do atleta. Com `rng`, sorteia segundo as probabilidades; sem, escolhe a mais provável. */
  act(obs: Float32Array, off: number, out: Int32Array | number[], outOff: number, rng?: Rng) {
    this.bufs[0].set(obs.subarray(off, off + OBS_SIZE));
    for (let l = 0; l < this.W.length; l++) {
      const x = this.bufs[l], y = this.bufs[l + 1], w = this.W[l], b = this.B[l], nin = this.sizes[l], nout = this.sizes[l + 1];
      for (let j = 0; j < nout; j++) {
        let s = b[j];
        const row = j * nin;
        for (let i = 0; i < nin; i++) s += w[row + i] * x[i];
        y[j] = l < this.W.length - 1 ? Math.tanh(s) : s;
      }
    }
    const logits = this.bufs[this.bufs.length - 1];
    let k = 0;
    ACTION_DIMS.forEach((n, h) => {
      let best = 0, max = -Infinity;
      for (let i = 0; i < n; i++) if (logits[k + i] > max) { max = logits[k + i]; best = i; }
      if (rng) {
        let z = 0;
        for (let i = 0; i < n; i++) z += Math.exp(logits[k + i] - max);
        let u = rng.next() * z;
        best = n - 1;
        for (let i = 0; i < n; i++) { u -= Math.exp(logits[k + i] - max); if (u <= 0) { best = i; break; } }
      }
      out[outOff + h] = best;
      k += n;
    });
  }
}
