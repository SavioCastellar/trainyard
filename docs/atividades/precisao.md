# Ficha: Treino de Precisão

Estação do centro de treinamento para **Precisão**. A versão de 1 nível foi aprovada no protótipo. Os níveis 2 e 3 são proposta do Claude (2026-10-16), aprovados no papel; aprovação final só vendo rodando.

- **Tipo:** treino de atributo base, individual. **Atributo:** Precisão.
- **Objetivo do atleta (recompensa):** acertar alvos chutando bolas. +1 por acerto, nenhuma outra recompensa. O chute fica, por decisão do Savio.
- **Duração da tentativa:** 30 s.
- **Por que é divertido de assistir:**
  - No começo chuta para o nada e a bola some na borda.
  - Depois aprende a virar para o alvo antes de chutar.
  - No nível 2 aprende a escolher o alvo que ainda vai estar aceso quando a bola chegar.
  - No nível 3 aprende a chutar **à frente** do alvo móvel. A antecipação dá para ver
    (medido: o chute passa de 0,7° atrás para 3,1° à frente do alvo, sempre a ~6,6 m; `sim/scripts/lead-check.ts`).
- **Teto alto:** os 3 níveis. A fita atual satura no nível 1 (a 3ª sessão quase não muda), e os níveis 2 e 3 resolvem isso.

## Níveis (fita treinada uma vez, subindo de nível quando o atleta domina o atual)
| Nível | O que muda | Domínio do nível |
|---|---|---|
| 1 · Alvos fixos | 3 alvos parados ao mesmo tempo; o acertado reaparece em outro lugar (como antes) | **26** acertos por tentativa |
| 2 · Alvos que acendem e apagam | cada alvo fica aceso só **2,0 s** e depois troca de lugar; bola em alvo apagado não conta | **26** acertos por tentativa |
| 3 · Alvos móveis | os alvos deslizam em trilhos circulares ao redor do centro, a **2,0/s**, em sentidos sorteados | **25** acertos por tentativa |

**Medido com robôs (2026-10-16, `sim/test/precisao.test.ts`, 40 tentativas):** o robô gira parado até o
alvo mais rápido de acertar e chuta quando a mira está boa.

| Nível | Parado / girando / aleatório | Robô sem o comportamento do nível | Robô com | Domínio |
|---|---|---|---|---|
| 1 | 0,2 / 4,3 / 1,5 | aleatório 1,5 | mira 30,4 | 26 |
| 2 | 2,9 / 3,7 / 1,4 | ignora o tempo aceso 25,1 | só mira alvo que ainda vai estar aceso 29,2 | 26 |
| 3 | 5,8 / 3,7 / 2,5 | mira onde o alvo está 16,6 | mira à frente 30,3 | 25 |

- **Mudanças na proposta, por medida:** com 3,0 s aceso, ignorar o tempo custava só 2 acertos (28,1 × 30,1);
  com trilho a 1,5/s, não antecipar perdia só 6 (24,1 × 30,4). Com 2,0 s e 2,0/s os comportamentos se separam.
- O domínio fica abaixo do robô com o comportamento porque o PPO estaciona em ~90% do robô perfeito
  (nível 1: 27,6 na fita antiga; 26,5 no nível 2 nunca foi alcançado, o atleta parou em ~25,9).
- **Treino (2026-10-16):** 20M passos, ~22 mil tentativas, ~25 min. Nível 1 em 3.840 tentativas;
  nível 2 em 19.840 (cai de 26 para 18 e volta); nível 3 em 21.824 (cai de 26 para 11 e volta a 25).

**Movimento novo (2026-10-20), medido com o piloto escrito à mão** (`pilotoPrecisao`, 40 tentativas): vira
parado para a direção mais perto do alvo e chuta com o ajuste fino que falta.
| Nível | Aleatório | Piloto sem o comportamento do nível | Piloto com | Domínio |
|---|---|---|---|---|
| 1 | 2,2 | — | 29,0 | 26 |
| 2 | 2,4 | 25,5 (ignora o tempo aceso) | 28,1 | 26 |
| 3 | 3,0 | 13,4 (mira onde o alvo está) | 26,9 | 25 |

Os domínios continuam os mesmos.

## Medidas (unidades da simulação ≈ metros; fonte: `sim/src/drills/precision.ts`)
| Coisa | Medida |
|---|---|
| Arena | círculo de raio 12, borda marcada no chão |
| Atleta | raio 0,55; movimento padrão (`movimento.ts`) com os atributos da fita (Velocidade 35, Controle 35): 4,2 m/s, gira o corpo até 7,5 rad/s |
| Bola | raio 0,32; sai a 15/s; atrito 0,55; some ao parar (< 1,5/s) ou sair da arena |
| Alvos | 3 ao mesmo tempo, raio 0,7; reaparecem a 3,5–10,5 do centro, longe do atleta e entre si |
| Alvo aceso (nível 2) | 2,0 s (defasados: no começo 0,7, 1,3 e 2,0 s); depois apaga e reaparece em outro lugar 0,3 s depois |
| Trilhos (nível 3) | cada alvo percorre um círculo do seu raio (3,5–10,5) a 2,0/s; sentido sorteado |
| Chute | intervalo mínimo 0,9 s; só uma bola por vez; erro de mira pequeno; sai na direção do corpo com ajuste fino de −10°, −5°, 0, +5° ou +10° |
| Decisões | `[direção 16, ritmo 3, chute 6]` a cada 8 quadros: chute 0 = não chuta, 1–5 = chuta com o ajuste fino (2026-10-20, movimento novo; as 16 direções sozinhas, de 22,5° em 22,5°, erram o alvo por 2–3 m a 7 m) |
| Observação (114) | chute pronto, velocidade e direção do corpo, centro; para cada alvo: aceso, posição relativa, distância, quanto falta virar o corpo para ele (sen, cos), tempo aceso restante (nível 2), velocidade (nível 3) e a direção dele "no idioma das ações" (16); 16 raios em volta do corpo (alvos acesos e borda) |

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
- Ficha: nível 1 aprovado rodando; níveis 2 e 3 aprovados no papel (2026-10-16), com tempo aceso e velocidade do trilho ajustados por medida; aprovação final só vendo rodando.
- Cenário: protótipo aprovado (dentro de `web/src/precision.template.html`), ainda numa ilha. Refazer dentro do CT (`web/cenarios/precisao.js`).
- Treino: 3 níveis feitos com os controles antigos (`fitas/precisao.json`, 2026-10-16). Migrada para o movimento novo em 2026-10-20 (prévia: `python web/atividades/precisao/build.py --previa`); a fita antiga não funciona mais com a página e é refeita no retreino.
