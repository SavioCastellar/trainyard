/**
 * Regras do jogo: atributos base e do esporte, treino com progressão de atividade, especialidades e
 * habilidades, trabalho, economia, equipamentos, forma, lesão e convocação. Texto das regras e
 * justificativas: `docs/regras.md`.
 *
 * Tudo aqui é função pura sobre objetos JSON simples (o backend guarda o `Atleta` como está).
 * Sorte só pelo `Rng` com semente. Resultado de partida vem de fora (a simulação do esporte);
 * aqui só se aplica o que ele causa (prêmio, desgaste, lesão).
 */
import { Rng } from './rng.js';

// Atributos base: propriedades do corpo, iguais em todos os esportes. São os únicos treinados.
export const ATRIBUTOS = ['velocidade', 'forca', 'precisao', 'controle', 'reflexo', 'folego', 'inteligencia'] as const;
export type Atributo = typeof ATRIBUTOS[number];
export type Atributos = Record<Atributo, number>;

export const NOME_ATRIBUTO: Record<Atributo, string> = {
  velocidade: 'Velocidade', forca: 'Força', precisao: 'Precisão', controle: 'Controle',
  reflexo: 'Reflexo', folego: 'Fôlego', inteligencia: 'Inteligência',
};

/** O que cada atributo base muda na física, em qualquer esporte (pedidos às sessões de treino). */
export const EFEITO_ATRIBUTO: Record<Atributo, string> = {
  velocidade: 'velocidade máxima',
  forca: 'potência (empurrar, arremessar, chutar) e disputa de corpo',
  precisao: 'erro de mira em qualquer lançamento',
  controle: 'aceleração, frenagem e giro do corpo',
  reflexo: 'tempo entre ver e agir',
  folego: 'barra de arrancada: quanto tempo corre no máximo e quão rápido recupera',
  inteligencia: 'qualidade da decisão: menos aleatoriedade na escolha das ações',
};

export const REGRAS = {
  acoesPorDia: 5,
  horasPorAcao: 2,
  // treino: ganho = ganhoBase × (1 − valor/100)^curvaGanho × fator de forma × (1 + bônus do CT)
  ganhoBase: 4,
  curvaGanho: 1.5,
  tetoAtributo: 99,
  inicialMin: 25,
  inicialMax: 40,
  bonusCTPorNivel: 0.1,      // cada nível do CT da atlética: +10% de ganho (e estrutura visual maior)
  // progressão da atividade: cada atividade tem 3 níveis; o atleta sobe ao cumprir as sessões do nível
  niveisAtividade: 3,
  sessoesPorNivel: 3,
  // especialidades: conquista no requisito, perde só abaixo do requisito − margem
  margemEspecialidade: 5,
  // inteligência: temperatura do sorteio das ações do cérebro (1 = como foi treinado)
  temperaturaMax: 1.3,
  temperaturaMin: 0.9,
  // forma (condição física, 0–100)
  formaInicial: 80,
  formaDiaAtivo: 10,
  formaDiaAusente: -15,
  diasAteRegredir: 2,
  regressaoPorDia: 0.5,
  // economia
  taxaCaixa: 0.1,
  quedaPorTurno: 0.25,       // cada turno de trabalho a mais no mesmo dia paga 25% menos
  reparo: 0.35,
  adaptacaoPorDia: 25,
  tratamentoPorDia: 50,
  custoPreparador: 100,      // sessão com preparador: treino rende +50%
  bonusPreparador: 0.5,
  // lesão
  lesaoPartida: 0.02,
  lesaoForaDeForma: 0.04,
  lesaoExpedicao: 0.12,
  lesaoDias: [2, 4] as const,
  // presença na convocação: pontos por dia ativo nos últimos 7
  presencaPorDia: 0.5,
  escalaResultado: 25,       // escala da curva de vitória (maior = atributo pesa menos); calibrada em scripts/calibrar.ts
  // rodada oficial (validado em scripts/liga.ts; ver docs/regras.md → "Validação")
  duplasPorRodada: 3,        // cada atlética escala 3 duplas; dupla 1 × dupla 1 etc.
  pontosVitoria: 3,
  pontosEmpate: 1,
  pontosPreparo: 3,          // por rodada, × fração das ações dos membros usadas no dia
  vantagemCampanha: true,    // no mata-mata (melhor de 3) o melhor colocado começa com 1 vitória
} as const;

