# Sessão de treino: Futebol 2x2

**Missão:** fazer o futebol 2x2 ser bom de assistir — gols, jogadas variadas, atributos e
habilidades que fazem diferença visível. É a primeira competição oficial e o maior risco técnico
em aberto. **Roda no computador do Savio** (ver `docs/treino-local.md`).

## É seu
- `sim/src/soccer.ts`, `sim/src/bot.ts`, `sim/src/bridge.ts`, `sim/src/replay.ts`, `sim/src/brain.ts`
- `training/ppo.py`, `training/simenv.py`, `training/policy.py`, `training/evaluate.py`
- `web/atividades/futebol/` e o visualizador de replay (`web/src/viewer.template.html`, `web/src/stage.js`, `web/build.py`)

## Compartilhado / não é seu
- Igual a `docs/sessoes/treino-modelo.md`. O cenário do campo virá de `web/cenarios/futebol.js`
  quando a sessão Cenários entregar; até lá, use `web/src/stage.js`.

## Antes de começar
- `docs/aprendizados.md` (itens 1–4, 6–7 são deste problema) e `docs/resultados-poc.md` §1.

## Marcos
1. **Treino em paralelo na máquina do Savio:** vários processos de simulação (um por núcleo) em
   vez de um; medir passos por segundo e registrar em `docs/treino-local.md`.
2. **Imitar o robô** (behavior cloning): cérebro começa jogando como o robô (~6,5 gols por partida).
3. **PPO a partir daí** com recompensa de avanço só com posse, liga de self-play. Pronto quando:
   gols por partida perto do robô, sem chutão, jogadas variadas.
4. **Linha do tempo visual** do treino (fotos do cérebro lado a lado; o Savio dá nota) — a
   métrica final é ele achar divertido.
5. **Atributos e habilidades com efeito visível** (Velocidade, Precisão…; Chute de longe → defesa
   recua). Depois, cérebros de título (Velocista…), quando as regras estiverem decididas.

## Estado
- Feito: PPO com liga e currículo (aprende, mas chutão), replay oficial, bateria de testes.
- Próximo: marco 1.
