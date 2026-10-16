# Ficha: Trenó de carga

Estação do centro de treinamento para **Força**. Proposta do Claude (2026-10-16), aprovada no papel pelo Savio; aprovação final só vendo rodando.

- **Tipo:** treino de atributo base, individual. **Atributo:** Força.
- **Ideia:** empurrar um trenó com peso até a linha final, como nos treinos de força de verdade. O trenó só anda enquanto o atleta empurra. Empurrar fora do centro faz o trenó girar. Não tem gesto de esporte, robô nem adversário.
- **Objetivo do atleta (recompensa):** +1 a cada marca de 3 que o trenó cruza. Ao cruzar a linha final, o trenó volta ao início e ele recomeça. Nenhuma outra recompensa.
- **Duração da tentativa:** 30 s.
- **Por que é divertido de assistir:**
  - No começo ele anda em volta do trenó e empurra de lado: o trenó gira e sai da pista.
  - Depois aprende a se posicionar atrás e empurrar pelo centro.
  - No nível 2 descobre que parar custa caro, porque arrancar de novo é difícil, e passa a empurrar sem parar.
  - No nível 3 aprende que na rampa não pode parar, senão o trenó volta.
- **Teto alto:** os 3 níveis mudam o peso e o terreno.

## Níveis (fita treinada uma vez, subindo de nível quando o atleta domina o atual)
| Nível | O que muda | Domínio do nível |
|---|---|---|
| 1 · Carga leve | trenó leve, pista reta de 15 | ≥ 3 entregas por tentativa |
| 2 · Carga pesada | trenó 3× mais pesado; parado, ele exige um empurrão forte para sair do lugar (atrito parado maior que em movimento) | ≥ 1,5 entrega por tentativa |
| 3 · Rampa | o meio da pista é uma rampa; se o atleta solta o trenó na subida, ele escorrega para trás | ≥ 1 entrega por tentativa |

Valores estimados; a sessão de treino mede e ajusta.

## Medidas (unidades da simulação ≈ metros)
| Coisa | Medida |
|---|---|
| Pista | 4 de largura × 15 de comprimento, com marcas a cada 3; sair da largura = o trenó volta ao início |
| Trenó | retângulo de 1,2 × 0,8; leve: avança até 2,5/s empurrado; pesado: até 1,2/s; gira quando empurrado fora do centro |
| Empurrar | o atleta encosta na traseira do trenó e anda para a frente; a força vai pelo ponto de contato |
| Atleta | raio 0,55; anda até 4,5/s sem carga; gira 3,2 rad/s |
| Rampa (nível 3) | trecho de 5 no meio da pista, inclinação que faz o trenó escorregar a ~1/s se solto |
| Decisões | girar (esquerda, nada, direita), andar (frente, nada, ré) |
| Observação | posição, direção e velocidade do atleta; posição, ângulo e velocidade do trenó; ponto de contato; distância até a próxima marca |

## O que se mexe (para o cenário)
- Atleta: passada, postura de empurrar (inclinado para a frente).
- Trenó: desliza, gira, escorrega na rampa.
- Marcas da pista: acendem quando o trenó cruza.
- Linha final: efeito de entrega.

## Centro de treinamento (só visual)
| Nível do CT | Estrutura |
|---|---|
| 0 | trenó de metal com anilhas sobre cimento |
| 1 | pista de grama sintética com faixas pintadas |
| 2 | trenó com marcador de carga, painel de distância |
| 3 | pista coberta com rampa de verdade, telão com a carga levada pela atlética |

## Estado
- Ficha: aprovada no papel (2026-10-16). Aprovação final só vendo o treino rodando.
- Cenário: a fazer.
- Treino: a fazer.
