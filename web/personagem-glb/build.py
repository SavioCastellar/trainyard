"""Prova de conceito do atleta em GLB (HTML único): python web/personagem-glb/build.py [--antes <commit>] → web/dist/atleta-glb.html e web/dist/atleta-biblioteca.html"""
import base64, os, re, subprocess, sys
here = os.path.dirname(os.path.abspath(__file__)); web = os.path.dirname(here); root = os.path.dirname(web)
read = lambda p: open(os.path.join(root, p), encoding='utf8').read()
strip = lambda s: re.sub(r'^export\s+', '', re.sub(r'^import [\s\S]*?;\s*$', '', s, flags=re.M), flags=re.M)
sim = '\n'.join(strip(read(f'sim/dist/src/{p}')) for p in ['movimento.js'])
drill = '(function(){\n' + sim + '\nwindow.DRILL = { DT, DECISAO_QUADROS, fisica, novoCorpo, moverCorpo, direcaoDoAngulo, ATLETA_FITA };\n})();'
glb = base64.b64encode(open(os.path.join(root, 'assets/personagem/atleta.glb'), 'rb').read()).decode()
# --antes <commit>: embute também o atleta.glb daquele commit, para comparar a rodada anterior com a atual
antes = ''
if '--antes' in sys.argv:
    ref = sys.argv[sys.argv.index('--antes') + 1]
    antes = base64.b64encode(subprocess.run(['git', 'show', f'{ref}:assets/personagem/atleta.glb'], cwd=root, capture_output=True, check=True).stdout).decode()
def montar(modelo, saida):
    out = (open(os.path.join(here, modelo), encoding='utf8').read()
           .replace('/*DRILL*/', drill).replace('/*GLB_ANTES*/', antes).replace('/*GLB*/', glb)
           .replace('/*CABECUDO*/', read('web/src/cabecudo-lib.js'))
           .replace('/*ANIMACAO*/', read('web/src/animacao-atleta.js'))
           .replace('/*ATLETA_GLB*/', read('web/src/atleta-glb.js')))
    os.makedirs(os.path.join(web, 'dist'), exist_ok=True)
    dst = os.path.join(web, 'dist', saida); open(dst, 'w', encoding='utf8').write(out); print(dst, len(out))
montar('teste.template.html', 'atleta-glb.html')          # comparação (antes × depois, ou atual × GLB)
montar('biblioteca.template.html', 'atleta-biblioteca.html')  # biblioteca: ossos, malhas, guarda-roupa, ficha
