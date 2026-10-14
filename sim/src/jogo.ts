/**
 * Regras do jogo: atributos, treino, trabalho, economia, equipamentos, forma, lesão, títulos e
 * convocação. Texto das regras e justificativas: `docs/regras.md`.
 *
 * Tudo aqui é função pura sobre objetos JSON simples (o backend guarda o `Atleta` como está).
 * Sorte só pelo `Rng` com semente. Resultado de partida vem de fora (a simulação do esporte);
 * aqui só se aplica o que ele causa (prêmio, desgaste, lesão).
 */
import { Rng } from './rng.js';

export const ATRIBUTOS = ['velocidade', 'forca', 'precisao', 'chute', 'controle', 'reflexo', 'folego'] as const;
export type Atributo = typeof ATRIBUTOS[number];
export type Atributos = Record<Atributo, number>;

export const NOME_ATRIBUTO: Record<Atributo, string> = {
  velocidade: 'Velocidade', forca: 'Força', precisao: 'Precisão', chute: 'Chute',
  controle: 'Controle', reflexo: 'Reflexo', folego: 'Fôlego',
};

export const REGRAS = {
  acoesPorDia: 5,
  horasPorAcao: 2,
  // treino: ganho = ganhoBase × (1 − valor/100)^curvaGanho × fator de forma
  ganhoBase: 4,
  curvaGanho: 1.5,
  tetoAtributo: 99,
  inicialMin: 25,
  inicialMax: 40,
  // forma (condição física, 0–100)
  formaInicial: 80,
  formaDiaAtivo: 10,
  formaDiaAusente: -15,
  diasAteRegredir: 2,
  regressaoPorDia: 0.5,
  // economia
  taxaCaixa: 0.1,
  reparo: 0.35,
  adaptacaoPorDia: 25,
  tratamentoPorDia: 50,
  // lesão
  lesaoPartida: 0.02,
  lesaoForaDeForma: 0.04,
  lesaoExpedicao: 0.12,
  lesaoDias: [2, 4] as const,
  // presença na convocação: pontos por dia ativo nos últimos 7
  presencaPorDia: 0.5,
} as const;

export type ModalidadeId = 'futebol' | 'queimada' | 'bandeira';
export const MODALIDADES: Record<ModalidadeId, { nome: string; vagas: number; pesos: Partial<Atributos>; disponivel: boolean }> = {
  futebol: { nome: 'Futebol 2x2', vagas: 2, disponivel: true, pesos: { velocidade: .25, chute: .2, precisao: .2, controle: .15, reflexo: .1, folego: .1 } },
  queimada: { nome: 'Queimada 3x3', vagas: 3, disponivel: false, pesos: { forca: .3, reflexo: .3, precisao: .25, velocidade: .15 } },
  bandeira: { nome: 'Rouba-bandeira 3x3', vagas: 3, disponivel: false, pesos: { velocidade: .35, folego: .25, reflexo: .2, controle: .2 } },
};

// Uma atividade de treino por atributo. `fita` = arquivo em fitas/ quando o treino já foi gravado.
export const ATIVIDADES: Record<Atributo, { nome: string; fita: string | null }> = {
  precisao: { nome: 'Treino de Precisão', fita: 'precisao' },
  velocidade: { nome: 'Tiro de velocidade', fita: null },
  forca: { nome: 'Empurrar o trenó', fita: null },
  chute: { nome: 'Chute de força', fita: null },
  controle: { nome: 'Condução entre cones', fita: null },
  reflexo: { nome: 'Defesa de reflexo', fita: null },
  folego: { nome: 'Circuito de resistência', fita: null },
};
export const SESSOES_POR_FITA = 3;

export const HABILIDADES: Record<string, { nome: string; modalidade: ModalidadeId; requisito: Partial<Atributos>; sessoes: number }> = {
  chuteLonge: { nome: 'Chute de longe', modalidade: 'futebol', requisito: { chute: 60 }, sessoes: 3 },
  goleiro: { nome: 'Goleiro', modalidade: 'futebol', requisito: { reflexo: 55 }, sessoes: 3 },
  drible: { nome: 'Drible', modalidade: 'futebol', requisito: { controle: 65 }, sessoes: 4 },
  carrinho: { nome: 'Carrinho', modalidade: 'futebol', requisito: { forca: 55 }, sessoes: 3 },
};

export const TITULOS: { id: string; nome: string; requisito: Partial<Atributos> }[] = [
  { id: 'velocista', nome: 'Velocista', requisito: { velocidade: 80 } },
  { id: 'artilheiro', nome: 'Artilheiro', requisito: { chute: 80, precisao: 75 } },
  { id: 'maestro', nome: 'Maestro', requisito: { controle: 80, precisao: 70 } },
  { id: 'paredao', nome: 'Paredão', requisito: { reflexo: 80 } },
  { id: 'maratonista', nome: 'Maratonista', requisito: { folego: 85 } },
  { id: 'avalanche', nome: 'Avalanche', requisito: { velocidade: 80, forca: 80 } },
  { id: 'completo', nome: 'Atleta completo', requisito: { velocidade: 70, forca: 70, precisao: 70, chute: 70, controle: 70, reflexo: 70, folego: 70 } },
];

