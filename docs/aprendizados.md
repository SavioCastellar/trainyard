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
## Trenó de carga (Força), 2026-10-16
25. **Recompensa por marca: errar não pode devolver as marcas.** No Trenó, sair da pista devolvia o trenó
    ao início e zerava as marcas: o atleta tirava o trenó da pista 5–7 vezes por tentativa e ainda
    dominava o nível 1 (re-ganhava as primeiras marcas). Com as marcas já cruzadas sem pagar de novo, o
    robô que não corrige o rumo caiu de 2,7 para 2,1 entregas e o domínio passou a exigir empurrar reto.
    → Recompensa de progresso precisa ser pelo **máximo** alcançado, não por cada vez que cruza.
26. **Domínio alto demais pode pegar o atleta numa fase instável.** No nível 3, o atleta chegou a 1,2
    entrega logo e depois piorou para 0,6–0,8 durante 15 min. Com o domínio em 1,0 a fita termina no auge.
    → Ao ver a curva cair depois de subir, baixe o domínio para o primeiro patamar (ainda acima do robô
    sem o comportamento) e use `--after` curto (20) para a última foto não pegar a piora.
27. **Avalie as fotos da fita com mais tentativas quando a métrica é pequena.** Com 24 tentativas, a média
    de entregas (~1 por tentativa) oscila ±0,2 entre fotos vizinhas; 64 deixa a curva legível.
28. Física de empurrar que funcionou: choque sem quique no ponto de contato (o trenó gira sozinho quando
    o empurrão é fora do centro) e atrito parado como **velocidade mínima do choque**: encostado não
    destrava; precisa de embalo. Isso criou o "arranque" sem recompensa nenhuma.
## Precisão com 3 níveis — 2026-10-16
25. **Meça o nível proposto com robôs antes de treinar: a ficha pode não ensinar nada.** Com os alvos
    acesos 3,0 s (proposta), ignorar o tempo custava só 2 acertos (28,1 × 30,1); com 2,0 s custa 4
    (25,1 × 29,2). Trilhos a 1,5/s: mirar no alvo e não à frente perdia só 6; a 2,0/s perde 14. Ajustar a
    medida até os robôs se separarem é mais barato que treinar e descobrir que o nível não muda nada.
26. **Raios valem como sensor de "acertaria agora?".** Trocar os raios da Precisão por alvos em direção +
    distância (aprendizado 19) travou o atleta em 22,6 acertos: chutava na cadência máxima com 69% no alvo,
    porque decidir "a mira está boa" exige juntar ângulo e distância. Com os raios de volta (alvo na linha
    do chute de graça) e os alvos descritos ao lado, chegou a 25 em 3M passos, como a versão de 1 nível.
    → Mantenha o sensor que já dá a resposta do gesto; acrescente o que o nível novo pede.
27. **O domínio tem que caber no teto do PPO, não no do robô.** O PPO fica em ~90% do robô perfeito
    (nível 1: 27,6 × 30,4). Domínio acima disso trava a subida de nível (26,5 no nível 2 ficou em 25,9
    por 15 min). Ponha o domínio entre o robô sem o comportamento e ~90% do robô com ele.
## Movimento
19. **Controles de tanque + visão por raios finos = atleta girando no lugar.** Com 16 raios, um alvo
    pequeno a mais de ~4 m some entre dois raios; o jeito de achar é girar. Somado a "só anda para
    onde olha" e decisão a cada quadro, o movimento fica robótico. Com um piloto escrito à mão
    (mesmo para os dois), o antigo passa 85% do tempo girando parado e faz 3,5 pontos/min; o novo
    (`sim/src/movimento.ts`: direção + ritmo, embalo, cone de visão, decisão a cada 4 quadros)
    fica em ~2% e 21,5 pontos/min (`node sim/dist/scripts/movimento.js`). → Toda atividade usa o
    movimento padrão (`docs/contratos.md` §2). Ainda não testado com cérebro treinado.
    Ajuste visual do Savio no laboratório: decisão a cada 8 quadros, inclinação na curva bem menor
    (30%) e atributos baixos (Velocidade e Controle 30) pareceram mais naturais.

20. **Com 16 direções no mundo, mostre a direção "no idioma das ações".** A Velocidade travou em 34% no
    nível 2 por 170 mil tentativas recebendo só x e z do alvo: a rede precisa transformar (x, z) num de 16
    ângulos, e não conseguiu. Com 16 entradas = cosseno entre cada direção e o alvo (`direcaoComoAcao` em
    `movimento.ts`), chegou a 77% em 2 min e ~87% em 4 min. → Para cada coisa que o atleta precisa
    alcançar ou evitar, dê essas 16 entradas.

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

## Circuito de decisão (Inteligência) — 2026-10-16
25. **Escolha só aparece quando abrir mão custa.** Com postos renascendo um a um, ou em levas em que dá para
    pegar quase todos, "ir sempre no mais perto" rendia tanto quanto escolher pelo valor (até um robô que testa
    todas as ordens ganhava só 5–8%). Com **uma escolha por leva** (pisar um posto apaga os outros) e os de mais
    valor nascendo mais longe, o mais perto fica em 26,6 e o que pesa valor e tempo em 32,7. → Em atividade de
    decisão, meça com robô "guloso" e robô "esperto" antes de treinar; se empatam, a regra não pede decisão.
26. **A rede tem dificuldade de escolher entre itens de uma lista por um atributo.** Postos ordenados por
    distância: o nível 2 parou em "ir no mais perto" (24 pontos, 1,3 por posto) por 10 min. Ordenados por valor:
    passou de 30 em 8 min. No nível 3, uma lista só com a cor como número (+1/−1) ficou 5 min sem aprender a
    cor (metade dos postos pisados da cor errada). **Duas listas pela cor** e o painel como entrada: ficou 20 min
    parado e então aprendeu em 2 min (14 → 21) — a lista laranja estava sempre vazia no nível 2, e a rede demora a
    começar a usar entradas que nunca variaram. Alternativa testada e descartada: listas "vale agora / não vale"
    dominam o nível 3 em 1 min, mas aí a leitura do painel é feita pela observação, não pelo atleta.
    → Ordene a observação pelo que a decisão do nível pede; o que o nível quer ensinar não pode vir pronto.
