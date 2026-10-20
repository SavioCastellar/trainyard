# Ficha: Bandeja

Estação do centro de treinamento para **Controle**. Substitui as Plataformas de equilíbrio, que o Savio
achou feias e pouco divertidas de assistir (2026-10-19). Ele pediu uma atividade em que o atleta
equilibre algo ou se equilibre sobre algo, e deixou a escolha com o Claude. Aprovação final só vendo rodando.

- **Tipo:** treino de atributo base, individual. **Atributo:** Controle.
- **Ideia:** o atleta leva uma bandeja com uma bola em cima por um circuito sem fim de marcas no chão.
  A bandeja é um pouco côncava: andando constante, a bola fica no meio. Toda arrancada, freada ou curva
  empurra a bola para o lado contrário, como num ônibus. Se ela passa da beira, cai. Ele fica 2,5 s
  parado pegando outra bola. Não tem gesto de esporte, robô nem adversário.
- **Por que treina Controle:** aceleração, frenagem e curva do movimento padrão (`fisica()`, atributo
  Controle) são exatamente o que empurra a bola. O atleta precisa dosar: arrancar em etapas, frear
  antes da curva e virar aos poucos.
- **Objetivo do atleta (recompensa):** +1 por marca alcançada com a bola na bandeja. Nenhuma outra
  recompensa: derrubar a bola custa 2,5 s parado (custo natural). Com 1,5 s, num teste curto o atleta aceitava ~3 bolas caídas por tentativa em troca de correr mais; com 2,5 s elas caem mais rápido.
- **Duração da tentativa:** 30 s.
- **Por que é divertido de assistir:**
  - No começo ele sai em disparada e a bola voa logo na largada, ou faz a curva com tudo e ela sai
    pelo lado.
  - Depois aprende a arrancar trotando, frear antes da curva e virar aos poucos: vira um garçom.
  - No nível 2 faz o slalom: zigue-zague entre portas de cones, virando para um lado e para o outro sem deixar a bola escapar; quando erra, passa por fora e os cones tombam.
  - No nível 3 aprende a tirar o pé antes da lombada.
  - A bola caindo e quicando no chão é o "fracasso engraçado" do treino.
- **Leitura na tela:** a bandeja inclina um pouco com o empurrão e um anel vermelho acende quando a
  bola chega perto da beira. Vista de cima, a cabeça grande taparia a bandeja, então a bandeja e a bola
  são desenhadas por cima.

## Níveis (fita treinada uma vez, subindo de nível quando o atleta domina o atual)
Pedido do Savio (2026-10-19): na primeira prévia os níveis 1 e 2 pareciam iguais (só mudavam a
bandeja e o ângulo das curvas) e a lombada era pequena demais para exigir esforço. Agora cada nível
tem um percurso e um comportamento próprio. O nível 2 foi primeiro um vai e volta entre duas linhas
(parava em cada marca, pouca coisa acontecia); o Savio não gostou e virou o slalom.

| Nível | Percurso | Comportamento que ensina | Domínio do nível (média por tentativa) |
|---|---|---|---|
| 1 · Circuito | marcas a 3,5–5 m, curvas de até 35° (bandeja funda: w 6, atrito 3) | ir de marca em marca sem arrancar nem frear com tudo | ≥ 20 marcas e < 1 bola caída |
| 2 · Slalom | portas (dois cones, vão de 1,4 m) em zigue-zague, a 3,2 m uma da outra e 1,6 m para cada lado de uma linha que faz curvas leves. Passar por dentro conta; por fora perde a porta (sem recompensa) e segue para a próxima. Bandeja um pouco mais rasa (w 5,5) | virar para os dois lados em sequência, em ritmo, sem parar; mirar a entrada da porta | ≥ 14 portas e < 1 bola caída |
| 3 · Lombadas | trechos de 5,5–7 m, curvas de até 45°; em 90% dos trechos uma lombada larga (4,4 m, com poste em cada ponta) atravessa o caminho | tirar o pé antes da lombada (correndo, a bola sempre pula para fora) e correr só nos trechos livres | ≥ 10 marcas e < 1 bola caída |

**Medido com pilotos escritos à mão (2026-10-19, 60 tentativas, `sim/test/bandeja.test.ts`), marcas / bolas caídas por tentativa:**
| Piloto | Nível 1 | Nível 2 | Nível 3 |
|---|---|---|---|
| a esmo | 0,2 / 4,8 | 0,1 / 6,1 | 0,1 / 4,8 |
| sempre trotando, direto na marca | 15,8 / 0,1 | 13,9 / 1,0 | 10,4 / 0,3 |
| sempre correndo | 22,8 / 2,1 | 10,5 / 7,0 | 9,4 / 7,6 |
| esperto: corre na reta, trota antes da curva, vira aos poucos; no slalom trota mirando a entrada da porta e espera a bola assentar; trota nos trechos com lombada | 21,7 / 0,1 | 14,5 / 0,2 | 11,5 / 0,8 |
| esperto que não liga para lombada | — | — | 8,9 / 5,9 |

