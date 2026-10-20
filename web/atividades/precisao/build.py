"""Monta a página do Treino de Precisão (HTML único): simulação JS + atleta + fita.
Uso: python web/atividades/precisao/build.py [fitas/precisao.json]  →  web/dist/treino-precisao.html
     python web/atividades/precisao/build.py --previa  →  web/dist/previa-precisao.html (piloto escrito à mão, sem fita)"""
import json, os, re, sys
here = os.path.dirname(os.path.abspath(__file__))
web = os.path.dirname(os.path.dirname(here))
root = os.path.dirname(web)
read = lambda p: open(os.path.join(root, p), encoding='utf8').read()
strip = lambda s: re.sub(r'^export\s+', '', re.sub(r'^import [\s\S]*?;\s*$', '', s, flags=re.M), flags=re.M)
previa = '--previa' in sys.argv; args = [a for a in sys.argv[1:] if a != '--previa']
sim = '\n'.join(strip(read(f'sim/dist/src/{p}')) for p in ['rng.js', 'movimento.js', 'drills/painel.js', 'drills/bandeja.js', 'drills/precision.js', 'drills/laboratorio-movimento.js', 'drills/pilotos-movimento.js'])
drill = '(function(){\n' + sim + '\nwindow.DRILL = { Rng, PRECISION, PRECISION_OBS, PRECISION_ACTIONS, PrecisionDrill, DECISAO_QUADROS, pilotoPrecisao };\n})();'
if previa:
    # fita falsa: um ponto por nível, só para a página montar as sessões
    tape = json.dumps({'exercise': 'precisao', 'decisao': 8, 'dims': {'layers': [], 'actions': []}, 'totalEpisodes': 0, 'milestones': [],
                       'checkpoints': [{'episodes': 0, 'steps': 0, 'acc': 0, 'hits': 0, 'kicks': 0, 'nivel': n, 'scales': [], 'w': ''} for n in (1, 2, 3)]})
else:
    tape_path = args[0] if args else os.path.join(root, 'fitas/precisao.json')
    tape = json.dumps(json.load(open(tape_path, encoding='utf8')), separators=(',', ':'))
out = (open(os.path.join(here, 'precisao.template.html'), encoding='utf8').read()
       .replace('/*DRILL*/', drill)
       .replace('/*CABECUDO*/', read('web/src/cabecudo-lib.js'))
       .replace('/*CT*/', read('web/atividades/ct-provisorio.js'))
       .replace('/*ANIMACAO*/', read('web/src/animacao-atleta.js'))
       .replace('/*PREVIA*/', 'true' if previa else 'false')
       .replace('/*TAPE*/', tape))
os.makedirs(os.path.join(web, 'dist'), exist_ok=True)
dst = os.path.join(web, 'dist', 'previa-precisao.html' if previa else 'treino-precisao.html')
open(dst, 'w', encoding='utf8').write(out)
print(dst, len(out))
