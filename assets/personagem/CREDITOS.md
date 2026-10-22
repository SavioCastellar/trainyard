# Créditos dos modelos 3D

- **Lowpoly Chibi Character**, de mehreen1919 (https://www.behance.net/mehreenadeel), via Poly Pizza
  (https://poly.pizza/m/nfrpFnfKh3). Licença Creative Commons Atribuição 3.0
  (https://creativecommons.org/licenses/by/3.0/). Modificado: esqueleto do Mixamo, escala, orientação e
  roupas geradas a partir do corpo (`preparar.py`). O crédito tem que aparecer no jogo (tela de créditos).
- **Anime-Hair**, de H.art (https://sketchfab.com/h.art), via Sketchfab
  (https://sketchfab.com/3d-models/anime-hair-478d75c2552d46ff831a9d19eb07d4b6). Licença Creative Commons
  Atribuição 4.0 (https://creativecommons.org/licenses/by/4.0/). Modificado: encaixado na cabeça do atleta,
  malha reduzida, sem textura, presa ao osso da cabeça (`preparar.py`, cabelos "franja" e "chanel"). Em teste.

## Arquivos
- `lowpoly-chibi-rig.fbx`: o modelo com o esqueleto do Mixamo (T-pose), como saiu de lá.
- `preparar.py`: script do Blender que gera o `atleta.glb` (altura 1,75 m, de frente para +Z, pés no chão,
  camisa, short e tênis como "cascas" do próprio corpo, presas ao esqueleto).
  Uso (Blender como módulo Python, `pip install bpy==4.2.0`): `python3 preparar.py lowpoly-chibi-rig.fbx atleta.glb`
- `cabelos/anime-hair.glb`: o cabelo acima, como veio do Sketchfab (com as cabeças de referência).
- `atleta.glb`: o resultado, usado pelas páginas.
