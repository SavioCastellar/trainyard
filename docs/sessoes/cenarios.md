# Sessão Cenários

**Missão:** a parte visual dos lugares onde o Cabeçudo treina e compete — objetos, cenário,
iluminação, céu, clima, efeitos (partículas, impacto, comemoração). Não mexe em simulação nem em
treino: entrega cenários prontos para as sessões de treino plugarem a simulação.

## É seu
- `web/cenarios/` — um módulo por atividade (`web/cenarios/<atividade>.js`) e peças comuns
  (`web/cenarios/comum.js`: ilha flutuante, céu, luz, grama, árvores, partículas…).
- `web/cenarios/vitrine/` — páginas de vitrine para o Savio aprovar cada cenário.

## Não é seu
- `web/src/cabecudo-lib.js` (sessão Personagem). Use o boneco parado/animado só para escala.
- `sim/`, `training/`, `fitas/` (sessões de treino).

## Como cada cenário nasce
1. A ficha da atividade em `docs/atividades/<atividade>.md` (escrita pela Central com o Savio) diz
   o que existe na cena, tamanhos e o que se mexe. **As medidas da ficha mandam**: o cenário tem que
   bater com a simulação que a sessão de treino vai escrever.
2. Você monta o cenário seguindo `docs/contratos.md` §5 e publica uma **vitrine**: a cena com o
   Cabeçudo e os objetos móveis animados de forma simples (sem IA), para o Savio julgar o visual.
3. Rodadas de ajuste com o Savio até ele aprovar. Marque na ficha: "Cenário: aprovado".
4. A Central abre a sessão de treino daquela atividade.

## Referências
- Estilo aprovado: `prototipos/` (ilhas flutuantes low-poly, céu em degradê, sombras suaves) e a
  arena do Treino de Precisão (`web/src/precision.template.html`, `buildIsland`, alvos, partículas).
- Meta: ≥ 30 fps num celular intermediário com 4 Cabeçudos em cena. Instâncias para objetos
  repetidos, poucas luzes com sombra, texturas geradas em canvas.

## Marcos
1. Extrair as peças comuns de `precision.template.html` para `web/cenarios/comum.js` e refazer a
   arena da Precisão como `web/cenarios/precisao.js` no contrato §5 (vitrine publicada).
2. Cenário do futebol 2x2 (campo na ilha, gols, torcida em instâncias) — ficha `docs/atividades/futebol.md`.
3. Próximos cenários conforme a Central for criando fichas.

## Estado
- Próximo: marco 1.