/** Temperatura do sorteio das ações para um valor de Inteligência (o cérebro aplica). */
export const temperaturaDecisao = (inteligencia: number) =>
  REGRAS.temperaturaMax - (REGRAS.temperaturaMax - REGRAS.temperaturaMin) * inteligencia / 100;

// Atividades de treino: uma estação do CT por atributo base, com 3 níveis que mudam a atividade.
// `lancamento` = entra na primeira versão; `fita` = arquivo em fitas/ quando o treino já foi gravado.
export const ATIVIDADES: Record<Atributo, { nome: string; niveis: [string, string, string]; lancamento: boolean; fita: string | null }> = {
  precisao: { nome: 'Treino de Precisão', niveis: ['alvos fixos', 'alvos que acendem e apagam', 'alvos móveis'], lancamento: true, fita: 'precisao' },
  reflexo: { nome: 'Painel de reação', niveis: ['luzes lentas', 'janela curta', 'luzes proibidas'], lancamento: true, fita: null },
  inteligencia: { nome: 'Circuito de decisão', niveis: ['poucos pontos', 'caminhos bloqueados', 'regras que mudam no meio'], lancamento: true, fita: null },
  velocidade: { nome: 'Pista de tiros', niveis: ['tiros curtos', 'tiros longos', 'tiros com mudança de direção'], lancamento: true, fita: null },
  forca: { nome: 'Trenó de carga', niveis: ['carga leve', 'carga pesada', 'rampa'], lancamento: true, fita: null },
  controle: { nome: 'Plataformas de equilíbrio', niveis: ['plataformas largas', 'estreitas', 'móveis'], lancamento: false, fita: null },
  folego: { nome: 'Circuito de arrancadas', niveis: ['pontos próximos', 'pontos distantes', 'terreno pesado'], lancamento: false, fita: null },
};
export const nivelAtividade = (a: Atleta, atr: Atributo) =>
  Math.min(REGRAS.niveisAtividade, Math.floor((a.sessoes[atr] ?? 0) / REGRAS.sessoesPorNivel) + 1);

// Modalidades e atributos do esporte: combinação ponderada dos atributos base (não são treinados).
export type ModalidadeId = 'futebol' | 'queimada';
export interface AtributoEsporte { nome: string; base: [Atributo, number][]; peso: number }
export const MODALIDADES: Record<ModalidadeId, { nome: string; vagas: number; disponivel: boolean; atributos: Record<string, AtributoEsporte> }> = {
  futebol: {
    nome: 'Futebol 2x2', vagas: 2, disponivel: true, atributos: {
      finalizacao: { nome: 'Finalização', base: [['precisao', .6], ['forca', .4]], peso: .25 },
      passe: { nome: 'Passe', base: [['precisao', .6], ['controle', .4]], peso: .2 },
      marcacao: { nome: 'Marcação', base: [['forca', .6], ['velocidade', .4]], peso: .2 },
      drible: { nome: 'Drible', base: [['inteligencia', .6], ['controle', .4]], peso: .15 },
      defesa: { nome: 'Defesa', base: [['reflexo', .6], ['inteligencia', .4]], peso: .2 },
    },
  },
  queimada: {
    nome: 'Queimada 3x3', vagas: 3, disponivel: false, atributos: {
      arremesso: { nome: 'Arremesso', base: [['forca', .6], ['precisao', .4]], peso: .35 },
      esquiva: { nome: 'Esquiva', base: [['reflexo', .6], ['velocidade', .4]], peso: .35 },
      pegada: { nome: 'Pegada', base: [['reflexo', .6], ['forca', .4]], peso: .3 },
    },
  },
};

