"""Monta a página do Painel de luzes (Velocidade) (HTML único): simulação JS + boneco + fita.
Uso: python web/atividades/velocidade/build.py [fitas/velocidade.json]  →  web/dist/treino-velocidade.html
     python web/atividades/velocidade/build.py --previa  →  web/dist/previa-velocidade.html (piloto escrito à mão, sem fita)"""
import base64, json, os, re, sys
here = os.path.dirname(os.path.abspath(__file__))
web = os.path.dirname(os.path.dirname(here))
root = os.path.dirname(web)
read = lambda p: open(os.path.join(root, p), encoding='utf8').read()
strip = lambda s: re.sub(r'^export\s+', '', re.sub(r'^import [\s\S]*?;\s*$', '', s, flags=re.M), flags=re.M)
previa = '--previa' in sys.argv; args = [a for a in sys.argv[1:] if a != '--previa']
sim = '\n'.join(strip(read(f'sim/dist/src/{p}')) for p in ['rng.js', 'movimento.js', 'drills/painel.js', 'drills/laboratorio-movimento.js', 'drills/pilotos-movimento.js'])
drill = '(function(){\n' + sim + '\nwindow.DRILL = { Rng, PAINEL, PAINEL_OBS, PAINEL_ACTIONS, PainelDrill, DECISAO_QUADROS, pilotoPainel };\n})();'
if previa:
    # fita falsa: um ponto por nível, só para a página montar as sessões
    tape = json.dumps({'exercise': 'velocidade', 'decisao': 8, 'dims': {'layers': [], 'actions': []}, 'totalEpisodes': 0, 'milestones': [],
                       'checkpoints': [{'episodes': 0, 'steps': 0, 'acc': 0, 'reds': 0, 'hits': 0, 'nivel': n, 'scales': [], 'w': ''} for n in (1, 2, 3)]})
else:
    tape_path = args[0] if args else os.path.join(root, 'fitas/velocidade.json')
    tape = json.dumps(json.load(open(tape_path, encoding='utf8')), separators=(',', ':'))
out = (open(os.path.join(here, 'painel.template.html'), encoding='utf8').read()
       .replace('/*DRILL*/', drill)
       .replace('/*CABECUDO*/', read('web/src/cabecudo-lib.js'))
       .replace('/*CT*/', read('web/atividades/ct-provisorio.js'))
       .replace('/*ANIMACAO*/', read('web/src/animacao-atleta.js'))
       .replace('/*ATLETA_GLB*/', read('web/src/atleta-glb.js'))
       .replace('/*GLB*/', base64.b64encode(open(os.path.join(root, 'assets/personagem/atleta.glb'), 'rb').read()).decode())
       .replace('/*PREVIA*/', 'true' if previa else 'false')
       .replace('/*TAPE*/', tape))
os.makedirs(os.path.join(web, 'dist'), exist_ok=True)
dst = os.path.join(web, 'dist', 'previa-velocidade.html' if previa else 'treino-velocidade.html')
open(dst, 'w', encoding='utf8').write(out)
print(dst, len(out))
