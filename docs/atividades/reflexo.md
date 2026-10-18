# Ficha: Lançadores

Estação do centro de treinamento para **Reflexo**. Ideia do Savio (2026-10-16, depois de assistir ao
Painel, que foi para Velocidade): desviar de bolas vindo na direção do atleta. Desenho do Claude;
aprovação final só vendo rodando.

- **Tipo:** treino de atributo base, individual. **Atributo:** Reflexo ("tempo entre ver e agir").
- **Ideia:** o atleta fica num tapete redondo. Lançadores de bola na borda da estação piscam e
  disparam bolas de espuma nele. Ele precisa sair da linha a tempo. Lançador é equipamento da
  estação, não adversário; não tem gesto de esporte.
- **Objetivo do atleta (recompensa):** +1 por bola que passa sem acertar. Nenhuma outra recompensa.
- **Bolada:** o atleta fica **1 s atordoado** (parado), um custo natural, sem recompensa negativa.
- **Duração da tentativa:** 30 s.
- **A mira:** a bola vai onde o atleta **vai estar** no fim do voo. Se ele repete a mesma ação há
  0,3 s ou mais, o lançador simula a mesma física com essa ação; se ele está trocando de ação, supõe
  que segue com a velocidade que tem. Assim, ficar parado, tremer no lugar ou correr em círculo não
  adianta. Só escapa quem **muda de direção depois do disparo**, que é o reflexo.
- **Por que é divertido de assistir:**
  - No começo leva bolada atrás de bolada, sem entender de onde ela vem.
  - Depois aprende a sair da frente quando o lançador dispara.
  - No nível 2 a bola vem de qualquer lado: ele aprende a olhar para o lançador que pisca.
  - No nível 3 os lançadores andam em volta do tapete (pedido do Savio, 2026-10-17) e às vezes disparam em par: ele acompanha quem vai disparar e escolhe o lado certo para fugir.

## Níveis (fita treinada uma vez, subindo de nível quando o atleta domina o atual)
| Nível | O que muda | Bola | Aviso | Intervalo | Domínio |
|---|---|---|---|---|---|
| 1 · Um lançador | só o lançador da frente | 9/s | 1,0 s | 2,0 s | ≥ 90% das bolas desviadas |
| 2 · Quatro lançadores | 4 lançadores em volta (a cada 90°) | 12/s | 0,5 s | 1,6 s | ≥ 95% |
| 3 · Lançadores em movimento | como o 2, mas os lançadores giram em volta do tapete a 0,4 rad/s (~3,6 m/s), trocando de sentido a cada 2–5 s (sorteado); em 40% dos disparos saem duas bolas juntas de lançadores diferentes, e a segunda mira 1,4 para um dos lados da primeira (fecha a rota de fuga) | 12/s | 0,5 s | 1,6 s | ≥ 94% |

Medido com robôs simples (200 tentativas por linha, % de bolas desviadas):
| Nível | Parado | Aleatório (tremendo) | Correndo em círculo | Reage ao disparo (robô simples) |
|---|---|---|---|---|
| 1 | 0% | 12% | 14% | 71% |
| 2 | 0% | 5% | 4% | 48% |
| 3 | 29% | 30% | 28% | 68% |

Treino medido (2026-10-16, domínio = média das últimas 300 tentativas do nível):
| Nível | Início do nível | Domínio | Tentativas até o domínio |
|---|---|---|---|
| 1 | 12% (leva ~12 boladas em 30 s) | 93% | 576 |
| 2 | ~50% | 95% | 6.208 |
| 3 | ~70% | 94% com os lançadores girando (teto ~95% em 45 min; sem giro chegava a 97%) | 33.216 |
O atleta treinado passa bem do robô simples. Treino até o domínio do nível 3: ~25 min (retreinado em 2026-10-17 com o giro).

## Medidas (unidades da simulação ≈ metros; atleta igual ao dos outros treinos)
| Coisa | Medida |
|---|---|
| Tapete | círculo de raio 3; o atleta não sai dele |
| Lançadores | a 9 do centro, a 0°, 90°, 180° e 270°; bola sai na altura do peito |
| Atleta | raio 0,55; anda até 4,5/s (ré 2,25/s); passo lateral até 3,5/s; gira 3,2 rad/s; começa no centro olhando para +x (para o lançador do nível 1) |
| Bola | raio 0,3; reta, velocidade constante; acerta se a distância ao centro do atleta < 0,85; some ao passar de 9,5 do centro |
| Sequência | primeiro aviso aos 0,6 s; depois um aviso a cada "intervalo"; a bola sai no fim do aviso |
| Decisões | girar (esquerda, nada, direita), andar (frente, nada, ré), passo lateral (esquerda, nada, direita) |
| Observação | posição, direção, velocidades e se está atordoado; para cada lançador: aviso aceso, tempo até o disparo, direção (cos, sen) e distância vistos pelo atleta; para as 4 bolas mais perto: direção, distância e velocidade no referencial do atleta; sentido do giro dos lançadores |

## O que se mexe (para o cenário)
- Atleta: corrida, passo lateral, atordoado depois da bolada, comemoração curta ao desviar.
- Lançadores: lâmpada de aviso piscando, cabeça que acompanha o atleta, recuo no disparo; no nível 3 deslizam em volta do tapete (trilho circular).
- Bolas de espuma em voo; estouro na bolada.
- Cronômetro da tentativa e contador de bolas desviadas.

## Centro de treinamento (só visual)
| Nível do CT | Estrutura |
|---|---|
| 0 | tapete sobre cimento, lançadores simples em tripé |
| 1 | piso emborrachado, rede de proteção atrás dos lançadores |
| 2 | lançadores com anel de LED, painel com bolas desviadas |
| 3 | arena iluminada, telão com o replay em câmera lenta, marca da atlética |

## Estado
- Ficha: desenho do Claude a partir da ideia do Savio (2026-10-16). Aprovação final vendo rodando.
- Treino: feito (2026-10-16), fita `fitas/reflexo.json` (75 fotos), página `web/atividades/reflexo/`
  (`web/dist/treino-reflexo.html`). Aguarda o Savio assistir.
- Cenário: provisório na página; definitivo com a sessão Cenários.
