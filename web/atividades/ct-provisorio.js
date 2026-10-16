// Centro de treinamento PROVISÓRIO (galpão urbano), comum às páginas de treino até o cenário da
// sessão Cenários chegar. Script clássico: espera THREE e TAU no escopo.
// construirCTProvisorio(scene, { cor, livre }) → { atualizar(dt) }
//   cor: cor principal da atlética; livre(x, z) → false onde não pode ter objeto (a estação e vizinhança).
function construirCTProvisorio(scene, o = {}) {
  const cor = new THREE.Color(o.cor || '#1f7a4d');
  const livre = o.livre || ((x, z) => Math.hypot(x, z) > 11 && Math.hypot(x - 18, z) > 11);
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .85, flatShading: true, ...extra });
  const tex = (draw, w, h) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const g = new THREE.Group(); scene.add(g);
  const box = (w, h, d, m, x, y, z, ry = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.rotation.y = ry; b.castShadow = b.receiveShadow = true; g.add(b); return b; };

  // galpão: parede do fundo com janelas altas, paredes laterais e pilares (sem teto: a câmera vem de cima)
  const parede = mat(0xc9ccd1), pilar = mat(0x4d525c), vidro = mat(0x9fc6dc, { emissive: 0x6f9cb8, emissiveIntensity: .35, roughness: .3 });
  box(80, 9, .8, parede, 9, 4.5, -24);
  for (let i = 0; i < 9; i++) box(6.5, 2.4, .2, vidro, -26 + i * 8.8, 6.6, -23.5);
  box(.8, 9, 60, parede, -31, 4.5, 6); box(.8, 9, 60, parede, 49, 4.5, 6);
  for (let i = -3; i <= 5; i++) box(.8, 9, .8, pilar, i * 8.8 - 0.4, 4.5, -23.2);
  // faixa da atlética e placas na parede
  const faixa = tex((x, w, h) => {
    x.fillStyle = '#' + cor.getHexString(); x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(255,255,255,.92)'; x.font = '800 74px "Bricolage Grotesque", system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('CENTRO DE TREINAMENTO', w / 2, h / 2);
    x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(0, 8, w, 6); x.fillRect(0, h - 14, w, 6);
  }, 1024, 128);
  const fx = new THREE.Mesh(new THREE.PlaneGeometry(22, 2.75), new THREE.MeshStandardMaterial({ map: faixa, roughness: .9 }));
  fx.position.set(-4, 3.6, -23.55); g.add(fx);
  const relogioTex = tex((x, w, h) => { x.fillStyle = '#16181d'; x.fillRect(0, 0, w, h); x.fillStyle = '#ff4b3a'; x.font = '700 64px "JetBrains Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('00:30', w / 2, h / 2 + 4); }, 256, 96);
  const relogio = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.2), new THREE.MeshBasicMaterial({ map: relogioTex }));
  relogio.position.set(14, 4.4, -23.55); g.add(relogio);
  box(3.6, 1.6, .2, mat(0x2a2d35), 14, 4.4, -23.7);
  for (const [x, c] of [[24, 0xe9b84a], [30, 0xd9482b], [36, 0x3d4fa8]]) box(4.4, 1.2, .15, mat(c), x, 5.6, -23.5);

  // outras estações do CT ao fundo (só decoração): pista com raias, rack de pesos, colchões, barreiras
  const raia = mat(0xb8473a), linha = mat(0xf2f2f2);
  box(30, .05, 6, raia, -6, .03, -18.5);
  for (let i = 0; i < 4; i++) box(30, .06, .08, linha, -6, .04, -21.3 + i * 1.9);
  const barreira = mat(0xf4f1e8), barreiraP = mat(0x2a2d35);
  for (let i = 0; i < 5; i++) { const x = -18 + i * 5.5; box(1.6, .08, .08, barreira, x, .8, -17.5); box(.06, .8, .06, barreiraP, x - .75, .4, -17.5); box(.06, .8, .06, barreiraP, x + .75, .4, -17.5); }
  const rack = mat(0x2f333b), anilha = mat(0x1d1f24), anilhaC = mat(cor.getHex());
  box(5, .15, 1.2, rack, 28, 1.6, -21); box(.15, 1.6, 1.2, rack, 25.6, .8, -21); box(.15, 1.6, 1.2, rack, 30.4, .8, -21);
  for (let i = 0; i < 6; i++) { const d = new THREE.Mesh(new THREE.CylinderGeometry(.5 - i * .04, .5 - i * .04, .12, 18), i % 2 ? anilhaC : anilha); d.rotation.x = Math.PI / 2; d.position.set(26.2 + i * .7, 2.2, -21); d.castShadow = true; g.add(d); }
  for (let i = 0; i < 3; i++) box(3, .25, 2, mat([0x3d4fa8, 0x2f8a4a, 0xd9482b][i]), 34 + i * 3.4, .125, -16);

  // bancos, cones, garrafas, bolas e plantas espalhados (instâncias)
  const inst = (geo, m, n, place) => {
    const im = new THREE.InstancedMesh(geo, m, n), M = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(), e = new THREE.Euler();
    let k = 0;
    for (let tries = 0; k < n && tries < n * 30; tries++) {
      const r = place(); if (!r || !livre(r.x, r.z)) continue;
      p.set(r.x, r.y || 0, r.z); e.set(0, r.ry || 0, 0); q.setFromEuler(e); s.setScalar(r.s || 1);
      im.setMatrixAt(k, M.compose(p, q, s)); if (r.c) im.setColorAt(k, r.c); k++;
    }
    im.count = k; im.castShadow = true; im.receiveShadow = true; g.add(im); return im;
  };
  // bancos encostados nas paredes
  const bancoGeo = new THREE.BoxGeometry(3, .45, .7); bancoGeo.translate(0, .45, 0);
  inst(bancoGeo, mat(0x8a5e3c), 8, () => { const i = Math.floor(rnd() * 8); return i < 5 ? { x: -24 + i * 9, z: -22.6 } : { x: -29.8, z: -12 + (i - 5) * 9, ry: Math.PI / 2 }; });
  // pilhas de cones
  const coneGeo = new THREE.ConeGeometry(.22, .55, 10); coneGeo.translate(0, .27, 0);
  const cc = new THREE.Color();
  inst(coneGeo, mat(0xffffff), 40, () => ({ x: (rnd() - .5) * 70 + 9, z: -14 - rnd() * 8, ry: rnd() * TAU, c: cc.set(rnd() < .7 ? 0xf08a3c : 0xe9e04a).clone() }));
  // garrafas d'água em cima dos bancos
  const garrafaGeo = new THREE.CylinderGeometry(.09, .09, .32, 8); garrafaGeo.translate(0, .16, 0);
  inst(garrafaGeo, mat(0x6fc3e8, { roughness: .3 }), 14, () => { const i = Math.floor(rnd() * 5); return { x: -24 + i * 9 + (rnd() - .5) * 2.4, y: .9, z: -22.6 + (rnd() - .5) * .4 }; });
  // bolas medicinais e de espuma soltas
  const bolaGeo = new THREE.IcosahedronGeometry(.32, 1);
  inst(bolaGeo, mat(0xffffff), 18, () => ({ x: (rnd() - .5) * 60 + 9, y: .32, z: -10 - rnd() * 12, c: cc.set([0xd9482b, 0x3d4fa8, 0xe9b84a, 0x2f8a4a][Math.floor(rnd() * 4)]).clone() }));
  // plantas em vaso nos cantos
  const vasoGeo = new THREE.CylinderGeometry(.45, .35, .7, 8); vasoGeo.translate(0, .35, 0);
  const folhaGeo = new THREE.IcosahedronGeometry(.8, 0); folhaGeo.translate(0, 1.4, 0);
  const vasos = [[-29, -22], [47, -22], [-29, 18], [47, 18], [3, -22.5], [21, -22.5]];
  let vi = 0; const vaso = () => { const v = vasos[vi++ % vasos.length]; return { x: v[0], z: v[1] }; };
  inst(vasoGeo, mat(0x5c616b), vasos.length, vaso); vi = 0;
  inst(folhaGeo, mat(0x4f9a56), vasos.length, vaso);
  // em volta da estação (o que a câmera padrão enxerga): piso emborrachado, cones, carrinho de bolas,
  // bebedouro, tripé com câmera e banco com toalha
  const borr = new THREE.Mesh(new THREE.PlaneGeometry(24, 22), mat(0x707784, { roughness: 1 }));
  borr.rotation.x = -Math.PI / 2; borr.position.set(0, .01, -1); borr.receiveShadow = true; g.add(borr);
  const borda = mat(cor.getHex());
  box(24, .03, .25, borda, 0, .02, -12); box(24, .03, .25, borda, 0, .02, 10); box(.25, .03, 22, borda, -12, .02, -1); box(.25, .03, 22, borda, 12, .02, -1);
  inst(coneGeo, mat(0xffffff), 10, () => { const a = rnd() * TAU, r = 10 + rnd() * 1.5; return { x: Math.cos(a) * r, z: Math.sin(a) * r - 1, c: cc.set(0xf08a3c).clone() }; });
  const perto = (x, z) => livre(x, z);
  if (perto(-10.5, -6)) { // carrinho de bolas
    box(1.6, .1, 1, mat(0x9aa0aa, { metalness: .4 }), -10.5, .7, -6); box(1.6, .7, .06, mat(0x9aa0aa, { metalness: .4 }), -10.5, 1.05, -6.5); box(1.6, .7, .06, mat(0x9aa0aa, { metalness: .4 }), -10.5, 1.05, -5.5);
    inst(bolaGeo, mat(0xffffff), 9, () => ({ x: -11.1 + rnd() * 1.2, y: 1 + rnd() * .3, z: -6.3 + rnd() * .6, s: .7, c: cc.set([0xf08a3c, 0xe9e04a][Math.floor(rnd() * 2)]).clone() }));
  }
  if (perto(-10, 4)) { box(.7, 1.2, .7, mat(0xe8ecef), -10, .6, 4); const b = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .6, 12), mat(0x6fc3e8, { roughness: .2, transparent: true, opacity: .8 })); b.position.set(-10, 1.5, 4); g.add(b); }
  if (perto(10.5, -7)) { // tripé com câmera, filmando a estação
    for (const a of [0, 2.1, 4.2]) { const p = box(.05, 1.6, .05, poste0(), 10.5 + Math.cos(a) * .3, .75, -7 + Math.sin(a) * .3); p.rotation.set(Math.sin(a) * .2, 0, -Math.cos(a) * .2); }
    const cam = box(.5, .35, .3, mat(0x1d1f24), 10.5, 1.65, -7); cam.lookAt(0, 1.65, 0);
  }
  if (perto(-6, -11)) { box(3, .45, .7, mat(0x8a5e3c), -6, .45, -11); box(.9, .06, .6, mat(0xffffff), -6.6, .71, -11); box(.9, .06, .6, borda, -5.4, .71, -11); }
  function poste0() { return mat(0x2a2d35); }
  // refletores nos cantos (postes com luz)
  const poste = mat(0x2a2d35), lampada = new THREE.MeshBasicMaterial({ color: 0xfff6dc });
  for (const [x, z] of [[-27, -20], [45, -20], [-27, 14], [45, 14]]) {
    box(.25, 7, .25, poste, x, 3.5, z);
    const l = box(1.4, .4, .6, lampada, x + (x < 9 ? .6 : -.6), 7, z); l.castShadow = false;
  }
  return { raiz: g, atualizar() {} };
}
