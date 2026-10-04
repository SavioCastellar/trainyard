/**
 * Experimentos 3 e 4 da prova de conceito:
 *  - determinismo: 1.000 partidas oficiais rodadas duas vezes precisam sair idênticas;
 *  - tamanho do replay;
 *  - custo de CPU por partida e por passo, com projeção para N usuários.
 * Uso: node dist/scripts/bench.js caminho/actor.json
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { Brain, ActorWeights } from '../src/brain.js';
import { runOfficialMatch } from '../src/replay.js';
import { randomSpec } from '../src/soccer.js';
import { Rng } from '../src/rng.js';

const weights = JSON.parse(readFileSync(process.argv[2], 'utf8')) as ActorWeights;
const N = +(process.argv[3] || 1000);
const brain = new Brain(weights);
const hash = (s: string) => createHash('sha256').update(s).digest('hex');

function one(seed: number) {
  const r = new Rng(seed);
  const specs = [0, 1, 2, 3].map(() => randomSpec(r));
  return runOfficialMatch({ seed, specs, brains: [brain, brain], maxTime: 90 });
}

let same = 0, bytes = 0, gz = 0, steps = 0, goals = 0;
const t0 = performance.now();
const first: string[] = [];
for (let s = 1; s <= N; s++) {
  const { replay } = one(s);
  const json = JSON.stringify(replay);
  first.push(hash(json));
  bytes += json.length; gz += gzipSync(json).length; steps += replay.nFrames; goals += replay.score[0] + replay.score[1];
}
const t1 = performance.now();
for (let s = 1; s <= N; s++) if (hash(JSON.stringify(one(s).replay)) === first[s - 1]) same++;
const msPerMatch = (t1 - t0) / N, usPerStep = ((t1 - t0) * 1000) / steps;

// projeção: cada usuário joga 1 partida 2x2 por dia (1/4 de partida por usuário) e faz 3 sessões de treino;
// uma sessão de treino ≈ 300 tentativas de 10 s de um atleta (≈ 300 × 300 passos de 1 atleta).
const stepPerAthleteUs = usPerStep / 4;
const sessionSec = (300 * 300 * stepPerAthleteUs) / 1e6 * 3; // ×3: atualização do cérebro custa ~2× a simulação
const proj = [1000, 5000, 20000].map(u => {
  const cpuSecDay = (u / 4) * (msPerMatch / 1000) + u * 3 * sessionSec;
  return { usuarios: u, horas_cpu_por_dia: +(cpuSecDay / 3600).toFixed(1), nucleos_se_concentrado_em_2h: +(cpuSecDay / 7200).toFixed(1) };
});
console.log(JSON.stringify({
  partidas: N,
  identicas_na_segunda_execucao: same,
  ms_por_partida_de_90s: +msPerMatch.toFixed(2),
  microssegundos_por_passo_4_atletas: +usPerStep.toFixed(2),
  replay_kb_medio: +(bytes / N / 1024).toFixed(1),
  replay_kb_gzip_medio: +(gz / N / 1024).toFixed(1),
  gols_por_partida: +(goals / N).toFixed(2),
  segundos_cpu_por_sessao_de_treino_estimado: +sessionSec.toFixed(2),
  projecao: proj,
}, null, 2));
