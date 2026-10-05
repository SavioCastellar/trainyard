# Cabeçudos — prova de conceito da arquitetura

Liga universitária em que cada estudante treina o seu atleta "Cabeçudo", controlado por IA, e as atléticas competem entre si todos os dias.

Este repositório existe para **provar que a arquitetura funciona** antes de construir o produto. Os resultados de cada experimento ficam em [`docs/resultados-poc.md`](docs/resultados-poc.md).

## Como as peças se encaixam

```
sim/        Física e regras em TypeScript — fonte única do jogo.
            Usada pelo treino (via ponte), pelo servidor (partidas oficiais) e pelo navegador.
training/   Treino do cérebro com PPO + self-play em liga (Python/PyTorch),
            conversando com a simulação por uma ponte binária (stdin/stdout).
web/        Visualizador 3D que toca os replays gerados no servidor.
docs/       Plano da prova de conceito e resultados.
```

Princípios:

1. **O servidor é a fonte da verdade.** Partidas e sessões de treino que valem pontos rodam no servidor, com semente registrada. O navegador só mostra.
2. **Uma única simulação.** A mesma física roda no treino, no servidor e no navegador, para nunca divergir.
3. **Atributos mudam o corpo; o cérebro decide.** Habilidades (Chute de longe, Goleiro…) liberam ações, e o cérebro enxerga as habilidades de todos para aprender quando usá-las e como se defender delas.

## Rodando

```bash
# simulação e testes (determinismo, monotonicidade do robô)
cd sim && npm install && npm test

# treino (Python 3.10+, PyTorch)
cd training && pip install -r requirements.txt
python ppo.py --minutes 60 --out runs/exp1
python evaluate.py runs/exp1/policy.pt

# custo, determinismo e tamanho de replay
cd sim && npx tsc -p . && node dist/scripts/bench.js ../training/runs/exp1/actor.json 1000

# visualizador de replay
node dist/scripts/make-replay.js ../training/runs/exp1/actor.json ../web/replay.json
python ../web/build.py ../web/replay.json   # gera web/dist/replay-oficial.html
```

## Treino de atividade gravado uma vez ("fita")

Cada atividade é treinada uma única vez, do zero até o domínio. As fotos do cérebro ao longo do
treino viram uma "fita" que todos os jogadores assistem em trechos; só a aparência do atleta muda.
O navegador re-simula cada tentativa a partir dos pesos da foto, então ninguém vê exatamente as
mesmas jogadas.

```bash
# 1. treinar (Treino de Precisão: ~5 min em 2 núcleos)
cd sim && npx tsc -p . && cd ../training
python ppo_drill.py --minutes 5 --out runs/precisao

# 2. gerar a fita (avalia cada foto, escolhe as que mostram mudança, detecta marcos)
cd ../sim && node dist/scripts/make-tape.js ../training/runs/precisao/checkpoints.json ../fitas/precisao.json

# 3. visualizador
python ../web/build_precision.py   # gera web/dist/treino-precisao.html
```
