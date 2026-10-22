# Sessão Personagem

**Missão:** o atleta (o personagem de cabeça grande) — como ele é, como o jogador o cria e como ele se mexe. É a sessão com mais
espaço para detalhe visual: o Savio vai pedir muitos ajustes finos aqui.

## É seu
- `web/src/cabecudo-lib.js` (a biblioteca do boneco, usada por todas as páginas)
- `web/src/atleta-glb.js`, `web/personagem-glb/`, `assets/personagem/` (o atleta em GLB, ver abaixo)
- `web/src/animacao-atleta.js` (animação padrão; mudanças avisando as sessões de treino)
- `web/personagem/` (página de criação e o que mais precisar)

## Não é seu
- Simulação, treino, fitas, arenas das atividades. Use-as para testar o boneco, mas não altere.
- A interface do rig e o formato do `look` estão em `docs/contratos.md` §1. Pode adicionar coisas;
  remover ou mudar o que existe só combinando (`docs/pedidos.md`).

## Referências
- `prototipos/cabecudo-ou-feijao.html` — página que comparou o estilo cabeça grande × "Feijão" (criador com opções,
  equipamentos, lesão, animações). Base para o criador.
- `prototipos/copa-dos-cabecudos.html`, `web/src/stage.js` — o boneco jogando futebol.
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

## Atleta em GLB (prova de conceito, 2026-10-21/22, feita na sessão Central com o Savio)
O Savio quer trocar o boneco gerado por código por um modelo 3D (mais qualidade e controle de design),
mantendo o estilo cabeça grande. Ele não modela: os assets saem por script (Blender como módulo Python) e ele
faz a direção de arte olhando páginas publicadas. Desempenho já aprovado por ele no celular.
- **Modelo:** chibi low-poly do Poly Pizza, CC BY 3.0 (crédito obrigatório numa tela do jogo:
  `assets/personagem/CREDITOS.md`). ~1.500 triângulos. Esqueleto padrão do Mixamo (25 ossos), feito pelo
  Savio no site do Mixamo: `assets/personagem/lowpoly-chibi-rig.fbx` (FBX Binary, T-pose).
- **Pipeline:** `assets/personagem/preparar.py` (no ambiente da nuvem: `pip install --break-system-packages
  bpy==4.2.0`; não chamar nenhum script de `inspect.py`, quebra o Python) gera `assets/personagem/atleta.glb`:
  escala 1,75 m, de frente para +Z, pés no chão, e "cascas" do corpo já presas ao esqueleto (faces de uma
  região do corpo copiadas e empurradas para fora): camisa, short, tênis, `cabelo_curto`, `cabelo_volume`
  (afro), `cabelo_moicano`.
- **No navegador:** `web/src/atleta-glb.js` → `prepararModeloGLB(gltf)` uma vez, `buildAtletaGLB(modelo, look)`
  devolve um rig com a mesma interface do `buildCabecudo` (root, body, legs, arms, headPivot, face, handR).
  A animação padrão escreve em grupos "procuradores" e `aplicarEsqueleto(rig)` passa para os ossos (braços
  descem 72° da T-pose). Rosto próprio (`buildRostoGLB`, pontos em metros em `GLB_ROSTO`, medidos na
  superfície: o modelo já tem nariz, estilo anime). Óculos e barba da `cabecudo-lib.js`; coque e aba do boné
  à parte. Cores por material (pele, camisa = cor principal, short, tênis, cabelo).
- **Página de teste:** `python web/personagem-glb/build.py` → `web/dist/atleta-glb.html` (Artifact "Atleta
  em GLB"): atual × GLB parados ou correndo, opções de atlética, pele, cabelo, óculos/barba, porte,
  facetado/suave, e +10/+22 atletas para medir desempenho.
- **Ferramentas úteis:** raios de frente no Blender (`BVHTree.ray_cast`) para medir a superfície do rosto;
  Chromium sem interface com `window.__pagina` para fotos de perto.

### Pendências que o Savio já apontou ou que ficaram de fora
- "Ainda tem muitos detalhes a corrigir" (pedir a lista a ele no começo da sessão).
- Número e apelido nas costas; meião; regata e manga longa; mãos meio abertas; cor do short em algumas
  atléticas; base feminina com o mesmo esqueleto; equipamentos (munhequeira, faixa, medalha, lesão).
- Depois de aprovado: trocar o boneco nas páginas dos treinos e dos cenários (combinar em `docs/pedidos.md`)
  e registrar a interface em `docs/contratos.md` §1.

## Estado
- Feito: biblioteca extraída do protótipo (`cabecudo-lib.js`); animação padrão (`animacao-atleta.js`); prova de conceito do atleta em GLB.
- Próximo: corrigir os detalhes do atleta em GLB com o Savio até a aprovação; depois o marco 1 (criador) já com o GLB.
