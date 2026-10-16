# Primeiro teste: liga entre amigos

**Quando:** só quando o jogo estiver quase completo. Nada deste documento deve ser implementado
antes disso; ele existe para que as decisões de agora já levem o teste em conta.

## Formato (decidido com o Savio em 2026-10-16)
- **16 atléticas, 16 pessoas reais:** o Savio e mais 15 pessoas. Cada pessoa é a **diretora de uma
  atlética** e tem **o próprio atleta** nela. Não há atlética sem diretor real.
- **40 atletas por atlética:** o atleta do diretor + 39 membros simulados (assumido; confirmar se
  o atleta do diretor conta dentro dos 40).
- **Divisão única** com as 16 atléticas. Sem acesso, rebaixamento ou várias equipes por atlética
  neste teste (todas têm o mesmo tamanho, então o problema de tamanho não aparece).
- **O diretor só decide o que fazer com o caixa da atlética** (hoje: centro de treinamento e
  departamento médico; ver `docs/regras.md`). Não escala, não orienta o treino dos simulados.
- **Elenco simulado:** sorteado em cada atlética, mas **equilibrado** entre elas.

## O que o diretor faz no dia
- Joga com o próprio atleta como qualquer jogador: 5 ações (treinar, trabalhar, amistoso…).
- Decide os gastos do caixa.
- Assiste às rodadas da sua atlética.

## Consequências para as regras (a ajustar quando o teste chegar)
1. **Tabela com 16 atléticas:** um turno completo são 15 rodadas. Sugestão: turno e returno
   (30 rodadas, dias 1–30) e mata-mata entre as 4 primeiras nos dias seguintes, ajustando a
   temporada de 42 dias. Sem dia de folga, porque 16 é par.
2. **Elenco equilibrado:** proposta — mesma quantidade de cada perfil simulado (dedicado, casual…)
   em todas as atléticas, atributos sorteados, e novo sorteio até a força média dos elencos ficar a
   menos de 2% entre a mais forte e a mais fraca.
3. **O atleta do diretor tem que importar:** os simulados não podem ser fortes ou ativos a ponto de
   um diretor que joga todo dia nunca ser convocado. Medir no laboratório antes do teste.
4. **O caixa precisa ser uma decisão de verdade:** com 39 simulados gerando 10% do que ganham, o
   caixa de todas as atléticas enche no mesmo ritmo. As melhorias precisam ter trocas reais
   (ex.: CT agora ou departamento médico antes do mata-mata), senão todos os diretores fazem a
   mesma coisa e o caixa não diferencia ninguém.
5. **Comportamento dos simulados:** reaproveitar os perfis de `sim/src/jogo-balanco.ts`.

## Pré-requisitos (o "jogo quase completo")
- Atributos base, atributos do esporte e especialidades decididos (`docs/regras.md`).
- Treinos com progressão de atividade e fitas gravadas para os atributos do lançamento.
- Futebol 2x2 bom de assistir, com as habilidades das especialidades.
- Centro de treinamento com cenário por nível.
- Backend: contas, atléticas, ações diárias, rodadas oficiais no servidor com replay, caixa.
- App do jogador (celular) e tela do diretor para o caixa.

## Antes de começar o teste
- Simular a temporada exata (16 × 40, divisão única, diretores com estratégias de caixa diferentes)
  e conferir: a decisão do caixa muda o resultado? O atleta do diretor é convocado? O equilíbrio
  dos elencos se mantém?
- Definir o que vamos observar: quantos dias seguidos cada pessoa abriu o app, o que fizeram com o
  caixa, o que acharam de assistir aos treinos e às rodadas.
