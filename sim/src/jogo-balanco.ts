/**
 * Balanço: joga temporadas inteiras com perfis de jogador para ver se a economia, a progressão e a
 * pontuação fazem sentido. `simularTemporada` = um atleta contra uma liga média; `simularLiga` =
 * várias atléticas com convocação, rodadas, mata-mata e caixa. Usado por `scripts/balanco.ts`,
 * `scripts/liga.ts`, pelos testes e pela página de regras.
 */
import { Rng } from './rng.js';
import {
  Atleta, Atributo, Encaixe, CATALOGO, MELHORIAS, novoAtleta, treinar, trabalhar, funcoesDisponiveis,
  registrarPartida, expedicao, comprar, equipar, reparar, tratar, custoTratamento, virarDia, forca, especialidades,
  convocar, sortearResultado, Resultado, REGRAS, novaTemporada,
} from './jogo.js';

export const DIAS_TEMPORADA = 42;
export const FIM_FASE_REGULAR = 35;

export interface Perfil {
  nome: string;
  descricao: string;
  treinos: number; trabalhos: number; amistosos: number;
  foco: Atributo[];
  ausente: (dia: number) => boolean;
}

// atributos com treino no lançamento
const TODOS: Atributo[] = ['precisao', 'reflexo', 'inteligencia', 'velocidade', 'forca', 'controle'];

export const PERFIS: Record<string, Perfil> = {
  dedicado: { nome: 'Dedicado', descricao: '5 ações todo dia: 2 treinos (os 6 atributos do lançamento), 2 trabalhos, 1 amistoso.',
    treinos: 2, trabalhos: 2, amistosos: 1, foco: TODOS, ausente: () => false },
  especialista: { nome: 'Especialista', descricao: '4 treinos e 1 trabalho, só Força e Precisão (busca a especialidade Artilheiro).',
    treinos: 4, trabalhos: 1, amistosos: 0, foco: ['forca', 'precisao'], ausente: () => false },
  trabalhador: { nome: 'Trabalhador', descricao: '1 treino e 4 trabalhos: compra o melhor equipamento cedo.',
    treinos: 1, trabalhos: 4, amistosos: 0, foco: TODOS, ausente: () => false },
  casual: { nome: 'Casual', descricao: '3 ações por dia, some 2 dias por semana.',
    treinos: 1, trabalhos: 1, amistosos: 1, foco: TODOS, ausente: d => d % 7 >= 5 },
  abandono: { nome: 'Some 10 dias', descricao: 'Dedicado, mas some do dia 15 ao 24.',
    treinos: 2, trabalhos: 2, amistosos: 1, foco: TODOS, ausente: d => d >= 15 && d <= 24 },
};

/** Força média dos adversários ao longo da temporada (estimativa para o atleta isolado). */
export const forcaLiga = (dia: number) => 34 + 0.55 * dia;

/** Livro-caixa: entradas e saídas de créditos por categoria (valores líquidos para o atleta). */
export type Livro = Record<string, number>;
const lancar = (l: Livro, k: string, v: number) => { l[k] = (l[k] ?? 0) + v; };

/** Compra a melhoria mais barata do kit de futebol que couber no bolso e já equipa. */
function comprarMelhoria(a: Atleta) {
  const nivelNo = (enc: Encaixe) => { const p = a.kit[enc]; return p ? Number(p.id.slice(-1)) : 0; };
  const opcoes = CATALOGO.filter(i => i.modalidade === 'futebol' && i.nivel === nivelNo(i.encaixe) + 1 && i.preco <= a.creditos)
    .sort((x, y) => x.preco - y.preco);
  if (!opcoes.length) return 0;
  comprar(a, opcoes[0].id);
  equipar(a, a.guardados.length - 1);
  a.guardados.length = 0; // a peça antiga é descartada na simulação
  return opcoes[0].preco;
}

