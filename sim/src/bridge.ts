/**
 * Ponte entre a simulação (TypeScript) e o treino (Python).
 *
 * O Python inicia este processo e conversa por stdin/stdout com quadros binários:
 *   [u32 tamanho][u8 operação][dados]
 * Operações:
 *   1 init      JSON  { nEnvs, seed, maxTime, untilGoal, skillProb, shaping }
 *   2 step      Int32 ações (nEnvs × 4 atletas × 4)
 *   3 configure JSON  { envs: [{ bot?: boolean, specs?: PlayerSpec[] }] }  (vale a partir do próximo reinício)
 *   4 reset     reinicia todos os ambientes agora
 * Resposta a init/step/reset:
 *   [u32 tamanho][u32 tamanho do JSON][JSON com episódios encerrados][obs Float32][recompensas Float32][fim Uint8]
 *
 * Cada ambiente reinicia sozinho quando a partida termina (a observação devolvida já é
 * a da nova partida).
 */
import { Match, OBS_SIZE, PlayerSpec, randomSpec, CFG } from './soccer.js';
import { Rng } from './rng.js';
import { botActions } from './bot.js';

interface Cfg { nEnvs: number; seed: number; maxTime: number; untilGoal: boolean; skillProb: number; botSkill: number; shaping: { progress: number; touch: number; approach: number; onTarget: number } }
type CfgIn = Pick<Cfg, 'nEnvs' | 'seed'> & Partial<Cfg>;
interface EnvCfg { bot?: boolean; specs?: PlayerSpec[] }

let cfg: Cfg;
let envs: Match[] = [];
let envCfg: EnvCfg[] = [];
let prevProg: number[] = [];
let prevApp: number[][] = [];
let seedRng: Rng;
let obs: Float32Array, rew: Float32Array, dones: Uint8Array;
const botBuf = new Int32Array(16);
const botRng = new Rng(12345);

function newMatch(i: number): Match {
  const ec = envCfg[i] || {};
  const specs = ec.specs ?? [0, 1, 2, 3].map(() => randomSpec(seedRng, cfg.skillProb));
  const m = new Match(specs, (seedRng.next() * 2 ** 32) >>> 0, { maxTime: cfg.maxTime, untilGoal: cfg.untilGoal });
  prevProg[i] = m.ball.x / CFG.W;
  prevApp[i] = [approachPot(m, 0), approachPot(m, 1)];
  return m;
}

/** potencial de aproximação: quanto mais perto da bola o atleta mais próximo do time, maior */
function approachPot(m: Match, team: number) {
  const b = m.ball;
  return -Math.min(...m.players.filter(p => p.team === team).map(p => Math.hypot(p.x - b.x, p.z - b.z))) / 35;
}

function summary(i: number, m: Match) {
  return {
    env: i, score: m.score, t: +m.t.toFixed(2), bot: !!envCfg[i]?.bot,
    teams: m.teamStats.map(t => ({ poss: +t.poss.toFixed(2), depth: t.depthTime > 0 ? +(t.depthSum / t.depthTime).toFixed(3) : null, depthTime: +t.depthTime.toFixed(2), shotsFaced: t.shotsFaced, longShotsFaced: t.longShotsFaced })),
    players: m.players.map(p => ({ skills: p.spec.skills, rating: Math.round(30 + 65 * Object.values(p.spec.attrs).reduce((a, b) => a + b, 0) / 6), ...p.st })),
  };
}

function writeObs() {
  for (let i = 0; i < envs.length; i++) for (let k = 0; k < 4; k++) envs[i].observe(k, obs, (i * 4 + k) * OBS_SIZE);
}

function respond(info: unknown[]) {
  const json = Buffer.from(JSON.stringify(info));
  const body = Buffer.concat([
    u32(json.length), json,
    Buffer.from(obs.buffer, obs.byteOffset, obs.byteLength),
    Buffer.from(rew.buffer, rew.byteOffset, rew.byteLength),
    Buffer.from(dones.buffer, dones.byteOffset, dones.byteLength),
  ]);
  process.stdout.write(Buffer.concat([u32(body.length), body]));
}
function u32(n: number) { const b = Buffer.alloc(4); b.writeUInt32LE(n, 0); return b; }

