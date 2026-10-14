"""Monta a página de regras e economia (HTML único): regras do jogo compiladas + simulador do dia + balanço.
Uso: (cd sim && npm run build) && python web/regras/build.py"""
import os, re
here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(os.path.dirname(here))
strip = lambda s: re.sub(r'^export\s+', '', re.sub(r'^import [^;]*;', '', s, flags=re.M), flags=re.M)
jogo = '\n'.join(strip(open(os.path.join(root, 'sim/dist/src', f), encoding='utf-8').read()) for f in ('rng.js', 'jogo.js', 'jogo-balanco.js'))
tpl = open(os.path.join(here, 'regras.template.html'), encoding='utf-8').read()
out = tpl.replace('/*JOGO*/', jogo)
os.makedirs(os.path.join(root, 'web/dist'), exist_ok=True)
dst = os.path.join(root, 'web/dist/regras.html')
open(dst, 'w', encoding='utf-8').write(out)
print(dst, len(out))
