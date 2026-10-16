# Sessão de treino: <atividade> (modelo)

Copie este arquivo para `docs/sessoes/treino-<atividade>.md` ao abrir a sessão de uma atividade.

**Missão:** fazer o atleta aprender `<atividade>` de um jeito divertido de assistir, do zero ao
domínio, e entregar a fita + página. **Roda no computador do Savio** (ver `docs/treino-local.md`).

## É seu
- `sim/src/drills/<atividade>.ts` (ou o arquivo da competição), testes dela
- `training/runs/<atividade>/` (não vai para o Git), `fitas/<atividade>.json`
- `web/atividades/<atividade>/` (página que junta cenário + simulação + fita)

## Compartilhado (só mudanças aditivas, testes passando)
- Ponte, `training/ppo_drill.py`, `sim/scripts/make-tape.ts`, casca da página de fita.
  Mudança que altera comportamento das outras atividades: `docs/pedidos.md`.

## Não é seu
- Cenário (`web/cenarios/`): use como está; ajuste visual → `docs/pedidos.md` para Cenários.
- Boneco (`web/src/cabecudo-lib.js`).

## Antes de começar
- `docs/atividades/<atividade>.md` (a ficha: regras, medidas, atributo ligado, o que é "domínio").
- `docs/aprendizados.md` inteiro.

## Marcos
1. Simulação da atividade seguindo a ficha e o contrato §2, com teste de determinismo.
2. Treino do zero ao domínio. Recompensa só do objetivo; se precisar de ajuda, registrar o porquê.
3. Fita + página (cenário da sessão Cenários + simulação + casca da fita). O Savio assiste e
   avalia; repetir 2–3 até ele aprovar a "graça" da evolução, não só a curva.
4. Registrar em `docs/aprendizados.md` o que funcionou e o que não.

## Estado
- Próximo: marco 1.
