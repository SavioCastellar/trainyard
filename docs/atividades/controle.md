# Ficha: Bandeja

Estação do centro de treinamento para **Controle**. Substitui as Plataformas de equilíbrio, que o Savio
achou feias e pouco divertidas de assistir (2026-10-19). Ele pediu uma atividade em que o atleta
equilibre algo ou se equilibre sobre algo, e deixou a escolha com o Claude. Aprovação final só vendo rodando.

- **Tipo:** treino de atributo base, individual. **Atributo:** Controle.
- **Ideia:** o atleta leva uma bandeja com uma bola em cima por um circuito sem fim de marcas no chão.
  A bandeja é um pouco côncava: andando constante, a bola fica no meio. Toda arrancada, freada ou curva
  empurra a bola para o lado contrário, como num ônibus. Se ela passa da beira, cai. Ele fica 1,5 s
  parado pegando outra bola. Não tem gesto de esporte, robô nem adversário.
- **Por que treina Controle:** aceleração, frenagem e curva do movimento padrão (`fisica()`, atributo
  Controle) são exatamente o que empurra a bola. O atleta precisa dosar: arrancar em etapas, frear
  antes da curva e virar aos poucos.
- **Objetivo do atleta (recompensa):** +1 por marca alcançada com a bola na bandeja. Nenhuma outra
  recompensa: derrubar a bola custa 1,5 s parado (custo natural).
- **Duração da tentativa:** 30 s.
- **Por que é divertido de assistir:**
  - No começo ele sai em disparada e a bola voa logo na largada, ou faz a curva com tudo e ela sai
    pelo lado.
  - Depois aprende a arrancar trotando, frear antes da curva e virar aos poucos: vira um garçom.
  - No nível 2 vira um vai e volta: aprende a frear antes, parar e esperar a bola assentar antes de sair.
  - No nível 3 aprende a tirar o pé antes da lombada.
  - A bola caindo e quicando no chão é o "fracasso engraçado" do treino.
- **Leitura na tela:** a bandeja inclina um pouco com o empurrão e um anel vermelho acende quando a
  bola chega perto da beira. Vista de cima, a cabeça grande taparia a bandeja, então a bandeja e a bola
  são desenhadas por cima.

## Níveis (fita treinada uma vez, subindo de nível quando o atleta domina o atual)
Pedido do Savio (2026-10-19): na primeira prévia os níveis 1 e 2 pareciam iguais (só mudavam a
bandeja e o ângulo das curvas) e a lombada era pequena demais para exigir esforço. Agora cada nível
tem um percurso e um comportamento próprio.

| Nível | Percurso | Comportamento que ensina | Domínio do nível (média por tentativa) |
|---|---|---|---|
| 1 · Circuito | marcas a 3,5–5 m, curvas de até 35° (bandeja funda: w 6, atrito 3) | ir de marca em marca sem arrancar nem frear com tudo | ≥ 20 marcas e < 1 bola caída |
| 2 · Vai e volta | duas linhas pintadas a 5,5 m uma da outra, com 13 m e cones nas pontas; as marcas alternam de linha (andando até 2,5 m ao longo dela), então cada marca é uma parada e uma virada completa. Bola mais solta (atrito 2,5) | frear antes, entrar na marca devagar, esperar a bola assentar e sair de novo | ≥ 9 marcas e < 1 bola caída |
| 3 · Lombadas | trechos de 5,5–7 m, curvas de até 45°; em 90% dos trechos uma lombada larga (4,4 m, com poste em cada ponta) atravessa o caminho | tirar o pé antes da lombada (correndo, a bola sempre pula para fora) e correr só nos trechos livres | ≥ 10 marcas e < 1 bola caída |

**Medido com pilotos escritos à mão (2026-10-19, 60 tentativas, `sim/test/bandeja.test.ts`), marcas / bolas caídas por tentativa:**
| Piloto | Nível 1 | Nível 2 | Nível 3 |
|---|---|---|---|
| a esmo | 0,2 / 4,8 | 0,1 / 6,9 | 0,1 / 4,8 |
| sempre trotando | 15,8 / 0,1 | 9,1 / 3,5 | 10,4 / 0,3 |
| sempre correndo | 22,8 / 2,1 | 9,6 / 5,8 | 9,4 / 7,6 |
| esperto: corre na reta, trota antes da curva, vira aos poucos, freia antes da volta, trota nos trechos com lombada | 21,7 / 0,1 | 10,1 / 0,4 | 11,5 / 0,8 |
| esperto que não liga para lombada | — | — | 8,9 / 5,9 |

