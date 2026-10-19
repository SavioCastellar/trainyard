# Ficha: Painel de luzes

Estação do centro de treinamento para **Velocidade**. Nasceu como "Painel de reação" para o Reflexo; o Savio assistiu ao treino (2026-10-16), gostou e decidiu que ele treina **Velocidade**, no lugar da Pista de tiros (que não chegou a ser treinada). O Reflexo ganhou os Lançadores (`reflexo.md`).

- **Tipo:** treino de atributo base, individual. **Atributo:** Velocidade.
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
| 2 · Janela curta | as 12 placas; uma verde por vez | **2,8 s** | ≥ **86%** das luzes |
| 3 · Luzes proibidas | as 12 placas; além da verde, acendem 2 vermelhas ao mesmo tempo; em metade das luzes uma delas cai no caminho até a verde | **2,8 s** | ≥ **82%** das luzes e menos de **0,4** vermelha pisada por tentativa |

**Movimento novo (2026-10-19):** com o atleta da fita (Velocidade 35, até 4,2 m/s) a janela de 2,5 s ficou
apertada demais: o piloto escrito à mão pisava 86% voltando ao centro e 84% parado. Com 2,8 s: 92% voltando,
87% parado (o voltar ao centro ainda vale). Treinando direto no nível 2, o atleta chega a ~87% em 4 min na
nuvem; domínios 86% (nível 2) e 82% com menos de 0,4 vermelha (nível 3). A tabela abaixo é do movimento antigo.

Domínios **medidos** no treino (2026-10-16; a média das últimas 300 tentativas do nível). Robô simples
(corre reto para a verde) para comparação:
| Nível | Robô parado entre luzes | Robô que volta ao centro | Atleta treinado (na subida de nível) | Tentativas até o domínio |
|---|---|---|---|---|
| 1 | 100% | 100% | 96% | 448 |
| 2 | 86% | 93% | 95% | 4.352 |
| 3 | 81%, 1,9 vermelha | 85%, 2,1 vermelhas (não desvia) | 95%, 0,29 vermelha | 39.360 (35 mil só no nível 3) |

- Nível 2: com o domínio em 90% (estimativa original de 85%) o atleta subia **sem** aprender a voltar ao
  centro (correndo de placa em placa já dá ~90%). Com 95% ele aprende a recuar ~0,6 m para o centro
  entre as luzes (distância do centro quando a luz acende: 4,45 → 3,87). O recuo existe, mas é sutil
  com a pausa de 0,4 s. Ver "Em aberto".
- Nível 3: com as vermelhas só sorteadas, quase nunca ficavam no caminho e o atleta não aprendia a
  desviar. Com uma no caminho em metade das luzes ele aprende (2,1 → 0,17 vermelha por tentativa).

- **Pisar numa vermelha:** o atleta fica **1 s parado**, um custo natural, sem recompensa negativa.
- **Por que o nível 2 obriga a voltar ao centro:**
  - do centro até qualquer placa externa: 5,5 de distância. Leva ~1,2 s correndo, mais até ~1 s para girar, e cabe nos 2,5 s;
  - de uma placa externa até a oposta: 11 de distância, ~2,4 s mais o giro, e não cabe.
  - **medido:** não obriga. Das 11 placas possíveis, só as ~3 do lado oposto não cabem; o robô que fica parado entre as luzes já pisa 86%.
- Os domínios da tabela foram medidos no treino (ver acima); as estimativas originais eram 90%, 85% e 85% com menos de 1 vermelha.

## Medidas (unidades da simulação ≈ metros; atleta igual ao da Precisão)
| Coisa | Medida |
|---|---|
| Piso | círculo de raio 7, borda marcada |
| Atleta | raio 0,55; atleta da fita com Velocidade 35 e Controle 35 (até 4,2/s, acelera 5,3/s², freia 8,1/s²); começa no centro |
| Placas | 12 placas redondas de raio 0,6, embutidas no piso: anel interno com 4 a 2,5 do centro (a 45°, 135°, 225°, 315°) e anel externo com 8 a 5,5 do centro (a cada 45°, começando em 0°) |
| Pisar | o centro do atleta entra no círculo da placa |
| Sequência | depois que uma verde é pisada ou apaga, a próxima acende 0,4 s depois, numa placa diferente (sorteada pela semente) |
| Vermelhas (nível 3) | acendem junto com a verde e apagam com ela; nunca na mesma placa da verde. Em metade das luzes, uma cai na placa mais perto da linha reta entre o atleta e a verde (se alguma placa estiver a menos de 1,15 dessa linha); a outra é sorteada |
| Decisões | movimento padrão (`sim/src/movimento.ts`): direção (16) e ritmo (parado, trote, corrida), a cada 8 quadros |
| Observação | posição, direção, velocidade do atleta e se está parado; centro, verde e as 2 vermelhas vistos pelo atleta (direção como cos/sen do ângulo, e distância); para cada placa: cor (apagada, verde, vermelha), tempo restante e posição relativa. Sem a direção da verde vista pelo atleta, ele decorava as 4 placas do nível 1 e não pisava nenhuma do anel de fora no nível 2 |

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

## Em aberto (para o Savio decidir vendo a página)
- **Deixar o "voltar ao centro" mais visível:** aumentar a pausa entre luzes e/ou encurtar a janela do
  nível 2. Medido com o robô (parado → volta ao centro): pausa 0,4 s e janela 2,5 s (atual): 86% → 93%;
  pausa 0,8 s e janela 2,2 s: 75% → 97%; pausa 1,0 s e janela 2,0 s: 68% → 97%. Com pausa maior o
  atleta tem tempo de chegar ao centro e o comportamento fica óbvio; custa retreinar (~20 min).

## Estado
- Ficha: aprovada no papel (2026-10-16). Aprovação final só vendo o treino rodando.
- Cenário: a fazer (sessão Cenários, dentro do CT).
- Treino: feito (2026-10-16), fita `fitas/velocidade.json`, página `web/atividades/velocidade/`
  (visual provisório). Assistido e aprovado pelo Savio como treino de Velocidade.
- Código: `sim/src/drills/painel.ts`, atividade `velocidade` na ponte e no `ppo_drill.py`.
