/**
 * Monta a "fita" de uma atividade a partir dos checkpoints do treino:
 * avalia cada foto do cérebro em tentativas com sementes fixas (no nível em que a foto foi tirada),
 * escolhe ~60 fotos bem distribuídas ao longo do aprendizado e detecta os marcos para a narração.
 * A atividade vem do campo `drill` dos checkpoints (padrão: precisao).
 * Uso: node dist/scripts/make-tape.js checkpoints.json saida-tape.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { PrecisionDrill, PRECISION_OBS, PRECISION_ACTIONS, PRECISION_DOMINIO } from '../src/drills/precision.js';
import { PainelDrill, PAINEL_OBS, PAINEL_ACTIONS, type Nivel } from '../src/drills/painel.js';
import { ReflexoDrill, REFLEXO_OBS, REFLEXO_ACTIONS } from '../src/drills/reflexo.js';
import { BandejaDrill, BANDEJA_OBS, BANDEJA_ACTIONS } from '../src/drills/bandeja.js';
import { ForcaDrill, FORCA_OBS, FORCA_ACTIONS } from '../src/drills/forca.js';
import { InteligenciaDrill, INTELIGENCIA_OBS, INTELIGENCIA_ACTIONS } from '../src/drills/inteligencia.js';
import { Rng } from '../src/rng.js';
import { DECISAO_QUADROS } from '../src/movimento.js';

interface Layer { in: number; out: number; scale: number; w: string; b: string }
interface Ckpt { update: number; steps: number; episodes: number; nivel?: number; layers: Layer[] }
const src = JSON.parse(readFileSync(process.argv[2], 'utf8')) as { drill?: string; checkpoints: Ckpt[] };
type Brain = (obs: Float32Array, rng: Rng, out: number[]) => void;
type Metrics = { hits: number; best: number; [k: string]: number };

const i16 = (hex: string) => { const b = Buffer.from(hex, 'hex'); return new Int16Array(b.buffer, b.byteOffset, b.byteLength / 2); };
function makeBrain(layers: Layer[], actions: readonly number[]): Brain {
  const W = layers.map(l => Float32Array.from(i16(l.w), v => v * l.scale));
  const B = layers.map(l => Float32Array.from(i16(l.b), v => v * l.scale));
  const bufs = [new Float32Array(layers[0].in), ...layers.map(l => new Float32Array(l.out))];
  return (obs, rng, out) => {
    bufs[0].set(obs);
    layers.forEach((l, k) => {
      const x = bufs[k], y = bufs[k + 1];
      for (let j = 0; j < l.out; j++) { let s = B[k][j]; for (let i = 0; i < l.in; i++) s += W[k][j * l.in + i] * x[i]; y[j] = k < layers.length - 1 ? Math.tanh(s) : s; }
    });
    const lg = bufs[bufs.length - 1]; let o = 0;
    actions.forEach((n, h) => {
      let m = -Infinity; for (let i = 0; i < n; i++) m = Math.max(m, lg[o + i]);
      let z = 0; for (let i = 0; i < n; i++) z += Math.exp(lg[o + i] - m);
      let u = rng.next() * z, pick = n - 1;
      for (let i = 0; i < n; i++) { u -= Math.exp(lg[o + i] - m); if (u <= 0) { pick = i; break; } }
      out[h] = pick; o += n;
    });
  };
}

/** domínio do Reflexo por nível (fração de bolas desviadas); igual ao DOMINIO do ppo_drill.py */
const REFLEXO_DOMINIO: Record<number, number> = { 1: 0.9, 2: 0.95, 3: 0.94 };
/** domínio da Bandeja (Controle) por nível: marcas e bolas caídas por tentativa; igual ao DOMINIO do ppo_drill.py */
const BANDEJA_DOMINIO: Record<number, { marcas: number; quedas: number }> = { 1: { marcas: 20, quedas: 1 }, 2: { marcas: 14, quedas: 1 }, 3: { marcas: 10, quedas: 1 } };
/** domínio da Força por nível (entregas por tentativa); igual ao DOMINIO do ppo_drill.py */
const FORCA_DOMINIO: Record<number, number> = { 1: 3, 2: 1.5, 3: 1 };
/** domínio da Inteligência por nível (pontos por tentativa); igual ao DOMINIO do ppo_drill.py */
const INTELIGENCIA_DOMINIO: Record<number, number> = { 1: 17, 2: 30, 3: 20 };
type Ev = { c: Ckpt; nivel: number; hits: number; [k: string]: any };
interface DrillTape {
  title: string; obs: number; actions: readonly number[];
  /** nova foto quando o desempenho muda maxHits/dHits ou passam gap(total) tentativas */
  dHits: number; gap(totalEpisodes: number): number;
  evaluate(brain: Brain, nivel: number): Metrics;
  marks(picked: Ev[], add: (i: number, text: string, nivel?: number) => void): void;
}

