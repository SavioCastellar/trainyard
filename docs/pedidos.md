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

## 2026-10-18 · de Laboratório de movimento para Central e Personagem · aberto
Movimento padrão novo em `sim/src/movimento.ts` (ver `docs/contratos.md` §2 e `docs/aprendizados.md` 19).
- **Central:** trocar a linha "Decisões" das fichas (Pista de tiros, Plataformas de equilíbrio e as
  que vierem) para `[direção 16, ritmo 3]` + decisões próprias; "gira 3,2 rad/s" sai, os números de
  aceleração/frenagem/curva vêm de `fisica()` (Velocidade e Controle). Precisão: retreinar com o
  movimento novo quando for refazer a fita.
- **Personagem:** a animação do laboratório (`web/movimento/movimento.template.html`, `Arena.animate`)
  inclina o corpo na curva e ao frear/acelerar, vira a cabeça para o alvo antes do corpo e dá
  passinhos ao girar parado. Levar isso para o `animateCabecudo` compartilhado (o estado de entrada
  é o `Corpo`: `vx, vz, h, w, aFrente, aLado, passada`).
Pronto quando as fichas estiverem atualizadas e o `animateCabecudo` cobrir esses movimentos.
