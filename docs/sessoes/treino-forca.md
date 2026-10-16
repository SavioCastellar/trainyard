# Sessão de treino: Trenó de carga (Força)

**Missão:** fazer o atleta aprender o Trenó de carga do zero ao domínio dos 3 níveis, de um jeito
divertido de assistir, e entregar a fita e a página. Segue o molde da sessão Treino: Reflexo
(ponte por nome, nível crescente, fita com níveis, CT provisório). **Roda no computador do Savio**,
numa cópia própria da pasta.

## É seu
- `sim/src/drills/forca.ts` e `sim/test/forca.test.ts`.
- `training/runs/forca/` (não vai para o Git), `fitas/forca.json`.
- `web/atividades/forca/` (casca dos Lançadores adaptada; `build.py` → `web/dist/treino-forca.html`).

## Compartilhado (só entradas novas)
- `sim/src/drills/bridge-drill.ts` (`forca`; `lights = 5`, então hits/lights = entregas por tentativa),
  `training/ppo_drill.py` (`DRILLS`, `DOMINIO`), `sim/scripts/make-tape.ts` (`forca`, avaliação com 64
  tentativas por foto, marcos por nível).

## Estado (2026-10-16)
- **Simulação** com os 3 níveis e testes (determinismo; ações constantes não levam o trenó; corrigir o
  rumo ajuda; parar custa caro nos níveis 2 e 3; trenó travado só sai com arranque). Medidas e robôs na
  ficha `docs/atividades/forca.md`.
- **Treino** do zero ao domínio dos 3 níveis em 3,8 min (5.900 tentativas). Duas correções no caminho:
  sair da pista pagava as marcas de novo (o atleta tirava o trenó 5–7 vezes por tentativa e ainda
  dominava o nível 1); o domínio 1,2 no nível 3 pegava o atleta numa fase instável (ficou 1,0).
- **Fita** `fitas/forca.json` (76 fotos, 1,3 MB) com marcos: empurrar, primeira entrega, corrigir o rumo,
  arranque com a carga pesada, rampa sem soltar.
- **Página** `web/dist/treino-forca.html`, visual provisório (pista de grama, marcas que acendem, trenó com
  anilhas, rampa e platô no nível 3, postura de empurrar). Testada no navegador embutido, desktop
  1280×800 e celular 390×844 (no celular a pista corre para o fundo da tela). O painel do navegador
  estava oculto, então não deu para medir quadros por segundo.
- **Próximo:** o Savio assistir e avaliar a graça da evolução. Pontos a mostrar: o arranque do nível 2
  (cai para 0,1 entrega e volta a 1,5) e a rampa no nível 3 (saídas 2,0 → 0,9). Depois, cenário do CT da
  sessão Cenários.

## Comandos
```bash
cd training
python ppo_drill.py --drill forca --minutes 60 --max-steps 4e8 --after 20 --out runs/forca
node ../sim/dist/scripts/make-tape.js runs/forca/checkpoints.json ../fitas/forca.json
python ../web/atividades/forca/build.py
```