// Habilidades: mecânicas extras no esporte. `base` = nível que todo atleta tem.
export const HABILIDADES: Record<string, { nome: string; modalidade: ModalidadeId; base: number; descricao: string }> = {
  goleiro: { nome: 'Goleiro', modalidade: 'futebol', base: 1, descricao: 'mergulho; nível maior = mais alcance e recarga menor' },
  chuteLonge: { nome: 'Chute de longe', modalidade: 'futebol', base: 0, descricao: 'percebe o gol livre e chuta por cobertura de longe; força a defesa a recuar alguém' },
  carrinho: { nome: 'Carrinho', modalidade: 'futebol', base: 0, descricao: 'desarme deslizando' },
  arrancada: { nome: 'Arrancada', modalidade: 'futebol', base: 0, descricao: 'velocidade extra ao disparar com espaço' },
  pressao: { nome: 'Pressão', modalidade: 'futebol', base: 0, descricao: 'arrancadas sem gastar fôlego por alguns segundos' },
  lancamento: { nome: 'Lançamento', modalidade: 'futebol', base: 0, descricao: 'passe longo no espaço, à frente do companheiro' },
  finta: { nome: 'Finta', modalidade: 'futebol', base: 0, descricao: 'drible de corpo que tira o marcador do lance' },
  esquiva: { nome: 'Esquiva', modalidade: 'queimada', base: 0, descricao: 'desvio rápido da bola' },
  curva: { nome: 'Curva', modalidade: 'queimada', base: 0, descricao: 'arremesso com efeito' },
  arremessoPesado: { nome: 'Arremesso pesado', modalidade: 'queimada', base: 0, descricao: 'bola mais rápida e difícil de pegar' },
  segundoFolego: { nome: 'Segundo fôlego', modalidade: 'queimada', base: 0, descricao: 'recupera a arrancada mais rápido' },
  arremessoFalso: { nome: 'Arremesso falso', modalidade: 'queimada', base: 0, descricao: 'gesto de arremesso sem soltar a bola' },
};

// Especialidades: conquistadas por atributos base; cada uma dá uma habilidade por esporte (somam nível).
export const ESPECIALIDADES: { id: string; nome: string; requisito: Partial<Atributos>; habilidades: Partial<Record<ModalidadeId, string>> }[] = [
  { id: 'maratonista', nome: 'Maratonista', requisito: { folego: 85 }, habilidades: { futebol: 'pressao', queimada: 'segundoFolego' } },
  { id: 'velocista', nome: 'Velocista', requisito: { velocidade: 85 }, habilidades: { futebol: 'arrancada', queimada: 'esquiva' } },
  { id: 'paredao', nome: 'Paredão', requisito: { reflexo: 85 }, habilidades: { futebol: 'goleiro', queimada: 'esquiva' } },
  { id: 'artilheiro', nome: 'Artilheiro', requisito: { forca: 80, precisao: 75 }, habilidades: { futebol: 'chuteLonge', queimada: 'curva' } },
  { id: 'avalanche', nome: 'Avalanche', requisito: { forca: 80, velocidade: 75 }, habilidades: { futebol: 'carrinho', queimada: 'arremessoPesado' } },
  { id: 'maestro', nome: 'Maestro', requisito: { controle: 80, precisao: 75 }, habilidades: { futebol: 'lancamento', queimada: 'curva' } },
  { id: 'malandro', nome: 'Malandro', requisito: { inteligencia: 80, controle: 75 }, habilidades: { futebol: 'finta', queimada: 'arremessoFalso' } },
];

export const FUNCOES: { id: string; nome: string; salario: number; turnos: number; requisito?: Partial<Atributos> }[] = [
  { id: 'monitor', nome: 'Monitor de escolinha', salario: 40, turnos: 0 },
  { id: 'arbitro', nome: 'Árbitro de categorias de base', salario: 55, turnos: 15 },
  { id: 'preparador', nome: 'Assistente de preparação física', salario: 70, turnos: 40, requisito: { forca: 50 } },
  { id: 'instrutor', nome: 'Instrutor técnico', salario: 90, turnos: 80, requisito: { precisao: 65 } },
];