const DRILLS: Record<string, DrillTape> = {
  precisao: {
    title: 'Precisão', obs: PRECISION_OBS, actions: PRECISION_ACTIONS, dHits: 25, gap: total => total / 20,
    evaluate(brain, nivel, n = 24) {
      const obs = new Float32Array(PRECISION_OBS), a = [0, 0, 0];
      let hits = 0, kicks = 0, best = 0;
      for (let e = 0; e < n; e++) {
        const env = new PrecisionDrill(9000 + e, false, nivel as Nivel), rng = new Rng(7000 + e);
        let q = 0;
        while (!env.done) { if (q++ % DECISAO_QUADROS === 0) { env.observe(obs); brain(obs, rng, a); } env.step(a[0], a[1], a[2]); }
        hits += env.hits; kicks += env.kicks; best = Math.max(best, env.hits);
      }
      return { hits: hits / n, kicks: kicks / n, acc: kicks ? hits / kicks : 0, best };
    },
    marks(picked, add) {
      const at = (nivel: number, f: (e: Ev) => boolean) => picked.findIndex(e => e.nivel === nivel && f(e));
      // o domínio é medido no treino (média de 300 tentativas); aqui marca a última foto do nível
      const fim = (nivel: number) => picked.map(e => e.nivel).lastIndexOf(nivel), D = PRECISION_DOMINIO;
      add(0, 'Primeira tentativa: ele ainda não sabe o que é um alvo. Chuta para qualquer lado.');
      add(at(1, e => e.kicks >= 3), 'Começou a correr até a bola.');
      add(at(1, e => e.acc >= 0.3), 'Agora vira para a pilha antes de chutar.');
      add(at(1, e => e.hits >= 5), 'Já derruba 5 pilhas por tentativa.');
      add(at(1, e => e.kicks < picked[0].kicks * 0.9 && e.acc > 0.3), 'Parou de chutar a esmo: agora espera a mira ficar boa.');
      add(fim(1), `Domínio do nível 1: ${D[1]} pilhas derrubadas por tentativa.`);
      const l2 = at(2, () => true);
      add(l2, 'Nível 2 · Minigols: só um dos quatro vale por vez. A máquina solta a bola em qualquer lugar do campo; tem que buscar e chutar no gol que vale.', 2);
      if (l2 >= 0) add(at(2, e => e.kicks >= picked[l2].kicks + 2), 'Aprendeu a correr até a bola.');
      add(at(2, e => e.hits >= D[2] - 2), 'Começou a chutar no gol que vale, e não em qualquer um.');
      add(fim(2), `Domínio do nível 2: ${String(D[2]).replace('.', ',')} gols por tentativa.`);
      add(at(3, () => true), 'Nível 3 · Alvo deslizante: agora é arremesso, com a mão. O alvo corre num trilho ao longo da parede.', 3);
      add(at(3, e => e.hits >= D[3] - 3), 'Começou a arremessar à frente do alvo, onde ele vai estar.');
      add(fim(3), `Domínio do nível 3: ${D[3]} acertos por tentativa no alvo em movimento.`);
    },
  },
  velocidade: {
    title: 'Painel de luzes', obs: PAINEL_OBS, actions: PAINEL_ACTIONS, dHits: 30, gap: total => total / 25,
    evaluate(brain, nivel, n = 24) {
      const obs = new Float32Array(PAINEL_OBS), a = [0, 0];
      let hits = 0, lights = 0, reds = 0, best = 0, dist = 0, ons = 0;
      for (let e = 0; e < n; e++) {
        const env = new PainelDrill(9000 + e, false, nivel as Nivel), rng = new Rng(7000 + e);
        let q = 0;
        while (!env.done) {
          const lit = env.state.some(s => s === 1);
          if (q++ % DECISAO_QUADROS === 0) { env.observe(obs); brain(obs, rng, a); }
          env.step(a[0], a[1]);
          // distância do centro quando a próxima luz acende: mede o "voltar ao centro"
          if (!lit && env.state.some(s => s === 1)) { dist += Math.hypot(env.player.x, env.player.z); ons++; }
        }
        hits += env.hits; lights += env.lights; reds += env.reds; best = Math.max(best, env.hits);
      }
      return { hits: hits / n, lights: lights / n, acc: lights ? hits / lights : 0, reds: reds / n, centro: ons ? dist / ons : 0, best };
    },
    marks(picked, add) {
      const at = (nivel: number, f: (e: Ev) => boolean) => picked.findIndex(e => e.nivel === nivel && f(e));
      add(0, 'Primeira tentativa: anda a esmo e as luzes apagam na frente dele.');
      add(at(1, e => e.acc >= 0.2), 'Começou a correr para a luz verde.');
      add(at(1, e => e.acc >= 0.5), 'Já pisa metade das luzes.');
      add(at(1, e => e.acc >= 0.9), 'Domínio do nível 1: 9 em cada 10 luzes.');
      const l2 = at(2, () => true);
      add(l2, 'Nível 2 · Janela curta: agora as 12 placas acendem e cada luz dura só 2,8 s.', 2);
      // no começo do nível 2 ele se afasta do centro (corre até as placas de fora e fica lá); depois aprende a recuar
      if (l2 >= 0) {
        const n2 = picked.filter(e => e.nivel === 2), pico = n2.reduce((a, e) => (e.centro > a.centro ? e : a), n2[0]);
        add(picked.findIndex(e => e.nivel === 2 && e.c.episodes > pico.c.episodes && e.centro <= pico.centro - 0.4),
          'Descobriu que vale recuar para o centro entre uma luz e outra: assim alcança qualquer placa.');
      }
      add(at(2, e => e.acc >= 0.86), 'Domínio do nível 2: 86% das luzes, de qualquer canto da sala.');
      const l3 = at(3, () => true);
      add(l3, 'Nível 3 · Luzes proibidas: junto com a verde acendem 2 vermelhas. Pisar nelas trava 1 s.', 3);
      if (l3 >= 0) add(at(3, e => e.reds <= picked[l3].reds / 2 && e.reds < 0.5), 'Aprendeu a desviar das vermelhas.');
      add(at(3, e => e.acc >= 0.82 && e.reds < 0.4), 'Domínio do nível 3: pisa as verdes e foge das vermelhas.');
    },
  },
  reflexo: {
    title: 'Lançadores', obs: REFLEXO_OBS, actions: REFLEXO_ACTIONS, dHits: 18, gap: total => total / 25,
    evaluate(brain, nivel, n = 24) {
      const obs = new Float32Array(REFLEXO_OBS), a = [0, 0, 0];
      let hits = 0, shots = 0, struck = 0, best = 0;
      for (let e = 0; e < n; e++) {
        const env = new ReflexoDrill(9000 + e, false, nivel as Nivel), rng = new Rng(7000 + e);
        while (!env.done) { env.observe(obs); brain(obs, rng, a); env.step(a[0], a[1], a[2]); }
        hits += env.hits; shots += env.shots; struck += env.struck; best = Math.max(best, env.hits);
      }
      return { hits: hits / n, shots: shots / n, acc: shots ? hits / shots : 0, struck: struck / n, best };
    },
    marks(picked, add) {
      const at = (nivel: number, f: (e: Ev) => boolean) => picked.findIndex(e => e.nivel === nivel && f(e));
      // a avaliação da fita (24 tentativas com sorteio) oscila ~2 pontos em torno da média do treino
      const D = Object.fromEntries(Object.entries(REFLEXO_DOMINIO).map(([k, v]) => [k, v - 0.02]));
      add(0, 'Primeira tentativa: não entende de onde vem a bola e leva bolada atrás de bolada.');
      add(at(1, e => e.acc >= 0.3), 'Começou a sair da frente quando o lançador dispara.');
      add(at(1, e => e.acc >= 0.6), 'Já desvia mais da metade das bolas.');
      add(at(1, e => e.acc >= D[1]), `Domínio do nível 1: desvia ${Math.round(REFLEXO_DOMINIO[1] * 100)}% das bolas.`);
      add(at(2, () => true), 'Nível 2 · Quatro lançadores: a bola vem de qualquer lado, mais rápida, com meio segundo de aviso.', 2);
      add(at(2, e => e.acc >= D[2]), `Domínio do nível 2: desvia ${Math.round(REFLEXO_DOMINIO[2] * 100)}% das bolas.`);
      add(at(3, () => true), 'Nível 3 · Lançadores em movimento: eles giram em volta do tapete e às vezes disparam em par, com a segunda bola fechando a rota de fuga.', 3);
      add(at(3, e => e.acc >= D[3]), `Domínio do nível 3: desvia ${Math.round(REFLEXO_DOMINIO[3] * 100)}% das bolas, com os lançadores em movimento.`);
    },
  },
  controle: {
    title: 'Bandeja', obs: BANDEJA_OBS, actions: BANDEJA_ACTIONS, dHits: 30, gap: total => total / 25,
    // 40 tentativas: bolas caídas são raras no fim e oscilam muito com poucas tentativas
    evaluate(brain, nivel, n = 40) {
      const obs = new Float32Array(BANDEJA_OBS), a = [0, 0];
      let hits = 0, drops = 0, misses = 0, best = 0;
      for (let e = 0; e < n; e++) {
        const env = new BandejaDrill(9000 + e, false, nivel as Nivel), rng = new Rng(7000 + e);
        let q = 0;
        while (!env.done) { if (q++ % DECISAO_QUADROS === 0) { env.observe(obs); brain(obs, rng, a); } env.step(a[0], a[1]); }
        hits += env.hits; drops += env.drops; misses += env.misses; best = Math.max(best, env.hits);
      }
      // acc = marcas/25, só para a curva da página; reds = bolas caídas por tentativa
      return { hits: hits / n, acc: hits / n / 25, reds: drops / n, misses: misses / n, best };
    },
    marks(picked, add) {
      const at = (nivel: number, f: (e: Ev) => boolean) => picked.findIndex(e => e.nivel === nivel && f(e));
      const D = BANDEJA_DOMINIO, fmt = (v: number) => v.toLocaleString('pt-BR');
      // o domínio é medido no treino; nas sementes da fita a última foto do nível pode ficar um pouco abaixo
      // o treino só sobe de nível depois do domínio: o marco do domínio fica na última foto do nível
      const dom = (n: number) => { let i = -1; picked.forEach((e, k) => { if (e.nivel === n) i = k; }); return i; };
      add(0, 'Primeira tentativa: sai em disparada e a bola voa da bandeja logo na largada.');
      add(at(1, e => e.hits >= 5), 'Começou a ir de marca em marca.');
      add(at(1, e => e.hits >= 12 && e.reds <= picked[0].reds / 2), 'Aprendeu a arrancar e frear sem derrubar a bola.');
      add(dom(1), `Domínio do nível 1: ${D[1].marcas} marcas por tentativa e quase nenhuma bola no chão.`);
      const l2 = at(2, () => true);
      add(l2, 'Nível 2 · Slalom: portas em zigue-zague. Tem que passar por dentro de cada uma, virando para um lado e para o outro.', 2);
      if (l2 >= 0) add(at(2, e => e.misses <= picked[l2].misses / 2 && e.hits >= picked[l2].hits + 3), 'Começou a mirar a entrada da porta: quase não passa mais por fora.');
      add(dom(2), `Domínio do nível 2: ${D[2].marcas} portas por tentativa sem derrubar a bola.`);
      const l3 = at(3, () => true);
      add(l3, 'Nível 3 · Lombadas: faixas largas atravessam o caminho. Passar correndo faz a bola pular da bandeja.', 3);
      const pe = l3 >= 0 ? at(3, e => e.reds <= picked[l3].reds / 2) : -1;
      if (pe >= 0) add(pe, 'Aprendeu a tirar o pé antes da lombada.');
      // último nível: o domínio é a primeira foto que bate a meta (o treino pode ter continuado depois, com --retomar)
      let d3 = picked.findIndex((e, k) => k > pe && e.nivel === 3 && e.hits >= D[3].marcas - 0.3 && e.reds < D[3].quedas + 0.1);
      if (d3 < 0) d3 = dom(3);
      add(d3, `Domínio do nível 3: ${D[3].marcas} marcas por tentativa e menos de ${fmt(D[3].quedas)} bola caída.`);
      const fim = picked.length - 1, extra = picked[fim];
      if (d3 >= 0 && fim > d3 + 2 && extra.hits >= picked[d3].hits + 1)
        add(fim, `Treino extra no nível 3: chegou a ${fmt(Math.round(extra.hits * 10) / 10)} marcas por tentativa (eram ${fmt(Math.round(picked[d3].hits * 10) / 10)} no domínio).`);
    },
  },
  forca: {
    title: 'Trenó de carga', obs: FORCA_OBS, actions: FORCA_ACTIONS, dHits: 30, gap: total => total / 25,
    // 64 tentativas: com 24, a média de entregas no nível 3 oscila ±0,2 entre fotos vizinhas
    evaluate(brain, nivel, n = 64) {
      const obs = new Float32Array(FORCA_OBS), a = [0, 0];
      let hits = 0, outs = 0, locks = 0, best = 0;
      for (let e = 0; e < n; e++) {
        const env = new ForcaDrill(9000 + e, false, nivel as 1 | 2 | 3), rng = new Rng(7000 + e);
        while (!env.done) { env.observe(obs); brain(obs, rng, a); env.step(a[0], a[1]); }
        hits += env.hits; outs += env.outs; locks += env.locks; best = Math.max(best, env.hits);
      }
      // hits = marcas por tentativa; entregas = marcas / 5 (conta entrega parcial, como o domínio)
      return { hits: hits / n, entregas: hits / n / 5, outs: outs / n, locks: locks / n, best };
    },
    marks(picked, add) {
      const at = (nivel: number, f: (e: Ev) => boolean) => picked.findIndex(e => e.nivel === nivel && f(e));
      const D = FORCA_DOMINIO, fmt = (v: number) => String(v).replace('.', ',');
      // o domínio é medido no treino (janela de 300 tentativas); a última foto de cada nível é a que o atingiu
      const fim = (nivel: number) => { let k = -1; picked.forEach((e, i) => { if (e.nivel === nivel) k = i; }); return k; };
      /** primeira foto do nível, depois do pico de `k`, em que `k` caiu para a metade do pico */
      const caiu = (nivel: number, k: string, f: (e: Ev) => boolean) => {
        const n = picked.filter(e => e.nivel === nivel); if (!n.length) return -1;
        const pico = n.reduce((a, e) => (e[k] > a[k] ? e : a), n[0]);
        return pico[k] < 0.5 ? -1 : picked.findIndex(e => e.nivel === nivel && e.c.episodes > pico.c.episodes && e[k] <= pico[k] / 2 && f(e));
      };
      add(0, 'Primeira tentativa: anda em volta do trenó e não sabe por onde empurrar.');
      add(at(1, e => e.hits >= 2), 'Começou a empurrar o trenó para a frente.');
      add(at(1, e => e.entregas >= 1), 'Primeira entrega completa: levou o trenó até a linha final.');
      add(caiu(1, 'outs', e => e.entregas >= 1), 'Aprendeu a empurrar pelo centro e corrigir o rumo: o trenó sai bem menos da pista.');
      add(fim(1), `Domínio do nível 1: ${fmt(D[1])} entregas por tentativa.`);
      add(at(2, () => true), 'Nível 2 · Carga pesada: o trenó pesa 3 vezes mais e, parado, trava no chão. Só sai com um arranque.', 2);
      add(at(2, e => e.entregas >= 1), 'Aprendeu o arranque: chega andando rápido e o trenó pesado sai do lugar. Depois não solta mais.');
      add(caiu(2, 'locks', e => e.entregas >= 0.8), 'Descobriu que parar custa caro: agora empurra sem soltar o trenó.');
      add(fim(2), `Domínio do nível 2: ${fmt(D[2])} entrega por tentativa com a carga pesada.`);
      add(at(3, () => true), 'Nível 3 · Rampa: no meio da pista tem uma subida. Se soltar o trenó, ele escorrega para trás.', 3);
      add(caiu(3, 'outs', e => e.entregas >= 0.9), 'Na rampa, aprendeu a empurrar reto sem soltar: o trenó não escorrega nem sai da pista.');
      add(fim(3), `Domínio do nível 3: ${fmt(D[3])} entrega por tentativa subindo a rampa.`);
    },
  },
  inteligencia: {
    title: 'Circuito de decisão', obs: INTELIGENCIA_OBS, actions: INTELIGENCIA_ACTIONS, dHits: 16, gap: total => total / 25,
    evaluate(brain, nivel, n = 24) {
      const obs = new Float32Array(INTELIGENCIA_OBS), a = [0, 0];
      let hits = 0, taken = 0, wrong = 0, best = 0, valor = 0;
      for (let e = 0; e < n; e++) {
        const env = new InteligenciaDrill(9000 + e, false, nivel as Nivel), rng = new Rng(7000 + e);
        while (!env.done) { env.observe(obs); brain(obs, rng, a); env.step(a[0], a[1]); }
        hits += env.points; taken += env.taken; wrong += env.wrong; best = Math.max(best, env.points);
      }
      // valor: média dos pontos por posto pisado (sobe quando ele passa a escolher os de 3)
      return { hits: hits / n, taken: taken / n, valor: taken ? hits / taken : 0, wrong: wrong / n, best };
    },
    marks(picked, add) {
      const at = (nivel: number, f: (e: Ev) => boolean) => picked.findIndex(e => e.nivel === nivel && f(e));
      const D = INTELIGENCIA_DOMINIO;
      add(0, 'Primeira tentativa: anda a esmo e os postos apagam sem ele chegar perto.');
      add(at(1, e => e.hits >= 5), 'Começou a ir atrás dos postos acesos.');
      add(at(1, e => e.hits >= 12), 'Já vai direto ao posto mais perto.');
      add(at(1, e => e.hits >= D[1]), `Domínio do nível 1: ${D[1]} pontos por tentativa.`);
      const l2 = at(2, () => true);
      add(l2, 'Nível 2 · Caminhos bloqueados: postos de 1, 2 e 3 pontos que apagam, divisórias no caminho. Pisar um apaga os outros.', 2);
      if (l2 >= 0) add(at(2, e => e.taken >= picked[l2].taken + 3), 'Aprendeu a contornar as divisórias: chega a mais postos antes que apaguem.');
      // subiu de nível ao atingir o domínio no treino; a avaliação da fita (24 tentativas) pode ficar um pouco abaixo
      add(at(3, () => true) - 1, `Domínio do nível 2: ${D[2]} pontos por tentativa.`);
      const l3 = at(3, () => true);
      add(l3, 'Nível 3 · Regras que mudam: o painel diz qual cor vale e troca a cada 8 s. Posto da outra cor vale 0.', 3);
      if (l3 >= 0) add(at(3, e => e.wrong <= picked[l3].wrong / 2), 'Aprendeu a ler o painel: quase não pisa mais a cor errada.');
      add(at(3, e => e.hits >= D[3]), `Domínio do nível 3: ${D[3]} pontos por tentativa.`);
    },
  },
};

