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
  - No nível 3 aprende a tirar o pé antes da lombada.
  - A bola caindo e quicando no chão é o "fracasso engraçado" do treino.
- **Leitura na tela:** a bandeja inclina um pouco com o empurrão e um anel vermelho acende quando a
  bola chega perto da beira. Vista de cima, a cabeça grande taparia a bandeja, então a bandeja e a bola
  são desenhadas por cima.

## Níveis (fita treinada uma vez, subindo de nível quando o atleta domina o atual)
| Nível | O que muda | Domínio do nível (média por tentativa) |
|---|---|---|
| 1 · Bandeja funda | marcas a 3,5–5 m, curvas de até 35°; bandeja funda (w 6, atrito 3) | ≥ 20 marcas e < 1 bola caída |
| 2 · Bandeja rasa | marcas a 2,8–4,2 m, curvas de 50° a 110°; bandeja rasa (w 5, atrito 3) | ≥ 17 marcas e < 1,5 bola caída |
| 3 · Lombadas | bandeja rasa; marcas a 4–6 m, curvas de 20° a 80°; lombada em 70% dos trechos | ≥ 13 marcas e < 2 bolas caídas |

**Medido com pilotos escritos à mão (2026-10-19, 40 tentativas, `sim/test/bandeja.test.ts`), marcas / bolas caídas por tentativa:**
| Piloto | Nível 1 | Nível 2 | Nível 3 |
|---|---|---|---|
| a esmo | 0,2 / 4,9 | 0,1 / 6,8 | 0,1 / 6,8 |
| sempre trotando | 15,8 / 0,1 | 17,3 / 2,2 | 13,1 / 0,8 |
| sempre correndo | 23,3 / 2,1 | 11,8 / 10,3 | 11,1 / 8,8 |
| esperto: corre na reta, trota antes da curva, vira aos poucos | 22,4 / 0,3 | 18,6 / 0,8 | — |
| esperto que não liga para lombada | — | — | 13,5 / 4,4 |
| esperto que trota na lombada | — | — | 13,7 / 2,0 |

Os domínios saíram do piloto esperto. O cérebro treinado deve ir além dele (o piloto não usa o empurrão
para trazer a bola de volta ao meio).

## Medidas (unidades da simulação ≈ metros)
| Coisa | Medida |
|---|---|
| Circuito | sem fim, sorteado pela semente numa área de 18 × 18; o atleta fica preso numa área de 24 × 24. O circuito é o mesmo para a mesma semente, faça o atleta o que fizer (o pulo da bola na lombada usa outro sorteio) |
| Marca | raio 0,7; chegou quando o centro do atleta entra nela, com a bola na bandeja |
| Bandeja | raio útil 0,3 (bola de raio 0,07). A bola sente 5/7 da aceleração do corpo, ao contrário (bola rolando), mais a volta para o meio (côncava: w² × posição) e atrito (c × velocidade). Passou de 0,3 do centro, caiu |
| Lombada | faixa de 2,4 × 0,35 atravessada no meio do trecho; ao subir nela, a bola pula 0,12 × velocidade² (m/s) para a frente e um pouco de lado |
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
- Lombadas: faixas de borracha amarela e preta.

## Centro de treinamento (só visual)
| Nível do CT | Estrutura |
|---|---|
| 0 | bandeja de lanchonete e bola de tênis, marcas de fita crepe no chão |
| 1 | bandeja de inox, cones de verdade, piso emborrachado |
| 2 | marcas com luz, lombadas de borracha |
| 3 | painel com a contagem e o recorde, telão mostrando a bandeja de cima |

## Estado
- Ficha: proposta do Claude (2026-10-19), a aprovar pelo Savio vendo a prévia.
- Prévia com piloto: `python web/atividades/controle/build.py --previa` → `web/dist/previa-controle.html`.
- Treino: a fazer depois da aprovação (ligar a Bandeja na ponte, no `ppo_drill.py` e no `make-tape.ts`).
- A fita antiga (`fitas/controle.json`, Plataformas) e `web/atividades/controle/controle.template.html`
  saem quando a fita nova estiver pronta.
