// Construção procedural do Cabeçudo (rosto, cabelo, uniforme, acessórios). Espera THREE e TAU no escopo.
/* ---------------- utilidades ---------------- */
const mats = new Map();
function M(color, o = {}) {
  const k = color + JSON.stringify(o);
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: .6, ...o }));
  return mats.get(k);
}
function add(parent, geo, mat, pos, rot, scale) {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.set(...pos); if (rot) m.rotation.set(...rot); if (scale) m.scale.set(...scale);
  m.castShadow = true; parent.add(m); return m;
}
const lum = hex => { const c = new THREE.Color(hex); return .2126 * c.r + .7152 * c.g + .0722 * c.b; };
const darker = (hex, k) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();
function jerseyTex(p) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512; const x = c.getContext('2d');
  x.fillStyle = p.team.p; x.fillRect(0, 0, 512, 512);
  x.fillStyle = p.team.s; x.fillRect(0, 0, 512, 22); x.fillRect(0, 490, 512, 22);
  const ink = lum(p.team.p) > .45 ? '#1f1b2a' : '#ffffff';
  x.fillStyle = ink; x.textAlign = 'center'; x.textBaseline = 'middle';
  const nick = (p.nick || '').toUpperCase().slice(0, 10);
  let fs = 74; x.font = `800 ${fs}px "Bricolage Grotesque", system-ui, sans-serif`;
  while (x.measureText(nick).width > 440 && fs > 30) { fs -= 4; x.font = `800 ${fs}px "Bricolage Grotesque", system-ui, sans-serif`; }
  x.fillText(nick, 256, 120);
  x.font = `800 230px "Bricolage Grotesque", system-ui, sans-serif`;
  x.lineWidth = 10; x.strokeStyle = p.team.s; x.strokeText(String(p.num), 256, 320);
  x.fillText(String(p.num), 256, 320);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function backDecal(parent, radius, height, y, tex, arc = 1.6) {
  const geo = new THREE.CylinderGeometry(radius, radius, height, 24, 1, true, Math.PI - arc / 2, arc);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: .7, transparent: false }));
  m.position.y = y; parent.add(m); return m;
}

