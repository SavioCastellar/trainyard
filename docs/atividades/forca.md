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
| 2 · Carga pesada | trenó 3× mais pesado; parado, trava no chão e só sai com um arranque | ≥ 1,5 entrega por tentativa |
| 3 · Rampa | carga pesada + rampa no meio da pista; solto na subida, o trenó escorrega para trás | ≥ 1 entrega por tentativa |

Entregas contam a parcial: marcas cruzadas ÷ 5 (média de 300 tentativas no treino).

**Medido com robôs (2026-10-16, `sim/test/forca.test.ts`, entregas por tentativa nos níveis 1 / 2 / 3):**
| Robô | N1 | N2 | N3 |
|---|---|---|---|
| parado, sempre em frente, círculo, aleatório | ≤ 0,03 | ≤ 0,03 | ≤ 0,01 |
| empurra pelo centro sem corrigir o rumo | 2,09 | 1,42 | 1,01 |
| corrige o rumo mas pausa 0,6 s a cada 1,5 s | 2,11 | 0,70 | 0,47 |
| corrige o rumo e empurra sem parar | 3,01 | 1,64 | 1,23 |

O domínio fica entre o robô sem o comportamento e o robô com ele. No nível 3 tentamos 1,2: o atleta
chega lá por pouco tempo e depois piora (oscila em 0,6–0,8 por 15 min); ficou 1,0.

**Treino (2026-10-16):** do zero ao domínio dos 3 níveis em 3,8 min / 5.900 tentativas
(`--after 20`). Nível 1 em 2,2 min; nível 2 em +1,2 min (cai para 0,1 e sobe a 1,5 ao aprender o
arranque); nível 3 em +0,3 min (0,55 → 1,07, saídas 2,0 → 0,9).

## Medidas (unidades da simulação ≈ metros) — como ficou em `sim/src/drills/forca.ts`
| Coisa | Medida |
|---|---|
| Pista | 4 de largura × 15 de comprimento, com marcas a cada 3; trenó com o centro fora da largura = volta ao início (as marcas já cruzadas nesta volta não pagam de novo; só a entrega zera) |
| Trenó | 1,2 × 0,8, começa em x = 1,2. Leve: massa 1, chega a ~2,2/s empurrado. Pesado: massa 3, ~1,05/s; parado, trava e só destrava se o choque do atleta der ≥ 0,7/s ao trenó (precisa chegar andando a ~2,8/s, uns 0,4 m de embalo) |
| Empurrar | choque sem quique no ponto de contato (gira se fora do centro); só empurra quem anda para a frente; parado ou de ré, o trenó só o afasta |
| Atleta | raio 0,55; até 4,5/s (ré 2,25/s), acelera com força 4 × (alvo − velocidade); gira 3,2 rad/s. Começa num ponto qualquer a 2–3 do trenó, virado para qualquer lado; de novo a cada entrega e a cada saída |
| Rampa (nível 3) | x de 5 a 10, altura 1 (só visual); empurrado sobe a ~0,5/s; solto escorrega para trás a ~0,45/s |
| Atrito | leve: constante 3 + arrasto 2 × vel.; pesado: 3,6 + 8 × vel. (o arrasto alto é o que deixa subir a rampa empurrando e escorregar quando solto) |
| Decisões | girar (esquerda, nada, direita), andar (ré, nada, frente) |
| Observação (27) | atleta (posição, direção, velocidade); trenó (posição, ângulo, velocidades, travado); traseira e centro do trenó vistos pelo atleta (cos, sen, distância); ângulo do trenó em relação ao atleta; contato e ponto de contato; distância até a próxima marca; na rampa e posição na rampa |

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
- Cenário: visual provisório (`web/atividades/ct-provisorio.js` + pista, trenó e rampa na página). Definitivo com a sessão Cenários.
- Treino: feito do zero ao domínio dos 3 níveis (2026-10-16). Fita `fitas/forca.json`, página `web/dist/treino-forca.html`. Falta o Savio assistir.
