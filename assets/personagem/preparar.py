"""Prepara o atleta GLB a partir do FBX do Mixamo: escala (1,75 m), de frente para +Z (glTF), pés no chão,
e gera roupas como "cascas" do próprio corpo (camisa, short, tênis), já presas ao esqueleto.
Uso: python3 preparar.py entrada.fbx saida.glb"""
import bpy, bmesh, sys, os, mathutils
from mathutils import Vector
from mathutils.bvhtree import BVHTree
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
# tronco de perfil: a linha que o Savio desenhou sobre a vista lateral (2026-10-22), medida na foto e convertida
# para metros. (altura, frente, costas): y do Blender, frente = -Y. O corpo é comprimido na profundidade, altura por
# altura, até a silhueta encostar na linha; a largura (X) não muda. Fora de 0,36–0,87 m nada muda.
PERFIL = [(0.355, -0.092, 0.101), (0.374, -0.093, 0.105), (0.393, -0.094, 0.111), (0.415, -0.094, 0.116), (0.434, -0.094, 0.112),
          (0.453, -0.094, 0.112), (0.475, -0.093, 0.111), (0.497, -0.093, 0.111), (0.519, -0.089, 0.107), (0.541, -0.087, 0.105),
          (0.563, -0.084, 0.104), (0.585, -0.083, 0.106), (0.607, -0.084, 0.108), (0.629, -0.084, 0.11), (0.651, -0.085, 0.114),
          (0.67, -0.088, 0.119), (0.692, -0.09, 0.126), (0.714, -0.094, 0.132), (0.736, -0.094, 0.138), (0.758, -0.093, 0.145),
          (0.78, -0.091, 0.145), (0.802, -0.084, 0.142), (0.824, -0.072, 0.136), (0.846, -0.049, 0.125), (0.868, -0.014, 0.103)]
def clamp01(t): return max(0.0, min(1.0, t))
def interp(tab, z):
    if z <= tab[0][0]: return tab[0][1:]
    for a, b in zip(tab, tab[1:]):
        if z <= b[0]: u = (z - a[0]) / (b[0] - a[0]); return tuple(p + (q - p) * u for p, q in zip(a[1:], b[1:]))
    return tab[-1][1:]
def silhueta(z):
    """frente e costas do corpo na altura z (corte das arestas da malha)"""
    ys = []
    for e in corpo.data.edges:
        p, q = corpo.data.vertices[e.vertices[0]].co, corpo.data.vertices[e.vertices[1]].co
        if (p.z - z) * (q.z - z) <= 0 and p.z != q.z: ys.append(p.y + (z - p.z) / (q.z - p.z) * (q.y - p.y))
    return min(ys), max(ys)
ossos_coluna = [arm.data.bones[f'mixamorig:{n}'].head_local for n in ('Hips', 'Spine', 'Spine1', 'Spine2', 'Neck')]
eixo = [(o.z, o.y, o.y) for o in ossos_coluna]                    # y da coluna em cada altura
alturas = [PERFIL[0][0] + k * 0.01 for k in range(int((PERFIL[-1][0] - PERFIL[0][0]) / 0.01) + 1)]
razao = []                                                       # (altura, fator da frente, fator das costas)
for z in alturas:
    (fA, cA), (fL, cL), (a, _) = silhueta(z), interp(PERFIL, z), interp(eixo, z)
    razao.append((z, (fL - a) / (fA - a), (cL - a) / (cA - a)))
BRACOS = ('Arm', 'ForeArm', 'Hand')
nomes0 = {g.index: g.name for g in corpo.vertex_groups}
for v in corpo.data.vertices:
    z = v.co.z
    if not (PERFIL[0][0] - .02 < z < PERFIL[-1][0] + .03) or not v.groups: continue
    if nomes0[max(v.groups, key=lambda g: g.weight).group].endswith(BRACOS): continue
    borda = clamp01((z - PERFIL[0][0] + .02) / .02) * clamp01((PERFIL[-1][0] + .03 - z) / .03)   # entra e sai suave
    rf, rc = interp(razao, min(max(z, alturas[0]), alturas[-1])); a = interp(eixo, z)[0]
    r = rf if v.co.y < a else rc
    v.co.y = a + (v.co.y - a) * (1 + (r - 1) * borda)
