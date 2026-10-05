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

## 2. Atividade (dono: sessão Atividades)
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

## 3. Fita (dono: sessão Atividades)
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

## 4. Replay de partida oficial (dono: sessão Atividades)
`sim/src/replay.ts`, interface `Replay` (v1): semente, fps, specs dos 4 atletas, placar, quadros
int16 em base64 (bola x,z + por atleta x, z, direção, flags), eventos.
