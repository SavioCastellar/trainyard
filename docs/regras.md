# Regras do jogo (Fase B — proposta 1)

Decididas pelo Claude em 2026-10-14 a pedido do Savio ("assuma o que for melhor"), para revisão.
**Os números vivem em `sim/src/jogo.ts`** (fonte da verdade); este arquivo explica o porquê.
Página para testar: `python web/regras/build.py` → `web/dist/regras.html` (simulador do dia,
balanço da temporada por perfil, tabelas geradas das próprias regras).

## Tom e mundo
- **Tom sério e competitivo.** O jogo trata a liga como esporte de verdade: linguagem de
  departamento esportivo (convocação, departamento médico, rodada, súmula), sem piadas na
  interface, sem gírias forçadas. A graça vem da competição e de assistir o atleta aprender, não
  de texto engraçado.
- **Mundo:** a Liga Universitária mantém um complexo de treinamento num arquipélago (as ilhas
  flutuantes do visual). Cada estudante inscrito recebe um **atleta**: um duplo digital, com a sua
  aparência, que aprende por tentativa e erro. As atléticas do campus disputam a temporada com os
  seus atletas; o que acontece nas ilhas é registrado e conta para o ranking oficial. Sem magia,
  sem vilões: o conflito é a tabela de classificação.
- O personagem caricato (cabeça grande) continua como decidido; o tom sério vale para textos,
  interface, nomes e situações.

## O dia
- **5 ações por dia**, cada uma ocupa o atleta por 2 h: treinar, treinar habilidade, trabalhar,
  amistoso, expedição em grupo. A rodada oficial **não** gasta ação.
- O dia vira à meia-noite (horário de Brasília). Ações não acumulam.

## Atributos
- Sete: **Velocidade, Força, Precisão, Chute, Controle, Reflexo, Fôlego.** Força entra (para
  Avalanche, queimada e o carrinho do futebol; pedido ao Treino: Futebol abaixo).
- Começam entre 25 e 40 (sorteados por semente), teto 99.
- **Ganho por treino** = 4 × (1 − valor/100)^1,5 × (0,6 + 0,4 × forma/100).
  Aos 35 sobe ~2,1 por treino; aos 70, ~0,66; aos 85, ~0,23. Treinando 2× por dia o mesmo
  atributo, 35 → 80 leva ~25 dias. Retorno decrescente premia especializar e deixa o topo raro.
- **Treino e fita:** cada atributo tem uma atividade (Precisão → Treino de Precisão; demais a
  definir em fichas). A fita tem 3 sessões de 2 h; o atleta assiste à sessão seguinte a cada treino.
  Depois da 3ª ele já domina a atividade e os treinos seguintes mostram o nível de domínio
  (com jogadas diferentes a cada vez), enquanto o atributo segue subindo devagar.

## Habilidades
Treino de habilidade gasta 1 ação e só pode começar com o requisito atingido; libera após N sessões.
Futebol: Chute de longe (Chute 60, 3), Goleiro (Reflexo 55, 3), Drible (Controle 65, 4),
Carrinho (Força 55, 3).

## Títulos
Calculados a partir dos atributos atuais (perde o título quem deixa o atributo regredir).
Velocista (Vel 80), Artilheiro (Chute 80 + Prec 75), Maestro (Contr 80 + Prec 70), Paredão
(Refl 80), Maratonista (Fôl 85), Avalanche (Vel 80 + Força 80), Atleta completo (todos ≥ 70).
No balanço, quem foca chega ao primeiro título por volta do **dia 26** de 42; quem divide treino
entre três atributos não chega na primeira temporada.

## Forma, ausência e lesão
- **Forma** (0–100, começa em 80): +10 por dia com alguma ação, −15 por dia sem nenhuma.
  Multiplica os atributos em partida (×0,8 a ×1,0) e o ganho de treino (×0,6 a ×1,0).
