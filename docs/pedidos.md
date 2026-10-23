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

## 2026-10-16 · de Treino: Força para Cenários · aberto
Estação do **Trenó de carga** para o CT: pista de 15 × 4 com marcas a cada 3 e linha final, trenó de
1,2 × 0,8 com anilhas (leve: poucas; pesada: muitas) e, no nível 3, rampa de x = 5 a 10 subindo 1 com
platô até o fim. O que se mexe e os níveis do CT estão em `docs/atividades/forca.md`. Hoje a página
`web/atividades/forca/` usa um visual provisório (grama, marcas que acendem, trenó vermelho).
## 2026-10-16 · de Treino: Precisão para Central · feito em parte (2026-10-20: página antiga apagada; falta o CLAUDE.md)
A Precisão agora tem 3 níveis e a página nova é `web/atividades/precisao/` (`build.py` →
`web/dist/treino-precisao.html`), no molde das outras atividades. A observação da simulação mudou
(35 → 58 entradas), então a página antiga (`web/src/precision.template.html` + `web/build_precision.py`)
**não funciona mais** com a fita nova: pode ser apagada. Atualizar também o "Rodando" do `CLAUDE.md`:
`python ppo_drill.py --drill precisao --minutes 60 --max-steps 4e8 --out runs/precisao` e
`python ../web/atividades/precisao/build.py`. Os números novos dos níveis estão na ficha.
Pronto quando a página antiga sair e o `CLAUDE.md` bater.
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
## 2026-10-21 · de Central (com o Savio) para Personagem · aberto
Prova de conceito do atleta em GLB (modelo chibi CC BY 3.0, `assets/personagem/CREDITOS.md`): esqueleto do
Mixamo, roupas geradas do corpo por script do Blender (`assets/personagem/preparar.py`), rosto e cabelos de
`cabecudo-lib.js` presos ao osso da cabeça, mesma animação padrão via `web/src/atleta-glb.js`
(`buildAtletaGLB` + `aplicarEsqueleto`). Página: `python web/personagem-glb/build.py` → `web/dist/atleta-glb.html`.
Falta decidir com o Savio se troca; depois: número nas costas, base feminina, mais roupas e cabelos, medir
no celular com 10 e 22 atletas, trocar nas páginas dos treinos.
## 2026-10-23 · de Central (atividades) para Personagem · feito (avisando)
As páginas dos treinos migrados (Velocidade, Controle/Bandeja, Precisão) passaram a usar o atleta em GLB:
os `build.py` embutem `web/src/atleta-glb.js` e `assets/personagem/atleta.glb`; as páginas criam o atleta com
`buildAtletaGLB(MODELO_ATLETA, look)` e chamam `aplicarEsqueleto(rig)` no fim de cada quadro, depois dos
ajustes de pose da página (braços na bandeja, chute, arremesso). Foi acrescentada `carregarModeloAtleta(b64,
GLTFLoader)` no fim de `atleta-glb.js`. Daqui em diante, mudanças no `atleta.glb` e no `atleta-glb.js` chegam
aos treinos só refazendo as páginas: manter a interface do rig (root, body, legs, arms, headPivot, face, handR,
restExpr) e o nome das peças; avisar aqui se mudar.
