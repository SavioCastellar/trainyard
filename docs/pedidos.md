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
atributos efetivos de `sim/src/jogo.ts` (`efetivo()`: equipamento adaptado + forma) como spec dos
atletas. Pronto quando o teste "atributos altos vencem" passar também variando só Força.
Também: hoje 30 pontos de vantagem de força dão só 66% de vitória com robôs
(`node sim/dist/scripts/calibrar.js 600`); atributos deveriam pesar mais (meta: ~75–80% com 30
pontos). Ao trocar robô por cérebro treinado, rodar o `calibrar.js` de novo e ajustar `chanceVitoria`.
