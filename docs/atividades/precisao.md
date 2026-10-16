# Ficha: Treino de Precisão

Estação do centro de treinamento para **Precisão**. A versão de 1 nível foi aprovada no protótipo. Os níveis 2 e 3 são proposta do Claude (2026-10-16), aguardando o Savio.

- **Tipo:** treino de atributo base, individual. **Atributo:** Precisão.
- **Objetivo do atleta (recompensa):** acertar alvos chutando bolas. +1 por acerto, nenhuma outra recompensa. O chute fica, por decisão do Savio.
- **Duração da tentativa:** 30 s.
- **Por que é divertido de assistir:**
  - No começo chuta para o nada e a bola some na borda.
  - Depois aprende a virar para o alvo antes de chutar.
  - No nível 2 aprende a escolher o alvo que ainda vai estar aceso quando a bola chegar.
  - No nível 3 aprende a chutar **à frente** do alvo móvel. A antecipação dá para ver.
- **Teto alto:** os 3 níveis. A fita atual satura no nível 1 (a 3ª sessão quase não muda), e os níveis 2 e 3 resolvem isso.

## Níveis (fita treinada uma vez, subindo de nível quando o atleta domina o atual)
| Nível | O que muda | Domínio do nível |
|---|---|---|
| 1 · Alvos fixos | 3 alvos parados ao mesmo tempo; o acertado reaparece em outro lugar (como hoje) | ~29 acertos por tentativa, ~97% dos chutes no alvo (medido na fita atual) |
| 2 · Alvos que acendem e apagam | cada alvo fica aceso só 3,0 s e depois troca de lugar; bola em alvo apagado não conta | ≥ 18 acertos por tentativa |
| 3 · Alvos móveis | os alvos deslizam em trilhos circulares ao redor do centro, a 1,5/s, em sentidos sorteados | ≥ 14 acertos por tentativa |

- Os valores de domínio dos níveis 2 e 3 são estimativas. A sessão de treino mede.
- A fita atual (`fitas/precisao.json`) cobre só o nível 1. Para ter os 3 níveis, retreinar com dificuldade crescente (a Precisão chega ao domínio em ~5 min).

## Medidas (unidades da simulação ≈ metros; fonte: `sim/src/drills/precision.ts`)
| Coisa | Medida |
|---|---|
| Arena | círculo de raio 12, borda marcada no chão |
| Atleta | raio 0,55; anda até 4,5/s; gira 3,2 rad/s |
| Bola | raio 0,32; sai a 15/s; atrito 0,55; some ao parar (< 1,5/s) ou sair da arena |
| Alvos | 3 ao mesmo tempo, raio 0,7; reaparecem a 3,5–10,5 do centro, longe do atleta e entre si |
| Alvo aceso (nível 2) | 3,0 s; depois apaga e reaparece em outro lugar 0,3 s depois |
| Trilhos (nível 3) | cada alvo percorre um círculo do seu raio (3,5–10,5) a 1,5/s; sentido sorteado |
| Chute | intervalo mínimo 0,9 s; só uma bola por vez; erro de mira pequeno |
| Decisões | girar (esquerda, nada, direita), andar (frente, nada, ré), chutar (sim, não) |
| Observação (acréscimo) | para cada alvo: tempo aceso restante (nível 2) e velocidade (nível 3) |

## O que se mexe (para o cenário)
- Atleta: posição, direção, passada, chute.
- Bola: rolando.
- Alvos: aparecem, acesos ou apagados, deslizando no trilho, acertados (efeito) e somem.

## Centro de treinamento (só visual)
| Nível do CT | Estrutura |
|---|---|
| 0 | alvos pintados em placas de madeira, piso de cimento |
| 1 | piso de grama sintética, rede de contenção em volta |
| 2 | alvos eletrônicos com luz, placar de acertos |
| 3 | trilhos embutidos no piso, telão com o replay do melhor chute, marca da atlética |

## Estado
- Ficha: nível 1 aprovado; níveis 2 e 3 aguardando o Savio.
- Cenário: protótipo aprovado (dentro de `web/src/precision.template.html`), ainda numa ilha. Refazer dentro do CT (`web/cenarios/precisao.js`).
- Treino: nível 1 feito (`fitas/precisao.json`); retreinar com os 3 níveis.
