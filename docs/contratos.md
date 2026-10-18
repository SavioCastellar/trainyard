# Contratos entre sessões

Estas interfaces são usadas por mais de uma sessão. Quem é dono pode mudar **por dentro** à vontade
(deixar o boneco mais bonito, treinar melhor), mas a interface só muda com combinação: escreva o
pedido em `docs/pedidos.md` e avise o Savio. Mudança aditiva (campo novo opcional) é permitida
e deve ser registrada aqui.

## 1. Boneco (dono: sessão Personagem)
Arquivo: `web/src/cabecudo-lib.js`. Script clássico (sem `import`), espera `THREE` e `TAU` no escopo;
é embutido nas páginas pelo build.

### Aparência (`look`)
```js
{
  nick: 'TROVÃO', num: 10,
  skin: '#e8b896', hair: 'curto'|'afro'|'moicano'|'coque'|'bone'|'careca', hairColor: '#1d1a1f',
  glasses: 'nenhum'|'redondo'|'escuro', beard: 'nenhuma'|'bigode'|'barba',
  expr: 'confiante'|'neutro'|'bravo',
  forca: 0..1, vel: 0..1,                      // mudam o corpo
  team: { p: '#1f7a4d', s: '#f4f1e8' },        // cores da atlética
  gear: { tenis, munhequeira, faixa, medalha, lesionado }   // booleanos
}
```
Novas opções de aparência entram como novos valores ou campos opcionais com padrão.

### `buildCabecudo(look) → rig`
```
rig.root        Group na origem, de pé no chão (y=0), olhando para +z. Altura ≈ 2,3 unidades.
rig.tumble      Group para cair/rolar o corpo inteiro
rig.body        Group do corpo (mexer position.y para quicar, rotation.x para inclinar)
rig.legs[0|1]   pernas esquerda/direita (rotation.x balança; perna 1 é a do chute)
rig.arms[0|1]   braços (rotation.x balança, rotation.z abre para comemorar)
rig.headPivot   pescoço (rotation.x/z para a cabeça "molenga" com mola)
rig.head        a cabeça
rig.face        { eyes[], brows[], mouths{} } — usar com setExpr(rig.face, expr)
rig.headTop     Object3D acima da cabeça (para crachá/ícones)
rig.restExpr    expressão de repouso
```
- `setExpr(face, 'confiante'|'neutro'|'bravo'|'feliz'|'triste')`.
- Para virar o boneco para a direção `h` (ângulo no plano x,z, como na simulação):
  `rig.root.rotation.y = Math.PI / 2 - h`.
- Animação: as páginas animam pernas/braços/corpo diretamente (padrão em
  `web/src/precision.template.html`, `Arena.animateAthlete`). Quando a sessão Personagem criar
  uma função de animação compartilhada (ex.: `animateCabecudo(rig, estado, dt)`), ela entra aqui e
  as atividades passam a usá-la.

## 2. Atividade (dono: a sessão de treino de cada atividade)
Cada atividade é uma classe em `sim/src/drills/<nome>.ts`, determinística por semente:
```ts
export const NOME = { ...constantes, maxTime, dt };       // dt = 1/30
export const NOME_OBS: number;                            // tamanho da observação
export const NOME_ACTIONS: readonly number[];             // tamanhos das decisões (categóricas)
export class NomeDrill {
  constructor(seed: number, record = false);
  t: number; done: boolean; reward: number;               // reward = recompensa do último passo
  events: Evento[] | null;                                // só com record=true; { type, t, ... }
  observe(out: Float32Array, off?: number): void;
  step(...acoes: number[]): void;
  // + estado público que a página desenha (posições, alvos, bola…)
}
```
- Para o treino, a atividade é registrada na ponte `bridge-drill.ts` (hoje só a Precisão;
  generalizar por nome ao criar a segunda atividade).
- O futebol (`sim/src/soccer.ts`, `Match`) segue o mesmo espírito com 4 atletas; ver o arquivo.

### Movimento padrão (`sim/src/movimento.ts`) — vale para toda atividade nova ou retreinada
- **Ações de movimento:** `[direção 0..15 (no mundo), ritmo 0..2 (parado, trote, corrida)]`
  (`ACOES_MOVIMENTO`); a atividade acrescenta as suas (ex.: chutar). Nada de "girar esq/dir".
- **Física:** `fisica({ velocidade, controle })` → velocidade máxima, aceleração, frenagem, curva e
  giro do corpo; `moverCorpo()` a cada passo. O corpo vira sozinho para onde vai.
- **Visão:** posição relativa do que importa dentro de um cone (`enxerga()`), mais uma memória
  curta do último lugar visto. Raios finos só para obstáculos, se a atividade tiver.
