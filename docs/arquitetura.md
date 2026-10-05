# Arquitetura validada

Detalhes das medições em `docs/resultados-poc.md`. Aqui fica o resumo do que foi provado e como as
peças se encaixam.

## Visão geral
```
           treino (uma vez, offline)                       produto
 ┌────────────────────────────────────┐     ┌──────────────────────────────────────┐
 │ Python PPO  ⇄  ponte  ⇄  sim (Node)│     │ servidor: sim + cérebro → replay      │
 │      │                             │     │ navegador: fita → re-simula tentativas│
 │      └─ fotos do cérebro → fita ───┼────►│ navegador: replay → assiste a partida │
 └────────────────────────────────────┘     └──────────────────────────────────────┘
```

## Peças e o que foi provado
| Peça | Onde | Status |
|---|---|---|
| Simulação única em TypeScript, determinística por semente (mulberry32) | `sim/src` | Validada: 300/300 e 200/200 partidas idênticas ao repetir |
| Ponte Node↔Python (quadros binários `[u32 tamanho][u8 op][dados]` por stdin/stdout) | `sim/src/bridge.ts`, `sim/src/drills/bridge-drill.ts` | Validada: ~28–29 mil decisões/s em 2 núcleos. Não precisa de Rust |
| PPO em PyTorch (CPU), cabeças categóricas múltiplas, GAE | `training/` | Funciona; qualidade do futebol ainda não (ver aprendizados) |
| Partida oficial no servidor → replay (posições int16 a 30 quadros/s) | `sim/src/replay.ts` | Validada: 0,46 s de CPU por partida de 90 s; replay ~195 KB (~50 KB comprimido) |
| Cérebro em JS lendo pesos exportados | `sim/src/brain.ts` | Validado |
| Visualização Three.js no celular | `web/` | Validada: 50 fps num Android intermediário com qualidade máxima |
| Fita de treino (fotos int16 do cérebro + marcos + sessões) | `sim/scripts/make-tape.ts`, `fitas/` | Validada visualmente no Treino de Precisão |

## A fita, em detalhe
1. `ppo_drill.py` treina do zero e guarda fotos do ator: todas as primeiras 40 atualizações, depois
   a cada 3 até a 150, depois a cada 8 (o começo muda rápido; o fim, devagar).
2. `make-tape.ts` avalia cada foto em 16 tentativas com sementes fixas, mantém só as fotos em que o
   desempenho mudou, e detecta marcos ("começou a virar para os alvos", "10 acertos"…).
3. A fita (`fitas/<atividade>.json`, ~1,8 MB) leva: dimensões da rede, total de tentativas, marcos,
   e para cada foto: tentativas até ali, desempenho médio, escalas e pesos int16 em base64.
4. O navegador decodifica a foto, roda a mesma simulação e sorteia as ações com sua própria
   semente. Mesmo nível de aprendizado para todos, jogadas diferentes para cada um.
5. A fita é dividida em sessões de 2h; o horário em que o app é aberto decide até que foto está liberada.

## Custos
- Servidor: ~10 h de CPU por dia para 1.000 usuários (partidas oficiais); cabe em 1–2 servidores pequenos.
- Fita: sem custo de servidor (o navegador re-simula).
- Treino de uma atividade simples: minutos em 2 núcleos. Futebol com 4 atletas: horas; vale usar
  uma máquina de 16–32 núcleos por algumas horas (escala quase linear).

## Ressalvas
- `Math.sin` etc. podem diferir no último bit entre motores JS. Por isso o servidor é a fonte
  oficial das partidas; o navegador só toca o replay. Na fita isso não importa (é só visual).
- Ainda não existe backend de produto (contas, atléticas, ações). Só a prova de conceito.
