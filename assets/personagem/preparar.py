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
camisa = casca('camisa', {'Spine', 'Spine1', 'Spine2', 'LeftShoulder', 'RightShoulder', 'LeftArm', 'RightArm'}, .012, (.12, .48, .3))
short = casca('short', {'Hips', 'LeftUpLeg', 'RightUpLeg'}, .014, (.95, .94, .9))
tenis = casca('tenis', {'LeftFoot', 'LeftToeBase', 'LeftToe_End', 'RightFoot', 'RightToeBase', 'RightToe_End'}, .012, (.95, .95, .95))
# cabelos como cascas da cabeça: a linha do cabelo fica alta na testa (rosto) e desce atrás e nos lados
def linha(x, y, z, testa=1.37, nuca=1.1):
    t = max(0.0, min(1.0, (0.18 - z) / 0.4))          # 0 na frente do rosto, 1 atrás
    lado = max(0.0, min(1.0, (abs(x) - 0.12) / 0.15))  # perto das orelhas desce um pouco
    return y > testa - (testa - nuca) * t - 0.08 * lado * (1 - t)
cab = {'Head', 'HeadTop_End'}
curto = casca('cabelo_curto', cab, .012, (.1, .09, .1), onde=linha)
volume = casca('cabelo_volume', cab, .11, (.1, .09, .1), onde=lambda x, y, z: linha(x, y, z, 1.4, 1.15))
moicano = casca('cabelo_moicano', cab, .05, (.1, .09, .1), onde=lambda x, y, z: abs(x) < .07 and linha(x, y, z, 1.4, 1.15), maioria=.3)
for ob in (camisa, short, tenis, curto, volume, moicano):
    print(ob.name, 'faces', len(ob.data.polygons), 'pesos', sum(len(v.groups) > 0 for v in ob.data.vertices), '/', len(ob.data.vertices))
print('altura', round(max((corpo.matrix_world @ v.co).z for v in corpo.data.vertices), 3), 'bones', len(arm.data.bones))
for b in ['mixamorig:LeftArm', 'mixamorig:RightArm', 'mixamorig:LeftToe_End', 'mixamorig:Head']: print(b, tuple(round(v, 3) for v in arm.data.bones[b].head_local))
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_skins=True, export_animations=False, export_yup=True, export_apply=False)
