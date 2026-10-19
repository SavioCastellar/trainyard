"""Monta a página do Treino de Precisão (HTML único): simulação JS + boneco + fita.
Uso: python web/atividades/reflexo/build.py [fitas/precisao.json]  →  web/dist/treino-precisao.html"""
import json, os, re, sys
here = os.path.dirname(os.path.abspath(__file__))
web = os.path.dirname(os.path.dirname(here))
root = os.path.dirname(web)
read = lambda p: open(os.path.join(root, p), encoding='utf8').read()
strip = lambda s: re.sub(r'^export\s+', '', re.sub(r'^import .*$', '', s, flags=re.M), flags=re.M)
sim = strip(read('sim/dist/src/rng.js')) + '\n' + strip(read('sim/dist/src/drills/precision.js'))
drill = '(function(){\n' + sim + '\nwindow.DRILL = { Rng, PRECISION, PRECISION_OBS, PRECISION_ACTIONS, PrecisionDrill };\n})();'
tape_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, 'fitas/precisao.json')
tape = json.dumps(json.load(open(tape_path, encoding='utf8')), separators=(',', ':'))
out = (open(os.path.join(here, 'precisao.template.html'), encoding='utf8').read()
       .replace('/*DRILL*/', drill)
       .replace('/*CABECUDO*/', read('web/src/cabecudo-lib.js'))
       .replace('/*CT*/', read('web/atividades/ct-provisorio.js'))
       .replace('/*TAPE*/', tape))
os.makedirs(os.path.join(web, 'dist'), exist_ok=True)
dst = os.path.join(web, 'dist', 'treino-precisao.html')
open(dst, 'w', encoding='utf8').write(out)
print(dst, len(out))
