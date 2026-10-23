// Atleta a partir do modelo GLB (assets/personagem/atleta.glb): corpo com esqueleto + roupas como cascas do corpo.
// Mesma interface do rig de cabecudo-lib.js (root, body, legs, arms, headPivot, face, handR), para usar a
// animação padrão (animacao-atleta.js) sem mudar nada: ela escreve rotações em "procuradores" (grupos soltos,
// no referencial do personagem) e aplicarEsqueleto() passa essas rotações para os ossos.
// Script clássico: espera THREE, SkeletonUtils (clone) e as funções de rosto/cabelo de cabecudo-lib.js no escopo.

const GLB_OSSOS = { quadril: 'mixamorigHips', cabeca: 'mixamorigHead', pernaD: 'mixamorigRightUpLeg', pernaE: 'mixamorigLeftUpLeg', bracoD: 'mixamorigRightArm', bracoE: 'mixamorigLeftArm', maoE: 'mixamorigLeftHand' };
/** braço em T-pose → braço caído ao lado do corpo (graus) */
const GLB_BRACO_BAIXO = 72;

/**
 * Pontos do rosto (metros, referencial do personagem: y altura, z frente), medidos na superfície do modelo
 * (raios de frente, assets/personagem). O nariz é do próprio modelo (estilo anime): ponta em y 1,12, z 0,34;
 * queixo em y 1,04. Olhos acima do nariz, boca entre o nariz e o queixo.
 */
