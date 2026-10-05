# Cabeçudos (repositório trainyard)

Jogo simulado de hábito diário para atléticas universitárias. Cada membro tem um atleta de IA (o
"Cabeçudo") que treina atividades por aprendizado por reforço e compete pela atlética.

Antes de trabalhar, leia:
1. `docs/sessoes/<sua-sessao>.md` — o que é seu, o que não é, e o próximo objetivo.
2. `docs/contratos.md` — as interfaces que outras sessões usam. Não quebre.
3. `docs/produto.md` e `docs/aprendizados.md` quando a tarefa tocar em regra de jogo ou em treino.

## Regras que não se discutem mais
- **A simulação em TypeScript (`sim/`) é a única fonte da verdade.** O treino em Python chama a
  mesma simulação pela ponte Node↔Python; o navegador usa a mesma simulação compilada.
- **Tudo é determinístico por semente** (`sim/src/rng.ts`). Nada de `Math.random` dentro da simulação.
- **Cada atividade é treinada uma única vez, do zero até o domínio, e vira uma "fita".** Todos os
  jogadores assistem à mesma fita; só a aparência do atleta muda. Não existe treino por usuário.
- **O treino tem que ser divertido de assistir** (estilo vídeos do AI Warehouse): o atleta começa
  completamente errado e melhora aos poucos. Recompensa simples (de preferência só o objetivo da
  atividade); recompensas auxiliares geram comportamentos degenerados (ver `docs/aprendizados.md`).
- **Visual:** Three.js 0.160, low-poly colorido, personagem Cabeçudo de `web/src/cabecudo-lib.js`.
  Nada de modelos realistas. A cabeça grande é só visual, nunca mecânica de jogo.
- **Interface e textos em português do Brasil.** Tom: humor, mas competitivo. Público adulto
  (18+): nada infantil, nada de alimentar ou fazer carinho no personagem.
- **Validação é visual.** Diversão não tem métrica: toda mudança relevante termina numa página
  publicada que o Savio consegue abrir e assistir (inclusive no celular, meta ≥ 30 quadros/s).

## Como trabalhar
- Trabalhe só nas pastas da sua sessão (ver `docs/sessoes/`). Precisa mudar algo de outra sessão
  ou um contrato? Descreva a mudança em `docs/pedidos.md` e avise o Savio, em vez de fazer.
- Um ramo por sessão (`personagem`, `atividades`, `central`). Commits pequenos, mensagem em português.
- Páginas para o Savio ver: publique como Artifact (HTML único, tudo embutido; Three.js via
  importmap do `cdn.jsdelivr.net`). Teste antes num Chromium sem interface, desktop e celular (390×844).
- Ao terminar um marco, atualize `docs/sessoes/<sua-sessao>.md` (feito / próximo) e, se aprendeu
  algo que vale para os outros, `docs/aprendizados.md`.
- Decisões de produto em aberto estão em `docs/produto.md` → "Em aberto". Não invente: pergunte.

## Rodando
```bash
cd sim && npm install && npx tsc -p . && npm test         # simulação + testes de determinismo
cd training && pip install -r requirements.txt             # Python 3.10+, PyTorch (CPU basta)
python ppo_drill.py --minutes 5 --out runs/precisao        # treino de uma atividade
node ../sim/dist/scripts/make-tape.js runs/precisao/checkpoints.json ../fitas/precisao.json
python ../web/build_precision.py                           # gera web/dist/treino-precisao.html
```
A máquina das sessões na nuvem tem 2 núcleos: o Treino de Precisão leva ~5 min; o futebol leva horas.

## Mapa
- `sim/` simulação (futebol 2x2, robô de referência, atividades em `src/drills/`, replay, ponte)
- `training/` PPO em Python (futebol: `ppo.py`; atividades: `ppo_drill.py`)
- `fitas/` fitas de treino gravadas (entram no Git; são o "conteúdo" do jogo)
- `web/` visualizadores (replay oficial, treino de precisão) e a biblioteca do Cabeçudo
- `prototipos/` páginas exploratórias já aprovadas como referência visual (não editar)
- `docs/` produto, arquitetura, aprendizados, contratos, plano e briefing de cada sessão
