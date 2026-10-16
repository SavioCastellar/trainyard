# Sessão de treino: Painel de reação (Reflexo)

**Missão:** fazer o atleta aprender o Painel de reação de um jeito divertido de assistir, do zero
ao domínio dos 3 níveis, e entregar a fita e a página. É o **primeiro treino novo** depois da
Precisão. Serve também para provar o formato com níveis que todos os outros treinos vão usar.
**Roda no computador do Savio** (ver `docs/treino-local.md`), numa cópia própria da pasta, no ramo
`treino-reflexo`.

**O objetivo é o Savio ver rodando.** A aprovação da ficha foi só no papel; a aprovação de verdade
é ele assistir à página e achar divertido. Chegue a uma página assistível o quanto antes, mesmo
com visual provisório, e melhore a partir daí.

## É seu
- `sim/src/drills/reflexo.ts` e os testes dele.
- `training/runs/reflexo/` (não vai para o Git), `fitas/reflexo.json`.
- `web/atividades/reflexo/`: a página que junta cenário, simulação e fita.

## Compartilhado (só mudanças aditivas, testes passando)
- Ponte (`sim/src/drills/bridge-drill.ts`): hoje só conhece a Precisão. **Generalize por nome da
  atividade** (o contrato §2 já prevê isso na segunda atividade) sem mudar o comportamento da
  Precisão.
- `training/ppo_drill.py` e `sim/scripts/make-tape.ts`: precisam de **dificuldade crescente**
  (o ambiente sobe de nível quando o atleta domina o atual) e de saber o nível de cada foto.
  Registre os campos novos da fita em `docs/contratos.md` §3, como mudança aditiva: `nivel` em
  cada foto e um marco por subida de nível. A próxima sessão (Precisão com 3 níveis) vai reusar
  isso.
- Casca da página de fita (`web/src/precision.template.html` é a referência).

## Não é seu
- Cenário (`web/cenarios/`): a sessão Cenários está fazendo o CT e esta estação (marcos 1 e 2 dela).
  Até lá, use um **visual provisório** simples: piso, placas coloridas e o boneco. Quando o cenário
  chegar, troque pelo dele. Pedidos de ajuste visual vão para `docs/pedidos.md`.
- Boneco (`web/src/cabecudo-lib.js`).
- Regras do jogo (`sim/src/jogo.ts`).

## Antes de começar
- `docs/atividades/reflexo.md`: a ficha, com regras, medidas, níveis e domínio. **As medidas da
  ficha mandam.**
- `docs/aprendizados.md` inteiro, principalmente os itens 1, 5, 8, 9 e 14.
- `sim/src/drills/precision.ts` e `training/ppo_drill.py`: o molde que funcionou.

## Marcos
1. **Simulação** do Painel de reação seguindo a ficha e o contrato §2, com os 3 níveis e um teste
   de determinismo (mesma semente e mesmas ações = mesma tentativa).
2. **Treino do zero ao domínio dos 3 níveis**, com recompensa só do objetivo e o nível subindo
   quando o atleta atinge o domínio da ficha. Meça os valores reais de domínio e corrija a ficha.
3. **Fita e página** com o visual provisório. O Savio assiste e avalia; repita 2 ou 3 vezes até ele
   aprovar a graça da evolução, não só a curva. Pontos a mostrar: a descoberta de voltar ao
   centro (nível 2) e o desvio das vermelhas (nível 3).
4. Trocar o visual provisório pelo cenário da sessão Cenários, quando estiver aprovado.
5. Registrar em `docs/aprendizados.md` o que funcionou e o que não, principalmente sobre a
   dificuldade crescente, que é nova.

## Estado
- Próximo: marco 1.
