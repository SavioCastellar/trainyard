"""Prepara o atleta GLB a partir do FBX do Mixamo: escala (1,75 m), de frente para +Z (glTF), pés no chão,
e gera roupas como "cascas" do próprio corpo (camisa, short, tênis), já presas ao esqueleto.
Uso: python3 preparar.py entrada.fbx saida.glb"""
import bpy, bmesh, sys, mathutils
from math import radians
src, dst = sys.argv[-2], sys.argv[-1]
ALTURA = 1.75
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=src)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); corpo = next(o for o in bpy.data.objects if o.type == 'MESH')
for o in [o for o in bpy.data.objects if o.type == 'EMPTY']: bpy.data.objects.remove(o)
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
arm.animation_data_clear()
# normaliza: centro do quadril em x=y=0, pés no chão, de frente para -Y do Blender (= +Z no glTF), altura ALTURA
bpy.context.view_layer.update()
zs = [(corpo.matrix_world @ v.co) for v in corpo.data.vertices]
minz, maxz = min(p.z for p in zs), max(p.z for p in zs)
hips = arm.matrix_world @ arm.data.bones['mixamorig:Hips'].head_local
s = ALTURA / (maxz - minz)
M = mathutils.Matrix.Scale(s, 4) @ mathutils.Matrix.Rotation(radians(-90), 4, 'Z') @ mathutils.Matrix.Translation((-hips.x, -hips.y, -minz))
arm.matrix_world = M @ arm.matrix_world
bpy.context.view_layer.update()
for o in (arm, corpo): o.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
corpo.name = 'corpo'; corpo.data.name = 'corpo'
def mat(nome, cor):
    m = bpy.data.materials.new(nome); m.use_nodes = True
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*cor, 1); m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .7
    return m
corpo.data.materials.clear(); corpo.data.materials.append(mat('pele', (.8, .6, .45)))
# tronco: o modelo original é um "tubo" com a barriga mais para a frente que o peito. Peito e ombros um pouco
# mais largos e para a frente, cintura e barriga para dentro, leve curva nas costas (frente = -Y do Blender)
def bump(z, c, r): t = (z - c) / r; return (1 - t * t) ** 2 if abs(t) < 1 else 0.0
def clamp01(t): return max(0.0, min(1.0, t))
for v in corpo.data.vertices:
    x, y, z = v.co
    if not (0.5 < z < 0.9 and abs(x) < 0.24): continue
    perto = 1 - clamp01((abs(x) - 0.15) / 0.09)          # raiz dos braços entra só um pouco
    sx = 1 + 0.09 * bump(z, .79, .1) - 0.06 * bump(z, .61, .07)
    v.co.x = x * (1 + (sx - 1) * perto)
    frente, costas = clamp01(-y / 0.12), clamp01((y - 0.03) / 0.12)
    v.co.y = y + perto * (frente * (-0.028 * bump(z, .77, .09) + 0.022 * bump(z, .6, .07))
                          + costas * (0.012 * bump(z, .78, .08) - 0.012 * bump(z, .6, .06)))
# grupo dominante de cada vértice
nomes = {g.index: g.name.replace('mixamorig:', '') for g in corpo.vertex_groups}
dom = {}
for v in corpo.data.vertices:
    if v.groups: g = max(v.groups, key=lambda g: g.weight); dom[v.index] = nomes[g.group]
