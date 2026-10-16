# Ficha: Plataformas de equilíbrio

Estação do centro de treinamento para **Controle**. Proposta do Claude (2026-10-16), aguardando o Savio.

- **Tipo:** treino de atributo base, individual. **Atributo:** Controle.
- **Ideia:** uma trilha de plataformas redondas e baixas, encostadas umas nas outras, com curvas. O atleta tem embalo, então correr demais numa curva faz ele passar da plataforma. Quem sai cai no colchão e volta para a última plataforma pisada. Não tem gesto de esporte, robô nem adversário.
- **Objetivo do atleta (recompensa):** +1 por plataforma nova alcançada. Nenhuma outra recompensa.
- **Duração da tentativa:** 30 s.
- **Por que é divertido de assistir:**
  - No começo ele cai o tempo todo: corre reto e passa direto pela primeira curva.
  - Depois aprende a frear antes da curva e acelerar na reta.
  - No nível 3 aprende a esperar a plataforma móvel chegar antes de pisar.
  - As quedas no colchão são o "fracasso engraçado" do treino, sem humor forçado.
- **Teto alto:** plataformas menores, curvas mais fechadas e plataformas que se mexem.

## Níveis (fita treinada uma vez, subindo de nível quando o atleta domina o atual)
| Nível | O que muda | Domínio do nível |
|---|---|---|
| 1 · Plataformas largas | raio 1,0; curvas suaves (até 30° de uma para a outra) | ≥ 16 plataformas por tentativa |
| 2 · Estreitas | raio 0,6; curvas fechadas (até 90°, em zigue-zague) | ≥ 14 plataformas |
| 3 · Móveis | raio 0,6; algumas plataformas deslizam de um lado para o outro (±0,8, período de 3 s) | ≥ 12 plataformas |

Valores estimados; a sessão de treino mede e ajusta.

## Medidas (unidades da simulação ≈ metros)
| Coisa | Medida |
|---|---|
| Trilha | 24 plataformas sorteadas pela semente, cada uma encostada na anterior, dentro de uma área de 20 × 20 |
| Pisar | o centro do atleta dentro do círculo da plataforma; fora de todas = queda |
| Queda | o atleta volta para o centro da última plataforma pisada, parado, depois de 1 s |
| Atleta | raio 0,55; velocidade máxima 4,5/s; **aceleração 6/s² e frenagem 9/s²** (embalo); gira 3,2 rad/s |
| Decisões | girar (esquerda, nada, direita), andar (frente, nada, ré) |
| Observação | posição, direção e velocidade do atleta; as próximas 4 plataformas (posição relativa, raio, velocidade se móvel) |

## O que se mexe (para o cenário)
- Atleta: passada, desequilíbrio na beira, queda no colchão, volta.
- Plataformas: acendem ao serem pisadas pela primeira vez; as móveis deslizam.

## Centro de treinamento (só visual)
| Nível do CT | Estrutura |
|---|---|
| 0 | caixas de madeira sobre colchões velhos |
| 1 | plataformas emborrachadas, colchão novo em volta |
| 2 | plataformas com aro de luz, painel com a contagem |
| 3 | plataformas com mecanismo aparente nas móveis, telão com o percurso |

## Estado
- Ficha: proposta, aguardando o Savio.
- Cenário: a fazer.
- Treino: a fazer.
