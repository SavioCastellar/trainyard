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

## Movimento
19. **Controles de tanque + visão por raios finos = atleta girando no lugar.** Com 16 raios, um alvo
    pequeno a mais de ~4 m some entre dois raios; o jeito de achar é girar. Somado a "só anda para
    onde olha" e decisão a cada quadro, o movimento fica robótico. Com um piloto escrito à mão
    (mesmo para os dois), o antigo passa 85% do tempo girando parado e faz 3,5 pontos/min; o novo
    (`sim/src/movimento.ts`: direção + ritmo, embalo, cone de visão, decisão a cada 4 quadros)
    fica em ~2% e 21,5 pontos/min (`node sim/dist/scripts/movimento.js`). → Toda atividade usa o
    movimento padrão (`docs/contratos.md` §2). Ainda não testado com cérebro treinado.

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

## Operação
14. A máquina da sessão na nuvem pode reiniciar e matar treinos longos: salve fotos periodicamente e
    permita retomar de uma foto.
15. `pkill -f` pode matar o próprio shell; use `pgrep -f "^python3 ppo"` + `kill`.
