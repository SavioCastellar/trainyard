# Sessão de treino: Plataformas de equilíbrio (Controle)

**Missão:** fazer o atleta aprender as Plataformas de equilíbrio do zero ao domínio dos 3 níveis, no
formato com níveis da sessão Treino: Reflexo, e entregar a fita e a página. Roda no computador do
Savio, numa cópia própria da pasta (ramo da sessão).

## É seu
- `sim/src/drills/controle.ts` e `sim/test/controle.test.ts`.
- `training/runs/controle/` (não vai para o Git), `fitas/controle.json`.
- `web/atividades/controle/` (casca copiada de `web/atividades/reflexo/`, com o CT provisório comum).
- Entradas `controle` na ponte (`bridge-drill.ts`), no `ppo_drill.py` (DRILLS, DOMINIO) e no `make-tape.ts`.

## Não é seu
- Cenário definitivo da estação (sessão Cenários); boneco; regras do jogo.

## Estado (2026-10-16)
- **Feito:**
  - Simulação com os 3 níveis, testes de determinismo, da trilha e do domínio entre robôs
    (parado/ação constante/círculo/aleatório não dominam nenhum nível; mirar domina o 1; só quem freia
    domina o 2; só quem espera a móvel domina o 3).
  - Ficha ajustada pelo que foi medido (`docs/atividades/controle.md`): trilha sem fim, curvas que
    fecham, móvel de lado ±1,0, domínio por plataformas **e** quedas, folga na observação.
  - Treino do zero ao domínio dos 3 níveis em 5 min (6.016 tentativas): nível 1 → 90 plataformas;
    nível 2 → 138 plataformas e 2 quedas (aprende a frear); nível 3 → 92 plataformas e 3,6 quedas
    (aprende a acertar o tempo da móvel).
  - Fita `fitas/controle.json` (52 fotos, 10 marcos) e página `web/dist/treino-controle.html`, testada
    no navegador no desktop e no celular 390×844 (60 quadros/s com o painel visível, sem erros).
- **Próximo:**
  - O Savio assistir e avaliar a graça da evolução. Pontos a mostrar: passar direto na curva (nível 2,
    começo) → frear antes da curva; cair no vão da móvel (nível 3, começo) → chegar quando ela encosta.
  - Se ele quiser ver o atleta **parar e esperar** a móvel (hoje ele quase nunca para, ajusta a
    velocidade): testar móvel mais lenta ou com mais tempo solta (±1,2 também domina; rodado e parado
    no meio) e domínio com menos quedas.
  - Trocar o visual provisório pelo cenário da sessão Cenários, quando estiver aprovado.
- **Comandos:**
  `python ppo_drill.py --drill controle --minutes 150 --max-steps 6e8 --out runs/controle`,
  `node ../sim/dist/scripts/make-tape.js runs/controle/checkpoints.json ../fitas/controle.json`,
  `python ../web/atividades/controle/build.py`.
  Medir robôs: `cd sim && npm run build && MEDIR=1 node --test dist/test/controle.test.js`.