/** Um dia de ações de um perfil (sem a rodada oficial). `forcaRival` = adversário dos amistosos. */
function agir(a: Atleta, p: Perfil, rng: Rng, forcaRival: number, livro: Livro, nivelCT = 0, nivelDM = 0, pularAmistoso = false, usarPreparador = true) {
  if (a.lesao > 0 && a.creditos >= custoTratamento(a)) { lancar(livro, 'medico', custoTratamento(a)); tratar(a); }
  // preparador só com o kit de futebol completo no nível Elite e uma reserva de 600 para consertos
  const kitCompleto = (['calcado', 'roupa', 'acessorio'] as Encaixe[]).every(e => a.kit[e]?.id.endsWith('3'));
  for (let t = 0; t < p.treinos && a.lesao === 0; t++) {
    const prep = usarPreparador && kitCompleto && a.creditos >= 600 + REGRAS.custoPreparador;
    if (prep) lancar(livro, 'preparador', REGRAS.custoPreparador);
    treinar(a, p.foco.reduce((m, k) => (a.atrib[k] < a.atrib[m] ? k : m)), nivelCT, prep);
  }
  let caixa = 0;
  for (let t = 0; t < p.trabalhos; t++) {
    const r = trabalhar(a, funcoesDisponiveis(a).at(-1)!.id);
    lancar(livro, 'salario', r.liquido); caixa += r.caixa;
  }
  for (let t = 0; t < p.amistosos && a.lesao === 0 && !pularAmistoso; t++) {
    const r = registrarPartida(a, 'futebol', sortearResultado(forca(a, 'futebol'), forcaRival, rng.next()), false, rng, nivelDM);
    lancar(livro, 'amistoso', r.premio); caixa += r.caixa;
  }
  return caixa; // parte que vai para o caixa da atlética
}

/** Depois das partidas: conserta o que está no fim e compra melhorias. */
function manter(a: Atleta, livro: Livro) {
  for (const enc of Object.keys(a.kit) as Encaixe[]) if (a.kit[enc]!.usos <= 2) {
    const c = a.creditos;
    try { reparar(a, enc); lancar(livro, 'reparo', c - a.creditos); } catch { /* sem dinheiro */ }
  }
  for (let g; (g = comprarMelhoria(a)); ) lancar(livro, 'equipamento', g);
}

export interface DiaBalanco { dia: number; creditos: number; forma: number; forca: number; maior: number; especialidades: string[]; kit: number; lesao: number }

/** Um atleta contra a liga média. Com `temporadas` > 1 a temporada recomeça (dia 1) com `novaTemporada`. */
export function simularTemporada(perfilId: string, seed: number, temporadas = 1, usarPreparador = true) {
  const p = PERFIS[perfilId], rng = new Rng(seed * 7919 + 1), a = novoAtleta(seed);
  const dias: DiaBalanco[] = [], livro: Livro = {};
  for (let i = 0; i < DIAS_TEMPORADA * temporadas; i++) {
    const dia = (i % DIAS_TEMPORADA) + 1;
    if (i && dia === 1) novaTemporada(a);
    if (!p.ausente(dia)) {
      agir(a, p, rng, forcaLiga(dia), livro, 0, 0, false, usarPreparador);
      if (a.lesao === 0 && dia % 2 === 0) // convocado em metade das rodadas
        lancar(livro, 'oficial', registrarPartida(a, 'futebol', sortearResultado(forca(a, 'futebol'), forcaLiga(dia), rng.next()), true, rng).premio);
      manter(a, livro);
    }
    virarDia(a);
    const kit = Object.values(a.kit).reduce((s, q) => s + Number(q!.id.slice(-1)), 0);
    dias.push({ dia, creditos: a.creditos, forma: a.forma, forca: forca(a, 'futebol'),
      maior: Math.max(...Object.values(a.atrib)), especialidades: especialidades(a).map(t => t.nome), kit, lesao: a.lesao });
  }
  const ganho = (livro.salario ?? 0) + (livro.amistoso ?? 0) + (livro.oficial ?? 0);
  const gastoKit = (livro.equipamento ?? 0) + (livro.reparo ?? 0);
  const primeiraEspecialidade = dias.find(d => d.especialidades.length)?.dia ?? null;
  return { perfil: p.nome, dias, ganho, gastoKit, gastoMedico: livro.medico ?? 0, primeiraEspecialidade, final: a, livro };
}

// ---------------------------------------------------------------- liga

export interface Membro { atleta: Atleta; perfil: string; convocacoes: number; jogos: number }
export interface Atletica { nome: string; engajamento: number; membros: Membro[]; caixa: number; ct: number; dm: number; pts: number; v: number; e: number; d: number; gp: number }

