# Aprendizados — limitações e como contornamos

Leia antes de desenhar uma atividade nova ou mexer em treino.

## Treino e recompensas
1. **Recompensas auxiliares viram vício.** No futebol, pagar por "avançar a bola" e por "chute no
   alvo" fez o cérebro chutar de longe 99,8% das vezes (mesmo sem a habilidade Chute de longe).
   → Prefira recompensa só do objetivo. Se precisar de ajuda, condicione (ex.: só paga avanço
   quando o próprio time tem a posse) e reduza ao longo do treino.
2. **Sem nenhuma ajuda, o futebol não aprende em tempo razoável** (17 min sem progresso). Currículo
   contra o robô de referência (que fica mais forte quando é vencido) destravou o aprendizado.
3. **Self-play tende ao empate**: os dois lados aprendem primeiro a não sofrer gol. Com poucos gols,
   os testes de atributos e habilidades ficam sem poder de medida.
4. **Caminho proposto para o futebol** (não testado ainda): começar imitando o robô (behavior
   cloning, o robô faz ~6,5 gols por partida), recompensa de avanço condicionada à posse, máquina
   maior por algumas horas.
5. **Atividade isolada, com um atleta e recompensa só do objetivo, aprende rápido e é bonita de
   assistir.** Precisão: de 0,6 para 29 acertos por tentativa em 5 min / 5.500 tentativas.
   → É o modelo a seguir para treinos.

## Dificuldade crescente (níveis numa fita só) — Painel de reação, 2026-10-16
19. **Observação por número de placa/alvo não generaliza entre níveis.** No nível 1 o atleta aprendeu
    as 4 placas do meio "de cor" e no nível 2 pisou 0 de 219 luzes do anel de fora. Dar o alvo visto
    pelo atleta como **direção (cos, sen do ângulo) + distância** resolveu: o "correr para a luz"
    passou direto para as placas novas. → Em atividade com níveis, descreva alvos, perigos e o centro
    em relação ao atleta, com direção separada da distância (posição relativa crua também falha:
    distâncias maiores que as do nível 1 ficam fora do que a rede viu).
20. **Domínio baixo demais pula o comportamento que se quer mostrar.** Com 90% no nível 2 o atleta
    subia sem aprender a recuar ao centro (dá 90% só correndo de placa em placa). Com 95% ele precisa
    recuar. → Antes de fixar o domínio, meça com um robô simples com e sem o comportamento
    (`sim/test/reflexo.test.ts` tem o molde) e ponha o limite entre os dois.
21. **Custo natural raro não ensina.** Vermelhas sorteadas ao acaso quase nunca ficavam no caminho e o
    atleta não aprendeu a desviar (~0,9 pisada por tentativa, estável). Pondo uma vermelha no caminho em
    metade das luzes, o custo (1 s parado) passou a tirar luzes e ele aprendeu a desviar (1,6 → 0,4).
    Sem recompensa negativa.
24. **Atividade de desviar: a mira tem que vencer qualquer ação constante.** Mirar onde o atleta está
    deixa "correr sem parar" ganhar; prever em linha reta deixa "correr em círculo" ganhar (93%); repetir a
    última ação deixa "tremer no lugar" ganhar (48%). O que funcionou nos Lançadores: se ele repete a mesma
    ação há ≥ 0,3 s, a mira simula a mesma física com ela; senão, supõe a velocidade atual. Teste com
    robôs parado/aleatório/círculo (todos < 15%) antes de treinar (`sim/test/reflexo.test.ts`).
22. Subir de nível derruba a curva (95% → 30%) e ela volta a subir: isso dá uma boa história na fita.
    Dividir as sessões da página por nível deixa a evolução clara.

## Plataformas de equilíbrio (Controle), 2026-10-16
25. **Tempo de sobra esconde o comportamento.** Com uma trilha de 24 plataformas e 30 s, quem não freava caía 5
    vezes e ainda terminava em 13 s. Trilha sem fim (o placar é quantas passa em 30 s) fez o tempo apertar e cada
    queda custar plataformas. → Em atividade de percurso, o tempo tem que acabar antes do percurso.
26. **Medir o domínio também pelo erro, não só pelo placar.** No nível 2, "plataformas" sozinho deixava passar
    quem corre sem frear (56); exigir menos de 2 quedas obriga a frear. A ponte manda as quedas no campo `reds`
    e `lights` = 100 fixo, e o `DOMINIO` do `ppo_drill.py` usa os dois sem mudar nada no treino.
27. **O atleta treinado passa longe dos robôs de referência** (140 plataformas no nível 2 contra 92 do robô que
    freia): os robôs servem para pôr o domínio entre "sem" e "com" o comportamento, não como teto.
28. **Obstáculo que se mexe tem que tirar, não dar.** A plataforma móvel deslizando ao longo da trilha empurrava o
    atleta para a frente e ajudava; de lado, com amplitude que solta das vizinhas, virou obstáculo. Mesmo assim,
    queda barata (1 s) faz o atleta "acertar o tempo" sem parar em vez de esperar parado; queda de 2 s não mudou isso.
