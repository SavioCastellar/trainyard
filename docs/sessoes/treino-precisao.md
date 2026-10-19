# Sessão de treino: Precisão com 3 níveis

**Missão:** retreinar a Precisão do zero ao domínio de 3 níveis (alvos fixos, alvos que apagam, alvos
móveis) no formato com níveis da sessão Treino: Reflexo, e entregar fita e página. Roda no computador do
Savio, numa cópia própria da pasta.

## É seu
- `sim/src/drills/precision.ts`, `sim/test/precisao.test.ts`, `sim/scripts/lead-check.ts`.
- Entrada `precisao` em `bridge-drill.ts`, `training/ppo_drill.py` e `sim/scripts/make-tape.ts`.
- `training/runs/precisao*/` (fora do Git), `fitas/precisao.json`, `web/atividades/precisao/`.

## Estado (2026-10-16)
- **Feito:** simulação com 3 níveis (padrão 1 = comportamento de antes), testes de determinismo e de robôs
  (domínio entre o robô sem e com o comportamento de cada nível). Tempo aceso 2,0 s e trilho a 2,0/s
  (a ficha propunha 3,0 s e 1,5/s, que quase não separavam os robôs). Domínio 26 / 26 / 25 acertos.
- Treino do zero ao domínio dos 3 níveis: ~25 min, 20M passos (`runs/precisao3`). Nível 1 em 3.840
  tentativas; nível 2 cai de 26 para 18 e volta; nível 3 cai de 26 para 11 e volta a 25, com o chute indo
  3° à frente do alvo (antes 0,7° atrás), sempre a ~6,6 m.
- Fita `fitas/precisao.json` (102 fotos, 2,3 MB, marcos por nível) e página
  `web/atividades/precisao/` → `web/dist/treino-precisao.html`, testada no navegador (desktop e celular
  390×844), com o CT provisório, anel do tempo aceso no nível 2 e trilhos no nível 3.
- A página antiga (`web/src/precision.template.html`) não roda com a fita nova: pedido em `docs/pedidos.md`.
- **Próximo:** o Savio assistir e avaliar se a escolha do alvo aceso (nível 2) e a antecipação (nível 3) dão
  para ver; se não, deixar o efeito mais claro na página (ex.: marca do ponto mirado). Depois, trocar o CT
  provisório pelo cenário da sessão Cenários. Quadros/s no celular ainda não medidos (o painel do
  navegador estava escondido no teste).

## Comandos
```bash
cd training
python ppo_drill.py --drill precisao --minutes 60 --max-steps 4e8 --out runs/precisao
node ../sim/dist/scripts/make-tape.js runs/precisao/checkpoints.json ../fitas/precisao.json
node ../sim/dist/scripts/lead-check.js ../fitas/precisao.json     # antecipação no nível 3
python ../web/atividades/precisao/build.py
```