export const PREMIOS = {
  oficial: { v: 80, e: 40, d: 20 },
  amistoso: { v: 20, e: 10, d: 5 },
  expedicaoBase: 120,
  expedicaoPorMembroExtra: 40,
} as const;
export type Resultado = 'v' | 'e' | 'd';

// Equipamentos: 3 encaixes; cada peça soma a um atributo do esporte e só vale nessa modalidade.
export type Encaixe = 'calcado' | 'roupa' | 'acessorio';
export const NIVEIS = [
  { nome: 'Básico', bonus: 3, preco: 150, usos: 15 },
  { nome: 'Profissional', bonus: 6, preco: 400, usos: 25 },
  { nome: 'Elite', bonus: 10, preco: 1000, usos: 40 },
] as const;
const PECAS: Record<ModalidadeId, [Encaixe, string, string][]> = {
  futebol: [['calcado', 'Chuteira', 'finalizacao'], ['roupa', 'Uniforme leve', 'drible'], ['acessorio', 'Caneleira', 'marcacao']],
  queimada: [['calcado', 'Tênis de quadra', 'esquiva'], ['roupa', 'Camisa de compressão', 'arremesso'], ['acessorio', 'Luva de aderência', 'pegada']],
};
/** Atributos base ligados a uma peça (para o desgaste no treino). */
const basesDe = (m: ModalidadeId, esp: string) => MODALIDADES[m].atributos[esp].base.map(([k]) => k);
export interface ItemCatalogo { id: string; nome: string; modalidade: ModalidadeId; encaixe: Encaixe; atributo: string; nivel: number; bonus: number; preco: number; usos: number }
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
  centroTreino: { nome: 'Centro de treinamento', custos: [5000, 12000, 25000], efeito: 'estrutura maior no cenário dos treinos e +10% de ganho de treino por nível' },
  departamentoMedico: { nome: 'Departamento médico', custos: [4000, 10000], efeito: 'lesões 1 dia mais curtas por nível' },
} as const;

export interface Peca { id: string; usos: number; adaptacao: number }
export interface Atleta {
  atrib: Atributos;
  base: Atributos;              // valores iniciais: a regressão por ausência nunca desce abaixo disso
  forma: number;
  creditos: number;
  turnos: number;               // turnos de trabalho cumpridos (sobe de função)
  turnosHoje?: number;          // turnos no dia (salário decrescente)
  sessoes: Partial<Record<Atributo, number>>;   // sessões cumpridas por atividade (define o nível dela)
  especialidades: string[];     // ids conquistados (ver `atualizarEspecialidades`)
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
    atrib, base: { ...atrib }, forma: REGRAS.formaInicial, creditos: 0, turnos: 0, sessoes: {}, especialidades: [],
    kit: {}, guardados: [], lesao: 0, acoesHoje: 0, diasAusente: 0, presenca: [],
  };
}

const atende = (a: Atleta, req: Partial<Atributos> = {}, folga = 0) =>
  (Object.keys(req) as Atributo[]).every(k => a.atrib[k] >= req[k]! - folga);

/**
 * Conquista e perda de especialidades. Conquista ao atingir o requisito; só perde quando algum
 * atributo cai abaixo do requisito − margem (evita ganhar e perder no mesmo dia). Devolve as novas.
 */
export function atualizarEspecialidades(a: Atleta) {
  const novas: string[] = [];
  a.especialidades = ESPECIALIDADES.filter(e => {
    const tem = a.especialidades.includes(e.id);
    if (!tem && atende(a, e.requisito)) { novas.push(e.id); return true; }
    return tem && atende(a, e.requisito, REGRAS.margemEspecialidade);
  }).map(e => e.id);
  return novas;
}
export const especialidades = (a: Atleta) => ESPECIALIDADES.filter(e => a.especialidades.includes(e.id));