const drill = src.drill ?? 'precisao', D = DRILLS[drill];
const evals: Ev[] = src.checkpoints.map(c => { const nivel = c.nivel ?? 1; return { c, nivel, ...D.evaluate(makeBrain(c.layers, D.actions), nivel) }; });
const maxHits = Math.max(...evals.map(e => e.hits)), maxGap = D.gap(evals[evals.length - 1].c.episodes);
// escolha: sempre o começo, o fim e as duas pontas de cada subida de nível; no meio, uma foto sempre que o desempenho muda o suficiente
const picked = [evals[0]];
evals.slice(1, -1).forEach((e, k) => {
  const last = picked[picked.length - 1], next = evals[k + 2];
  if (e.nivel !== last.nivel || e.nivel !== next.nivel || Math.abs(e.hits - last.hits) >= maxHits / D.dHits || e.c.episodes - last.c.episodes > maxGap) picked.push(e);
});
picked.push(evals[evals.length - 1]);

const marks: { ck: number; text: string; nivel?: number }[] = [];
D.marks(picked, (i, text, nivel) => { if (i >= 0 && !marks.some(m => m.ck === i)) marks.push(nivel ? { ck: i, text, nivel } : { ck: i, text }); });
marks.sort((a, b) => a.ck - b.ck);