function init(c: CfgIn) {
  cfg = { maxTime: 30, untilGoal: true, skillProb: 0.5, botSkill: 1, ...c, shaping: { progress: 0.5, touch: 0.02, approach: 0, onTarget: 0, ...(c.shaping || {}) } };
  seedRng = new Rng(cfg.seed);
  envCfg = Array.from({ length: cfg.nEnvs }, (_, i) => envCfg[i] || {});
  prevProg = new Array(cfg.nEnvs).fill(0);
  prevApp = Array.from({ length: cfg.nEnvs }, () => [0, 0]);
  envs = Array.from({ length: cfg.nEnvs }, (_, i) => newMatch(i));
  obs = new Float32Array(cfg.nEnvs * 4 * OBS_SIZE);
  rew = new Float32Array(cfg.nEnvs * 4);
  dones = new Uint8Array(cfg.nEnvs);
  writeObs(); rew.fill(0); dones.fill(0);
  respond([]);
}

function step(actions: Int32Array) {
  const info: unknown[] = [];
  const sh = cfg.shaping;
  for (let i = 0; i < envs.length; i++) {
    const m = envs[i];
    const acts = actions.subarray(i * 16, i * 16 + 16);
    if (envCfg[i]?.bot) {
      botBuf.set(acts); botActions(m, 1, botBuf);
      // robô mais fraco no começo do treino (currículo): às vezes fica parado
      for (const k of [2, 3]) if (botRng.next() > cfg.botSkill) { botBuf[k * 4] = 1; botBuf[k * 4 + 2] = 0; botBuf[k * 4 + 3] = 0; }
      m.step(botBuf);
    } else m.step(acts);
    const shotOn = [false, false, false, false];
    if (m.lastKickOnTarget >= 0) shotOn[m.lastKickOnTarget] = true;
    const prog = m.ball.x / CFG.W, dProg = prog - prevProg[i];
    prevProg[i] = prog;
    for (let k = 0; k < 4; k++) {
      const s = k < 2 ? 1 : -1, team = k < 2 ? 0 : 1;
      const app = approachPot(m, team);
      let r = sh.progress * s * dProg + (m.touched[k] ? sh.touch : 0) + sh.approach * (app - prevApp[i][team]) + (shotOn[k] ? sh.onTarget : 0);
      if (m.goalTeam === team) r += 1; else if (m.goalTeam === 1 - team) r -= 1;
      rew[i * 4 + k] = r;
    }
    prevApp[i] = [approachPot(m, 0), approachPot(m, 1)];
    if (m.goalTeam >= 0) prevProg[i] = 0; // recomeço no meio não conta como avanço
    dones[i] = m.done ? 1 : 0;
    if (m.done) { info.push(summary(i, m)); envs[i] = newMatch(i); }
  }
  writeObs();
  respond(info);
}

let buf: Buffer = Buffer.alloc(0);
process.stdin.on('data', (chunk: Buffer) => {
  buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
  while (buf.length >= 4) {
    const len = buf.readUInt32LE(0);
    if (buf.length < 4 + len) break;
    const frame = buf.subarray(4, 4 + len);
    buf = buf.subarray(4 + len);
    const op = frame[0], data = frame.subarray(1);
    if (op === 1) init(JSON.parse(data.toString()));
    else if (op === 2) {
      const a = new Int32Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
      step(a);
    } else if (op === 3) {
      const c = JSON.parse(data.toString()) as { envs: EnvCfg[] };
      c.envs.forEach((e, i) => { envCfg[i] = e; });
    } else if (op === 4) {
      envs = envs.map((_, i) => newMatch(i)); writeObs(); rew.fill(0); dones.fill(0); respond([]);
    } else if (op === 5) {
      cfg.botSkill = JSON.parse(data.toString()).botSkill;
    } else if (op === 9) process.exit(0);
  }
});
