# Ficha: Circuito de decisão

Estação do centro de treinamento para **Inteligência**. Proposta do Claude (2026-10-16), aprovada no papel pelo Savio; aprovação final só vendo rodando.

- **Tipo:** treino de atributo base, individual. **Atributo:** Inteligência (qualidade da decisão).
- **Ideia:**
  - Pela quadra há postos que acendem com um valor (1, 2 ou 3 pontos) e um tempo para apagar.
  - O atleta não consegue pegar todos, então precisa **escolher**: o posto perto que vale pouco, ou o longe que vale muito e pode apagar antes de ele chegar?
  - Não tem gesto de esporte, robô nem adversário.
- **Objetivo do atleta (recompensa):** + o valor do posto pisado (1, 2 ou 3). Nenhuma outra recompensa.
- **Duração da tentativa:** 30 s.
- **Por que é divertido de assistir:**
  - No começo corre para qualquer luz e chega tarde.
  - Depois aprende a pegar o mais perto.
  - Por fim aprende a abrir mão de um ponto fácil para buscar um de 3 que ainda dá tempo de pegar.
  - No nível 3 dá para ver ele "ler" o painel e trocar de alvo no meio do caminho quando a regra muda.
  - É o treino em que as escolhas aparecem, não só a execução.
- **Teto alto:** obstáculos que obrigam a planejar o caminho e regras que mudam.
- **Risco de treino:** é o mais difícil de aprender da lista. Se o nível 3 não aprender em tempo razoável, fica com 2 níveis e registramos o motivo em `docs/aprendizados.md`.

## Níveis (fita treinada uma vez, subindo de nível quando o atleta domina o atual)
| Nível | O que muda | Domínio do nível |
|---|---|---|
| 1 · Poucos pontos | 3 postos acesos, todos valem 1, sem tempo para apagar | ≥ 17 pontos por tentativa (medido) |
| 2 · Caminhos bloqueados | 5 postos com valores 1–3 que apagam em 3–6 s; os de mais valor nascem mais longe; divisórias baixas no meio da quadra obrigam a dar a volta | ≥ 30 pontos (medido) |
| 3 · Regras que mudam | como o nível 2, mas os postos têm cor (azul ou laranja) e um painel diz qual cor vale; a cor que vale troca a cada 8 s; posto da cor errada vale 0 | ≥ 20 pontos (medido) |

**Leva (ajuste medido, 2026-10-16):** os postos acendem juntos, numa leva. **Pisar um posto apaga os outros
da leva**; a próxima leva acende 0,5 s depois que todos foram pisados ou apagaram. Sem isso (postos
renascendo um a um, ou levas em que dá para pegar todos), "ir sempre no mais perto" rendia tanto quanto
escolher pelo valor, e até um robô que testa todas as ordens só ganhava 5–8%: escolher não importava.
Com uma escolha por leva, cada decisão aparece na tela e o valor passa a pesar.

**Medidas com robôs** (`sim/test/inteligencia.test.ts`, 40 tentativas, pontos por tentativa):
| Robô | Nível 1 | Nível 2 | Nível 3 |
|---|---|---|---|
| parado / sempre em frente / círculo / aleatório | 0–0,4 | 0–1,6 | 0–0,8 |
| vai no mais perto | 23,0 | 26,6 | 13,3 |
| valor por tempo, sem olhar a cor | 23,1 | 32,7 | 16,1 |
| valor por tempo, com a cor na chegada | 23,1 | 32,7 | 24,5 |
O domínio fica entre o robô sem e o com o comportamento do nível (ir até um posto; escolher pelo valor;
ler o painel).

- **Por que mede decisão:** pegar sempre o mais perto rende menos do que escolher pelo valor e pelo tempo restante. A diferença entre as duas estratégias aparece no placar.
- Valores estimados; a sessão de treino mede e ajusta.

## Medidas (unidades da simulação ≈ metros)
| Coisa | Medida |
|---|---|
| Quadra | retângulo de 16 × 12 |
| Postos | discos de raio 0,6; pisar = centro do atleta dentro do disco; valor sorteado (1, 2, 3 iguais) e nasce a 1,5–5 (valor 1), 3–8 (valor 2) ou ≥ 5 (valor 3) do atleta; pisar um apaga a leva |
| Divisórias (níveis 2–3) | 3 paredes baixas de 4 de comprimento, em posições sorteadas por tentativa; o atleta não atravessa |
| Painel (nível 3) | mostra a cor que vale; troca a cada 8 s |
| Atleta | raio 0,55; anda até 4,5/s; gira 3,2 rad/s |
| Decisões | girar (esquerda, nada, direita), andar (frente, nada, ré) |
| Observação | posição, direção e velocidade do atleta; painel (se há, qual cor vale, tempo até a troca); os postos acesos em duas listas pela cor (azul ou sem cor; laranja), cada uma do que vale mais ao que vale menos: direção (cos, sen) e distância vistas pelo atleta, valor, tempo restante; 8 sensores de distância até a parede ou divisória mais próxima |

## O que se mexe (para o cenário)
- Atleta: corrida, troca de direção.
- Postos: acendem com o número e um anel de tempo que esvazia; pisados (efeito com o valor) e apagados.
- Divisórias.
- Painel da cor que vale (nível 3).
- Placar de pontos.

## Centro de treinamento (só visual)
| Nível do CT | Estrutura |
|---|---|
| 0 | discos numerados no chão da quadra, divisórias de cavalete |
| 1 | piso de quadra pintado, divisórias acolchoadas |
| 2 | postos de LED com número e anel de tempo, painel eletrônico |
| 3 | quadra com iluminação cênica, telão com o mapa da tentativa e as escolhas do atleta |

## Treino (2026-10-16)
Do zero ao domínio dos 3 níveis em 32 min / 40.900 tentativas (`training/runs/inteligencia-c`):
- Nível 1 em 0,4 min. Nível 2 em 8,6 min (16 → 30 pontos: aprende a contornar as divisórias e chegar antes
  que o posto apague).
- Nível 3: começa em 11 pontos (pisa a cor errada em metade dos postos), fica ~20 min parado em 12–14 e,
  de repente, em 2 min sobe para 20 (cor errada 5 → 1,4 por tentativa). É o "estalo" de ler o painel.
- Fita `fitas/inteligencia.json` (80 fotos, 2 MB); página `web/atividades/inteligencia/` → `web/dist/treino-inteligencia.html`.
- Observação: três tentativas falharam antes desta (ver `docs/aprendizados.md` 25–26).

## Estado
- Ficha: aprovada no papel (2026-10-16); regras ajustadas pela medida (leva com uma escolha, valor longe).
  Aprovação final só vendo o treino rodando.
- Cenário: provisório (CT comum); o definitivo é da sessão Cenários.
- Treino: feito, 3 níveis.
