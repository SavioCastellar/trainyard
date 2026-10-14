# Produto — o que já está decidido

## Público e formato
- Atléticas universitárias brasileiras. Começa com as atléticas de **um único campus**.
- Público adulto (18+). Nada de lore infantil, nada de alimentar/fazer carinho no personagem.
- É um "jogo simulado" de **hábito diário**: o jogador tem que querer abrir todo dia; ficar dias
  sem entrar deve parecer perder progresso e abandonar o seu atleta.
- Inspirações: Tamagotchi (presença diária) e Punch Club (evolução do personagem pelo que ele faz).
- Cada atlética compete contra as outras diariamente. Prêmio em dinheiro no fim do campeonato.
- Tom: **sério e competitivo** (mudou em 2026-10-14; antes era "humor, mas competitivo").
- Regras, economia, temporada, convocação e mundo: proposta em `docs/regras.md` (números em
  `sim/src/jogo.ts`).

## O atleta
- Cada membro da atlética tem o **seu próprio atleta de IA**, uma caricatura de cabeça grande
  do estudante, construída em código (`web/src/cabecudo-lib.js`). Esse estilo venceu o "Feijão"
  (corpo estilo Fall Guys) na escolha de personagem.
- Personalização atual: pele, cabelo (curto, black power, moicano, coque, boné, careca), cor do
  cabelo, óculos (nenhum, redondo, escuro), barba (nenhuma, bigode, barba cheia), expressão
  (confiante, neutro, bravo), número, apelido, cores da atlética. O corpo reflete Força (mais
  largo) e Velocidade (pernas mais longas, mais esguio). Equipamentos aparecem no corpo (tênis,
  munhequeira, faixa, medalha) e lesão também (curativo, tipoia).
- Por enquanto o Claude cria os personagens em código; se o projeto der certo, um artista refina.
- A cabeça grande é **só visual**, nunca mecânica de jogo.
- **Rivalidade interna:** os membros disputam quem é convocado para representar a atlética.

## Competições
- Não precisam ser esportes reais. O **futebol 2x2** fica. Outras ideias aceitas: rouba-bandeira,
  queimada. Competições em dupla, trio e equipe, além de individuais.
- O melhor atleta tem mais chance, mas pode perder.
- Partidas oficiais rodam no servidor e o jogador assiste ao replay.

## Progressão
- **Treino físico** sobe atributos (ex.: Velocidade, Precisão, Chute, Controle, Reflexo, Fôlego).
- **Treino de habilidade** libera habilidades do esporte (ex.: futebol: chute de longe, drible,
  carrinho). As habilidades devem gerar estratégias novas e contraestratégias (ex.: um defensor
  passa a ficar recuado contra quem tem chute de longe).
- **Títulos de especialista** no estilo FIFA: 80+ de Velocidade = "Velocista"; 80+ de Velocidade e
  Força = "Avalanche". Cada título tem um **cérebro especializado**, ajustado a partir do cérebro
  base, que joga de um jeito reconhecível.

## O dia do jogador
- **5 ações por dia.** Treinar, trabalhar e jogar uma partida custam 1 ação cada.
- Treinar trava o atleta por **2 horas**. Durante esse tempo, cada vez que o jogador abre o app, vê
  o atleta naquela atividade, com evolução perceptível (mesmo que pequena).
- Há uma economia: trabalhar rende dinheiro; dinheiro compra equipamentos melhores.
  Equipamentos penalizam quem tenta ser bom em muitos esportes ao mesmo tempo.
- Ideia de atividade em grupo: algo como o Dungeon Escape do ML-Agents, que rende mais dinheiro,
  tem mais risco de lesão e cria laço entre os atletas.

## Treinos como entretenimento
- O treino tem que dar a sensação dos vídeos do **AI Warehouse**: aprendizado por reforço puro,
  o atleta começa completamente errado e vai melhorando.
- **A fita:** cada atividade é treinada **uma única vez** (do episódio zero até o domínio). As fotos
  do cérebro ao longo do treino são gravadas e divididas em sessões de 2h. Todos os jogadores veem o
  mesmo treino; só a aparência do atleta muda. O navegador re-simula cada tentativa com sementes
  próprias, então as jogadas exatas variam de jogador para jogador.
- Atividades com tema genérico (arenas, ilhas, campos), não temas forçados de vida universitária.
  Boa fonte de ideias: os ambientes de exemplo do Unity ML-Agents e os vídeos do AI Warehouse.
- Protótipo aprovado: **Treino de Precisão** (chutar bolas em alvos que aparecem pela arena).

## Rejeitado (não propor de novo)
- "Cabeçudo(s)" como nome do jogo ou dos personagens.
- Treinos que são exercícios de luta (chatos de assistir).
- Sumô. Cabeça como mecânica.
- Treinos com temática de faculdade forçada; cenas realistas (caras e sem graça).
- Mecânica de "estudar o adversário": cada jogador foca em otimizar o próprio treino.
- Lore infantil; cuidados tipo alimentar/carinho.
- Modelos 3D realistas (ex.: Quaternius).
- Treinar um cérebro por usuário.

## Em aberto (perguntar ao Savio antes de decidir)
- **Nome do jogo e nome dos personagens.** Até lá: "o jogo" e "o atleta".
- Revisar a proposta 1 de `docs/regras.md` (atributos com Força, ganho de treino, títulos,
  economia, convocação automática, temporada de 6 semanas, ausência, mundo). Até o Savio revisar,
  as outras sessões seguem essa proposta.