export const FUNCOES: { id: string; nome: string; salario: number; turnos: number; requisito?: Partial<Atributos> }[] = [
  { id: 'monitor', nome: 'Monitor de escolinha', salario: 40, turnos: 0 },
  { id: 'arbitro', nome: 'Árbitro de categorias de base', salario: 55, turnos: 15 },
  { id: 'preparador', nome: 'Assistente de preparação física', salario: 70, turnos: 40, requisito: { folego: 50 } },
  { id: 'instrutor', nome: 'Instrutor técnico', salario: 90, turnos: 80, requisito: { precisao: 65 } },
];

export const PREMIOS = {
  oficial: { v: 80, e: 40, d: 20 },
  amistoso: { v: 20, e: 10, d: 5 },
  expedicaoBase: 120,
  expedicaoPorMembroExtra: 40,
} as const;
export type Resultado = 'v' | 'e' | 'd';

// Equipamentos: 3 encaixes; cada peça só vale na sua modalidade e precisa de adaptação.
export type Encaixe = 'calcado' | 'roupa' | 'acessorio';
export const NIVEIS = [
  { nome: 'Básico', bonus: 3, preco: 150, usos: 15 },
  { nome: 'Profissional', bonus: 6, preco: 400, usos: 25 },
  { nome: 'Elite', bonus: 10, preco: 1000, usos: 40 },
] as const;
const PECAS: Record<ModalidadeId, [Encaixe, string, Atributo][]> = {
  futebol: [['calcado', 'Chuteira', 'chute'], ['roupa', 'Uniforme leve', 'velocidade'], ['acessorio', 'Caneleira', 'controle']],
  queimada: [['calcado', 'Tênis de quadra', 'reflexo'], ['roupa', 'Camisa de compressão', 'forca'], ['acessorio', 'Luva de aderência', 'precisao']],
  bandeira: [['calcado', 'Sapatilha de corrida', 'velocidade'], ['roupa', 'Roupa térmica', 'folego'], ['acessorio', 'Tornozeleira', 'controle']],
};
export interface ItemCatalogo { id: string; nome: string; modalidade: ModalidadeId; encaixe: Encaixe; atributo: Atributo; nivel: number; bonus: number; preco: number; usos: number }
export const CATALOGO: ItemCatalogo[] = (Object.keys(PECAS) as ModalidadeId[]).flatMap(m =>
  PECAS[m].flatMap(([encaixe, nome, atributo]) => NIVEIS.map((n, nivel) => ({
    id: `${m}-${encaixe}-${nivel + 1}`, nome: `${nome} ${n.nome.toLowerCase()}`, modalidade: m, encaixe, atributo,
    nivel: nivel + 1, bonus: n.bonus, preco: n.preco, usos: n.usos,
  }))));
export const item = (id: string) => {
  const it = CATALOGO.find(i => i.id === id);
  if (!it) throw new Error(`Item desconhecido: ${id}`);
  return it;
};

// Melhorias coletivas compradas com o caixa da atlética.
export const MELHORIAS = {
  centroTreino: { nome: 'Centro de treinamento', custos: [5000, 12000, 25000], efeito: 'ganho de treino +5% por nível' },
  departamentoMedico: { nome: 'Departamento médico', custos: [4000, 10000], efeito: 'lesões 1 dia mais curtas por nível' },
} as const;

export interface Peca { id: string; usos: number; adaptacao: number }
export interface Atleta {
  atrib: Atributos;
  base: Atributos;              // valores iniciais: a regressão por ausência nunca desce abaixo disso
  forma: number;
  creditos: number;
  turnos: number;               // turnos de trabalho cumpridos (sobe de função)
  sessoes: Partial<Record<Atributo, number>>;   // sessões de fita assistidas por atividade
  habilidades: Record<string, number>;          // sessões cumpridas; liberada ao chegar em `sessoes`
  kit: Partial<Record<Encaixe, Peca>>;
  guardados: Peca[];
  lesao: number;                // dias restantes
  acoesHoje: number;
  diasAusente: number;
  presenca: boolean[];          // últimos 7 dias, mais recente no fim
}

export function novoAtleta(seed: number): Atleta {
  const r = new Rng(seed);
  const atrib = {} as Atributos;
  for (const k of ATRIBUTOS) atrib[k] = Math.round(r.range(REGRAS.inicialMin, REGRAS.inicialMax));
  return {
    atrib, base: { ...atrib }, forma: REGRAS.formaInicial, creditos: 0, turnos: 0, sessoes: {}, habilidades: {},
    kit: {}, guardados: [], lesao: 0, acoesHoje: 0, diasAusente: 0, presenca: [],
  };
}

