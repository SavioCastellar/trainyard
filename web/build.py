"""Monta o visualizador de replay (arquivo HTML único) a partir do modelo, do estádio e de um replay."""
import json, os, sys
here = os.path.dirname(os.path.abspath(__file__))
tpl = open(os.path.join(here, 'src', 'viewer.template.html')).read()
out = (tpl.replace('/*BASECSS*/', open(os.path.join(here, 'src', 'base.css.html')).read())
          .replace('/*STAGE*/', open(os.path.join(here, 'src', 'stage.js')).read())
          .replace('/*REPLAY*/', open(sys.argv[1]).read()))
os.makedirs(os.path.join(here, 'dist'), exist_ok=True)
dst = os.path.join(here, 'dist', 'replay-oficial.html')
open(dst, 'w').write(out)
print(dst, len(out))