29. **Dê ao atleta a medida do que ele precisa julgar.** No nível 3 ele estacionou em 8,3 quedas (o mesmo do robô
    que não espera) com posição e velocidade da móvel na observação. Acrescentando a folga entre cada plataforma e a
    anterior e quanto ela muda por segundo, dominou em 2,4 min. Como no item 19: a rede aprende rápido com a
    grandeza certa (distância até a beira, folga), e devagar ou nunca quando precisa calculá-la.
    Geração sorteada: confira a trilha com um teste (vizinhas sobrepostas, não vizinhas separadas) — o modo de
    emergência que ignora a folga criou plataformas encostadas em antigas e deu "progresso" ao robô parado.

## Atributos e cérebro
6. **Neuroevolução não aprendeu a usar atributos como entrada** (com atributos altos jogava pior).
   → Hoje os atributos afetam **só a física** (velocidade, força do chute, precisão…), e o cérebro
   não os recebe. Ainda falta provar: cérebro que recebe atributos e muda o estilo de jogo, e os
   cérebros de título (especialistas).
7. Efeito dos atributos no futebol (cérebro único): Velocidade e Precisão claramente decisivas;
   Chute pouco; Controle e Reflexo sem efeito claro. Atributo que não muda nada é atributo que
   o jogador não sente — revisar a física de cada um.

## Regras e economia
16. **Campeonato decidido pelos 2 melhores de cada atlética é sorteio.** Toda atlética tem 2 bons
    jogadores; a diferença de força fica em ~2,5 e cada jogo vira moeda. Para a atividade de todos
    os membros contar: mais duplas por rodada e pontos de preparo coletivo (`docs/regras.md`).
17. **Dinheiro sem uso recorrente acumula.** Depois do kit completo, o saldo dobrava a cada
    temporada. Sumidouro recorrente (preparador) + salário decrescente no dia resolveram.
18. Antes de mexer em número de regra, rode `node sim/dist/scripts/liga.js` e `economia.js` e
    compare com a tabela de validação de `docs/regras.md`.

## A fita
8. **Atividade que satura cedo deixa a última sessão sem graça.** Na Precisão, a sessão 1 vai de
   "chuta para nada" a 17 acertos; a sessão 3 só vai de 25 a 29. → Dividir a fita pela mudança de
   comportamento (não em partes iguais) e/ou desenhar atividades com teto mais alto (alvos que se
   movem, vento, obstáculos) para o aprendizado durar.
9. Fotos espaçadas pelo número de atualizações não bastam: escolha as fotos pela mudança de
   desempenho (`make-tape.ts` já faz isso).
10. O "Fim da sessão" do protótipo mostra um ganho de atributo inventado; a regra real está em aberto.

## Visual e páginas
11. Teste no Chromium sem interface: ele não acessa o jsdelivr. Sirva `three.module.js` e
    `OrbitControls.js` localmente (`npm pack three@0.160.0`) e reescreva o importmap só no teste.
12. Prefira poucas chamadas de desenho (instâncias para grama, árvores, torcida): 350 chamadas no
    replay ainda deu 50 fps, mas a margem é para aparelhos mais fracos.
13. Painéis cobrem a cena no celular: no layout estreito, mostre só o essencial (contador, curva
    pequena, última linha do diário) e deixe a câmera mais alta e afastada.

25. **Movimento do atleta fluido** (Savio achou "deslizando", depois "tremendo"): o cérebro sorteia uma
    ação a cada 1/30 s, e a direção da simulação vai e volta. Na página: (a) desenhe entre dois passos
    (interpolação; a tela é 60/s e a simulação 30/s); (b) suavize só a direção mostrada (~0,3 s);
    (c) tire passada e inclinação das velocidades da simulação, nunca da diferença entre quadros; (d) passada
    pela distância andada (um passo a cada ~0,8 m), com passo lateral e passinhos ao girar; (e) cabeça olhando
    o alvo/perigo. Molde em `web/atividades/reflexo/reflexo.template.html` (`snap`, `animateAthlete`).

## Operação
14. A máquina da sessão na nuvem pode reiniciar e matar treinos longos: salve fotos periodicamente e
    permita retomar de uma foto.
15. `pkill -f` pode matar o próprio shell; use `pgrep -f "^python3 ppo"` + `kill`.
23. No Windows, para parar um treino sem matar o de outra sessão, ache os processos pela linha de
    comando (`Get-CimInstance Win32_Process | ? { $_.CommandLine -match 'ppo_drill|bridge-drill' }`) e
    pare só os seus: o Python mostra o `--out runs/<nome>`, a ponte do Node mostra o caminho da sua cópia. Dois treinos em paralelo rodam sem perder velocidade (1 núcleo cada).