const GLB_ROSTO = {
  olhoX: .105, olhoY: 1.215, olhoZ: .272, olhoR: .056,
  sobY: 1.29, sobZ: .276,
  bocaY: 1.074, bocaZ: .318, bocaW: .032,
  get oculos() { return { eyeX: this.olhoX, eyeY: this.olhoY, eyeR: this.olhoR, z: this.olhoZ, mouthY: this.bocaY, mouthW: this.bocaW * 1.4 }; },
};
/** mesmo formato de buildFace (cabecudo-lib.js): { eyes, brows, mouths }, para setExpr e o piscar funcionarem */
function buildRostoGLB(g, p) {
  const R = GLB_ROSTO, f = { eyes: [], brows: [], mouths: {} };
  const white = M('#ffffff', { roughness: .25 }), pupil = M('#1b1724', { roughness: .2 }), dark = M('#2a1e22', { roughness: .8 });
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * R.olhoX, R.olhoY, R.olhoZ);
    add(e, new THREE.SphereGeometry(R.olhoR, 18, 14), white, [0, 0, 0], null, [1, 1.2, .5]);
    add(e, new THREE.SphereGeometry(R.olhoR * .52, 14, 10), pupil, [s * -R.olhoR * .08, -R.olhoR * .06, R.olhoR * .38]);
    g.add(e); f.eyes.push(e);
    const b = add(g, new THREE.BoxGeometry(R.olhoR * 1.7, R.olhoR * .3, R.olhoR * .4), M(darker(p.hairColor, .9)), [s * R.olhoX, R.sobY, R.sobZ]);
    b.userData.side = s; f.brows.push(b);
  }
  const mw = R.bocaW, y = R.bocaY, z = R.bocaZ;
  const smile = new THREE.TorusGeometry(mw, mw * .22, 8, 20, Math.PI);
  f.mouths.confiante = add(g, smile, dark, [mw * .25, y, z], [0, 0, Math.PI + .3], [1, .75, 1]);
  f.mouths.neutro = add(g, new THREE.BoxGeometry(mw * 1.4, mw * .3, mw * .3), dark, [0, y, z]);
  f.mouths.bravo = add(g, smile, dark, [0, y - mw * .3, z], [0, 0, 0], [1, .6, 1]);
  f.mouths.feliz = add(g, new THREE.SphereGeometry(mw * .9, 16, 10, 0, TAU, Math.PI / 2, Math.PI / 2), M('#5a1f2c', { roughness: .8 }), [0, y + mw * .4, z - .01], [Math.PI * .08, 0, 0], [1.2, 1.1, .5]);
  f.mouths.triste = add(g, smile, dark, [0, y - mw * .5, z], [0, 0, 0], [.8, .5, 1]);
  return f;
}

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
  // cabelos: cascas da cabeça (curto, volume/afro, moicano; coque e boné usam a curta) e cabelos de fora encaixados
  // pelo preparar.py (franja, chanel); se o modelo não tiver o estilo pedido, fica o curto
  let estilo = { curto: 'cabelo_curto', coque: 'cabelo_curto', bone: 'cabelo_curto', afro: 'cabelo_volume', moicano: 'cabelo_moicano', franja: 'cabelo_franja', chanel: 'cabelo_chanel' }[p.hair] || 'cabelo_curto';
  let tem = false; cena.traverse(m => { if (m.isMesh && m.name.startsWith(estilo)) tem = true; });
  if (!tem) estilo = 'cabelo_curto';
  cena.traverse(m => {
    if (!m.isMesh) return;
    m.castShadow = true; m.frustumCulled = false;
    m.material = m.material.clone();
    m.material.flatShading = !o.suave; m.material.roughness = .75; m.material.metalness = 0;
    if (/corpo/.test(m.name)) m.material.color = cor(p.skin);
    else if (/camisa/.test(m.name)) m.material.color = cor(p.team.p);
    else if (/short/.test(m.name)) m.material.color = cor(p.team.s === '#f4f1e8' ? darker(p.team.p, .55) : p.team.s);
    else if (/sola/.test(m.name)) m.material.color = cor(darker(p.team.p, .7));
    else if (/tenis/.test(m.name)) m.material.color = cor('#f4f4f2');
    else if (/cabelo/.test(m.name)) {
      // o boné usa a casca curta na cor do time; o prendedor do chanel vai na cor principal do time
      m.visible = m.name.startsWith(estilo);
      if (/prendedor/.test(m.name)) { m.material.color = cor(p.team.p); m.material.roughness = .5; }
      else { m.material.color = cor(p.hair === 'bone' ? p.team.s : p.hairColor); m.material.roughness = p.hair === 'bone' ? .6 : .9; }
    }
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
  // rosto: noutro grupo, em metros no referencial do personagem (o modelo já tem nariz e queixo; os olhos,
  // a boca e as sobrancelhas vão nos pontos medidos na superfície do rosto, ver GLB_ROSTO)
  const rosto = new THREE.Group(); osso.cabeca.add(rosto);
  rosto.position.copy(osso.cabeca.worldToLocal(root.localToWorld(new THREE.Vector3())));
  rosto.quaternion.copy(head.quaternion);
  rosto.scale.set(larg / sw.x, 1 / sw.y, larg / sw.z);
  const face = buildRostoGLB(rosto, p);
  buildGlasses(rosto, p.glasses, GLB_ROSTO.oculos);
  buildBeard(rosto, p.beard, GLB_ROSTO.oculos, p.hairColor, modelo.cabeca.raio * .82, [0, modelo.cabeca.centro.y, modelo.cabeca.centro.z]);
  // complementos do cabelo: coque atrás, aba do boné na frente
  if (p.hair === 'coque') add(rosto, new THREE.IcosahedronGeometry(.1, 1), M(p.hairColor, { roughness: .9, flatShading: true }), [0, 1.66, -.16]);
  if (p.hair === 'bone') add(rosto, new THREE.CylinderGeometry(.24, .24, .02, 20, 1, false, -Math.PI / 2, Math.PI), M(p.team.s, { roughness: .6 }), [0, 1.43, .2], [.18, 0, 0], [1, 1, .85]);
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

/**
 * Carrega o modelo embutido na página (atleta.glb em base64, posto pelo build.py) e prepara para buildAtletaGLB.
 * Uso nas páginas (módulo): const MODELO_ATLETA = await carregarModeloAtleta(GLB_BASE64, GLTFLoader);
 */
function carregarModeloAtleta(b64, GLTFLoader) {
  const bin = atob(b64), buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Promise((ok, erro) => new GLTFLoader().parse(buf.buffer, '', g => ok(prepararModeloGLB(g)), erro));
}
