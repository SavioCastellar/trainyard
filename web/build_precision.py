"""Monta o visualizador do Treino de Precisão (HTML único): simulação JS + boneco + fita."""
import json, os, re, sys
here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)
strip = lambda s: re.sub(r'^export\s+', '', re.sub(r'^import .*$', '', s, flags=re.M), flags=re.M)
sim = strip(open(os.path.join(root, 'sim/dist/src/rng.js')).read()) + '\n' + strip(open(os.path.join(root, 'sim/dist/src/drills/precision.js')).read())
drill = '(function(){\n' + sim + '\nwindow.DRILL = { Rng, PRECISION, PRECISION_OBS, PRECISION_ACTIONS, PrecisionDrill };\n})();'
tape_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, 'fitas/precisao.json')
tape = json.dumps(json.load(open(tape_path)), separators=(',', ':'))
tpl = open(os.path.join(here, 'src', 'precision.template.html')).read()
out = (tpl.replace('/*DRILL*/', drill)
          .replace('/*CABECUDO*/', open(os.path.join(here, 'src', 'cabecudo-lib.js')).read())
          .replace('/*TAPE*/', tape))
os.makedirs(os.path.join(here, 'dist'), exist_ok=True)
dst = os.path.join(here, 'dist', 'treino-precisao.html')
open(dst, 'w').write(out)
print(dst, len(out))