# pernas vistas de frente: as linhas que o Savio desenhou (2026-10-22). Pernas mais finas por dentro, afinando até o
# tornozelo, e o vão entre elas começando mais alto (0,30 m). (altura, fora D, dentro D, dentro E, fora E), x em metros;
# D = perna direita do atleta (x negativo). Acima de 0,30 m o lado de dentro não tem linha (é o quadril).
PERNAS = [(0.117, -0.17, -0.077, 0.079, 0.166), (0.137, -0.174, -0.073, 0.073, 0.169), (0.157, -0.178, -0.068, 0.066, 0.171),
          (0.177, -0.181, -0.062, 0.056, 0.172), (0.196, -0.182, -0.056, 0.049, 0.173), (0.216, -0.183, -0.048, 0.043, 0.176),
          (0.236, -0.183, -0.04, 0.041, 0.177), (0.256, -0.182, -0.031, 0.036, 0.177), (0.276, -0.182, -0.026, 0.034, 0.177),
          (0.296, -0.182, -0.022, 0.034, 0.176), (0.315, -0.182, -0.022, 0.034, 0.176), (0.335, -0.181, -0.022, 0.034, 0.176),
          (0.355, -0.178, -0.022, 0.034, 0.176), (0.375, -0.176, -0.022, 0.034, 0.172), (0.395, -0.175, -0.022, 0.034, 0.172),
          (0.414, -0.171, -0.022, 0.034, 0.172)]
VIRILHA = 0.304
PERNA = ('UpLeg', 'Leg', 'Foot', 'ToeBase', 'Toe_End')
def lado_perna(v):
    if not v.groups: return None
    n = nomes0[max(v.groups, key=lambda g: g.weight).group].replace('mixamorig:', '')
    return n[:-len('UpLeg')] if n.endswith('UpLeg') else (n.split('Leg')[0] if n.endswith(PERNA) and n.startswith(('Left', 'Right')) else None)
lados = [lado_perna(v) for v in corpo.data.vertices]
def extremos_perna(z, lado):
    """dentro e fora da perna `lado` na altura z (corte das arestas que tocam essa perna)"""
    xs = []
    for e in corpo.data.edges:
        a, b = e.vertices
        if lado not in (lados[a], lados[b]): continue
        p, q = corpo.data.vertices[a].co, corpo.data.vertices[b].co
        if (p.z - z) * (q.z - z) <= 0 and p.z != q.z: xs.append(p.x + (z - p.z) / (q.z - p.z) * (q.x - p.x))
    if not xs: return None
    return (max(xs), min(xs)) if lado == 'Right' else (min(xs), max(xs))   # (dentro, fora)
alt_p = [round(0.10 + k * 0.01, 2) for k in range(32)]                 # 0,10 a 0,41 m
atual = {l: [(z, *extremos_perna(z, l)) for z in alt_p] for l in ('Left', 'Right')}
alvo = {'Right': [(r[0], r[2], r[1]) for r in PERNAS], 'Left': [(r[0], r[3], r[4]) for r in PERNAS]}
for v, l in zip(corpo.data.vertices, lados):
    if l is None or not (0.07 < v.co.z < 0.42): continue
    z = v.co.z
    dA, fA = interp(atual[l], min(max(z, alt_p[0]), alt_p[-1])); dL, fL = interp(alvo[l], z)
    if z > 0.25 and z < 0.26 and abs(v.co.x) < 0.015:               # ponto da virilha: sobe, no meio das duas linhas
        v.co.z, v.co.x = VIRILHA, (alvo['Left'][0][1] + alvo['Right'][0][1]) / 2; continue
    t = (v.co.x - dA) / (fA - dA) if fA != dA else 0
    novo = dL + t * (fL - dL)
    peso = clamp01((z - 0.07) / 0.04)                               # dentro do tênis volta ao original
    v.co.x += (novo - v.co.x) * peso
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
def bvh_de(me, faces_ok=None):
    bm = bmesh.new(); bm.from_mesh(me)
    if faces_ok: bmesh.ops.delete(bm, geom=[f for f in bm.faces if not faces_ok(f)], context='FACES')
    t = BVHTree.FromBMesh(bm); bm.free(); return t
