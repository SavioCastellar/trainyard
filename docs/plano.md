# Plano

## Sessões em paralelo
| Sessão | Ramo | Pastas dela | Briefing |
|---|---|---|---|
| Personagem | `personagem` | `web/personagem/`, `web/src/cabecudo-lib.js` | `docs/sessoes/personagem.md` |
| Atividades (inclui o futebol) | `atividades` | `sim/`, `training/`, `fitas/`, `web/atividades/`, `web/src/precision.template.html`, `web/build*.py` | `docs/sessoes/atividades.md` |
| Central | `main` | `docs/`, `CLAUDE.md`, `README.md` | `docs/sessoes/central.md` |

Depois, quando as decisões em aberto de `docs/produto.md` estiverem fechadas: sessão **Backend/App**.

## Fases
**Fase A — conteúdo (agora, em paralelo)**
- Personagem: criador de atleta no repositório, boneco mais bonito, animações compartilhadas.
- Atividades: pipeline genérico de atividade → fita → página; 2ª e 3ª atividades; futebol que joga bem.
- Pronto quando: 3 atividades com fita assistível e aprovada pelo Savio; futebol com gols e jogadas
  variadas, sem chutão; boneco final usado em todas as páginas.

**Fase B — regras do jogo** (Central, com o Savio)
- Fechar atributos, habilidades, títulos, quanto cada treino rende, economia, temporada, convocação.
- Pronto quando: `docs/produto.md` sem itens críticos em "Em aberto".

**Fase C — backend** (sessão nova)
- Contas e atléticas, 5 ações por dia, sessões de treino de 2h ligadas às fitas, partidas oficiais
  no servidor gerando replays, ranking interno e entre atléticas.

**Fase D — app**
- Interface do jogador (mobile primeiro) juntando criador, treinos, partidas e ranking.

## Como as sessões se juntam
- Cada sessão trabalha no seu ramo e abre pull request para `main` ao fim de cada marco.
- O Savio aprova olhando a página publicada do marco. A Central confere se contratos foram respeitados.
- Pedido de mudança em pasta de outra sessão ou em contrato: `docs/pedidos.md`.