Os domínios saíram do piloto esperto. O cérebro treinado deve ir além dele: o piloto não usa o
empurrão para trazer a bola de volta ao meio, nem acerta o momento de frear para a bola não estar
balançando quando sobe na lombada.

## Medidas (unidades da simulação ≈ metros)
| Coisa | Medida |
|---|---|
| Circuito | níveis 1 e 3: sem fim, sorteado pela semente numa área de 18 × 18; nível 2: duas linhas paralelas (ver níveis); o atleta fica preso numa área de 24 × 24. O circuito é o mesmo para a mesma semente, faça o atleta o que fizer (o pulo da bola na lombada usa outro sorteio) |
| Marca | raio 0,7; chegou quando o centro do atleta entra nela, com a bola na bandeja |
| Bandeja | raio útil 0,3 (bola de raio 0,07). A bola sente 5/7 da aceleração do corpo, ao contrário (bola rolando), mais a volta para o meio (côncava: w² × posição) e atrito (c × velocidade). Passou de 0,3 do centro, caiu |
| Lombada | 4,4 de largura × 1,2 ao longo do caminho × 0,22 de altura, entre 40% e 60% do trecho, sem encostar em marcas nem em outras lombadas; ao subir nela, a bola pula 0,4 × velocidade² (m/s) para a frente e um pouco de lado: a ~1 m/s passa, trotando (2,3) às vezes cai, correndo (4,2) cai sempre. O atleta sobe e desce com ela (só desenho) |
| Bola caída | 1,5 s parado; volta uma bola nova no meio da bandeja |
| Atleta | movimento padrão (`movimento.ts`), atributos da fita (Velocidade 35, Controle 35): 4,2 m/s, arranca 5,3 m/s², freia 8,1 m/s², curva até 8,2 m/s² |
| Decisões | `[direção 16, ritmo 3]`, a cada 8 quadros |
| Observação (58) | velocidade e direção do corpo; bola (posição e velocidade na bandeja); empurrão de agora; parado; as 3 próximas marcas (posição relativa, se há lombada antes e onde); direção da próxima marca e da seguinte "no idioma das ações" (16 + 16) |

## O que se mexe (para o cenário)
- Atleta: anda com os braços para a frente segurando a bandeja; desanima quando a bola cai.
- Bandeja: inclina um pouco com o empurrão; anel vermelho de alerta perto da beira.
- Bola: rola na bandeja; ao cair, voa com a velocidade que tinha, quica e rola no chão.
- Marcas: a próxima pulsa em verde com número e cone; as seguintes ficam apagadas; trilha pontilhada
  entre elas; a alcançada pisca e some.
- Lombadas: largas, de borracha amarela e preta, com poste amarelo nas pontas; a bola dá um pulinho ao subir.
- Vai e volta: duas linhas brancas pintadas no chão com cones laranja nas pontas.

## Centro de treinamento (só visual)
| Nível do CT | Estrutura |
|---|---|
| 0 | bandeja de lanchonete e bola de tênis, marcas de fita crepe no chão |
| 1 | bandeja de inox, cones de verdade, piso emborrachado |
| 2 | marcas com luz, lombadas de borracha, linhas do vai e volta pintadas |
| 3 | painel com a contagem e o recorde, telão mostrando a bandeja de cima |

## Estado
- Ficha: proposta do Claude (2026-10-19), a aprovar pelo Savio vendo a prévia.
- Prévia com piloto: `python web/atividades/controle/build.py --previa` → `web/dist/previa-controle.html`.
- Treino: a fazer depois da aprovação (ligar a Bandeja na ponte, no `ppo_drill.py` e no `make-tape.ts`).
- A fita antiga (`fitas/controle.json`, Plataformas) e `web/atividades/controle/controle.template.html`
  saem quando a fita nova estiver pronta.