- **Ausência:** a partir do 3º dia seguido sem entrar, todos os atributos perdem 0,5 por dia
  (nunca abaixo do valor inicial). Sumir 10 dias no meio da temporada derruba a força de ~51 para
  ~35 e o atleta termina a temporada ~7 pontos atrás de quem não sumiu.
- **Lesão:** 2% por partida (+4% com forma abaixo de 50), 12% por expedição; 2–4 dias fora de
  treinos e partidas (pode trabalhar). Departamento médico cura na hora por 50 créditos por dia
  restante.

## Economia
Moeda: **créditos**. Não se compram com dinheiro real e não se convertem em dinheiro real (o prêmio
do campeonato é pago à atlética pela organização, fora da economia do jogo).

**Entradas**
| Fonte | Valor |
|---|---|
| Trabalho (1 ação; cada turno a mais no mesmo dia paga 25% menos) | Monitor de escolinha 40 · Árbitro de base 55 (15 turnos) · Assistente de preparação física 70 (40 turnos, Fôlego 50) · Instrutor técnico 90 (80 turnos, Precisão 65) |
| Rodada oficial (convocados) | vitória 80 · empate 40 · derrota 20 |
| Amistoso (1 ação) | 20 · 10 · 5 |
| Expedição em grupo (1 ação, 3–4 atletas) | 120 por atleta (+40 com 4) |

**10% de todo pagamento vai para o caixa da atlética.**

**Saídas**
- **Equipamento:** 3 encaixes (calçado, roupa, acessório), 3 níveis — Básico +3 / 150 cr / 15 usos,
  Profissional +6 / 400 / 25, Elite +10 / 1.000 / 40. Cada peça vale só na sua modalidade e para
  um atributo (futebol: Chuteira → Chute, Uniforme leve → Velocidade, Caneleira → Controle).
- **Adaptação:** a peça recém-equipada rende 0% e sobe 25% por dia ativo; trocar zera. É isso que
  **penaliza quem tenta ser bom em muitos esportes**: um kit só rende numa modalidade e trocar de kit
  custa dias de adaptação.
- **Desgaste:** cada partida da modalidade e cada treino do atributo da peça gastam 1 uso; sem
  usos a peça não dá bônus. Conserto: 35% do preço.
- **Sessão com preparador:** opcional no treino, 100 cr, ganho +50%. Sumidouro recorrente: com o
  kit completo, o dinheiro vira treino em vez de acumular.
- **Tratamento médico:** 50 cr por dia de lesão.
- **Caixa da atlética:** compra melhorias coletivas, decididas pela diretoria da atlética:
  Centro de treinamento (5.000 / 12.000 / 25.000; +5% de ganho de treino por nível) e Departamento
  médico (4.000 / 10.000; lesões 1 dia mais curtas por nível).

Números da economia validados abaixo ("Validação").

## Convocação
- Índice da modalidade = força ponderada (atributos efetivos, com equipamento e forma) + 0,5 por
  dia ativo nos últimos 7.
- **Só é convocável quem está apto e fez pelo menos uma ação no dia da rodada** (confirmou
  presença). Sem isso, um atleta forte e sumido ocupava a vaga de quem estava jogando.
- Convocados automaticamente antes de cada rodada pela ordem do índice: no futebol, 3 duplas
  (1ª dupla = os dois maiores índices) + 1 reserva. Critério público no ranking interno.

## Temporada
- **6 semanas (42 dias).** Dias 1–35: fase regular, uma rodada por dia (rodízio). Na rodada, as
  3 duplas de cada atlética enfrentam as 3 da outra (dupla 1 × dupla 1…): 3 pontos por vitória e
  1 por empate, em cada jogo.
- **Pontos de preparo:** até 3 por rodada, proporcionais à fração das ações dos membros usadas no
  dia (todos os membros, não só os convocados). A atlética inteira joga todo dia.
- Dias 36–41: semifinais (1º × 4º, 2º × 3º) e final em melhor de 3; **o melhor colocado começa a
  série com 1 vitória** (vantagem de campanha). Empate no mata-mata vai para os pênaltis (50%).