- **Decisão a cada `DECISAO_QUADROS` (8) quadros, ~0,27 s**, mantendo a ação no intervalo (treino, fita e
  partida oficial usam o mesmo número; atividades de reação podem precisar de menos — medir).
- **Animação (padrão escolhido pelo Savio):** inclinação na curva 30%, ao acelerar/frear 100%,
  postura de corrida 100%, ângulo máximo 35°, resposta 10, cabeça com mola. Valores em
  `INC_PADRAO` de `web/movimento/movimento.template.html`.
- Referência: `sim/src/drills/laboratorio-movimento.ts`; página `web/movimento/` → `web/dist/laboratorio-movimento.html`.

## 3. Fita (compartilhado entre as sessões de treino; mudanças aditivas)
`fitas/<atividade>.json`, gerada por `sim/scripts/make-tape.ts`:
```js
{
  exercise: 'precisao', title: 'Treino de Precisão',
  dims: { obs: 35, actions: [3,3,2], layers: [[35,64],[64,64],[64,8]] },  // [entradas, saídas]
  totalEpisodes: 5504,
  milestones: [{ ck: 4, text: 'Começou a virar na direção dos alvos antes de chutar.' }],
  checkpoints: [{
    episodes, steps, hits, kicks, acc, best,   // métricas médias daquela foto (hits = desempenho)
    scales: [s0, s1, s2],                      // uma escala por camada
    w: 'base64'                                // int16; por camada: pesos [saída][entrada] e depois vieses; valor = int × escala
  }]
}
```
- Cérebro: camadas ocultas com `tanh`, última camada linear dividida em logits por decisão;
  ações sorteadas de cada distribuição categórica (não usar argmax: o sorteio dá a variedade).
- Campos de métrica (`hits`, `kicks`, `acc`, `best`) são da Precisão; outras atividades podem ter
  outros, mas **`hits` deve existir como "desempenho principal"** (a curva usa ele) — ou renomear
  para `score` em todas de uma vez, combinando aqui.

## 4. Replay de partida oficial (dono: sessão de treino do Futebol)
`sim/src/replay.ts`, interface `Replay` (v1): semente, fps, specs dos 4 atletas, placar, quadros
int16 em base64 (bola x,z + por atleta x, z, direção, flags), eventos.

## 5. Cenário (dono: sessão Cenários)
Um módulo por atividade em `web/cenarios/<atividade>.js` (script clássico, como a `cabecudo-lib.js`;
espera `THREE` e `TAU` no escopo), mais peças comuns em `web/cenarios/comum.js`.
```js
const cen = construirCenario<Atividade>(scene, { qualidade: 'alta'|'leve' });
cen.raiz          // Group com todo o cenário; origem = centro da arena da simulação, y=0 = chão
cen.objetos       // fábricas dos objetos que se mexem, nas medidas da ficha:
                  //   ex.: cen.objetos.bola(), cen.objetos.alvo() → { grupo, ...handles }
cen.efeitos       // efeitos prontos: ex.: cen.efeitos.acerto(x, z), cen.efeitos.gol(time)
cen.camera        // sugestão de câmera: { desktop: {pos, alvo}, celular: {pos, alvo} }
cen.atualizar(dt) // anima o que é só decoração (grama, água, torcida, nuvens)
```
- **Unidades e eixos iguais aos da simulação**: 1 unidade = 1 da simulação; plano x,z; a direção
  `h` da simulação vira `rotation.y = Math.PI / 2 - h`.
- O cenário **não** decide nada do jogo: posições vêm da simulação; o cenário só desenha.
- Luz e sombra ficam no cenário (cada atividade pode ter seu clima), mas cabem no orçamento de
  desempenho: ≥ 30 fps no celular intermediário com 4 atletas.

## 6. Regras do jogo (dono: Central)
`sim/src/jogo.ts`: funções puras sobre um `Atleta` JSON (`novoAtleta`, `treinar`, `trabalhar`,
`registrarPartida`, `expedicao`, `comprar`, `equipar`, `reparar`, `tratar`, `virarDia`,
`novaTemporada`, `atributoEsporte`, `forca`, `indiceConvocacao`, `convocar`, `especialidades`,
`habilidades`, `atualizarEspecialidades`, `nivelAtividade`, `temperaturaDecisao`, `sortearResultado`);
`treinar(a, atr, nivelCT, comPreparador)`; `Atleta.turnosHoje` (opcional) controla o salário
decrescente. Formato da rodada em `REGRAS` (`duplasPorRodada`, `pontosPreparo`, `vantagemCampanha`). Ações inválidas
lançam `Error` com mensagem em português (o backend mostra ao jogador). Sorte só via `Rng`.
Números podem mudar no balanceamento; nomes e formato do `Atleta` só com pedido.
