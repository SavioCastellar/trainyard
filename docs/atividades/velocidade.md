# Ficha: Pista de tiros

Estação do centro de treinamento para **Velocidade**. Proposta do Claude (2026-10-16), aguardando o Savio.

- **Tipo:** treino de atributo base, individual. **Atributo:** Velocidade.
- **Ideia:** o "vai e volta" dos testes físicos de verdade. O atleta corre entre duas linhas e precisa chegar à próxima linha antes do apito. A cada linha o apito fica mais apertado, até ele não conseguir mais. Não tem gesto de esporte, robô nem adversário.
- **Objetivo do atleta (recompensa):** +1 por linha alcançada antes do apito. A tentativa acaba na primeira linha perdida ou aos 45 s.
- **Por que é divertido de assistir:**
  - No começo anda devagar, passa da linha sem perceber ou volta antes da hora.
  - Depois aprende a correr direto, frear em cima da linha e virar rápido.
  - Perto do limite, cada linha vira uma corrida contra o apito.
  - O placar ("chegou a 14 linhas") dá uma progressão fácil de entender.
- **Teto alto:** o apito aperta sem parar, então sempre existe uma linha seguinte mais difícil. Os 3 níveis mudam o tipo de corrida.

## Níveis (fita treinada uma vez, subindo de nível quando o atleta domina o atual)
| Nível | O que muda | Domínio do nível |
|---|---|---|
| 1 · Tiros curtos | linhas a 10 de distância; o 1º apito dá 4,0 s e cada linha tira 0,1 s | ≥ 20 linhas por tentativa |
| 2 · Tiros longos | linhas a 20 de distância; o 1º apito dá 6,5 s e cada linha tira 0,15 s; só ganha tempo quem freia e vira bem | ≥ 12 linhas |
| 3 · Mudança de direção | a próxima linha é uma de 3 (frente, diagonal esquerda, diagonal direita), revelada quando ele toca a atual | ≥ 12 linhas |

- **Por que os números:** a 4,5/s, 10 de distância levam 2,2 s mais a frenagem e a virada. No nível 1 o apito chega abaixo disso por volta da 20ª linha, que é o limite físico.
- Valores estimados; a sessão de treino mede e ajusta.

## Medidas (unidades da simulação ≈ metros)
| Coisa | Medida |
|---|---|
| Pista | retângulo de 26 × 10 (níveis 1–2); 26 × 22 com 3 linhas de chegada no nível 3 |
| Linhas | faixas de 10 × 0,3 no chão; "alcançar" = o centro do atleta cruza a faixa |
| Atleta | raio 0,55; velocidade máxima 4,5/s; **aceleração 6/s² e frenagem 9/s²** (o atleta tem embalo; parar e virar custa); gira 3,2 rad/s |
| Apito | conta regressiva a partir do toque na linha anterior |
| Decisões | girar (esquerda, nada, direita), andar (frente, nada, ré), como na Precisão |
| Observação | posição, direção e velocidade do atleta; posição da linha-alvo; tempo restante do apito |

## O que se mexe (para o cenário)
- Atleta: corrida, frenagem, virada.
- Linha-alvo: acesa, com contagem.
- Apito: som e efeito visual.
- Placar de linhas e linha perdida (efeito de fim).

## Centro de treinamento (só visual)
| Nível do CT | Estrutura |
|---|---|
| 0 | linhas pintadas no cimento, cones nas pontas |
| 1 | pista emborrachada, cronômetro de parede |
| 2 | linhas de LED no piso, painel com linhas e tempo |
| 3 | pista coberta com iluminação de estádio, telão com o recorde da atlética |

## Estado
- Ficha: proposta, aguardando o Savio.
- Cenário: a fazer.
- Treino: a fazer.