/** Nível de cada habilidade da modalidade: o nível base + 1 por especialidade que a dá. */
export function habilidades(a: Atleta, m: ModalidadeId) {
  const out: Record<string, number> = {};
  for (const [id, h] of Object.entries(HABILIDADES)) if (h.modalidade === m && h.base) out[id] = h.base;
  for (const e of especialidades(a)) { const h = e.habilidades[m]; if (h) out[h] = (out[h] ?? 0) + 1; }
  return out;
}

function gastarAcao(a: Atleta, permiteLesionado = false) {
  if (a.acoesHoje >= REGRAS.acoesPorDia) throw new Error('Sem ações restantes hoje.');
  if (a.lesao > 0 && !permiteLesionado) throw new Error('Atleta lesionado.');
  a.acoesHoje++;
}

export const ganhoTreino = (valor: number, forma: number, nivelCT = 0) =>
  REGRAS.ganhoBase * Math.pow(1 - valor / 100, REGRAS.curvaGanho) * (0.6 + 0.4 * forma / 100) * (1 + REGRAS.bonusCTPorNivel * nivelCT);

export function treinar(a: Atleta, atr: Atributo, nivelCT = 0, comPreparador = false) {
  if (!ATIVIDADES[atr].lancamento) throw new Error(`${ATIVIDADES[atr].nome} ainda não está disponível.`);
  if (comPreparador && a.creditos < REGRAS.custoPreparador) throw new Error('Créditos insuficientes para o preparador.');
  gastarAcao(a);
  if (comPreparador) a.creditos -= REGRAS.custoPreparador;
  const nivel = nivelAtividade(a, atr);
  const bruto = ganhoTreino(a.atrib[atr], a.forma, nivelCT) * (comPreparador ? 1 + REGRAS.bonusPreparador : 1);
  const ganho = Math.min(bruto, REGRAS.tetoAtributo - a.atrib[atr]);
  a.atrib[atr] += ganho;
  // a peça ligada a um atributo do esporte que usa este atributo base também se gasta no treino
  for (const p of Object.values(a.kit)) {
    const it = item(p!.id);
    if (basesDe(it.modalidade, it.atributo).includes(atr) && p!.usos > 0) p!.usos--;
  }
  a.sessoes[atr] = (a.sessoes[atr] ?? 0) + 1;
  const sessaoNoNivel = nivel === REGRAS.niveisAtividade ? REGRAS.sessoesPorNivel : (a.sessoes[atr]! - 1) % REGRAS.sessoesPorNivel + 1;
  return { ganho, nivel, sessaoNoNivel, subiuNivel: nivelAtividade(a, atr) > nivel, especialidades: atualizarEspecialidades(a) };
}

export const funcoesDisponiveis = (a: Atleta) => FUNCOES.filter(f => a.turnos >= f.turnos && atende(a, f.requisito));

function receber(a: Atleta, bruto: number) {
  const caixa = Math.round(bruto * REGRAS.taxaCaixa);
  a.creditos += bruto - caixa;
  return { liquido: bruto - caixa, caixa };
}

export const salarioDoTurno = (salario: number, turnosHoje: number) => Math.round(salario * Math.max(0, 1 - REGRAS.quedaPorTurno * turnosHoje));

export function trabalhar(a: Atleta, funcao: string) {
  const f = funcoesDisponiveis(a).find(x => x.id === funcao);
  if (!f) throw new Error('Função não disponível.');
  gastarAcao(a, true); // lesionado pode trabalhar
  const hoje = a.turnosHoje ?? 0;
  a.turnos++;
  a.turnosHoje = hoje + 1;
  return receber(a, salarioDoTurno(f.salario, hoje));
}

const fatorForma = (a: Atleta) => 0.8 + 0.2 * a.forma / 100;

