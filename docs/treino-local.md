# Treino no computador do Savio

Todos os treinos e simulações pesadas rodam **no computador do Savio**, não nas máquinas da nuvem
(que têm 2 núcleos). As sessões de visual (Personagem, Cenários) e a Central podem rodar na nuvem.

## A máquina
- AMD Ryzen 9 5900HX — 8 núcleos / 16 threads, 3,3 GHz (até ~4,6 GHz)
- 16 GB de RAM, SSD de 512 GB
- AMD Radeon RX 6800M (12 GB) + gráfico integrado
- Windows

## O que isso muda
- **CPU é o que importa.** O gargalo do treino é a simulação (Node), não a rede neural, que é
  pequena (2 camadas de 64–128). Com 8 núcleos, rodar ~6–7 processos de simulação em paralelo
  deve dar algo como 4–6× a velocidade da nuvem (estimativa; medir no primeiro marco).
- **A placa de vídeo não ajuda o treino agora.** PyTorch com placa AMD só tem suporte oficial no
  Linux (ROCm); no Windows existe o `torch-directml`, experimental, e para redes deste tamanho a
  CPU costuma ser mais rápida. Só reavaliar se um dia usarmos visão (câmera) ou redes grandes.
- A RX 6800M **ajuda** a assistir: as páginas 3D rodam lisas no navegador do Savio.
- 16 GB de RAM sobram para os treinos (cada processo de simulação usa ~100 MB).

## Como o Claude trabalha aqui
Use o **Claude Code rodando no computador** (aplicativo do Claude → aba Code, ambiente local,
pasta `C:\Users\savio\Source\repos\trainyard`; ou `claude` no terminal dentro da pasta). Assim o
Claude roda os comandos direto no Windows, com todos os núcleos. O modo Cowork (máquina virtual
Linux) não serve para treino: ela tem só 2 núcleos e 3 GB.

Cada sessão de treino trabalha num ramo próprio (`treino-futebol`, `treino-<atividade>`) e
**numa cópia própria da pasta** para não atrapalhar as outras:
```powershell
cd C:\Users\savio\Source\repos\trainyard
git worktree add ..\trainyard-futebol -b treino-futebol
```
e abre a sessão do Claude Code em `..\trainyard-futebol`.

Treinos longos: iniciar em segundo plano gravando log (`training/runs/<nome>/log.jsonl`) e fotos
periódicas para poder retomar. Deixar o notebook na tomada e no modo de energia "Melhor desempenho".

## Preparar a máquina (uma vez)
1. **Node.js 22 LTS** — https://nodejs.org (instalador do Windows).
2. **Python 3.11 ou 3.12** — https://python.org (marcar "Add python.exe to PATH").
3. **Git** — já instalado.
4. Na pasta do projeto:
```powershell
cd sim
npm install
npm test                                   # compila e roda os testes de determinismo
cd ..\training
python -m venv .venv
.venv\Scripts\activate
pip install numpy
pip install torch --index-url https://download.pytorch.org/whl/cpu
python ppo_drill.py --minutes 2 --out runs/teste   # teste rápido da Precisão
```

## Medições nesta máquina
(preencher no primeiro marco de cada sessão de treino)
| Treino | Processos | Passos/s | Observação |
|---|---|---|---|
| Reflexo (`ppo_drill.py --drill reflexo`) | 1 (64 ambientes) | ~27 mil | 2026-10-16; 1 núcleo de Python + 1 de Node; dá para rodar 2 treinos em paralelo sem perder velocidade |
| Precisão 3 níveis (`--drill precisao`) | 1 (64 ambientes) | ~13 mil | 2026-10-16; observação maior (58); 20M passos em ~25 min até o domínio do nível 3 |
| Precisão (`ppo_drill.py`) | 1 (64 ambientes) | ~30 mil | 2026-10-16; 13,7 acertos/tentativa em 0,3 min (na nuvem levava ~2 min) |
