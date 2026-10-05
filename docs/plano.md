# Plano

## Sessões
| Sessão | Onde roda | Ramo | Pastas dela | Briefing |
|---|---|---|---|---|
| Central | nuvem | `main` | `docs/`, `CLAUDE.md`, `README.md` | `docs/sessoes/central.md` |
| Personagem | nuvem | `personagem` | `web/personagem/`, `web/src/cabecudo-lib.js` | `docs/sessoes/personagem.md` |
| Cenários | nuvem | `cenarios` | `web/cenarios/` | `docs/sessoes/cenarios.md` |
| Treino: Futebol | **computador do Savio** | `treino-futebol` | ver briefing | `docs/sessoes/treino-futebol.md` |
| Treino: <atividade> | **computador do Savio** | `treino-<atividade>` | ver briefing | a partir de `docs/sessoes/treino-modelo.md` |

Sessões de treino nascem conforme os cenários ficam prontos. Treinos rodam só no computador do
Savio (`docs/treino-local.md`); sessões de visual rodam na nuvem e publicam páginas para ele aprovar.

## Ciclo de uma atividade
1. **Ficha** (`docs/atividades/<atividade>.md`) — Central + Savio: regras, medidas, atributo, o que
   é domínio, por que é divertido de assistir.
2. **Cenário** — sessão Cenários: objetos, cenário, luz, efeitos, numa vitrine publicada. Savio aprova.
3. **Treino** — sessão nova no computador do Savio: simulação, treino do zero ao domínio, fita,
   página final juntando cenário + simulação + fita. Savio aprova a graça da evolução.
4. **Registro** — o que se aprendeu vai para `docs/aprendizados.md`; ficha marcada como pronta.

Os passos 2 e 3 podem se sobrepor: a sessão de treino pode começar a simulação pela ficha enquanto
o cenário é ajustado, e plugar o cenário quando ele for aprovado.

## Fases
**Fase A — conteúdo (agora)**
- Personagem: criador no repositório, boneco final, animações compartilhadas.
- Cenários: peças comuns + cenários da Precisão e do Futebol; depois os das novas atividades.
- Treino: Futebol jogando bem (começar já, em paralelo — é o maior risco).
- Central: fichas de 2–3 atividades novas com o Savio.
- Pronto quando: futebol bom de assistir; 3 atividades de treino com fita aprovada; boneco final em todas.

**Fase B — regras do jogo** (Central + Savio): atributos, habilidades, títulos, quanto rende cada
treino, economia, temporada, convocação. Pronto quando `docs/produto.md` → "Em aberto" não tiver
nada crítico. Pode andar junto com a Fase A.

**Fase C — backend** (sessão nova): contas e atléticas, 5 ações por dia, sessões de treino de 2h
ligadas às fitas, partidas oficiais no servidor com replay, rankings.

**Fase D — app**: interface do jogador (mobile primeiro).

## Como o trabalho se junta
- Cada sessão no seu ramo; pull request para `main` a cada marco. Sessões locais usam
  `git worktree` (uma pasta por sessão).
- O Savio aprova olhando a página do marco; a Central confere contratos e docs de estado.
- Mudança em pasta de outra sessão ou em contrato: `docs/pedidos.md`.