- Prêmio em dinheiro real para a atlética campeã, pago pela organização (valor e divisão fora do jogo).
- **Entre temporadas** (1 semana): atributos voltam 15% em direção ao valor inicial, títulos ficam
  no histórico, créditos e equipamentos são mantidos. Dá chance a quem entra depois sem apagar o
  trabalho de quem ficou.

## Validação (2026-10-14)
Scripts em `sim/scripts/`: `calibrar.js` (modelo de resultado × futebol real), `liga.js` (ligas
completas), `economia.js` (várias temporadas), `balanco.js` (um atleta por perfil). A página tem a
aba "Liga simulada" com os mesmos números. Liga de teste: 6 atléticas × 12 membros; a atlética A
tem os membros menos ativos e a F os mais ativos.

**Resultado de um jogo.** O modelo antigo das regras era íngreme demais. Medido no futebol 2x2
com robôs (600 partidas por diferença de força): 10 pontos de vantagem = 46% de vitória, 30 pontos =
66%, empates ~17%. A curva das regras foi recalibrada para isso (`chanceVitoria`, escala 25).

**Pontuação** (300 ligas):
| Medida | Proposta original | Regras atuais |
|---|---|---|
| Correlação atividade da atlética × posição (Spearman) | 0,1 | 0,7 |
| Mais ativa termina em 1º | 18% | 47% |
| Mais ativa é campeã | 20% | 39% |
| Líder da fase regular é campeão | 24% | 62% |
| Zebras por jogo (mais fraca vence) | 47% | 45% |

Com 1 dupla por rodada só os 2 melhores de cada atlética importavam, e todas tinham 2 bons
jogadores (diferença média de força 2,5): o campeonato era sorteio. 3 duplas (0,1 → 0,4), pontos de
preparo (→ 0,7) e vantagem de campanha (campeão = líder 24% → 62%). Cada jogo continua aberto; a
temporada recompensa a atlética mais ativa.

**Economia** (300 ligas; e 3 temporadas seguidas por perfil):
| Medida | Proposta original | Regras atuais |
|---|---|---|
| Saldo médio no fim da temporada | 1.334 | 490 |
| Desigualdade dos saldos (Gini) | 0,56 | 0,37 |
| Saldo do dedicado ao fim das temporadas 1 → 2 → 3 | 552 → 5.980 → 11.970 | 445 → 752 → 691 |
| Saldo do trabalhador 1 → 2 → 3 | 4.232 → 13.491 → 25.532 | 932 → 3.731 → 8.018 |

Mudanças: desgaste também no treino, sessão com preparador e salário decrescente no mesmo dia.
Entradas por atleta numa temporada: salário 63%, rodada oficial 19%, expedição 12%, amistoso 6%.
Saídas: equipamento 84%, conserto 13%, médico 3%, mais o preparador. Caixa da atlética: ~5.700 por
temporada; compra a 1ª melhoria por volta do dia 25.

Também verificado: mesma semente = mesma liga; só especialistas chegam a título na 1ª temporada
(dia ~26); sumir 10 dias tira o atleta da convocação e derruba a força de ~51 para ~35.

## Pendências desta proposta
- Trabalhador puro ainda acumula ~4.000 cr por temporada a partir da 2ª. Opções: contribuição
  voluntária ao caixa com reconhecimento no ranking interno, ou kits das próximas modalidades.
- Dedicado que divide o treino em 3 atributos só chega a título na 2ª temporada. Ok se título for
  marca de especialista; revisar se parecer frustrante.
- Atributos mexem pouco no futebol com robôs (30 pontos de vantagem = 66%). Pedido ao Treino:
  Futebol em `docs/pedidos.md`. Medir de novo com o cérebro treinado (`calibrar.js`).
- Habilidades de queimada e rouba-bandeira; atividades de treino para os atributos sem fita.
- Pedido ao Treino: Futebol — Força na física (disputa de bola/carrinho) e usar `forca()` de
  `jogo.ts` como atributos efetivos (equipamento + forma) nas partidas oficiais.
