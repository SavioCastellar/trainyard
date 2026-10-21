# Ficha: Precisão

Estação do centro de treinamento para **Precisão**. Refeita em 2026-10-20 a pedido do Savio: a versão de
alvos de tiro numa arena redonda "ainda estava bem feia" e o atleta só girava parado no meio. Agora cada
nível é uma estação diferente, e o nível 3 é com a mão, para não ser um treino só de futebol.

- **Tipo:** treino de atributo base, individual. **Atributo:** Precisão.
- **Objetivo do atleta (recompensa):** +1 por acerto. Nenhuma outra recompensa.
- **Duração da tentativa:** 30 s.
- **Por que é divertido de assistir:**
  - Nível 1: no começo nem acha a bola; depois corre até ela, vira para a pilha e derruba os garrafões, que voam.
    (Na primeira prévia a bola saía do pé, do nada; o Savio achou que parecia um "poder" e pediu a máquina também aqui.)
  - Nível 2: aprende a correr até a bola que a máquina solta, se ajeitar e acertar o painel aceso antes de
    apagar (o painel acende, pisca e estoura em luz no acerto).
  - Nível 3: troca o pé pela mão. Aprende a pegar a bola e arremessar **à frente** do alvo que corre no trilho.

## Níveis (fita treinada uma vez, subindo de nível quando o atleta domina o atual)
| Nível | Estação | Domínio (acertos por tentativa) |
|---|---|---|
| 1 · Derrubar | 3 pilhas de 6 garrafões espalhadas pelo campo. A máquina solta a bola a 1,2–2,5 m do atleta; ele busca e chuta; derrubou, a pilha é montada em outro lugar | **11** |
| 2 · Paredão | parede no fundo com 6 painéis; só um aceso por vez, por 4 s (pausa de 0,35 s). A máquina solta a bola parada num ponto sorteado; o atleta vai até ela e chuta no painel aceso. Bola em painel apagado não conta | **6** |
| 3 · Alvo deslizante | um alvo corre num trilho ao longo da parede (de −7,5 a +7,5, 2,4/s, volta nas pontas). O atleta pega a bola com a mão e **arremessa** | **8** |

**Medido com o piloto escrito à mão** (`pilotoPrecisao`, 60 tentativas), acertos / lançamentos por tentativa:
| Nível | Aleatório | Piloto sem o comportamento do nível | Piloto com |
|---|---|---|---|
| 1 | 0,1 / 0 | — | 13,8 / 14 |
| 2 | 0 (nunca chega na bola) | — | 7,4 / 9 |
| 3 | 0 | 0,6 / 10 (mira onde o alvo está) | 9,1 / 10 (mira à frente) |

Os pilotos dos níveis 1 e 2 são lentos: param atrás da bola antes de chutar. O atleta pode chutar sem parar (o chute
sai na direção do corpo), então deve passar bem do piloto.

**Ajustes para o atleta aprender (testes de 5 min na nuvem, 2026-10-21):** com a bola vindo da máquina, o
atleta ficava em ~2,5 acertos chutando na direção em que vinha correndo até a bola (12% no alvo, igual ao
acaso). Mudou: (1) só lança quase parado; (2) o lançamento sai na direção escolhida, e não na do corpo (o corpo
precisa estar virado até 60° para ela); (3) a observação dá quanto o alvo foge da direção de 22,5° mais perto,
que é o que o ajuste fino corrige; (4) as pilhas vêm da mais perto para a mais longe; (5) a bola cai mais
perto (1,2–2,5 m) e o alcance do chute é 1,1. Com isso, em 5 min: 3,3 acertos e subindo, erro mediano de 17°.

## Medidas (unidades da simulação ≈ metros; fonte: `sim/src/drills/precision.ts`)
| Coisa | Medida |
|---|---|
| Campo | 20 × 16 (x de −10 a 10, z de −8 a 8); parede em z = −8 |
| Linha de arremesso | níveis 2 e 3: o atleta não passa de z = −1,5 (a 6,5 m da parede) |
| Atleta | movimento padrão (`movimento.ts`), atributos da fita (Velocidade 35, Controle 35) |
| Bola | raio 0,25. Chute: sai a 15/s, rola com atrito 0,55, some abaixo de 1,5/s. Arremesso: sai da mão a 13/s, voa reto até a parede (o arco é só desenho) |
| Lançar | na direção escolhida com ajuste fino de −10°, −5°, 0, +5° ou +10°; erro pequeno; só quase parado (< 1,2 m/s) e com o corpo virado até 60° para essa direção. Níveis 1 e 2: só encostado na bola (até 1,1), de 0,9 em 0,9 s. Nível 3: só com a bola na mão (pega encostando, até 0,8) |
| Máquina | solta a próxima bola 0,6 s depois do lançamento. Nível 1: a 1,2–2,5 m do atleta, longe das pilhas. Níveis 2 e 3: em x de −7 a 7 e z de −0,5 a 6, longe do atleta |
| Pilhas (nível 1) | raio 0,6; aparecem longe do atleta e entre si |
| Painéis (nível 2) | centros em x = −7,5, −4,5, −1,5, 1,5, 4,5, 7,5; 1,8 de largura |
| Alvo do trilho (nível 3) | raio 0,75 |
| Decisões | `[direção 16, ritmo 3, lançar 6]` a cada 8 quadros; lançar 0 = não, 1–5 = ajuste fino |
| Observação (106) | pode lançar, velocidade e direção do corpo, posição no campo, qual estação, bola na mão; a bola a buscar (posição relativa, distância, direção "no idioma das ações"); até 3 alvos vistos de onde a bola vai sair, do mais perto para o mais longe (aceso, posição, distância, quanto o alvo foge da direção de 22,5° mais perto, se o corpo está virado para ele, tempo aceso, velocidade, direção "no idioma das ações") |

## O que se mexe (para o cenário)
- Atleta: anda, chuta (perna) ou arremessa (braço sobe atrás da cabeça); segura a bola na mão no nível 3.
- Bola: rola (futebol) ou voa em arco (handebol); a máquina solta a bola caindo do alto, com uma marca no chão (todos os níveis).
- Pilhas: garrafões que voam e quicam ao serem derrubados; a pilha nova cresce em outro lugar.
- Painéis: um aceso em verde, barra embaixo encolhendo com o tempo; estoura em luz no acerto.
- Trilho: alvo vermelho e branco correndo de uma ponta à outra.

## Centro de treinamento (só visual)
| Nível do CT | Estrutura |
|---|---|
| 0 | garrafões velhos, parede de tijolo pintada |
| 1 | piso emborrachado, painéis com lâmpada |
| 2 | painéis de LED com contagem, trilho motorizado |
| 3 | telão com o replay do melhor acerto, marca da atlética no paredão |

## Estado
- Ficha e prévia: aprovadas pelo Savio (2026-10-21), com a bola vindo da máquina também no nível 1.
- Prévia com piloto: `python web/atividades/precisao/build.py --previa` → `web/dist/previa-precisao.html`.
- Treino: a fazer depois da aprovação. A fita antiga (`fitas/precisao.json`, alvos de tiro) não funciona com a
  simulação nova e é substituída no retreino. Saíram a página antiga (`web/src/precision.template.html`,
  `web/build_precision.py`), a página da arena redonda e o `sim/scripts/lead-check.ts`.
