# Ficha: Painel de reação

Estação do centro de treinamento para **Reflexo**. Proposta do Claude (2026-10-16), aguardando aprovação do Savio.

- **Tipo:** treino de atributo base, individual. **Atributo:** Reflexo.
- **Ideia:** o piso da estação tem placas que acendem. O atleta precisa pisar na placa acesa antes que ela apague. É o treino de reação com luzes usado em centros de treinamento de verdade. Não tem gesto de esporte, robô nem adversário.
- **Objetivo do atleta (recompensa):** +1 por placa verde pisada a tempo. Nenhuma outra recompensa.
- **Duração da tentativa:** 30 s.
- **Por que é divertido de assistir:**
  - No começo o atleta anda a esmo e as luzes apagam na frente dele.
  - Depois aprende a correr para a luz.
  - No nível 2 descobre sozinho que precisa **voltar ao centro** entre uma luz e outra. Isso é visível e "inteligente".
  - No nível 3 aprende a desviar das placas vermelhas no caminho.
- **Teto alto:** os 3 níveis abaixo. O nível 2 é desenhado para ser impossível sem voltar ao centro.

## Níveis (a fita é treinada uma vez, subindo de nível quando o atleta domina o atual)
| Nível | O que muda | Janela da luz | Domínio do nível |
|---|---|---|---|
| 1 · Luzes lentas | só as 4 placas do anel interno; uma verde por vez | 4,0 s | ≥ 90% das luzes pisadas |
| 2 · Janela curta | as 12 placas; uma verde por vez | 2,5 s | ≥ 85% das luzes |
| 3 · Luzes proibidas | as 12 placas; além da verde, acendem 2 vermelhas ao mesmo tempo, às vezes no caminho | 2,5 s | ≥ 85% das luzes e menos de 1 vermelha pisada por tentativa |

- **Pisar numa vermelha:** o atleta fica **1 s parado**, um custo natural, sem recompensa negativa.
- **Por que o nível 2 obriga a voltar ao centro:**
  - do centro até qualquer placa externa: 5,5 de distância. Leva ~1,2 s correndo, mais até ~1 s para girar, e cabe nos 2,5 s;
  - de uma placa externa até a oposta: 11 de distância, ~2,4 s mais o giro, e não cabe.
- Os valores de domínio são estimativas. A sessão de treino mede e ajusta.

## Medidas (unidades da simulação ≈ metros; atleta igual ao da Precisão)
| Coisa | Medida |
|---|---|
| Piso | círculo de raio 7, borda marcada |
| Atleta | raio 0,55; anda até 4,5/s; gira 3,2 rad/s; começa no centro, olhando para +x |
| Placas | 12 placas redondas de raio 0,6, embutidas no piso: anel interno com 4 a 2,5 do centro (a 45°, 135°, 225°, 315°) e anel externo com 8 a 5,5 do centro (a cada 45°, começando em 0°) |
| Pisar | o centro do atleta entra no círculo da placa |
| Sequência | depois que uma verde é pisada ou apaga, a próxima acende 0,4 s depois, numa placa diferente (sorteada pela semente) |
| Vermelhas (nível 3) | acendem junto com a verde e apagam com ela; nunca na mesma placa da verde |
| Decisões | girar (esquerda, nada, direita) e andar (frente, nada, ré), como na Precisão |
| Observação | posição, direção e velocidade do atleta; para cada placa: cor (apagada, verde, vermelha) e tempo restante |

## O que se mexe (para o cenário)
- Atleta: posição, direção, passada, pisada, parada de 1 s na vermelha.
- Placas: apagada, verde, vermelha, pisada a tempo (efeito de acerto) e apagada sem ser pisada (efeito de erro).
- Cronômetro da tentativa e contador de acertos.

## Centro de treinamento (só visual)
A física e a fita são as mesmas em qualquer nível do CT; muda a estrutura em volta.
| Nível do CT | Estrutura |
|---|---|
| 0 | placas simples sobre piso de cimento, cronômetro de parede |
| 1 | piso emborrachado, iluminação própria da estação |
| 2 | placas com aro de LED, painel eletrônico com acertos e tempo |
| 3 | piso todo iluminado, telão com o replay da tentativa, marca da atlética |

## Estado
- Ficha: proposta, aguardando o Savio.
- Cenário: a fazer (sessão Cenários, dentro do CT).
- Treino: a fazer (sessão de treino nova no computador do Savio).
