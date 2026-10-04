# Prova de conceito — resultados

Objetivo: verificar se a arquitetura (simulação única em TypeScript, treino PPO em Python, partidas oficiais no servidor com replay, visualização no navegador) sustenta o produto antes de construí-lo.

Máquina usada: 2 núcleos de CPU, sem GPU. Datas: 3–4 de outubro de 2026.

## Resumo

| # | Risco | Resultado | Situação |
|---|---|---|---|
| 1 | O cérebro aprende com PPO, usa habilidades e cria contraestratégias | Aprende a vencer o robô de referência, mas joga um futebol pobre: poucos gols e "chutão" de longe o tempo todo | **Não passou ainda** |
| 2 | Uma simulação única serve ao treino (ponte Node ↔ Python) | ~28–29 mil decisões de atleta por segundo em 2 núcleos | **Passou** |
| 3 | Partidas reproduzíveis e auditáveis | 300/300 e 200/200 partidas idênticas na segunda execução; replay de ~195 KB (~50 KB comprimido) | **Passou** |
| 4 | Custo de servidor | 0,46 s de CPU por partida de 90 s; ~10 h de CPU por dia para 1.000 usuários | **Passou** |
| 5 | Desempenho no celular | Visualizador pronto, com medidor de quadros por segundo | **Aguardando teste no celular** |

A infraestrutura funciona. O que falta é **qualidade do aprendizado**, que é um problema de desenho de recompensas e de quantidade de treino — não de arquitetura.

## 1. Aprendizado (PPO + self-play em liga)

Configuração: 48 partidas em paralelo; o time A é sempre o cérebro atual; o time B é o próprio cérebro (60%), uma versão antiga (40%) ou o robô de referência (16 das 48 partidas). Atributos e habilidades sorteados a cada partida. Rede: 2 camadas de 128 neurônios, 4 decisões (andar, girar, chutar, mergulhar).

### Treino 1 (110 min, 46 milhões de passos)
- Sem recompensas auxiliares fortes, o cérebro não aprendia nada em 17 minutos. Com aproximação da bola, avanço da bola e currículo (robô começa fraco e fica mais forte quando é vencido), passou a aprender.
- Chegou a vencer o robô completo com frequência (≈ 40% de vitórias contra 28% de derrotas, no fim).
- Problema: incluí um pequeno bônus por "chute no alvo" e o cérebro passou a chutar de qualquer lugar.

### Treino 2 (54 min a partir do treino 1, interrompido por reinício da máquina)
Mudanças: sem bônus de chute no alvo; pequena penalidade por tempo sem gol; recompensas auxiliares reduzidas na segunda metade.

Resultados da bateria de testes (`training/evaluate.py`, partidas de 60 s com atributos 0,5):

| Teste | Resultado |
|---|---|
| Contra o robô | 23% vitórias, 66% empates, 12% derrotas; 0,59 × 0,35 gols |
| Gols por partida (cérebro × cérebro, 90 s) | 0,74 (o robô contra ele mesmo faz 6,5) |
| Chutes de longe | 99,8% dos chutes são de longe, **mesmo sem a habilidade** |
| Defesa contra quem tem Chute de longe | defensor mais recuado fica 1,2 m mais perto do próprio gol (13,4 → 12,2) |
| Goleiro | 0,9 mergulho e 0,06 defesa por partida |
| Atributos 0,75 × 0,25 | 45% V / 46% E / 9% D |
| Atributos 0,75 × 0,45 | 15% V / 74% E / 12% D |
| Atributo alto × baixo | Velocidade 31% V × 6% D; Precisão 22% × 6%; Chute 14% × 9%; Controle e Reflexo sem efeito claro |

### Diagnóstico
1. **"Chutão" premiado.** A recompensa auxiliar de "avanço da bola" paga por jogar a bola para frente, e o jeito mais fácil é chutar de qualquer lugar. O jogo vira um pingue-pongue de chutões com poucos gols.
2. **Equilíbrio defensivo do self-play.** Os dois lados aprendem primeiro a não sofrer gol. Com poucos gols, os testes de habilidade e de atributos ficam dominados por empates e perdem poder de medida.
3. **Pouco treino para o tamanho do problema.** Futebol com 4 atletas costuma pedir centenas de milhões de passos; aqui foram ~70 milhões.

O sinal da contraestratégia (defesa mais recuada contra Chute de longe) apareceu na direção certa, mas ainda não dá para afirmar que é aprendizado tático e não efeito colateral do chutão.

### Próximos passos para o risco 1
1. **Começar imitando o robô** (behavior cloning): o cérebro parte jogando como o robô, que faz ~6,5 gols por partida, e o PPO melhora a partir daí. Isso resolve o "começo burro" e evita o chutão.
2. **Trocar a recompensa de avanço da bola** por uma que só pague quando o próprio time está com a bola, e premiar gol e posse em vez de deslocamento.
3. **Máquina maior por algumas horas** (16–32 núcleos na nuvem): o treino escala quase linearmente com núcleos, então o mesmo experimento roda 8–15× mais rápido.
4. Com mais gols por partida, repetir a bateria de testes de habilidades e atributos.

## 2. Ponte entre simulação e treino
- 48 partidas por processo Node, quadros binários por stdin/stdout.
- ~28–29 mil decisões/s com o Python e o Node dividindo 2 núcleos.
- Conclusão: suficiente; reescrever o núcleo em Rust não é necessário agora.

## 3. Determinismo e replay
- Gerador aleatório com semente em toda a simulação, inclusive no sorteio das decisões do cérebro.
- `npm test`: 200 partidas robô × robô repetidas com resultado idêntico.
- `bench.js`: 300 + 200 partidas oficiais com cérebro, 100% idênticas.
- Replay: posições a 30 quadros/s em inteiros de 16 bits — ~195 KB em JSON, ~50 KB comprimido.
- Ressalva: funções como `Math.sin` podem variar no último bit entre motores JavaScript diferentes. Por isso o servidor é a fonte oficial e o navegador só toca o replay.

## 4. Custo
- Partida oficial de 90 s: 0,46 s de CPU (o cérebro em JS domina o custo; dá para reduzir).
- Sessão de treino de jogador (estimativa: 300 tentativas de 10 s): ~11 s de CPU.

| Usuários | Horas de CPU por dia | Núcleos se tudo rodasse em 2 h |
|---|---|---|
| 1.000 | 9,6 | 4,8 |
| 5.000 | 47,8 | 23,9 |
| 20.000 | 191,3 | 95,7 |

Distribuindo os treinos ao longo do dia, 1.000 usuários cabem em 1–2 servidores pequenos.

## 5. Celular
O visualizador (`web/dist/replay-oficial.html`) toca um replay oficial e mostra quadros por segundo, pior quadro, chamadas de desenho e triângulos, com um "Modo leve" (sem sombras, resolução 1×). Falta abrir num celular intermediário e registrar o resultado aqui.
