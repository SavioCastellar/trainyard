// Atleta a partir do modelo GLB (assets/personagem/atleta.glb): corpo com esqueleto + roupas como cascas do corpo.
// Mesma interface do rig de cabecudo-lib.js (root, body, legs, arms, headPivot, face, handR), para usar a
// animação padrão (animacao-atleta.js) sem mudar nada: ela escreve rotações em "procuradores" (grupos soltos,
// no referencial do personagem) e aplicarEsqueleto() passa essas rotações para os ossos.
// Script clássico: espera THREE, SkeletonUtils (clone) e as funções de rosto/cabelo de cabecudo-lib.js no escopo.

const GLB_OSSOS = { quadril: 'mixamorigHips', cabeca: 'mixamorigHead', pernaD: 'mixamorigRightUpLeg', pernaE: 'mixamorigLeftUpLeg', bracoD: 'mixamorigRightArm', bracoE: 'mixamorigLeftArm', maoE: 'mixamorigLeftHand' };
/** braço em T-pose → braço caído ao lado do corpo (graus) */
const GLB_BRACO_BAIXO = 72;

/** dados do modelo calculados uma vez: centro e raio da cabeça, no referencial do personagem */
function prepararModeloGLB(gltf) {
  const cena = gltf.scene; cena.updateMatrixWorld(true);
  let corpo = null; cena.traverse(o => { if (o.isSkinnedMesh && /corpo/.test(o.name)) corpo = o; });
  const ossos = corpo.skeleton.bones, iCab = ossos.findIndex(b => b.name === GLB_OSSOS.cabeca);
  const pos = corpo.geometry.attributes.position, si = corpo.geometry.attributes.skinIndex, sw = corpo.geometry.attributes.skinWeight;
  const box = new THREE.Box3(), v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) if (si.getX(i) === iCab && sw.getX(i) > .5) box.expandByPoint(v.fromBufferAttribute(pos, i).applyMatrix4(corpo.matrixWorld));
  const tam = box.getSize(new THREE.Vector3());
  return { gltf, cabeca: { centro: box.getCenter(new THREE.Vector3()), raio: Math.max(tam.x, tam.z) / 2, alto: tam.y } };
}

/**
 * p: mesmo formato do buildCabecudo (skin, hair, hairColor, glasses, beard, expr, team {p, s}, forca, vel).
 * o.suave: sombreamento suave (padrão: facetado, como o modelo original)
 */
