/**
 * Ponte para treinos de atividade (um atleta por ambiente). Mesmo protocolo da ponte do futebol:
 *   [u32 tamanho][u8 op][dados]; op 1 init {nEnvs, seed}, op 2 step Int32 (nEnvs × 3), op 9 sair.
 * Resposta: [u32][u32 json][json episódios encerrados][obs Float32][recompensa Float32][fim Uint8]
 */
import { PrecisionDrill, PRECISION_OBS } from './precision.js';
import { Rng } from '../rng.js';

let envs: PrecisionDrill[] = [];
let seeds: Rng;
let obs: Float32Array, rew: Float32Array, dones: Uint8Array;
const u32 = (n: number) => { const b = Buffer.alloc(4); b.writeUInt32LE(n, 0); return b; };

function respond(info: unknown[]) {
  const json = Buffer.from(JSON.stringify(info));
  const body = Buffer.concat([u32(json.length), json, Buffer.from(obs.buffer), Buffer.from(rew.buffer), Buffer.from(dones.buffer)]);
  process.stdout.write(Buffer.concat([u32(body.length), body]));
}
const fresh = () => new PrecisionDrill((seeds.next() * 2 ** 32) >>> 0);

function init(c: { nEnvs: number; seed: number }) {
  seeds = new Rng(c.seed);
  envs = Array.from({ length: c.nEnvs }, fresh);
  obs = new Float32Array(c.nEnvs * PRECISION_OBS); rew = new Float32Array(c.nEnvs); dones = new Uint8Array(c.nEnvs);
  envs.forEach((e, i) => e.observe(obs, i * PRECISION_OBS));
  respond([]);
}

function step(a: Int32Array) {
  const info: unknown[] = [];
  envs.forEach((e, i) => {
    e.step(a[i * 3], a[i * 3 + 1], a[i * 3 + 2]);
    rew[i] = e.reward; dones[i] = e.done ? 1 : 0;
    if (e.done) { info.push({ hits: e.hits, kicks: e.kicks }); envs[i] = fresh(); }
    envs[i].observe(obs, i * PRECISION_OBS);
  });
  respond(info);
}

let buf: Buffer = Buffer.alloc(0);
process.stdin.on('data', (chunk: Buffer) => {
  buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
  while (buf.length >= 4) {
    const len = buf.readUInt32LE(0);
    if (buf.length < 4 + len) break;
    const frame = buf.subarray(4, 4 + len); buf = buf.subarray(4 + len);
    const op = frame[0], data = frame.subarray(1);
    if (op === 1) init(JSON.parse(data.toString()));
    else if (op === 2) step(new Int32Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)));
    else if (op === 9) process.exit(0);
  }
});
