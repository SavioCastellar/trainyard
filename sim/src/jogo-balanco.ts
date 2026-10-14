/**
 * Balanço: joga uma temporada inteira com perfis de jogador para ver se a economia e a progressão
 * fazem sentido (quanto tempo até um título, quanto dinheiro sobra, quanto custa sumir).
 * Usado por `scripts/balanco.ts`, pelo teste e pela página de regras.
 */
import { Rng } from './rng.js';
import {
  Atleta, Atributo, Encaixe, CATALOGO, MODALIDADES, novoAtleta, treinar, trabalhar, funcoesDisponiveis,
  registrarPartida, comprar, equipar, reparar, tratar, custoTratamento, virarDia, forca, titulos,
  chanceVitoria, Resultado,
} from './jogo.js';

export const DIAS_TEMPORADA = 42;

export interface Perfil {
  nome: string;
  descricao: string;
  treinos: number; trabalhos: number; amistosos: number;
  foco: Atributo[];
  ausente: (dia: number) => boolean;
}

export const PERFIS: Record<string, Perfil> = {
  dedicado: { nome: 'Dedicado', descricao: '5 ações todo dia: 2 treinos, 2 trabalhos, 1 amistoso.',
    treinos: 2, trabalhos: 2, amistosos: 1, foco: ['velocidade', 'chute', 'precisao'], ausente: () => false },
  especialista: { nome: 'Especialista', descricao: '4 treinos e 1 trabalho, só Chute e Precisão (busca o título Artilheiro).',
    treinos: 4, trabalhos: 1, amistosos: 0, foco: ['chute', 'precisao'], ausente: () => false },
  trabalhador: { nome: 'Trabalhador', descricao: '1 treino e 4 trabalhos: compra o melhor equipamento cedo.',
    treinos: 1, trabalhos: 4, amistosos: 0, foco: ['velocidade', 'chute', 'precisao'], ausente: () => false },
  casual: { nome: 'Casual', descricao: '3 ações por dia, some 2 dias por semana.',
    treinos: 1, trabalhos: 1, amistosos: 1, foco: ['velocidade', 'chute', 'precisao'], ausente: d => d % 7 >= 5 },
  abandono: { nome: 'Some 10 dias', descricao: 'Dedicado, mas some do dia 15 ao 24.',
    treinos: 2, trabalhos: 2, amistosos: 1, foco: ['velocidade', 'chute', 'precisao'], ausente: d => d >= 15 && d <= 24 },
};

/** Força média dos adversários ao longo da temporada (estimativa: a liga evolui junto). */
export const forcaLiga = (dia: number) => 34 + 0.55 * dia;

/** Compra a melhoria mais barata do kit de futebol que couber no bolso e já equipa. */
function comprarMelhoria(a: Atleta) {
  const nivelNo = (enc: Encaixe) => { const p = a.kit[enc]; return p ? Number(p.id.slice(-1)) : 0; };
  const opcoes = CATALOGO.filter(i => i.modalidade === 'futebol' && i.nivel === nivelNo(i.encaixe) + 1 && i.preco <= a.creditos)
    .sort((x, y) => x.preco - y.preco);
  if (!opcoes.length) return false;
  comprar(a, opcoes[0].id);
  equipar(a, a.guardados.length - 1);
  a.guardados.length = 0; // a peça antiga é descartada na simulação
  return true;
}

export interface DiaBalanco { dia: number; creditos: number; forma: number; forca: number; maior: number; titulos: string[]; kit: number; lesao: number }

export function simularTemporada(perfilId: string, seed: number) {
  const p = PERFIS[perfilId], rng = new Rng(seed * 7919 + 1), a = novoAtleta(seed);
  const dias: DiaBalanco[] = [];
  let ganho = 0, gastoKit = 0, gastoMedico = 0;
  const gastar = (f: () => void) => { const c = a.creditos; f(); return c - a.creditos; };
  for (let dia = 1; dia <= DIAS_TEMPORADA; dia++) {
    if (!p.ausente(dia)) {
      if (a.lesao > 0 && a.creditos >= custoTratamento(a)) gastoMedico += gastar(() => tratar(a));
      for (let t = 0; t < p.treinos && a.lesao === 0; t++) {
        const atr = p.foco.reduce((m, k) => (a.atrib[k] < a.atrib[m] ? k : m));
        treinar(a, atr);
      }
      for (let t = 0; t < p.trabalhos; t++) {
        const f = funcoesDisponiveis(a).at(-1)!;
        ganho += trabalhar(a, f.id).liquido;
      }
      const jogo = (oficial: boolean) => {
        const x = rng.next(), pv = chanceVitoria(forca(a, 'futebol'), forcaLiga(dia));
        const res: Resultado = x < pv * 0.85 ? 'v' : x < pv * 0.85 + 0.15 ? 'e' : 'd';
        ganho += registrarPartida(a, 'futebol', res, oficial, rng).premio;
      };
      for (let t = 0; t < p.amistosos && a.lesao === 0; t++) jogo(false);
      if (a.lesao === 0 && dia % 2 === 0) jogo(true); // convocado em metade das rodadas
      for (const enc of Object.keys(a.kit) as Encaixe[]) if (a.kit[enc]!.usos <= 2 && a.creditos >= 0)
        try { gastoKit += gastar(() => reparar(a, enc)); } catch { /* sem dinheiro: segue gasto */ }
      while (true) { const c = a.creditos; if (!comprarMelhoria(a)) break; gastoKit += c - a.creditos; }
    }
    virarDia(a);
    const kit = Object.values(a.kit).reduce((s, q) => s + Number(q!.id.slice(-1)), 0);
    dias.push({ dia, creditos: a.creditos, forma: a.forma, forca: forca(a, 'futebol'),
      maior: Math.max(...Object.values(a.atrib)), titulos: titulos(a).map(t => t.nome), kit, lesao: a.lesao });
  }
  const primeiroTitulo = dias.find(d => d.titulos.length)?.dia ?? null;
  return { perfil: p.nome, dias, ganho, gastoKit, gastoMedico, primeiroTitulo, final: a };
}

export const MODALIDADE_BALANCO = MODALIDADES.futebol.nome;
