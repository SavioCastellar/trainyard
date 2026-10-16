# Pedidos entre sessões

Quando uma sessão precisa de mudança numa pasta que não é dela, ou num contrato, registra aqui.
A sessão Central decide com o Savio e encaminha.

Formato:
```
## AAAA-MM-DD · de <sessão> para <sessão> · aberto|aceito|recusado|feito
O que precisa, por quê, e como saber que ficou pronto.
```

## 2026-10-14 · de Central para Treino: Futebol · aberto
Incluir **Força** na física do futebol (disputa de bola, carrinho) e, nas partidas oficiais, usar os
atributos do esporte de `sim/src/jogo.ts` (`atributoEsporte()`: base + equipamento adaptado + forma) como spec dos
atletas. Pronto quando o teste "atributos altos vencem" passar também variando só Força.
Também: hoje 30 pontos de vantagem de força dão só 66% de vitória com robôs
(`node sim/dist/scripts/calibrar.js 600`); atributos deveriam pesar mais (meta: ~75–80% com 30
pontos). Ao trocar robô por cérebro treinado, rodar o `calibrar.js` de novo e ajustar `chanceVitoria`.

## 2026-10-16 · de Central para Treino: Futebol · aberto
Atributos novos (ver `docs/regras.md` → "Atributos base", "Atributos do esporte", "Especialidades"):
- **Chute sai, Força entra:** potência do chute vem de Força; Finalização = 60% Precisão + 40% Força.
- **Inteligência = qualidade da decisão:** sortear as ações com a temperatura de
  `temperaturaDecisao()` em `sim/src/jogo.ts` (1,3 a 0,9).
- **Fôlego = barra de arrancada** (escala de segundos, para aparecer em 90 s de jogo).
- **Controle** = aceleração, frenagem e giro do corpo.
- **Desarme e disputa de corpo** (para Marcação e Carrinho); **passe de verdade** para o companheiro
  (para Passe e Lançamento).
- Habilidades por especialidade, com nível: Goleiro (todos nível 1), Chute de longe (com a defesa
  aprendendo a recuar alguém quando o adversário tem a habilidade), Carrinho, Arrancada, Pressão,
  Lançamento, Finta. Cérebro retreinado recebendo as habilidades como entrada.
Pronto quando cada atributo e habilidade tiver efeito visível medido (como o teste "atributos altos
vencem") e o `calibrar.js` for rodado de novo.

## 2026-10-16 · de Treino: Reflexo para Central · aberto
O Savio assistiu ao Painel de reação e decidiu: **o Painel treina Velocidade** (no lugar da Pista de
tiros, que não chegou a ser treinada) e **o Reflexo ganha os Lançadores** (desviar de bolas; ficha nova
em `docs/atividades/reflexo.md`). Já feito nas pastas do treino: ficha `velocidade.md` (agora o Painel,
com o nome "Painel de luzes", a confirmar com o Savio), `fitas/velocidade.json`, `web/atividades/velocidade/`.
Falta na Central: `sim/src/jogo.ts` (nome e níveis das atividades de `velocidade` e `reflexo`),
`docs/regras.md` (tabela de atributos base), `docs/plano.md`. Pronto quando os nomes batem com as fichas.

## 2026-10-16 · de Treino: Reflexo para Cenários · aberto
1. A estação que vocês estão fazendo (Painel) agora é do **CT de Velocidade**; as medidas não mudaram
   (`docs/atividades/velocidade.md`). O Reflexo ganhou uma estação nova, os **Lançadores**
   (`docs/atividades/reflexo.md` → "O que se mexe").
2. Pedido do Savio ao ver a página: o cenário "funciona para este primeiro momento, mas pode ficar um
   pouco mais vivo, com mais elementos que preencham". Enquanto o definitivo não chega, as páginas usam
   `web/atividades/ct-provisorio.js` (galpão com outras estações ao fundo, bancos, cones, rack, faixa da
   atlética); usem como referência do que ele quer ver em volta, não como desenho final.