/** Atributo do esporte efetivo: combinação dos base + equipamento adaptado, multiplicado pela forma. */
export function atributoEsporte(a: Atleta, m: ModalidadeId, id: string) {
  const def = MODALIDADES[m].atributos[id];
  if (!def) throw new Error(`Atributo desconhecido: ${id}`);
  let v = def.base.reduce((s, [k, w]) => s + w * a.atrib[k], 0);
  for (const p of Object.values(a.kit)) {
    const it = item(p!.id);
    if (it.modalidade === m && it.atributo === id && p!.usos > 0) v += it.bonus * p!.adaptacao / 100;
  }
  return Math.min(REGRAS.tetoAtributo, v) * fatorForma(a);
}

/** Força na modalidade (0–100): média ponderada dos atributos do esporte efetivos. */
export const forca = (a: Atleta, m: ModalidadeId) =>
  Object.entries(MODALIDADES[m].atributos).reduce((s, [id, d]) => s + d.peso * atributoEsporte(a, m, id), 0);

/**
 * Índice da convocação interna: força na modalidade + presença nos últimos 7 dias.
 * Só é convocável quem está apto e fez pelo menos uma ação no dia da rodada (confirmou presença).
 */
export const indiceConvocacao = (a: Atleta, m: ModalidadeId) =>
  a.lesao > 0 || a.acoesHoje === 0 ? 0 : forca(a, m) + REGRAS.presencaPorDia * a.presenca.filter(Boolean).length;

/**
 * Convoca os melhores índices (desempate pela posição na lista, que o servidor sorteia com semente).
 * Padrão: titulares + 1 reserva.
 */
export function convocar(atletas: Atleta[], m: ModalidadeId, vagas = MODALIDADES[m].vagas + 1) {
  return atletas.map((a, i) => ({ i, x: indiceConvocacao(a, m) })).filter(o => o.x > 0)
    .sort((p, q) => q.x - p.x || p.i - q.i).slice(0, vagas).map(o => o.i);
}

/**
 * Probabilidade de vitória/empate/derrota entre duas forças, para o balanço e amistosos sem
 * simulação. Calibrada contra o futebol 2x2 com robôs (`scripts/calibrar.ts`, 600 partidas por
 * diferença): 10 pontos de vantagem ≈ 46% de vitória, 30 pontos ≈ 66%; empates ≈ 17%.
 */
export const EMPATE = 0.17;
export const chanceVitoria = (f1: number, f2: number) => (1 - EMPATE) / (1 + Math.exp(-(f1 - f2) / REGRAS.escalaResultado));
export function sortearResultado(f1: number, f2: number, x: number): Resultado {
  const v = chanceVitoria(f1, f2);
  return x < v ? 'v' : x < v + EMPATE ? 'e' : 'd';
}

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

/** Fecha o dia: forma, adaptação do kit, regressão por ausência, especialidades, lesão. */
export function virarDia(a: Atleta) {
  const ativo = a.acoesHoje > 0;
  a.forma = Math.max(0, Math.min(100, a.forma + (ativo ? REGRAS.formaDiaAtivo : REGRAS.formaDiaAusente)));
  a.diasAusente = ativo ? 0 : a.diasAusente + 1;
  if (ativo) for (const p of Object.values(a.kit)) p!.adaptacao = Math.min(100, p!.adaptacao + REGRAS.adaptacaoPorDia);
  if (a.diasAusente > REGRAS.diasAteRegredir)
    for (const k of ATRIBUTOS) a.atrib[k] = Math.max(a.base[k], a.atrib[k] - REGRAS.regressaoPorDia);
  atualizarEspecialidades(a);
  if (a.lesao > 0) a.lesao--;
  a.presenca = [...a.presenca, ativo].slice(-7);
  a.acoesHoje = 0;
  a.turnosHoje = 0;
}

/** Entre temporadas: atributos voltam 15% em direção ao valor inicial; o resto fica. */
export function novaTemporada(a: Atleta) {
  for (const k of ATRIBUTOS) a.atrib[k] -= 0.15 * (a.atrib[k] - a.base[k]);
  atualizarEspecialidades(a);
}