def casca(nome, grupos, folga, cor, maioria=0.5, onde=None):
    """cópia das faces do corpo cujos vértices (a maioria) são dos `grupos` (e passam em `onde(x, altura, frente)`),
    empurrada `folga` para fora: já sai presa ao esqueleto com os pesos do corpo"""
    bm = bmesh.new(); bm.from_mesh(corpo.data)
    ok = lambda v: dom.get(v.index) in grupos and (onde is None or onde(v.co.x, v.co.z, -v.co.y))
    tirar = [f for f in bm.faces if sum(ok(v) for v in f.verts) < maioria * len(f.verts)]
    bmesh.ops.delete(bm, geom=tirar, context='FACES')
    bm.normal_update()
    for v in bm.verts: v.co += v.normal * folga
    me = bpy.data.meshes.new(nome); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(nome, me); bpy.context.collection.objects.link(ob)
    for g in corpo.vertex_groups: ob.vertex_groups.new(name=g.name)
    # copia os pesos (bmesh perdeu? to_mesh mantém a camada deform se existir)
    ob.parent = arm; mod = ob.modifiers.new('Armature', 'ARMATURE'); mod.object = arm
    me.materials.clear(); me.materials.append(mat(nome, cor))
    return ob
# camiseta de manga curta (até o meio do braço) e gola rente ao pescoço; short acima do joelho
camisa = casca('camisa', {'Spine', 'Spine1', 'Spine2', 'LeftShoulder', 'RightShoulder', 'LeftArm', 'RightArm'}, .012, (.12, .48, .3),
               onde=lambda x, y, z: abs(x) < 0.25 and y < 0.885)
short = casca('short', {'Hips', 'LeftUpLeg', 'RightUpLeg'}, .014, (.95, .94, .9), onde=lambda x, y, z: y > 0.29)
PES = {'LeftFoot', 'LeftToeBase', 'LeftToe_End', 'RightFoot', 'RightToeBase', 'RightToe_End'}
def tenis():
    """tênis feito do zero (o pé do modelo é um toco): cabedal e sola, low-poly, presos aos ossos do pé.
    Seções do calcanhar (s=0) ao bico (s=1): meia-largura, altura do topo; a frente da sola sobe um pouco"""
    Y0, Y1, CX, SOLA = 0.085, -0.175, 0.117, 0.022
    SEC = [(0, .058, .125), (.12, .07, .13), (.3, .076, .128), (.5, .08, .12), (.62, .081, .1), (.74, .079, .08),
           (.86, .07, .063), (.95, .054, .05), (1, .03, .04)]
    sobe = lambda s: max(0.0, s - .8) * 0.07
    def pesos(ob, lado, verts):
        gp, gd = ob.vertex_groups.new(name=f'mixamorig:{lado}Foot'), ob.vertex_groups.new(name=f'mixamorig:{lado}ToeBase')
        for i, y in verts:
            t = clamp01((-0.05 - y) / 0.05)   # junta dos dedos em y≈-0,074
            if t < 1: gp.add([i], 1 - t, 'REPLACE')
            if t > 0: gd.add([i], t, 'REPLACE')
    def objeto(nome, bm, lado, cor):
        me = bpy.data.meshes.new(nome); bm.to_mesh(me); bm.free()
        ob = bpy.data.objects.new(nome, me); bpy.context.collection.objects.link(ob)
        pesos(ob, lado, [(v.index, v.co.y) for v in me.vertices])
        ob.parent = arm; mod = ob.modifiers.new('Armature', 'ARMATURE'); mod.object = arm
        me.materials.append(mat(nome.split('_')[0] + ('_sola' if 'sola' in nome else ''), cor))
        return ob
    obs = []
    for lado, sx in (('Left', 1), ('Right', -1)):
        cx = CX * sx
        # cabedal: anéis de 8 pontos, fechado no calcanhar e no bico
        bm = bmesh.new(); aneis = []
        for s, w, zt in SEC:
            y, zb = Y0 + s * (Y1 - Y0), SOLA + sobe(s) - .004
            h = zt - zb
            pts = [(-w * .92, zb), (w * .92, zb), (w, zb + .35 * h), (w * .85, zb + .8 * h), (w * .45, zt), (-w * .45, zt), (-w * .85, zb + .8 * h), (-w, zb + .35 * h)]
            aneis.append([bm.verts.new((cx + px * sx, y, pz)) for px, pz in pts])
        for a, b in zip(aneis, aneis[1:]):
            for k in range(8): bm.faces.new((a[k], a[(k + 1) % 8], b[(k + 1) % 8], b[k]) if sx > 0 else (a[k], b[k], b[(k + 1) % 8], a[(k + 1) % 8]))
        bm.faces.new(aneis[0][::-1] if sx > 0 else aneis[0]); bm.faces.new(aneis[-1] if sx > 0 else aneis[-1][::-1])
        bm.normal_update(); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        obs.append(objeto(f'tenis_{lado}', bm, lado, (.95, .95, .95)))
        # sola: o contorno de baixo do cabedal um pouco maior, de 0 a SOLA (a frente sobe)
        bm = bmesh.new()
        lados = [(Y0 + s * (Y1 - Y0), w + .006, sobe(s)) for s, w, _ in SEC]
        cont = [(cx - w * sx, y, z) for y, w, z in lados] + [(cx + w * sx, y, z) for y, w, z in reversed(lados)]
        cont = [((cx + (px - cx) * (.85 if i in (0, len(cont) - 1, len(lados) - 1, len(lados)) else 1)), py, pz) for i, (px, py, pz) in enumerate(cont)]
        baixo = [bm.verts.new((px, py, pz)) for px, py, pz in cont]; cima = [bm.verts.new((px, py, pz + SOLA)) for px, py, pz in cont]
        n = len(cont)
        for k in range(n): bm.faces.new((baixo[k], baixo[(k + 1) % n], cima[(k + 1) % n], cima[k]))
        bm.faces.new(cima); bm.faces.new(baixo[::-1])
        bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
        bm.normal_update(); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        obs.append(objeto(f'tenis_sola_{lado}', bm, lado, (.2, .2, .22)))
    # o pé do corpo fica todo dentro do tênis: tira essas faces
    bm = bmesh.new(); bm.from_mesh(corpo.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if all(dom.get(v.index) in PES for v in f.verts)], context='FACES')
    bm.to_mesh(corpo.data); bm.free()
    return obs