/* ---------------- rosto, cabelo e acessórios ---------------- */
function buildFace(head, o, p) {
  // o: { r, eyeX, eyeY, eyeR, z (superfície), browY, mouthY, noseZ?, big }
  const f = { eyes: [], brows: [], mouths: {} };
  const white = M('#ffffff', { roughness: .25 }), pupil = M('#1b1724', { roughness: .2 }), dark = M('#2a1e22', { roughness: .8 });
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * o.eyeX, o.eyeY, o.z);
    add(e, new THREE.SphereGeometry(o.eyeR, 18, 14), white, [0, 0, 0], null, [1, 1.15, .55]);
    add(e, new THREE.SphereGeometry(o.eyeR * .5, 14, 10), pupil, [s * -o.eyeR * .08, -o.eyeR * .05, o.eyeR * .42]);
    head.add(e); f.eyes.push(e);
    const b = add(head, new THREE.BoxGeometry(o.eyeR * 1.7, o.eyeR * .32, o.eyeR * .4), M(darker(p.hairColor, .9)), [s * o.eyeX, o.browY, o.z + .01]);
    b.userData.side = s; f.brows.push(b);
  }
  if (o.nose) add(head, new THREE.SphereGeometry(o.nose, 14, 10), M(darker(p.skin, .92)), [0, o.eyeY - o.eyeR * 1.1, o.z + o.nose * .6], null, [1, .9, 1]);
  const mw = o.mouthW;
  const smile = new THREE.TorusGeometry(mw, mw * .2, 8, 20, Math.PI);
  f.mouths.confiante = add(head, smile, dark, [mw * .25, o.mouthY, o.z + .01], [0, 0, Math.PI + .3], [1, .75, 1]);
  f.mouths.neutro = add(head, new THREE.BoxGeometry(mw * 1.4, mw * .28, mw * .3), dark, [0, o.mouthY, o.z]);
  f.mouths.bravo = add(head, smile, dark, [0, o.mouthY - mw * .3, o.z + .01], [0, 0, 0], [1, .6, 1]);
  f.mouths.feliz = add(head, new THREE.SphereGeometry(mw * .9, 16, 10, 0, TAU, Math.PI / 2, Math.PI / 2), M('#5a1f2c', { roughness: .8 }), [0, o.mouthY + mw * .4, o.z - .02], [Math.PI * 0.08, 0, 0], [1.2, 1.1, .5]);
  f.mouths.triste = add(head, smile, dark, [0, o.mouthY - mw * .5, o.z + .01], [0, 0, 0], [.8, .5, 1]);
  return f;
}
function setExpr(f, e) {
  for (const k in f.mouths) f.mouths[k].visible = k === e;
  for (const b of f.brows) {
    const s = b.userData.side;
    b.rotation.z = e === 'bravo' ? s * -.35 : e === 'triste' ? s * .35 : e === 'feliz' ? s * .12 : e === 'confiante' ? (s > 0 ? -.18 : .05) : 0;
  }
}
function buildHair(head, style, r, color, c = [0, 0, 0], teamS) {
  const hm = M(color, { roughness: .85 });
  const g = new THREE.Group(); g.position.set(...c); head.add(g);
  if (style === 'curto') {
    add(g, new THREE.SphereGeometry(r * 1.04, 32, 16, 0, TAU, 0, Math.PI * .36), hm, [0, 0, -r * .04]);
    add(g, new THREE.SphereGeometry(r * 1.035, 24, 12, Math.PI * .1, Math.PI * .8, Math.PI * .3, Math.PI * .22), hm, [0, 0, -r * .03], [0, Math.PI, 0]);
  } else if (style === 'afro') {
    const afro = add(g, new THREE.IcosahedronGeometry(r * 1.18, 2), M(color, { roughness: .95, flatShading: true }), [0, r * .42, -r * .34]);
    afro.scale.set(1.05, .9, .95);
  } else if (style === 'moicano') {
    for (let i = 0; i < 6; i++) {
      const a = -0.35 + i * .32;
      add(g, new THREE.ConeGeometry(r * .13, r * .55, 5), hm, [0, Math.cos(a) * r * 1.08, Math.sin(a) * r * 1.08], [a, 0, 0]);
    }
  } else if (style === 'coque') {
    add(g, new THREE.SphereGeometry(r * 1.04, 32, 16, 0, TAU, 0, Math.PI * .42), hm, [0, 0, -r * .03]);
    add(g, new THREE.SphereGeometry(r * .32, 16, 12), hm, [0, r * .95, -r * .45]);
  } else if (style === 'bone') {
    const cap = M(teamS, { roughness: .6 });
    add(g, new THREE.SphereGeometry(r * 1.06, 32, 16, 0, TAU, 0, Math.PI * .4), cap);
    add(g, new THREE.CylinderGeometry(r * .7, r * .7, r * .05, 24, 1, false, -Math.PI / 2, Math.PI), cap, [0, r * .62, r * .55], [0.12, 0, 0], [1, 1, .9]);
    add(g, new THREE.SphereGeometry(r * .08, 8, 6), cap, [0, r * 1.06, 0]);
  }
  return g;
}
function buildGlasses(head, kind, o) {
  if (kind === 'nenhum') return;
  const frame = M('#1d1a22', { roughness: .4 });
  if (kind === 'redondo') {
    for (const s of [-1, 1]) add(head, new THREE.TorusGeometry(o.eyeR * 1.25, o.eyeR * .14, 8, 24), frame, [s * o.eyeX, o.eyeY, o.z + o.eyeR * .45]);
    add(head, new THREE.BoxGeometry(o.eyeX * .7, o.eyeR * .14, o.eyeR * .14), frame, [0, o.eyeY + o.eyeR * .2, o.z + o.eyeR * .45]);
  } else {
    const lens = M('#15121c', { roughness: .15, metalness: .3 });
    for (const s of [-1, 1]) add(head, new THREE.SphereGeometry(o.eyeR * 1.3, 18, 12), lens, [s * o.eyeX, o.eyeY, o.z + o.eyeR * .4], null, [1.2, .85, .3]);
    add(head, new THREE.BoxGeometry(o.eyeX * 2.6, o.eyeR * .2, o.eyeR * .2), frame, [0, o.eyeY + o.eyeR * .7, o.z + o.eyeR * .4]);
  }
}
function buildBeard(head, kind, o, color, rHead, center = [0, 0, 0]) {
  if (kind === 'nenhuma') return;
  const hm = M(color, { roughness: .9 });
  if (kind === 'bigode') {
    for (const s of [-1, 1]) add(head, new THREE.CapsuleGeometry(o.mouthW * .22, o.mouthW * .7, 4, 8), hm, [s * o.mouthW * .5, o.mouthY + o.mouthW * .55, o.z + .02], [0, 0, Math.PI / 2 + s * .25]);
  } else {
    const b = add(head, new THREE.SphereGeometry(rHead * 1.02, 28, 14, Math.PI * .12, Math.PI * .76, Math.PI * .56, Math.PI * .3), M(color, { roughness: .95, flatShading: true }), center);
  }
}