Os domínios saíram do piloto esperto. O cérebro treinado deve ir além dele: o piloto não usa o
empurrão para trazer a bola de volta ao meio, nem acerta o momento de frear para a bola não estar
balançando quando sobe na lombada.

## Medidas (unidades da simulação ≈ metros)
| Coisa | Medida |
|---|---|
| Circuito | níveis 1 e 3: sem fim, sorteado pela semente numa área de 18 × 18; nível 2: duas linhas paralelas (ver níveis); o atleta fica preso numa área de 24 × 24. O circuito é o mesmo para a mesma semente, faça o atleta o que fizer (o pulo da bola na lombada usa outro sorteio) |
| Marca | raio 0,7; chegou quando o centro do atleta entra nela, com a bola na bandeja. Slalom: a marca é uma porta; conta ao cruzar a linha dela, por dentro dos cones |
| Bandeja | raio útil 0,3 (bola de raio 0,07). A bola sente 5/7 da aceleração do corpo, ao contrário (bola rolando), mais a volta para o meio (côncava: w² × posição) e atrito (c × velocidade). Passou de 0,3 do centro, caiu |
| Lombada | 4,4 de largura × 1,2 ao longo do caminho × 0,22 de altura, entre 40% e 60% do trecho, sem encostar em marcas nem em outras lombadas; ao subir nela, a bola pula 0,4 × velocidade² (m/s) para a frente e um pouco de lado: a ~1 m/s passa, trotando (2,3) às vezes cai, correndo (4,2) cai sempre. O atleta sobe e desce com ela (só desenho) |
| Bola caída | 2,5 s parado; volta uma bola nova no meio da bandeja |
| Atleta | movimento padrão (`movimento.ts`), atributos da fita (Velocidade 35, Controle 35): 4,2 m/s, arranca 5,3 m/s², freia 8,1 m/s², curva até 8,2 m/s² |
| Decisões | `[direção 16, ritmo 3]`, a cada 8 quadros |
| Observação (64) | velocidade e direção do corpo; bola (posição e velocidade na bandeja); empurrão de agora; parado; as 3 próximas marcas (posição relativa, se há lombada antes e onde, direção em que se passa pela porta); direção da próxima marca e da seguinte "no idioma das ações" (16 + 16) |

## O que se mexe (para o cenário)
- Atleta: anda com os braços para a frente segurando a bandeja; desanima quando a bola cai.
- Bandeja: inclina um pouco com o empurrão; anel vermelho de alerta perto da beira.
- Bola: rola na bandeja; ao cair, voa com a velocidade que tinha, quica e rola no chão.
- Marcas: a próxima pulsa em verde com número e cone; as seguintes ficam apagadas; trilha pontilhada
  entre elas; a alcançada pisca e some.
- Lombadas: largas, de borracha amarela e preta, com poste amarelo nas pontas; a bola dá um pulinho ao subir.
- Slalom: portas de dois cones altos (azul e vermelho alternando) com uma faixa no chão entre eles; a da próxima porta acende em verde; passando por fora, os cones tombam.

## Centro de treinamento (só visual)
| Nível do CT | Estrutura |
|---|---|
| 0 | bandeja de lanchonete e bola de tênis, marcas de fita crepe no chão |
| 1 | bandeja de inox, cones de verdade, piso emborrachado |
| 2 | marcas com luz, lombadas de borracha, portas de slalom com bandeirinha |
| 3 | painel com a contagem e o recorde, telão mostrando a bandeja de cima |

## Estado
- Ficha e prévia: aprovadas pelo Savio (2026-10-19), com o slalom no nível 2.
- Prévia com piloto: `python web/atividades/controle/build.py --previa` → `web/dist/previa-controle.html`.
- Treino (2026-10-20, computador do Savio): os 3 níveis dominados em 35 min (440 mil tentativas).
  Nível 1 em 9,9 min (22 marcas e 0,94 bola caída); nível 2 em mais 22,8 min (o mais difícil: ficou
  ~10 min entre 1 e 1,3 bola caída antes de chegar a 14 portas e 0,64); nível 3 em mais 1,8 min
  (10 marcas e 0,75), porque o atleta já chega sabendo dosar o ritmo. Fita `fitas/controle.json`
  (66 fotos), página `web/dist/treino-controle.html`. Depois, a pedido do Savio, mais 20 min só no nível 3 (`--retomar`):
  de 10 para 12,1 marcas por tentativa, com 0,7 a 0,8 bola caída; a sessão 3 da página passou de 4 para
  13 fotos. Fita aprovada pelo Savio (2026-10-20).
- Antes, o circuito travava o treino por volta da tentativa 40 mil (laço sem fim quando o sorteio
  ficava encurralado num canto); corrigido em `grow()` e coberto por teste.
- A simulação, o teste e a página das Plataformas saíram. A fita antiga `fitas/controle.json` não
  funciona com a página nova e é substituída quando a fita da Bandeja ficar pronta.