# cabelos como cascas da cabeça: a linha do cabelo fica alta na testa (rosto) e desce atrás e nos lados
def linha(x, y, z, testa=1.37, nuca=1.1):
    t = max(0.0, min(1.0, (0.18 - z) / 0.4))          # 0 na frente do rosto, 1 atrás
    lado = max(0.0, min(1.0, (abs(x) - 0.12) / 0.15))  # perto das orelhas desce um pouco
    return y > testa - (testa - nuca) * t - 0.08 * lado * (1 - t)
cab = {'Head', 'HeadTop_End'}
curto = casca('cabelo_curto', cab, .012, (.1, .09, .1), onde=linha)
volume = casca('cabelo_volume', cab, .11, (.1, .09, .1), onde=lambda x, y, z: linha(x, y, z, 1.4, 1.15))
moicano = casca('cabelo_moicano', cab, .05, (.1, .09, .1), onde=lambda x, y, z: abs(x) < .07 and linha(x, y, z, 1.4, 1.15), maioria=.3)
tenis_obs = tenis()  # por último: apaga faces do corpo e muda os índices usados por `dom`
for ob in (camisa, short, *tenis_obs, curto, volume, moicano):
    print(ob.name, 'faces', len(ob.data.polygons), 'pesos', sum(len(v.groups) > 0 for v in ob.data.vertices), '/', len(ob.data.vertices))
print('altura', round(max((corpo.matrix_world @ v.co).z for v in corpo.data.vertices), 3), 'bones', len(arm.data.bones))
for b in ['mixamorig:LeftArm', 'mixamorig:RightArm', 'mixamorig:LeftToe_End', 'mixamorig:Head']: print(b, tuple(round(v, 3) for v in arm.data.bones[b].head_local))
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_skins=True, export_animations=False, export_yup=True, export_apply=False)