/* ---------------- personagens ---------------- */
function newRig(kind) {
  return {
    kind, root: new THREE.Group(), tumble: new THREE.Group(), body: new THREE.Group(), legs: [], arms: [], headPivot: null, face: null,
    spring: { ax: 0, vx: 0, az: 0, vz: 0 }, prevY: 0, prevVy: 0, blink: 1 + Math.random() * 2, handR: null, headTop: new THREE.Object3D(),
  };
}
function buildCabecudo(p) {
  const rig = newRig('A'), wf = 1 + p.forca * .55, af = 1 + p.forca * .7, legLen = .4 + p.vel * .14, slim = 1 - p.vel * .12;
  rig.root.add(rig.tumble); rig.tumble.add(rig.body);
  const skin = M(p.skin), prim = M(p.team.p, { roughness: .55 }), sec = M(p.team.s, { roughness: .55 }), shorts = M(darker(p.team.p, .55), { roughness: .7 });
  const hipY = legLen + .1;
  for (const s of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(s * .12 * wf, hipY, 0); rig.body.add(leg); rig.legs.push(leg);
    add(leg, new THREE.CapsuleGeometry(.07 * (1 + p.forca * .35), legLen - .12, 4, 10), skin, [0, -legLen / 2, 0]);
    add(leg, new THREE.CylinderGeometry(.06, .06, .08, 10), M('#ffffff'), [0, -legLen + .12, 0]);
    shoe(leg, p, [0, -legLen + .02, .05], .11);
  }
  add(rig.body, new THREE.CylinderGeometry(.2 * wf * slim, .22 * wf * slim, .2, 20), shorts, [0, hipY + .02, 0]);
  const torsoY = hipY + .26;
  add(rig.body, new THREE.CapsuleGeometry(.21 * wf * slim, .2, 6, 20), prim, [0, torsoY, 0], null, [1, 1, .82]);
  add(rig.body, new THREE.TorusGeometry(.12, .025, 6, 20, Math.PI), sec, [0, torsoY + .22, .1 * wf], [0, 0, Math.PI]);
  backDecal(rig.body, .215 * wf * slim * .9, .3, torsoY + .02, jerseyTex(p), 2.1);
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(s * (.21 * wf * slim + .06), torsoY + .17, 0); rig.body.add(arm); rig.arms.push(arm);
    add(arm, new THREE.CylinderGeometry(.08 * af, .075 * af, .12, 12), prim, [0, -.04, 0]);
    add(arm, new THREE.CapsuleGeometry(.055 * af, .24, 4, 10), skin, [0, -.18, 0]);
    const hand = add(arm, new THREE.SphereGeometry(.07 * (1 + p.forca * .3), 12, 10), skin, [0, -.36, 0]);
    if (p.gear.munhequeira) add(arm, new THREE.CylinderGeometry(.068 * af, .068 * af, .07, 12), sec, [0, -.29, 0]);
    if (s > 0) rig.handR = hand;
  }
  if (p.gear.medalha) medal(rig.body, [0, torsoY + .06, .18 * wf * slim], .9);
  add(rig.body, new THREE.CylinderGeometry(.07, .08, .12, 12), skin, [0, torsoY + .3, 0]);
  const pivot = new THREE.Group(); pivot.position.y = torsoY + .32; rig.body.add(pivot); rig.headPivot = pivot;
  const head = new THREE.Group(); head.position.y = .55; pivot.add(head); rig.head = head;
  const R = .58;
  add(head, new THREE.SphereGeometry(R, 40, 28), skin, null, null, [1, 1.04, .96]);
  for (const s of [-1, 1]) add(head, new THREE.SphereGeometry(.11, 12, 10), skin, [s * R * .98, 0, 0], null, [.6, 1, 1]);
  const o = { eyeX: .2, eyeY: .08, eyeR: .12, z: R * .9, browY: .27, mouthY: -.22, mouthW: .1, nose: .085 };
  rig.face = buildFace(head, o, p);
  buildGlasses(head, p.glasses, o);
  buildBeard(head, p.beard, o, p.hairColor, R);
  buildHair(head, p.hair, R, p.hairColor, [0, 0, 0], p.team.s).scale.set(1, 1.04, .96);
  if (p.gear.faixa) add(head, new THREE.TorusGeometry(R * 1.0, .04, 8, 40), sec, [0, R * .38, 0], [Math.PI / 2 + .08, 0, 0], [1, .96, 1]);
  if (p.gear.lesionado) injury(rig, head, [R * .55, R * .45, R * .55], R);
  head.add(rig.headTop); rig.headTop.position.y = R + .25;
  rig.lieLift = .58; rig.restExpr = p.expr;
  return rig;
}
function buildFeijao(p) {
  const rig = newRig('D'), r = .46 * (1 + p.forca * .28), h = .62 * (1 + p.vel * .3) / (1 + p.forca * .1), legLen = .16 + p.vel * .06;
  rig.root.add(rig.tumble); rig.tumble.add(rig.body);
  const skin = M(p.skin), prim = M(p.team.p, { roughness: .5 }), sec = M(p.team.s, { roughness: .5 }), shorts = M(darker(p.team.p, .55), { roughness: .7 });
  const base = legLen;
  for (const s of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(s * r * .4, base + .06, 0); rig.body.add(leg); rig.legs.push(leg);
    add(leg, new THREE.CapsuleGeometry(.085, legLen - .04, 4, 10), shorts, [0, -legLen / 2 + .02, 0]);
    shoe(leg, p, [0, -legLen - .02, .05], .12);
  }
  const upper = new THREE.Group(); upper.position.y = base; rig.body.add(upper); rig.headPivot = upper;
  const cy = r + h / 2;
  add(upper, new THREE.CapsuleGeometry(r, h, 10, 32), prim, [0, cy, 0]);
  add(upper, new THREE.SphereGeometry(r * 1.012, 32, 12, 0, TAU, Math.PI / 2, Math.PI / 2), shorts, [0, r, 0]);
  add(upper, new THREE.CylinderGeometry(r * 1.012, r * 1.012, .14, 32, 1, true), shorts, [0, r + .07, 0]);
  add(upper, new THREE.CylinderGeometry(r * 1.014, r * 1.014, .07, 32, 1, true), sec, [0, r + h * .52, 0]);
  const fy = r + h * .82;
  const faceH = .44;
  add(upper, new THREE.CylinderGeometry(r * 1.015, r * 1.015, faceH, 32, 1, true, -.72, 1.44), skin, [0, fy, 0]);
  backDecal(upper, r * 1.02, Math.min(.5, h * .62), r + h * .42, jerseyTex(p), 2.0);
  const head = new THREE.Group(); upper.add(head); rig.head = head;
  const z = r * 1.02;
  const o = { eyeX: .13, eyeY: fy + .05, eyeR: .1, z, browY: fy + .18, mouthY: fy - .11, mouthW: .08, nose: 0 };
  rig.face = buildFace(head, o, p);
  buildGlasses(head, p.glasses, o);
  if (p.beard === 'bigode') buildBeard(head, 'bigode', o, p.hairColor, r);
  else if (p.beard === 'barba') add(head, new THREE.CylinderGeometry(r * 1.03, r * 1.03, .09, 32, 1, true, -.6, 1.2), M(p.hairColor, { roughness: .95 }), [0, fy - .21, 0]);
  buildHair(head, p.hair, r, p.hairColor, [0, r + h, 0], p.team.s);
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(s * (r + .02), r + h * .4, 0); upper.add(arm); rig.arms.push(arm);
    add(arm, new THREE.CapsuleGeometry(.07 * (1 + p.forca * .5), .18, 4, 10), prim, [0, -.12, 0]);
    const hand = add(arm, new THREE.SphereGeometry(.08 * (1 + p.forca * .3), 12, 10), skin, [0, -.27, 0]);
    if (p.gear.munhequeira) add(arm, new THREE.CylinderGeometry(.08 * (1 + p.forca * .5), .08 * (1 + p.forca * .5), .07, 12), sec, [0, -.2, 0]);
    if (s > 0) rig.handR = hand;
  }
  if (p.gear.medalha) medal(upper, [0, r + h * .3, r * .98], 1);
  if (p.gear.faixa) add(upper, new THREE.TorusGeometry(r * 1.0, .04, 8, 40), sec, [0, r + h + r * .32, 0], [Math.PI / 2, 0, 0], [.95, .95, 1]);
  if (p.gear.lesionado) injury(rig, head, [r * .55, fy + .16, r * .86], r);
  upper.add(rig.headTop); rig.headTop.position.y = r * 2 + h + .2;
  rig.lieLift = r; rig.restExpr = p.expr;
  return rig;
}
function shoe(leg, p, pos, s) {
  const fancy = p.gear.tenis;
  const g = new THREE.Group(); g.position.set(...pos); leg.add(g);
  add(g, new THREE.SphereGeometry(s, 16, 10), M(fancy ? '#fbfbf8' : '#7b7680', { roughness: .5 }), [0, 0, 0], null, [.85, .62, 1.45]);
  add(g, new THREE.BoxGeometry(s * 1.5, s * .28, s * 2.7), M(fancy ? p.team.s : '#4b4650', { roughness: .6 }), [0, -s * .42, 0]);
  if (fancy) add(g, new THREE.BoxGeometry(s * .25, s * .5, s * 1.4), M(p.team.p), [s * .8, s * .05, 0], [0, 0, .3]);
}
function medal(parent, pos, k) {
  const g = new THREE.Group(); g.position.set(...pos); parent.add(g);
  const rib = M('#2f6fd6', { roughness: .7 });
  add(g, new THREE.BoxGeometry(.04 * k, .2 * k, .01), rib, [-.05 * k, .1 * k, 0], [0, 0, -.45]);
  add(g, new THREE.BoxGeometry(.04 * k, .2 * k, .01), rib, [.05 * k, .1 * k, 0], [0, 0, .45]);
  add(g, new THREE.CylinderGeometry(.075 * k, .075 * k, .025, 20), M('#e9b43a', { metalness: .7, roughness: .3 }), [0, -.03 * k, .02], [Math.PI / 2, 0, 0]);
}
function injury(rig, head, pos, R) {
  const tape = M('#f2d7b6', { roughness: .8 });
  const g = new THREE.Group(); g.position.set(...pos); g.lookAt(pos[0] * 3, pos[1] + .1, pos[2] * 3); head.add(g);
  add(g, new THREE.BoxGeometry(.24, .07, .02), tape, null, [0, 0, .7]);
  add(g, new THREE.BoxGeometry(.24, .07, .02), tape, null, [0, 0, -.7]);
  const arm = rig.arms[0];
  add(arm, new THREE.CylinderGeometry(.1, .1, .22, 14), M('#f7f7f5', { roughness: .9 }), [0, -.27, 0]);
  rig.sling = true;
}