/** Perfis sorteados conforme o engajamento da atlética (0 = pouco ativa, 1 = muito ativa). */
function sortearPerfil(rng: Rng, eng: number) {
  const pesos: [string, number][] = [
    ['dedicado', 0.1 + 0.35 * eng], ['especialista', 0.05 + 0.15 * eng], ['trabalhador', 0.1],
    ['casual', 0.55 - 0.45 * eng], ['abandono', 0.2 - 0.05 * eng],
  ];
  let x = rng.next() * pesos.reduce((s, [, w]) => s + w, 0);
  for (const [id, w] of pesos) if ((x -= w) < 0) return id;
  return 'casual';
}

/** Tabela em rodízio (método do círculo): pares do dia `d` (0-based) para `n` atléticas (n par). */
export function pares(n: number, d: number): [number, number][] {
  const r = d % (n - 1), rot = [0, ...Array.from({ length: n - 1 }, (_, i) => 1 + ((i + r) % (n - 1)))];
  return Array.from({ length: n / 2 }, (_, i) => [rot[i], rot[n - 1 - i]]);
}

export interface PartidaLiga { dia: number; a: number; b: number; fa: number; fb: number; res: Resultado; fase: 'regular' | 'semi' | 'final' }

export interface OpcoesLiga { atleticas?: number; membros?: number; duplas?: number; preparo?: number; vantagem?: boolean }
export function simularLiga(seed: number, { atleticas: nAtleticas = 6, membros: nMembros = 12, duplas = REGRAS.duplasPorRodada, preparo = REGRAS.pontosPreparo, vantagem = REGRAS.vantagemCampanha }: OpcoesLiga = {}) {
  const rng = new Rng(seed * 104729 + 7), livro: Livro = {}, partidas: PartidaLiga[] = [];
  const ats: Atletica[] = Array.from({ length: nAtleticas }, (_, k) => {
    const engajamento = k / (nAtleticas - 1);
    return {
      nome: `Atlética ${String.fromCharCode(65 + k)}`, engajamento, caixa: 0, ct: 0, dm: 0, pts: 0, v: 0, e: 0, d: 0, gp: 0,
      membros: Array.from({ length: nMembros }, (_, i) => ({ atleta: novoAtleta(seed * 1000 + k * 50 + i), perfil: sortearPerfil(rng, engajamento), convocacoes: 0, jogos: 0 })),
    };
  });
  const moeda: number[] = [], caixas: number[] = [];
  const caixaDe = (at: Atletica, c: number) => { at.caixa += c; lancar(livro, 'caixaEntrada', c); };

  function jogar(dia: number, ia: number, ib: number, fase: PartidaLiga['fase']) {
    // cada atlética escala `duplas` duplas pela ordem do índice; dupla i enfrenta dupla i
    const escala = [ats[ia], ats[ib]].map(at => {
      const conv = convocar(at.membros.map(m => m.atleta), 'futebol', 2 * duplas).map(i => at.membros[i]);
      conv.forEach(m => m.convocacoes++);
      return conv;
    });
    const inv: Record<Resultado, Resultado> = { v: 'd', e: 'e', d: 'v' };
    const pts = (r: Resultado) => (r === 'v' ? REGRAS.pontosVitoria : r === 'e' ? REGRAS.pontosEmpate : 0);
    let saldo = 0;
    for (let j = 0; j < duplas; j++) {
      const ds = escala.map(c => c.slice(2 * j, 2 * j + 2));
      const f = ds.map(d => d.length === 2 ? (forca(d[0].atleta, 'futebol') + forca(d[1].atleta, 'futebol')) / 2 : 0); // W.O. = força 0
      let res = sortearResultado(f[0], f[1], rng.next());
      if (fase !== 'regular' && res === 'e') res = rng.next() < 0.5 ? 'v' : 'd'; // pênaltis
      saldo += pts(res) - pts(inv[res]);
      ds.forEach((d, i) => {
        const at = i === 0 ? ats[ia] : ats[ib], r = i === 0 ? res : inv[res];
        if (fase === 'regular') { at.pts += pts(r); at[r]++; }
        for (const m of d) {
          m.jogos++;
          const out = registrarPartida(m.atleta, 'futebol', r, true, rng, at.dm);
          lancar(livro, 'oficial', out.premio); caixaDe(at, out.caixa);
        }
      });
      partidas.push({ dia, a: ia, b: ib, fa: f[0], fb: f[1], res, fase });
    }
    // série do mata-mata: vence o confronto quem fez mais pontos nos jogos do dia (empate: pênaltis)
    return saldo > 0 || (saldo === 0 && rng.next() < 0.5) ? 'v' : 'd';
  }

  // série melhor de 3; `ia` é o melhor colocado e começa com 1 vitória (vantagem de campanha)
  const serie = (ia: number, ib: number, dias: number[], fase: PartidaLiga['fase']) => {
    let wa = vantagem ? 1 : 0, wb = 0;
    for (const d of dias) { if (wa === 2 || wb === 2) break; jogar(d, ia, ib, fase) === 'v' ? wa++ : wb++; }
    return wa > wb ? ia : ib;
  };
  let semis: [number, number][] = [], finalistas: number[] = [], campeao = -1, lider = -1;

  for (let dia = 1; dia <= DIAS_TEMPORADA; dia++) {
    // 1) ações do dia
    for (const at of ats) {
      const presentes = at.membros.filter(m => !PERFIS[m.perfil].ausente(dia));
      const grupo = dia % 2 ? presentes.filter(m => m.perfil === 'dedicado' && m.atleta.lesao === 0).slice(0, 4) : [];
      const emExpedicao = grupo.length >= 3;
      for (const m of presentes)
        caixaDe(at, agir(m.atleta, PERFIS[m.perfil], rng, forcaLiga(dia), livro, at.ct, at.dm, emExpedicao && grupo.includes(m)));
      if (emExpedicao) expedicao(grupo.map(m => m.atleta), rng, at.dm).forEach(r => { lancar(livro, 'expedicao', r.liquido); caixaDe(at, r.caixa); });
    }
    // 2) rodada
    if (dia <= FIM_FASE_REGULAR) for (const [a, b] of pares(nAtleticas, dia - 1)) jogar(dia, a, b, 'regular');
    if (dia === FIM_FASE_REGULAR) {
      const ord = classificacao(ats);
      lider = ord[0];
      semis = [[ord[0], ord[3]], [ord[1], ord[2]]];
      finalistas = semis.map(([a, b]) => serie(a, b, [36, 37, 38], 'semi'));
      if (ord.indexOf(finalistas[1]) < ord.indexOf(finalistas[0])) finalistas.reverse();
      campeao = serie(finalistas[0], finalistas[1], [39, 40, 41], 'final');
    }
    // 3) manutenção, caixa e virada
    for (const at of ats) for (const m of at.membros) if (!PERFIS[m.perfil].ausente(dia)) manter(m.atleta, livro);
    for (const at of ats) {
      const ct = MELHORIAS.centroTreino.custos[at.ct], dm = MELHORIAS.departamentoMedico.custos[at.dm];
      if (ct !== undefined && at.caixa >= ct) { at.caixa -= ct; at.ct++; lancar(livro, 'melhoria', ct); }
      else if (dm !== undefined && at.caixa >= dm) { at.caixa -= dm; at.dm++; lancar(livro, 'melhoria', dm); }
    }
    // pontos de preparo: até `preparo` pontos por dia, pela fração das ações da atlética usadas
    if (dia <= FIM_FASE_REGULAR && preparo)
      for (const at of ats) at.pts += preparo * at.membros.reduce((s, m) => s + m.atleta.acoesHoje, 0) / (REGRAS.acoesPorDia * at.membros.length);
    for (const at of ats) for (const m of at.membros) virarDia(m.atleta);
    moeda.push(ats.reduce((s, at) => s + at.membros.reduce((t, m) => t + m.atleta.creditos, 0), 0));
    caixas.push(ats.reduce((s, at) => s + at.caixa, 0));
  }
  return { ats, partidas, livro, moeda, caixas, lider, campeao, finalistas };
}

export const classificacao = (ats: Atletica[]) =>
  ats.map((at, i) => i).sort((a, b) => ats[b].pts - ats[a].pts || ats[b].v - ats[a].v || a - b);
