# Briefing de design — Mapa geral do jogo

> **Atualização (2026-10-16):** ilhas flutuantes foram descartadas; o ambiente é **urbano** (detalhe
> em aberto) e o tom é **sério e competitivo**. O "centro de treinamento" do mapa é o **CT de cada
> atlética**, que cresce de estrutura com o nível.

## O jogo em poucas linhas
O jogo (nome ainda a definir) é um jogo de hábito diário para **atléticas universitárias brasileiras**. Cada membro
da atlética tem o seu próprio **atleta**: uma caricatura de cabeça grande do estudante,
controlada por inteligência artificial. O jogador não controla o atleta durante as partidas: ele
escolhe o que o atleta faz no dia (treinar, trabalhar, jogar) e assiste ao resultado.

- **Treinar:** o atleta aprende uma atividade sozinho, por tentativa e erro. O jogador assiste: ele
  começa completamente errado e vai melhorando (a graça dos vídeos de "IA aprendendo" do YouTube).
  Treinos sobem atributos (Velocidade, Precisão, Chute…) ou liberam habilidades (chute de longe,
  drible, goleiro…).
- **Trabalhar:** rende dinheiro para comprar equipamentos (tênis, munhequeira, faixa…).
- **Jogar:** competições entre atléticas — futebol 2x2 primeiro; depois rouba-bandeira, queimada e
  outras, individuais, em dupla, trio ou equipe. As atléticas do mesmo campus disputam todos os
  dias; no fim do campeonato há prêmio em dinheiro.
- **Rivalidade interna:** os membros de uma atlética disputam quem é convocado para representá-la.
- **Escassez:** 5 ações por dia; cada treino, trabalho ou partida gasta 1. Um treino ocupa o atleta
  por 2 horas, e cada vez que o jogador abre o app vê o atleta treinando e evoluindo.
- Atividades em grupo arriscadas (estilo "fuga da masmorra"): rendem mais dinheiro, podem causar
  lesão e criam laço entre os atletas.
- Atletas de destaque ganham **títulos** (ex.: "Velocista" com 80+ de Velocidade) e passam a jogar
  com um estilo próprio.

## Público e tom
- Universitários adultos (18+). **Sério e competitivo.**
- Nada infantil: sem lore fofinha, sem alimentar ou fazer carinho no personagem.
- Começa com as atléticas de **um único campus**.

## Estilo visual já aprovado
(ver imagens anexas; também em `docs/design/referencias/`)
- 3D low-poly colorido, rodando no navegador do celular.
- **Ilhas flutuantes** com grama, árvores low-poly e base de rocha, num céu em degradê
  (azul no alto, pêssego no horizonte, rosado embaixo). Sombras suaves, luz quente de fim de tarde.
- Painéis de interface claros e translúcidos, cantos arredondados, tipografia arredondada
  (Bricolage Grotesque) e números em fonte mono.
- Cores das atléticas nos uniformes e na torcida.
- Temas **genéricos** (arenas, ilhas, campos). **Evitar** temática de faculdade forçada (salas de
  aula, provas, bandejão) e cenários realistas.
- A cabeça grande do atleta é só visual, não é mecânica de jogo.
- O jogo e os personagens ainda não têm nome; não usar "Cabeçudo(s)" (nome rejeitado).

## O que o mapa precisa resolver
O mapa é o "mundo" onde o jogo acontece e provavelmente a tela inicial de navegação. Ele precisa ter
lugar para:
1. **Centro de treinamento** — várias arenas de treino, uma por atividade (já existe o
   *Treino de Precisão*: o atleta chuta bolas em alvos numa ilha redonda). **Novas atividades
   serão adicionadas ao longo do tempo**, então o mapa precisa crescer sem ser redesenhado.
2. **Arena(s) de competição** — estádio do futebol 2x2 (já existe, com arquibancada e torcida) e
   espaço para outras competições.
3. **Trabalho** — onde o atleta vai trabalhar para ganhar dinheiro.
4. **Loja de equipamentos.**
5. **Sede da atlética** — onde ficam os atletas do grupo, a convocação e o ranking interno.
   Cada atlética do campus precisa ser reconhecível (cores, escudo); pensar se cada uma tem o seu
   território/ilha.
6. **Enfermaria** — para atletas lesionados.
7. **Atividade em grupo arriscada** (a "masmorra").

Requisitos:
- **Celular primeiro** (tela vertical), e funcionar no computador.
- Mostrar o que está acontecendo agora: onde está o meu atleta, se ele está treinando (e quanto
  falta das 2 horas), partidas acontecendo, quantas ações restam no dia.
- Leve o bastante para rodar em celular intermediário.

## Em aberto (pode propor)
- A lore do mundo: por que existe este lugar de ilhas flutuantes? (adulta e séria; proposta em `docs/regras.md`)
- Nomes dos lugares.
- Se as atléticas aparecem como ilhas/territórios próprios no mapa.
- Como o mapa mostra progresso ao longo da temporada.

## O que eu espero desta sessão
Primeiro, 2–3 direções diferentes de mapa (esboços) para eu escolher; depois, refinar a escolhida.
