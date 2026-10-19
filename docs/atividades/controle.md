# Ficha: Plataformas de equilíbrio

Estação do centro de treinamento para **Controle**. Proposta do Claude (2026-10-16), aprovada no papel pelo Savio; aprovação final só vendo rodando.

- **Tipo:** treino de atributo base, individual. **Atributo:** Controle.
- **Ideia:** uma trilha sem fim de plataformas redondas e baixas, cada uma sobreposta à anterior, com curvas. O atleta tem embalo, então correr demais numa curva faz ele passar da plataforma. Quem sai cai no colchão e volta para a última plataforma pisada. Não tem gesto de esporte, robô nem adversário.
- **Objetivo do atleta (recompensa):** +1 por plataforma nova alcançada. Nenhuma outra recompensa.
- **Duração da tentativa:** 30 s (a trilha não acaba; o placar é quantas plataformas ele passa).
- **Por que é divertido de assistir:**
  - No começo ele cai o tempo todo: corre reto e passa direto pela primeira curva.
  - Depois aprende a frear antes da curva e acelerar na reta.
  - No nível 3 aprende a acertar o tempo da plataforma móvel (chegar quando ela encosta), em vez de pular no vazio.
  - As quedas no colchão são o "fracasso engraçado" do treino, sem humor forçado.
- **Teto alto:** plataformas menores, curvas mais fechadas e plataformas que se mexem.

## Níveis (fita treinada uma vez, subindo de nível quando o atleta domina o atual)
| Nível | O que muda | Domínio do nível (média por tentativa) |
|---|---|---|
| 1 · Plataformas largas | raio 1,0; curvas suaves (até 30° de uma para a outra) | ≥ 80 plataformas e < 2 quedas |
| 2 · Estreitas | raio 0,6; curvas fechadas (45° a 90°; em 65% das vezes para o mesmo lado da anterior, fechando a curva) | ≥ 75 plataformas e < 2 quedas |
| 3 · Móveis | como o 2; 40% das plataformas (nunca duas seguidas) deslizam de lado, ±1,0, período de 3 s; em volta delas a trilha é quase reta | ≥ 35 plataformas e < 5 quedas |

**Medido com robôs (2026-10-16, 40 tentativas, `sim/test/controle.test.ts`):**
| Robô | Nível 1 | Nível 2 | Nível 3 |
|---|---|---|---|
| parado / ação constante / círculo / aleatório | ≤ 7 plataformas | ≤ 8 | ≤ 3 |
| mira a próxima, sempre acelerando | 91 (0,6 queda) | 56 (13,6 quedas) | 7 (19 quedas) |
| mira e freia antes da curva | 89 (0,1) | 92 (0,1) | 47 (8,7 quedas) |
| mira, freia e espera a móvel encostar | 89 | 92 | 37 (1,1 queda) |

**Ajustes medidos em relação à ficha original (2026-10-16):**
- **Trilha sem fim** (sempre 10 plataformas à frente; as que ficam 6 para trás afundam no colchão) no lugar de 24 plataformas: com 24, o robô que não freia caía 5 vezes e ainda assim acabava a trilha em 13 s; o tempo não apertava e o domínio não separava quem freia de quem não freia.
- **Zigue-zague puro não tem curva:** alternando o lado, as passagens ficam todas numa linha e dá para correr reto. A curva troca de lado só em 35% das vezes.
- **Sobreposição:** centros a 0,75 × (soma dos raios). Encostadas de verdade (tangentes) só se tocam num ponto e não dá para passar.
- **Plataforma móvel de lado, ±1,0** (ficha: ±0,8): com ±0,8 ela quase nunca solta das vizinhas e o robô que não espera não caía. Deslizando ao longo da trilha ela empurrava o atleta para a frente e ajudava em vez de atrapalhar.
- **Domínio com quedas:** "plataformas" sozinho não mostra o comportamento do nível (o robô que não freia ainda passa 56). Quedas < 2 no nível 2 exigem frear; quedas < 5 no nível 3 exigem acertar o tempo da móvel (quem não espera cai 8,7). Queda de 2 s no lugar de 1 s foi testada e não ajudou.
- **Folga na observação:** sem ela o atleta estacionou no nível 3 em 8,3 quedas (igual ao robô que não espera) por 12 min. Dando a folga entre cada plataforma e a anterior e quanto ela muda, ele dominou o nível 3 em 2,4 min.

**Treino (2026-10-16):** do zero ao domínio dos 3 níveis em 5 min (6.016 tentativas). Nível 1: 90 plataformas e 1,6 queda; nível 2: de 61 plataformas e 10,5 quedas para 138 e 2,1 (freadas de 6% para 21% dos passos); nível 3: de 10 plataformas e 18,7 quedas para 92 e 3,6. No nível 3 ele quase nunca para: acerta o tempo da móvel ajustando a velocidade na chegada.

## Medidas (unidades da simulação ≈ metros)
| Coisa | Medida |
|---|---|
| Trilha | sem fim, sorteada pela semente dentro de uma área de 20 × 20; centros vizinhos a 0,75 × (soma dos raios); 10 à frente, as que ficam 6 para trás afundam |
| Pisar | o centro do atleta dentro do círculo da plataforma; fora de todas = queda |
| Queda | o atleta volta para o centro da plataforma mais adiantada que já pisou, parado, depois de 1 s |
| Atleta | raio 0,55; velocidade máxima 4,5/s; **aceleração 6/s² e frenagem 9/s²** (embalo); gira 3,2 rad/s |
| Decisões | girar (esquerda, nada, direita), andar (frente, nada = embalo com atrito 1,5/s², ré = freia e depois anda de ré até 1,5/s) |
| Observação | velocidade e queda do atleta; a plataforma atual e as 4 seguintes vistas pelo atleta: direção (cos, sen), distância, raio, velocidade, se é móvel e a folga até a anterior (e quanto muda por segundo); na atual, quanto falta para a beira |

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
- Ficha: aprovada no papel (2026-10-16). Aprovação final só vendo o treino rodando.
- Cenário: a fazer.
- Treino: feito (fita `fitas/controle.json`, página `web/atividades/controle/`). Ver `docs/sessoes/treino-controle.md`.
