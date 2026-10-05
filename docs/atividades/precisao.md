# Ficha: Treino de Precisão

- **Tipo:** treino físico, individual. **Atributo:** Precisão (regra de ganho em aberto).
- **Objetivo do atleta:** acertar alvos chutando bolas. +1 por acerto, nenhuma outra recompensa.
- **Duração da tentativa:** 30 s.
- **Domínio:** ~29 acertos por tentativa, ~97% dos chutes no alvo (atingido em ~5.500 tentativas).

## Medidas (unidades da simulação ≈ metros; fonte: `sim/src/drills/precision.ts`)
| Coisa | Medida |
|---|---|
| Arena | círculo de raio 12, borda marcada no chão |
| Atleta | raio 0,55; anda até 4,5/s; gira 3,2 rad/s |
| Bola | raio 0,32; sai a 15/s; atrito 0,55; some ao parar (< 1,5/s) ou sair da arena |
| Alvos | 3 ao mesmo tempo, raio 0,7; reaparecem a 3,5–10,5 do centro, longe do atleta e entre si |
| Chute | intervalo mínimo 0,9 s; só uma bola por vez; erro de mira pequeno |

## O que se mexe (para o cenário)
Atleta (posição, direção, passada, chute), bola (rolando), alvos (aparecem, são acertados e somem).

## Estado
- Cenário: protótipo aprovado (dentro de `web/src/precision.template.html`); migrar para `web/cenarios/precisao.js`.
- Treino: feito (`fitas/precisao.json`). Melhorias possíveis: teto mais alto (alvos que se movem, vento) para a sessão 3 da fita não ficar parada.
