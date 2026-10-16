# Sessão de treino: Circuito de decisão (Inteligência)

**Missão:** o atleta aprender o Circuito de decisão do zero ao domínio dos 3 níveis, e entregar a fita e
a página. **Roda no computador do Savio**, numa cópia própria da pasta, no ramo desta sessão (com
`treino-reflexo` mesclado: ponte por nome, nível crescente, fita com níveis, CT provisório).

## É seu
- `sim/src/drills/inteligencia.ts` e `sim/test/inteligencia.test.ts` (robôs de medida e determinismo).
- `training/runs/inteligencia*` (não vai para o Git), `fitas/inteligencia.json`.
- `web/atividades/inteligencia/` (casca copiada do Reflexo + `build.py`).
- Entradas `inteligencia` na ponte (`bridge-drill.ts`), no `training/ppo_drill.py` e no `sim/scripts/make-tape.ts`.

## Feito (2026-10-16)
- Simulação com 3 níveis seguindo a ficha, com dois ajustes medidos (registrados na ficha):
  uma escolha por leva (pisar um posto apaga os outros) e postos de mais valor nascendo mais longe.
  Sem isso, "ir no mais perto" empatava com escolher (aprendizado 25).
- Domínio medido entre robôs: 17 / 30 / 20 pontos por tentativa (teste em `sim/test/inteligencia.test.ts`).
- Treino do zero ao domínio dos 3 níveis em 32 min (`runs/inteligencia-c`). O nível 3 tem um platô de ~20 min
  e um "estalo" de 2 min (14 → 21 pontos) quando aprende a ler o painel. Três observações falharam antes
  (aprendizado 26).
- Fita `fitas/inteligencia.json` (80 fotos, 2 MB) e página `web/dist/treino-inteligencia.html`, testada
  no navegador (desktop e celular 390×844, ~60 quadros/s, sem erros).

## Próximo
- O Savio assistir e dizer se a evolução diverte. Pontos a mostrar: no nível 2, o atleta indo no 3 longe
  em vez do 1 perto; no nível 3, o platô pisando a cor errada e o estalo no fim da sessão 3.
- O platô do nível 3 é longo: se cansar de assistir, a sessão 3 pode começar mais perto do estalo
  (só na página, sem retreinar).
- Cenário definitivo (sessão Cenários) no lugar do provisório.

## Comandos
```bash
cd training && python ppo_drill.py --drill inteligencia --minutes 90 --max-steps 4e8 --out runs/inteligencia-c
cd sim && node dist/scripts/make-tape.js ../training/runs/inteligencia-c/checkpoints.json ../fitas/inteligencia.json
python web/atividades/inteligencia/build.py
```