const atende = (a: Atleta, req: Partial<Atributos> = {}) =>
  (Object.keys(req) as Atributo[]).every(k => a.atrib[k] >= req[k]!);

function gastarAcao(a: Atleta, permiteLesionado = false) {
  if (a.acoesHoje >= REGRAS.acoesPorDia) throw new Error('Sem ações restantes hoje.');
  if (a.lesao > 0 && !permiteLesionado) throw new Error('Atleta lesionado.');
  a.acoesHoje++;
}

export const ganhoTreino = (valor: number, forma: number, nivelCT = 0) =>
  REGRAS.ganhoBase * Math.pow(1 - valor / 100, REGRAS.curvaGanho) * (0.6 + 0.4 * forma / 100) * (1 + 0.05 * nivelCT);

export function treinar(a: Atleta, atr: Atributo, nivelCT = 0) {
  gastarAcao(a);
  const ganho = Math.min(ganhoTreino(a.atrib[atr], a.forma, nivelCT), REGRAS.tetoAtributo - a.atrib[atr]);
  a.atrib[atr] += ganho;
  const sessao = (a.sessoes[atr] ?? 0) + 1;
  a.sessoes[atr] = sessao;
  // depois da última sessão da fita o atleta segue treinando no nível de domínio
  return { ganho, sessao: Math.min(sessao, SESSOES_POR_FITA), dominou: sessao >= SESSOES_POR_FITA };
}

export function treinarHabilidade(a: Atleta, id: string) {
  const h = HABILIDADES[id];
  if (!h) throw new Error(`Habilidade desconhecida: ${id}`);
  if (!atende(a, h.requisito)) throw new Error(`Requisito não atendido para ${h.nome}.`);
  if (temHabilidade(a, id)) throw new Error(`${h.nome} já liberada.`);
  gastarAcao(a);
  a.habilidades[id] = (a.habilidades[id] ?? 0) + 1;
  return { sessao: a.habilidades[id], liberou: temHabilidade(a, id) };
}
export const temHabilidade = (a: Atleta, id: string) => (a.habilidades[id] ?? 0) >= HABILIDADES[id].sessoes;

export const funcoesDisponiveis = (a: Atleta) => FUNCOES.filter(f => a.turnos >= f.turnos && atende(a, f.requisito));

function receber(a: Atleta, bruto: number) {
  const caixa = Math.round(bruto * REGRAS.taxaCaixa);
  a.creditos += bruto - caixa;
  return { liquido: bruto - caixa, caixa };
}

export function trabalhar(a: Atleta, funcao: string) {
  const f = funcoesDisponiveis(a).find(x => x.id === funcao);
  if (!f) throw new Error('Função não disponível.');
  gastarAcao(a, true); // lesionado pode trabalhar
  a.turnos++;
  return receber(a, f.salario);
}

export const efetivo = (a: Atleta, atr: Atributo, m: ModalidadeId) => {
  let v = a.atrib[atr];
  for (const p of Object.values(a.kit)) {
    const it = item(p!.id);
    if (it.modalidade === m && it.atributo === atr && p!.usos > 0) v += it.bonus * p!.adaptacao / 100;
  }
  return Math.min(REGRAS.tetoAtributo, v) * (0.8 + 0.2 * a.forma / 100);
};

/** Força na modalidade (0–100): média ponderada dos atributos efetivos. */
export const forca = (a: Atleta, m: ModalidadeId) =>
  (Object.entries(MODALIDADES[m].pesos) as [Atributo, number][]).reduce((s, [k, w]) => s + w * efetivo(a, k, m), 0);

/** Índice da convocação interna: força na modalidade + presença nos últimos 7 dias. */
export const indiceConvocacao = (a: Atleta, m: ModalidadeId) =>
  a.lesao > 0 ? 0 : forca(a, m) + REGRAS.presencaPorDia * a.presenca.filter(Boolean).length;

/** Convoca os melhores índices (desempate pela posição na lista, que o servidor sorteia com semente). */
export function convocar(atletas: Atleta[], m: ModalidadeId) {
  return atletas.map((a, i) => ({ i, x: indiceConvocacao(a, m) })).filter(o => o.x > 0)
    .sort((p, q) => q.x - p.x || p.i - q.i).slice(0, MODALIDADES[m].vagas + 1).map(o => o.i); // titulares + 1 reserva
}

/** Chance de vitória entre duas forças (usada no balanço e em amistosos sem simulação). */
export const chanceVitoria = (f1: number, f2: number) => 1 / (1 + Math.exp(-(f1 - f2) / 8));

