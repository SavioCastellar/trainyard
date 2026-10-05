# Sessão Atividades

**Missão:** os lugares onde o Cabeçudo treina e compete — ambiente (simulação), arena visual,
treino do zero ao domínio, fita e página para assistir. Inclui o **futebol 2x2**, que é a primeira
competição e o maior risco técnico em aberto.

## É seu
- `sim/` (simulação, atividades em `sim/src/drills/`, futebol, robô, replay, pontes, testes)
- `training/` (PPO), `fitas/`
- `web/atividades/` e as páginas atuais de visualização (`web/src/precision.template.html`,
  `web/src/viewer.template.html`, `web/src/stage.js`, `web/build*.py`)

## Não é seu
- `web/src/cabecudo-lib.js` (sessão Personagem). Use o boneco pela interface de `docs/contratos.md` §1.
  Problema no boneco? `docs/pedidos.md`.

## Antes de começar, leia
- `docs/aprendizados.md` inteiro (recompensas, fita, limitações).
- `docs/contratos.md` §2–4.

## Marcos
1. **Pipeline genérico:** ponte que escolhe a atividade pelo nome; `ppo_drill.py` e `make-tape.ts`
   genéricos; casca de página de fita reaproveitável (sessões de 2h, curva, diário, comparação
   "Tentativa 1 × agora", trocar atleta) separada da arena de cada atividade. A Precisão continua
   funcionando igual. Divisão das sessões da fita pela mudança de comportamento, não em partes iguais.
2. **Futebol que joga bem:** imitar o robô primeiro (behavior cloning), recompensa de avanço só com
   posse, liga de self-play. Pronto quando: gols por partida perto do robô, jogadas variadas, sem
   chutão, e a evolução virar uma fita/linha do tempo que o Savio assiste e avalia. Depois: efeito
   visível dos atributos e das habilidades (chute de longe → defesa recua). Treino longo: avisar o
   Savio se precisar de máquina maior.
3. **2ª e 3ª atividades de treino físico**, cada uma ligada a um atributo, com teto alto o bastante
   para as 3 sessões terem evolução visível. Propor 3–4 ideias ao Savio (com um esboço visual) antes
   de treinar. Fontes: ambientes do Unity ML-Agents e vídeos do AI Warehouse; tema genérico.
4. **Cérebros de título** (ex.: Velocista) como ajuste fino do cérebro base — depois que o futebol
   jogar bem e as regras de atributos estiverem decididas.

Cada marco termina numa página publicada para o Savio assistir (desktop e celular).

## Estado
- Feito: futebol 2x2 com PPO (aprende, mas chutão), replay oficial, Treino de Precisão com fita
  (`fitas/precisao.json`, página `web/dist/treino-precisao.html`).
- Próximo: marco 1.