OLHO_NOSSO, FRANJA, ENCOLHE = 1.25, 1.37, .5
def cabelo_externo(arquivo, pares, cor, dec=.4):
    """encaixa cabelos de outro modelo (cada um vem com a cabeça de referência dele): alinha a cabeça de referência
    à nossa (topo e altura dos olhos, largura e fundo) e depois deforma o cabelo radialmente, mantendo a distância
    que ele tinha do couro cabeludo de referência, agora medida até o nosso"""
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=arquivo); bpy.context.view_layer.update()
    novos = [o for o in bpy.data.objects if o not in antes]
    nossa = bvh_de(corpo.data, lambda f: sum(dom.get(v.index) in ('Head', 'HeadTop_End', 'Neck') for v in f.verts) * 2 >= len(f.verts))
    corpo_t = bvh_de(corpo.data)
    C = Vector((0, .08, 1.40))                          # centro da nossa cabeça (meio do crânio, acima dos olhos)
    saida = []
    for nome, cab_ref, partes in pares:
        ref = bpy.data.objects[cab_ref]
        P = [ref.matrix_world @ v.co for v in ref.data.vertices]
        cx = (min(p.x for p in P) + max(p.x for p in P)) / 2
        cran = [p for p in P if 2.4 < p.z < 2.8]; cy = (min(p.y for p in cran) + max(p.y for p in cran)) / 2
        TOPO, OLHO = max(p.z for p in P), 1.85               # olhos da cabeça de referência (fundo do nariz entre eles)
        # os olhos de referência vão um pouco acima dos nossos (1,215): a franja termina acima dos olhos
        sz = (1.75 - OLHO_NOSSO) / (TOPO - OLHO); sx, sy = .36, .33
        A = lambda p: Vector(((p.x - cx) * sx, (p.y - cy) * sy + .08, OLHO_NOSSO + (p.z - OLHO) * sz))
        bm = bmesh.new(); bm.from_mesh(ref.data)
        for v in bm.verts: v.co = A(ref.matrix_world @ v.co)
        dele = BVHTree.FromBMesh(bm); bm.free()
        def raio(t, d):
            hit = t.ray_cast(C, d); return (hit[0] - C).length if hit[0] else None
        cache = {}
        def delta(d):
            k = (round(d.x, 2), round(d.y, 2), round(d.z, 2))
            if k not in cache:
                s, n = 0.0, 0
                for e in ((0, 0, 0), (.08, 0, 0), (-.08, 0, 0), (0, .08, 0), (0, -.08, 0), (0, 0, .08), (0, 0, -.08)):
                    dd = (d + Vector(e)).normalized(); a, b = raio(nossa, dd), raio(dele, dd)
                    if a and b: s += a - b; n += 1
                cache[k] = s / n if n else 0.0
            return cache[k]
        obs = []
        for parte in partes:
            o = bpy.data.objects[parte]
            me = o.data.copy(); me.transform(o.matrix_world)
            for v in me.vertices:
                p = A(v.co); d = (p - C)
                if d.length > 1e-6: p = p + d.normalized() * delta(d.normalized())
                # franja: o que cai na frente do rosto encolhe para cima, para os olhos e as sobrancelhas aparecerem
                t = clamp01((-.1 - p.y) / .1) * clamp01((.32 - abs(p.x)) / .08)
                if p.z < FRANJA and t > 0: p.z = FRANJA - (FRANJA - p.z) * (1 - (1 - ENCOLHE) * t)
                v.co = p
            # rede de segurança: nada dentro do corpo
            for v in me.vertices:
                loc, nor, _, _ = corpo_t.find_nearest(v.co)
                if loc is not None and (v.co - loc).dot(nor) < .006: v.co = loc + nor * .006
            ob = bpy.data.objects.new(nome + ('' if not obs else '_prendedor'), me); bpy.context.collection.objects.link(ob)
            if dec < 1:  # o original tem 11 a 17 mil triângulos; o corpo inteiro tem uns 3 mil
                m = ob.modifiers.new('d', 'DECIMATE'); m.ratio = dec
                bpy.context.view_layer.objects.active = ob; bpy.ops.object.modifier_apply(modifier='d')
            me.materials.clear(); me.materials.append(mat(ob.name, cor if not obs else (.35, .05, .6)))  # o 2º objeto é o prendedor (cor do time na página)
            g = ob.vertex_groups.new(name='mixamorig:Head'); g.add(range(len(me.vertices)), 1.0, 'REPLACE')
            ob.parent = arm; mod = ob.modifiers.new('Armature', 'ARMATURE'); mod.object = arm
            obs.append(ob)
        saida += obs
    for o in novos: bpy.data.objects.remove(o)
    return saida
# cabelos de fora (Sketchfab, CC BY 4.0, ver CREDITOS.md): franja (masculino) e chanel com rabinho (feminino)
anime = cabelo_externo(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cabelos', 'anime-hair.glb'),
                       [('cabelo_franja', 'Object_12', ['Object_10']), ('cabelo_chanel', 'Object_8', ['Object_6', 'Object_4'])], (.1, .09, .1))
tenis_obs = tenis()  # por último: apaga faces do corpo e muda os índices usados por `dom`
for ob in (camisa, short, *tenis_obs, curto, volume, moicano, *anime):
    print(ob.name, 'faces', len(ob.data.polygons), 'pesos', sum(len(v.groups) > 0 for v in ob.data.vertices), '/', len(ob.data.vertices))
print('altura', round(max((corpo.matrix_world @ v.co).z for v in corpo.data.vertices), 3), 'bones', len(arm.data.bones))
for b in ['mixamorig:LeftArm', 'mixamorig:RightArm', 'mixamorig:LeftToe_End', 'mixamorig:Head']: print(b, tuple(round(v, 3) for v in arm.data.bones[b].head_local))
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_skins=True, export_animations=False, export_yup=True, export_apply=False)
