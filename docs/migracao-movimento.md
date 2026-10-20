# Migração dos treinos para o movimento padrão

Ramo `integracao`: junta os seis treinos (Velocidade, Reflexo, Controle, Força, Precisão,
Inteligência) e o `movimento`. Cada atividade passa para `sim/src/movimento.ts` e é retreinada do
zero no computador do Savio, **uma de cada vez**, depois de ele aprovar a prévia.

## Decisões (2026-10-19)
- **Atleta das fitas:** Velocidade 35, Controle 35 (`ATLETA_FITA`). É um atleta de começo de carreira
  (atributos iniciais vão de 25 a 40), que é onde o jogador está quando assiste.
- **Decisão a cada 8 quadros (~0,27 s) em todas as atividades**, inclusive o Reflexo. A reação média
  fica em ~0,13 s, perto da humana. Se o domínio do Reflexo ficar impossível, o atributo Reflexo passa a
  definir o intervalo (mais Reflexo = decide mais vezes).
- **Observação no referencial do mundo** (posição relativa x, z), como as ações (16 direções no mundo).
- **Visão:** cone de 150° quando a atividade tem coisas a procurar; em salas pequenas com sinais
  claros (placas que acendem no piso) tudo fica visível.
- **Páginas:** animação padrão `web/src/animacao-atleta.js` (a do laboratório). Cada página ganha o
  modo prévia (`build.py --previa`): piloto escrito à mão, sem fita, com "Decisões certas" no lugar
  do relógio.
- A ponte (`bridge-drill.ts`) repete a ação por `decisao` quadros e soma a recompensa; a fita grava
  `decisao` e a página chama o cérebro nesse intervalo.

## Ordem e estado
| # | Atividade | Simulação migrada | Prévia aprovada | Retreinada | Fita aprovada |
|---|---|---|---|---|---|
| 1 | Velocidade (Painel de luzes) | sim | sim | sim (2026-10-19, 219 checkpoints) | sim |
| 2 | Controle (**Bandeja**, nova; substitui as Plataformas) | sim | sim (2026-10-19) | sim (2026-10-20, 35 min + 20 min no nível 3) | sim (2026-10-20) |
| 3 | Precisão (chute com ajuste fino de ±10°) | sim | aguardando | — | — |
| 4 | Reflexo (Lançadores) | — | — | — | — |
| 5 | Força (Trenó) | — | — | — | — |
| 6 | Inteligência | — | — | — | — |

As fitas antigas continuam no repositório até a nova de cada atividade ficar pronta; a página de
treino de uma atividade migrada só funciona com a fita nova.

**Velocidade concluída:** fita nova em `fitas/velocidade.json` (`decisao` = 8); domínio do nível 3
no checkpoint 198. O Savio aprovou o resultado em 2026-10-19.

## Retreinar uma atividade (no computador do Savio)
Troque `controle` pela atividade (`velocidade`, `controle`, ...):
```powershell
cd sim; npm install; npx tsc -p .; cd ..\training
python ppo_drill.py --drill controle --minutes 120 --max-steps 4e8 --out runs/controle
cd ..\sim; node dist/scripts/make-tape.js ..\training\runs\controle\checkpoints.json ..\fitas\controle.json
cd ..; python web/atividades/controle/build.py     # gera web/dist/treino-controle.html
```

## Continuar um treino (mais tempo no último nível)
`--retomar` carrega a última foto de um treino, continua no nível dela por `--minutes`, sem subir de nível
nem parar no domínio, e grava a lista inteira de fotos (antigas + novas) no `--out`. O crítico não fica
nas fotos: nas primeiras `--aquecer` atualizações (30) só ele aprende. Use outra pasta de saída para não
perder o treino original:
```powershell
python ppo_drill.py --drill controle --minutes 20 --max-steps 4e8 --retomar runs/controle/checkpoints.json --out runs/controle-n3
cd ..\sim; node dist/scripts/make-tape.js ..\training\runs\controle-n3\checkpoints.json ..\fitas\controle.json
```
