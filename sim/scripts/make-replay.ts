/**
 * Gera um replay oficial para o visualizador web.
 * Procura, entre várias sementes, uma partida movimentada (gols, defesas e chutes de longe).
 * Uso: node dist/scripts/make-replay.js actor.json saida.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { Brain, ActorWeights } from '../src/brain.js';
import { runOfficialMatch } from '../src/replay.js';
import { flatSpec, PlayerSpec } from '../src/soccer.js';

const brain = new Brain(JSON.parse(readFileSync(process.argv[2], 'utf8')) as ActorWeights);
const mk = (v: number, s: PlayerSpec['skills']): PlayerSpec => ({ ...flatSpec(v), skills: s });
const specs = [mk(0.62, { longShot: 3, keeper: 0 }), mk(0.55, { longShot: 0, keeper: 2 }), mk(0.6, { longShot: 2, keeper: 0 }), mk(0.58, { longShot: 0, keeper: 3 })];
let best = null as null | { score: number; replay: ReturnType<typeof runOfficialMatch>['replay'] };
for (let seed = 1; seed <= 120; seed++) {
  const { replay } = runOfficialMatch({ seed, specs, brains: [brain, brain], maxTime: 90 });
  const goals = replay.score[0] + replay.score[1];
  const saves = replay.events.filter(e => e.type === 'save').length;
  const longs = replay.events.filter(e => e.type === 'kick' && e.long).length;
  const close = Math.abs(replay.score[0] - replay.score[1]) <= 1 ? 2 : 0;
  const s = goals * 2 + saves * 3 + longs + close;
  if (!best || s > best.score) best = { score: s, replay };
}
writeFileSync(process.argv[3], JSON.stringify(best!.replay));
const r = best!.replay;
console.log('semente', r.seed, 'placar', r.score.join('×'), 'defesas', r.events.filter(e => e.type === 'save').length, 'chutes de longe', r.events.filter(e => e.type === 'kick' && e.long).length);
