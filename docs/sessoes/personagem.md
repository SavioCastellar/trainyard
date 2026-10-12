# Sessão Personagem

**Missão:** o atleta (o personagem de cabeça grande) — como ele é, como o jogador o cria e como ele se mexe. É a sessão com mais
espaço para detalhe visual: o Savio vai pedir muitos ajustes finos aqui.

## É seu
- `web/src/cabecudo-lib.js` (a biblioteca do boneco, usada por todas as páginas)
- `web/personagem/` (página de criação e o que mais precisar)

## Não é seu
- Simulação, treino, fitas, arenas das atividades. Use-as para testar o boneco, mas não altere.
- A interface do rig e o formato do `look` estão em `docs/contratos.md` §1. Pode adicionar coisas;
  remover ou mudar o que existe só combinando (`docs/pedidos.md`).

## Referências
- `prototipos/cabecudo-ou-feijao.html` — página que comparou o estilo cabeça grande × "Feijão" (criador com opções,
  equipamentos, lesão, animações). Base para o criador.
- `prototipos/copa-dos-cabecudos.html`, `web/src/stage.js` — o boneco jogando futebol.
- `web/src/precision.template.html` (`Arena.animateAthlete`) — o boneco correndo, chutando e comemorando.
- Ver `docs/produto.md` → "O atleta".

## Marcos
1. **Criador no repositório:** `web/personagem/` com página de criação usando a `cabecudo-lib.js`
   (sem cópia do código do boneco), build gerando HTML único, publicada como Artifact.
2. **Ajustes visuais do Savio:** rosto, proporções, cabelos, uniforme, novas opções. Cada rodada
   termina numa página publicada para ele comparar (antes × depois quando ajudar).
3. **Animações compartilhadas:** `animateCabecudo(rig, estado, dt)` com parado, andar, correr,
   chutar, comemorar, cair/levantar, lesionado — e cabeça com mola. Registrar em `docs/contratos.md`
   e avisar as sessões de Cenários e de treino para adotar.
4. **Aparência salva:** formato JSON do `look` validado, gerador aleatório coerente, e prévia
   pequena (retrato) para listas e ranking.

Meta de desempenho: 4 bonecos em cena a ≥ 30 fps num celular intermediário; cuidado com o número
de materiais e de chamadas de desenho.

## Estado
- Feito: biblioteca extraída do protótipo (`cabecudo-lib.js`).
- Próximo: marco 1.