function rolarLesao(a: Atleta, rng: Rng, chance: number, nivelDM = 0) {
  if (rng.next() >= chance) return 0;
  const [lo, hi] = REGRAS.lesaoDias;
  a.lesao = Math.max(1, lo + rng.int(hi - lo + 1) - nivelDM);
  return a.lesao;
}

export function registrarPartida(a: Atleta, m: ModalidadeId, res: Resultado, oficial: boolean, rng: Rng, nivelDM = 0) {
  if (!oficial) gastarAcao(a);
  for (const p of Object.values(a.kit)) if (item(p!.id).modalidade === m && p!.usos > 0) p!.usos--;
  const { liquido, caixa } = receber(a, (oficial ? PREMIOS.oficial : PREMIOS.amistoso)[res]);
  const chance = REGRAS.lesaoPartida + (a.forma < 50 ? REGRAS.lesaoForaDeForma : 0);
  return { premio: liquido, caixa, lesao: rolarLesao(a, rng, chance, nivelDM) };
}

/** Expedição em grupo (3–4 atletas da mesma atlética): paga mais, arrisca lesão. */
export function expedicao(grupo: Atleta[], rng: Rng, nivelDM = 0) {
  if (grupo.length < 3 || grupo.length > 4) throw new Error('A expedição exige de 3 a 4 atletas.');
  if (grupo.some(a => a.lesao > 0 || a.acoesHoje >= REGRAS.acoesPorDia)) throw new Error('Todos precisam estar aptos e com ação disponível.');
  const bruto = PREMIOS.expedicaoBase + PREMIOS.expedicaoPorMembroExtra * (grupo.length - 3);
  return grupo.map(a => { gastarAcao(a); return { ...receber(a, bruto), lesao: rolarLesao(a, rng, REGRAS.lesaoExpedicao, nivelDM) }; });
}

export function comprar(a: Atleta, id: string) {
  const it = item(id);
  if (a.creditos < it.preco) throw new Error('Créditos insuficientes.');
  a.creditos -= it.preco;
  a.guardados.push({ id, usos: it.usos, adaptacao: 0 });
}

/** Equipa uma peça guardada; a que ocupava o encaixe volta para o armário e perde a adaptação. */
export function equipar(a: Atleta, indiceGuardado: number) {
  const p = a.guardados[indiceGuardado];
  if (!p) throw new Error('Peça não encontrada.');
  const enc = item(p.id).encaixe;
  a.guardados.splice(indiceGuardado, 1);
  const antiga = a.kit[enc];
  if (antiga) a.guardados.push({ ...antiga, adaptacao: 0 });
  a.kit[enc] = { ...p, adaptacao: 0 };
}

export const custoReparo = (p: Peca) => Math.round(item(p.id).preco * REGRAS.reparo);
export function reparar(a: Atleta, enc: Encaixe) {
  const p = a.kit[enc];
  if (!p) throw new Error('Encaixe vazio.');
  const c = custoReparo(p);
  if (a.creditos < c) throw new Error('Créditos insuficientes.');
  a.creditos -= c;
  p.usos = item(p.id).usos;
}

export const custoTratamento = (a: Atleta) => a.lesao * REGRAS.tratamentoPorDia;
export function tratar(a: Atleta) {
  const c = custoTratamento(a);
  if (!c) throw new Error('Atleta não está lesionado.');
  if (a.creditos < c) throw new Error('Créditos insuficientes.');
  a.creditos -= c;
  a.lesao = 0;
}

export const titulos = (a: Atleta) => TITULOS.filter(t => atende(a, t.requisito));

/** Fecha o dia: forma, adaptação do kit, regressão por ausência, recuperação de lesão. */
export function virarDia(a: Atleta) {
  const ativo = a.acoesHoje > 0;
  a.forma = Math.max(0, Math.min(100, a.forma + (ativo ? REGRAS.formaDiaAtivo : REGRAS.formaDiaAusente)));
  a.diasAusente = ativo ? 0 : a.diasAusente + 1;
  if (ativo) for (const p of Object.values(a.kit)) p!.adaptacao = Math.min(100, p!.adaptacao + REGRAS.adaptacaoPorDia);
  if (a.diasAusente > REGRAS.diasAteRegredir)
    for (const k of ATRIBUTOS) a.atrib[k] = Math.max(a.base[k], a.atrib[k] - REGRAS.regressaoPorDia);
  if (a.lesao > 0) a.lesao--;
  a.presenca = [...a.presenca, ativo].slice(-7);
  a.acoesHoje = 0;
}

/** Entre temporadas: atributos voltam 15% em direção ao valor inicial; o resto fica. */
export function novaTemporada(a: Atleta) {
  for (const k of ATRIBUTOS) a.atrib[k] -= 0.15 * (a.atrib[k] - a.base[k]);
}
