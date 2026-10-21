# Créditos dos modelos 3D

- **Lowpoly Chibi Character**, de mehreen1919 (https://www.behance.net/mehreenadeel), via Poly Pizza
  (https://poly.pizza/m/nfrpFnfKh3). Licença Creative Commons Atribuição 3.0
  (https://creativecommons.org/licenses/by/3.0/). Modificado: esqueleto do Mixamo, escala, orientação e
  roupas geradas a partir do corpo (`preparar.py`). O crédito tem que aparecer no jogo (tela de créditos).

## Arquivos
- `lowpoly-chibi-rig.fbx`: o modelo com o esqueleto do Mixamo (T-pose), como saiu de lá.
- `preparar.py`: script do Blender que gera o `atleta.glb` (altura 1,75 m, de frente para +Z, pés no chão,
  camisa, short e tênis como "cascas" do próprio corpo, presas ao esqueleto).
  Uso (Blender como módulo Python, `pip install bpy==4.2.0`): `python3 preparar.py lowpoly-chibi-rig.fbx atleta.glb`
- `atleta.glb`: o resultado, usado pelas páginas.
