"""Monta o Laboratório de movimento (HTML único): simulação compilada + boneco + página."""
import os, re
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(os.path.dirname(here))
dist = os.path.join(root, 'sim', 'dist', 'src')
strip = lambda s: re.sub(r'^export\s+', '', re.sub(r'^import [\s\S]*?;\s*$', '', s, flags=re.M), flags=re.M)
partes = ['rng.js', 'movimento.js', 'drills/laboratorio-movimento.js', 'drills/pilotos-movimento.js']
sim = '\n'.join(strip(open(os.path.join(dist, p)).read()) for p in partes)
sim = '(function(){\n' + sim + '\nwindow.SIM = { Rng, LAB, DT, DECISAO_QUADROS, difAngulo, LaboratorioMovimento, pilotoNovo, pilotoAntigo };\n})();'
tpl = open(os.path.join(here, 'movimento.template.html')).read()
out = tpl.replace('/*SIM*/', sim).replace('/*CABECUDO*/', open(os.path.join(root, 'web', 'src', 'cabecudo-lib.js')).read())
os.makedirs(os.path.join(root, 'web', 'dist'), exist_ok=True)
dst = os.path.join(root, 'web', 'dist', 'laboratorio-movimento.html')
open(dst, 'w').write(out); print(dst, len(out))