function buildAtletaGLB(modelo, p, o = {}) {
  const root = new THREE.Group();
  const cena = THREE_SkeletonUtils.clone(modelo.gltf.scene);
  root.add(cena);
  const cor = c => new THREE.Color(c);
  cena.traverse(m => {
    if (!m.isMesh) return;
    m.castShadow = true; m.frustumCulled = false;
    m.material = m.material.clone();
    m.material.flatShading = !o.suave; m.material.roughness = .75; m.material.metalness = 0;
    if (/corpo/.test(m.name)) m.material.color = cor(p.skin);
    else if (/camisa/.test(m.name)) m.material.color = cor(p.team.p);
    else if (/short/.test(m.name)) m.material.color = cor(p.team.s === '#f4f1e8' ? darker(p.team.p, .55) : p.team.s);
    else if (/tenis/.test(m.name)) m.material.color = cor('#f4f4f2');
    m.material.needsUpdate = true;
  });
  // porte: força alarga o corpo, velocidade afina (sem mexer na altura)
  const larg = 1 + (p.forca - .5) * .16 - (p.vel - .5) * .06;
  cena.scale.set(larg, 1, larg);
  root.updateMatrixWorld(true);
  const osso = {}; cena.traverse(b => { for (const k in GLB_OSSOS) if (b.isBone && b.name === GLB_OSSOS[k]) osso[k] = b; });
  // orientação de repouso de cada osso no referencial do personagem
  const qRoot = new THREE.Quaternion(), repouso = {};
  root.getWorldQuaternion(qRoot);
  for (const k in osso) repouso[k] = qRoot.clone().invert().multiply(osso[k].getWorldQuaternion(new THREE.Quaternion()));
  const quadrilY = osso.quadril.position.y, escalaArm = osso.quadril.parent.getWorldScale(new THREE.Vector3()).y;
  // cabeça: um grupo preso ao osso da cabeça, com os eixos do personagem, onde entram rosto, cabelo, óculos e barba
  const R = .58, k = modelo.cabeca.raio / R * 1.02;
  const head = new THREE.Group();
  osso.cabeca.add(head);
  const wc = modelo.cabeca.centro.clone().multiply(new THREE.Vector3(larg, 1, larg));
  head.position.copy(osso.cabeca.worldToLocal(root.localToWorld(wc)));
  head.quaternion.copy(osso.cabeca.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(qRoot));
  const sw = osso.cabeca.getWorldScale(new THREE.Vector3()); head.scale.set(k / sw.x, k * (modelo.cabeca.alto / (2 * modelo.cabeca.raio)) / sw.y, k / sw.z);
  const of = { eyeX: .2, eyeY: .02, eyeR: .12, z: R * .93, browY: .21, mouthY: -.27, mouthW: .1, nose: .07 };
  const face = buildFace(head, of, p);
  buildGlasses(head, p.glasses, of);
  buildBeard(head, p.beard, of, p.hairColor, R);
  buildHair(head, p.hair, R, p.hairColor, [0, 0, 0], p.team.s);
  setExpr(face, p.expr);
  // procuradores (a animação padrão escreve neles)
  const body = new THREE.Group(), legs = [new THREE.Group(), new THREE.Group()], arms = [new THREE.Group(), new THREE.Group()], headPivot = new THREE.Group();
  const handR = new THREE.Object3D(); osso.maoE.add(handR);
  return {
    kind: 'glb', root, tumble: cena, body, legs, arms, headPivot, face, handR, restExpr: p.expr, head,
    _glb: { osso, repouso, quadrilY, escalaArm, qRoot: new THREE.Quaternion(), q: new THREE.Quaternion(), e: new THREE.Euler(), baixo: [GLB_BRACO_BAIXO, -GLB_BRACO_BAIXO].map(g => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), g * Math.PI / 180)) },
  };
}

/** passa as rotações dos procuradores para os ossos (chamar depois de animarAtleta) */
function aplicarEsqueleto(rig) {
  const G = rig._glb, { osso, repouso } = G;
  const qBody = new THREE.Quaternion().setFromEuler(rig.body.rotation);
  // quer: orientação do osso (no referencial do personagem) = corpo × membro × repouso
  const por = (b, qDesejada) => {
    const pai = osso[b].parent, qPai = new THREE.Quaternion();
    pai.getWorldQuaternion(qPai); rig.root.getWorldQuaternion(G.qRoot);
    // local = pai⁻¹ × root × desejada
    osso[b].quaternion.copy(qPai.invert().multiply(G.qRoot).multiply(qDesejada));
    osso[b].updateMatrixWorld(true);
  };
  rig.root.updateMatrixWorld(true);
  por('quadril', qBody.clone().multiply(repouso.quadril));
  osso.quadril.position.y = G.quadrilY + rig.body.position.y * .8 / G.escalaArm;
  const membro = (b, proc, extra) => {
    const q = qBody.clone().multiply(new THREE.Quaternion().setFromEuler(proc.rotation));
    if (extra) q.multiply(extra);
    por(b, q.multiply(repouso[b]));
  };
  membro('pernaD', rig.legs[0]); membro('pernaE', rig.legs[1]);
  membro('bracoD', rig.arms[0], G.baixo[0]); membro('bracoE', rig.arms[1], G.baixo[1]);
  // cabeça: a mola e o olhar da animação padrão
  membro('cabeca', rig.headPivot);
}