const round = (v: number) => +v.toFixed(3);
/** atividades já no movimento padrão (decisão a cada DECISAO_QUADROS quadros) */
const MOVIMENTO_PADRAO = new Set(['velocidade', 'controle', 'precisao']);
const tape = {
  exercise: drill, title: D.title, decisao: MOVIMENTO_PADRAO.has(drill) ? DECISAO_QUADROS : 1,
  dims: { obs: D.obs, actions: [...D.actions], layers: src.checkpoints[0].layers.map(l => [l.in, l.out]) },
  totalEpisodes: picked[picked.length - 1].c.episodes,
  checkpoints: picked.map(({ c, nivel, ...m }) => ({
    episodes: c.episodes, steps: c.steps, ...Object.fromEntries(Object.entries(m).map(([k, v]) => [k, round(v)])),
    ...(c.nivel ? { nivel } : {}),
    scales: c.layers.map(l => l.scale),
    w: Buffer.concat(c.layers.flatMap(l => [Buffer.from(l.w, 'hex'), Buffer.from(l.b, 'hex')])).toString('base64'),
  })),
  milestones: marks,
};
writeFileSync(process.argv[3], JSON.stringify(tape));
const f = (e: Ev) => Object.entries(e).filter(([k]) => k !== 'c').map(([k, v]) => `${k} ${typeof v === 'number' ? v.toFixed(2) : v}`).join(' ');
console.log('fotos', picked.length, 'de', evals.length, '\n  início:', f(picked[0]), '\n  fim:   ', f(picked[picked.length - 1]));
console.log('marcos:', marks.map(m => `${m.ck}: ${m.text}`).join('\n  '));
console.log('tamanho', (JSON.stringify(tape).length / 1024).toFixed(0), 'KB');
