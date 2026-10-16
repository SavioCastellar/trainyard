# Ficha: Circuito de decisão

Estação do centro de treinamento para **Inteligência**. Proposta do Claude (2026-10-16), aguardando o Savio.

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
| 1 · Poucos pontos | 3 postos acesos, todos valem 1, sem tempo para apagar | ≥ 14 pontos por tentativa |
| 2 · Caminhos bloqueados | 5 postos com valores 1–3 que apagam em 3–6 s; divisórias baixas no meio da quadra obrigam a dar a volta | ≥ 20 pontos |
| 3 · Regras que mudam | como o nível 2, mas os postos têm cor (azul ou laranja) e um painel diz qual cor vale; a cor que vale troca a cada 8 s; posto da cor errada vale 0 | ≥ 18 pontos |

- **Por que mede decisão:** pegar sempre o mais perto rende menos do que escolher pelo valor e pelo tempo restante. A diferença entre as duas estratégias aparece no placar.
- Valores estimados; a sessão de treino mede e ajusta.

## Medidas (unidades da simulação ≈ metros)
| Coisa | Medida |
|---|---|
| Quadra | retângulo de 16 × 12 |
| Postos | discos de raio 0,6; pisar = centro do atleta dentro do disco; ao ser pisado ou apagar, reaparece em outro lugar sorteado pela semente |
| Divisórias (níveis 2–3) | 3 paredes baixas de 4 de comprimento, em posições sorteadas por tentativa; o atleta não atravessa |
| Painel (nível 3) | mostra a cor que vale; troca a cada 8 s |
| Atleta | raio 0,55; anda até 4,5/s; gira 3,2 rad/s |
| Decisões | girar (esquerda, nada, direita), andar (frente, nada, ré) |
| Observação | posição, direção e velocidade do atleta; para cada posto: posição relativa, valor, tempo restante, cor; a cor que vale e o tempo até a troca; 8 sensores de distância até a parede ou divisória mais próxima |

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

## Estado
- Ficha: proposta, aguardando o Savio.
- Cenário: a fazer.
- Treino: a fazer (o mais arriscado da lista).
