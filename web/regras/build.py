"""Monta as páginas de regras (HTML único cada): regras do jogo compiladas + página.
  web/dist/regras.html  simulador do dia, balanço, liga simulada, tabelas
  web/dist/mapa.html    como o jogo funciona: ciclo, um dia, dinheiro, evolução, convocação, temporada, laboratório
Uso: (cd sim && npm run build) && python web/regras/build.py"""
import os, re
here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(os.path.dirname(here))
strip = lambda s: re.sub(r'^export\s+', '', re.sub(r'^import [^;]*;', '', s, flags=re.M), flags=re.M)
jogo = '\n'.join(strip(open(os.path.join(root, 'sim/dist/src', f), encoding='utf-8').read()) for f in ('rng.js', 'jogo.js', 'jogo-balanco.js'))
os.makedirs(os.path.join(root, 'web/dist'), exist_ok=True)
for tpl, nome in (('regras.template.html', 'regras.html'), ('mapa.template.html', 'mapa.html')):
    out = open(os.path.join(here, tpl), encoding='utf-8').read().replace('/*JOGO*/', jogo)
    dst = os.path.join(root, 'web/dist', nome)
    open(dst, 'w', encoding='utf-8').write(out)
    print(dst, len(out))
