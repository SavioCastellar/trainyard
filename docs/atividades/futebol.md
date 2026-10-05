# Ficha: Futebol 2x2

- **Tipo:** competição oficial, 2 contra 2. Partidas rodam no servidor; o jogador assiste ao replay.
- **Atributos que importam:** Velocidade, Chute, Precisão, Controle, Reflexo, Fôlego (Força em aberto).
- **Habilidades:** Chute de longe, Goleiro (mergulho). Futuras: drible, carrinho.
- **Bom de assistir quando:** sai gol com frequência, jogadas variadas (passe, condução, chute de
  longe quando faz sentido), goleiro que mergulha, defesa que se ajusta ao adversário.

## Medidas (fonte: `sim/src/soccer.ts`, `CFG`)
| Coisa | Medida |
|---|---|
| Campo | 30 × 18 (meia-largura 15, meia-altura 9), paredes que rebatem a bola (fator 0,75) |
| Gol | boca de 6 (meia-largura 3), profundidade 2, nas pontas do eixo x |
| Atleta | raio 0,6; velocidade 5,1 + 1,0 × Velocidade |
| Bola | raio 0,38; atrito 0,9 |
| Chute | força 9 + 8 × Chute; erro de mira 0,03 + 0,5 × (1 − Precisão); acima de 10 de distância só com Chute de longe |
| Mergulho | alcance de goleiro até 6 do próprio gol; recarga 2 s |

## O que se mexe (para o cenário)
4 atletas (posição, direção, passada, chute, mergulho, caído), bola, placar, comemoração de gol.
Torcida e placar são decoração do cenário.

## Estado
- Cenário: protótipo em `web/src/stage.js` (estádio da Copa dos Cabeçudos); migrar para `web/cenarios/futebol.js`.
- Treino: aprende, mas joga "chutão" (ver `docs/aprendizados.md`). Sessão: `docs/sessoes/treino-futebol.md`.
