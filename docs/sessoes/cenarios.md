# Sessão Cenários

**Missão:** a parte visual dos lugares onde o atleta treina e compete — objetos, cenário,
iluminação, céu, clima, efeitos (partículas, impacto, comemoração). Não mexe em simulação nem em
treino: entrega cenários prontos para as sessões de treino plugarem a simulação.

> **Mudança de direção (2026-10-16):** sem ilhas flutuantes; o ambiente é urbano. Os **treinos
> acontecem no centro de treinamento da atlética**, cuja estrutura cresce com o nível do CT (cada
> cenário de treino vai precisar de versões por nível). As referências de ilha abaixo ficam só como
> referência de estilo low-poly, luz e desempenho. Nos treinos não há robôs nem
> adversários: só o atleta e o ambiente. Ver `docs/produto.md`.

## É seu
- `web/cenarios/` — um módulo por estação (`web/cenarios/<atividade>.js`) e peças comuns
  (`web/cenarios/comum.js`: o prédio do CT em 4 níveis de estrutura, piso, paredes, luz, cores da
  atlética, partículas…).
- `web/cenarios/vitrine/` — páginas de vitrine para o Savio aprovar cada cenário.

## Não é seu
- `web/src/cabecudo-lib.js` (sessão Personagem). Use o boneco parado/animado só para escala.
- `sim/`, `training/`, `fitas/` (sessões de treino).

## Como cada cenário nasce
1. A ficha da atividade em `docs/atividades/<atividade>.md` (escrita pela Central com o Savio) diz
   o que existe na cena, tamanhos e o que se mexe. **As medidas da ficha mandam**: o cenário tem que
   bater com a simulação que a sessão de treino vai escrever.
2. Você monta o cenário seguindo `docs/contratos.md` §5 e publica uma **vitrine**: a cena com o
   atleta e os objetos móveis animados de forma simples (sem IA), para o Savio julgar o visual.
3. Rodadas de ajuste com o Savio até ele aprovar. Marque na ficha: "Cenário: aprovado".
4. A Central abre a sessão de treino daquela atividade.

## Referências
- Cada ficha em `docs/atividades/` tem a tabela **"Centro de treinamento (só visual)"** com o que
  muda do nível 0 (improvisado: cimento, madeira, cones) ao 3 (CT moderno: piso iluminado, telão,
  marca da atlética). O nível do CT nunca muda medidas nem física: só o que está em volta.
- Estilo: low-poly colorido, tom sério (`docs/regras.md` → "Tom e mundo"). Das referências antigas
  (`prototipos/`, `web/src/precision.template.html`), aproveite técnica de luz, sombra, partículas e
  desempenho, não as ilhas nem o céu em degradê.
- Meta: ≥ 30 fps num celular intermediário com 4 atletas em cena. Instâncias para objetos
  repetidos, poucas luzes com sombra, texturas geradas em canvas.

## Marcos (refeitos em 2026-10-16)
1. **O CT da atlética** em `web/cenarios/comum.js`: o espaço onde ficam as estações, nos 4 níveis de
   estrutura, com as cores da atlética. Vitrine com um seletor de nível do CT.
2. **Estação do Painel de reação** (`web/cenarios/reflexo.js`, ficha `docs/atividades/reflexo.md`):
   é o primeiro treino novo. Vitrine com placas acendendo e o atleta andando sem IA.
3. **Estação da Precisão** dentro do CT (refazer a arena atual sem a ilha).
4. Pista de tiros, Trenó de carga, Plataformas de equilíbrio, Circuito de decisão, na ordem em
   que as sessões de treino forem abertas.
5. Futebol 2x2: espera o Savio definir o que é "urbano" para as partidas.

## Estado
- Próximo: marco 1 (antes era a arena da Precisão na ilha; trocado pela mudança de direção).
