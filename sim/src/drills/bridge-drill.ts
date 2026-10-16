/**
 * Ponte para treinos de atividade (um atleta por ambiente). Mesmo protocolo da ponte do futebol:
 *   [u32 tamanho][u8 op][dados]; op 1 init {nEnvs, seed, drill?, nivel?}, op 2 step Int32 (nEnvs × nº de decisões),
 *   op 3 nível {nivel} (vale para as próximas tentativas), op 9 sair.
 * Resposta: [u32][u32 json][json episódios encerrados][obs Float32][recompensa Float32][fim Uint8]
 * `drill` é o nome da atividade (padrão 'precisao').
 */
import { PrecisionDrill, PRECISION_OBS, PRECISION_ACTIONS } from './precision.js';
import { PainelDrill, PAINEL_OBS, PAINEL_ACTIONS, type Nivel } from './painel.js';
import { ReflexoDrill, REFLEXO_OBS, REFLEXO_ACTIONS } from './reflexo.js';
import { ForcaDrill, FORCA_OBS, FORCA_ACTIONS } from './forca.js';
import { Rng } from '../rng.js';

interface Env { done: boolean; reward: number; observe(o: Float32Array, off: number): void; step(...a: number[]): void }
const DRILLS: Record<string, { obs: number; acts: number; make(seed: number, nivel: number): Env; info(e: any): object }> = {
  precisao: { obs: PRECISION_OBS, acts: PRECISION_ACTIONS.length, make: s => new PrecisionDrill(s), info: (e: PrecisionDrill) => ({ hits: e.hits, kicks: e.kicks }) },
  velocidade: {
    obs: PAINEL_OBS, acts: PAINEL_ACTIONS.length, make: (s, n) => new PainelDrill(s, false, n as Nivel),
    info: (e: PainelDrill) => ({ hits: e.hits, lights: e.lights, reds: e.reds, nivel: e.nivel }),
  },
  // lights = bolas disparadas e encerradas (o ppo_drill mede o domínio por hits/lights)
  reflexo: {
    obs: REFLEXO_OBS, acts: REFLEXO_ACTIONS.length, make: (s, n) => new ReflexoDrill(s, false, n as Nivel),
    info: (e: ReflexoDrill) => ({ hits: e.hits, lights: e.shots, reds: 0, struck: e.struck, nivel: e.nivel }),
  },
  // hits = marcas cruzadas; lights = 5 marcas por entrega, então hits/lights = entregas por tentativa (domínio da ficha)
  forca: {
    obs: FORCA_OBS, acts: FORCA_ACTIONS.length, make: (s, n) => new ForcaDrill(s, false, n as 1 | 2 | 3),
    info: (e: ForcaDrill) => ({ hits: e.hits, lights: 5, reds: 0, delivered: e.delivered, outs: e.outs, nivel: e.nivel }),
  },
};

let D = DRILLS.precisao, nivel = 1;
let envs: Env[] = [];
let seeds: Rng;
let obs: Float32Array, rew: Float32Array, dones: Uint8Array;
const u32 = (n: number) => { const b = Buffer.alloc(4); b.writeUInt32LE(n, 0); return b; };

function respond(info: unknown[]) {
  const json = Buffer.from(JSON.stringify(info));
  const body = Buffer.concat([u32(json.length), json, Buffer.from(obs.buffer), Buffer.from(rew.buffer), Buffer.from(dones.buffer)]);
  process.stdout.write(Buffer.concat([u32(body.length), body]));
}
const fresh = () => D.make((seeds.next() * 2 ** 32) >>> 0, nivel);

function init(c: { nEnvs: number; seed: number; drill?: string; nivel?: number }) {
  D = DRILLS[c.drill ?? 'precisao']; nivel = c.nivel ?? 1;
  if (!D) throw new Error(`atividade desconhecida: ${c.drill}`);
  seeds = new Rng(c.seed);
  envs = Array.from({ length: c.nEnvs }, fresh);
  obs = new Float32Array(c.nEnvs * D.obs); rew = new Float32Array(c.nEnvs); dones = new Uint8Array(c.nEnvs);
  envs.forEach((e, i) => e.observe(obs, i * D.obs));
  respond([]);
}

function step(a: Int32Array) {
  const info: unknown[] = [], k = D.acts;
  envs.forEach((e, i) => {
    e.step(...a.subarray(i * k, i * k + k));
    rew[i] = e.reward; dones[i] = e.done ? 1 : 0;
    if (e.done) { info.push(D.info(e)); envs[i] = fresh(); }
    envs[i].observe(obs, i * D.obs);
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
    else if (op === 3) nivel = JSON.parse(data.toString()).nivel;
    else if (op === 9) process.exit(0);
  }
});
