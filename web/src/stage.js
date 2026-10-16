// Estádio, atletas, partículas e animação dos atletas (Three.js).
// Espera no escopo: THREE, OrbitControls, $, CFG, W, H, GH, GD, IR, TEAM, LOOKS, reduceMotion, TAU.
/* =========================================================
   Cena
   ========================================================= */
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const HORIZON = 0xf4ddc2;
scene.fog = new THREE.Fog(HORIZON, 70, 180);
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 500);
camera.position.set(0, 14.5, 19.5);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = .08; controls.maxPolarAngle = 1.38; controls.minDistance = 7; controls.maxDistance = 100;
controls.enabled = false;

scene.add(new THREE.Mesh(new THREE.SphereGeometry(320, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color(0x86c3dc) }, mid: { value: new THREE.Color(HORIZON) }, bot: { value: new THREE.Color(0xe7a996) } },
  vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP;
    void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.55, h)) : mix(mid, bot, smoothstep(0.0, -0.6, h));
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
    }`,
})));
scene.add(new THREE.HemisphereLight(0xe3f2ff, 0xc9a77c, 1.15));
const sun = new THREE.DirectionalLight(0xfff0d6, 2.5);
sun.position.set(14, 40, 18); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 5, far: 110 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(sun);

let seedV = 4242;
const srand = () => { seedV = (seedV * 16807) % 2147483647; return (seedV - 1) / 2147483646; };
const noise3 = (x, y, z) => Math.sin(x * 0.7 + y * 1.3) * Math.cos(z * 0.9 - y * 0.5) + 0.5 * Math.sin(x * 1.9 - z * 1.7 + y * 0.8);
function makeRockBase(radius, height, seg, rings, cTop, cBot) {
  const geo = new THREE.ConeGeometry(radius, height, seg, rings); geo.rotateX(Math.PI);
  const pos = geo.attributes.position, colors = [], top = new THREE.Color(cTop), bot = new THREE.Color(cBot), tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (y < height / 2 - 0.01) { const n = noise3(x * .35, y * .35, z * .35), k = 1 + n * .12; x *= k; z *= k; y += n * height * .03; pos.setXYZ(i, x, y, z); }
    tmp.copy(bot).lerp(top, Math.pow(THREE.MathUtils.clamp((y + height / 2) / height, 0, 1), .8)); colors.push(tmp.r, tmp.g, tmp.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
}
function canvasTex(draw, w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const dotTex = canvasTex(x => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, '#fff'); g.addColorStop(.55, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }, 64, 64);

// ilha
const grassTop = new THREE.Mesh(new THREE.CylinderGeometry(IR + 1, IR + .5, 1.2, 80), new THREE.MeshStandardMaterial({ color: 0x9fcf7f, roughness: 1 }));
grassTop.position.y = -.6; grassTop.receiveShadow = true; scene.add(grassTop);
const island = makeRockBase(IR + .5, 16, 30, 6, 0xc39266, 0x7c6a93); island.position.y = -1.2 - 8; scene.add(island);

// gramado com linhas
const PW = 2 * W, PH = 2 * H;
const pitchTex = canvasTex((x, w, h) => {
  const sx = w / PW, stripes = 10;
  for (let i = 0; i < stripes; i++) { x.fillStyle = i % 2 ? '#7fbf5f' : '#8ccb69'; x.fillRect(i * w / stripes, 0, w / stripes + 1, h); }
  x.strokeStyle = 'rgba(255,255,255,.92)'; x.lineWidth = .12 * sx;
  const L = v => v * sx, cx = w / 2, cy = h / 2;
  x.strokeRect(L(.15), L(.15), w - L(.3), h - L(.3));
  x.beginPath(); x.moveTo(cx, L(.15)); x.lineTo(cx, h - L(.15)); x.stroke();
  x.beginPath(); x.arc(cx, cy, L(3), 0, TAU); x.stroke();
  x.fillStyle = 'rgba(255,255,255,.92)'; x.beginPath(); x.arc(cx, cy, L(.22), 0, TAU); x.fill();
  for (const s of [0, 1]) {
    const bx = s ? w - L(.15) - L(4.5) : L(.15);
    x.strokeRect(bx, cy - L(6), L(4.5), L(12));
    const gx = s ? w - L(.15) - L(1.8) : L(.15);
    x.strokeRect(gx, cy - L(3.8), L(1.8), L(7.6));
    x.beginPath(); x.arc(s ? w - L(3.4) : L(3.4), cy, L(.2), 0, TAU); x.fill();
  }
}, 1500, 900);
const pitch = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshStandardMaterial({ map: pitchTex, roughness: 1 }));
pitch.rotation.x = -Math.PI / 2; pitch.position.y = .01; pitch.receiveShadow = true; scene.add(pitch);

// muretas
{
  const mat = new THREE.MeshStandardMaterial({ color: 0xf1e6cf, roughness: .8, flatShading: true });
  const capMat = new THREE.MeshStandardMaterial({ color: 0xd8c7a6, roughness: .8 });
  const add = (w, d, x, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, .55, d), mat); m.position.set(x, .27, z); m.castShadow = true; m.receiveShadow = true; scene.add(m);
    const c = new THREE.Mesh(new THREE.BoxGeometry(w + .05, .08, d + .05), capMat); c.position.set(x, .58, z); scene.add(c);
  };
  add(PW + .8, .4, 0, H + .2); add(PW + .8, .4, 0, -H - .2);
  const seg = H - GH;
  for (const s of [-1, 1]) { add(.4, seg, s * (W + .2), GH + seg / 2); add(.4, seg, s * (W + .2), -GH - seg / 2); }
  // bandeirinhas
  const poleGeo = new THREE.CylinderGeometry(.04, .04, 1.3, 6), poleMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const p = new THREE.Mesh(poleGeo, poleMat); p.position.set(sx * (W - .2), .65, sz * (H - .2)); scene.add(p);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(.45, .3), new THREE.MeshStandardMaterial({ color: sx < 0 ? TEAM[0].col : TEAM[1].col, side: THREE.DoubleSide }));
    f.position.set(sx * (W - .2) + .22, 1.15, sz * (H - .2)); scene.add(f);
  }
}
// gols
function makeGoal(side) {
  const g = new THREE.Group(), s = side, postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .4 });
  const post = new THREE.CylinderGeometry(.1, .1, 1.9, 10);
  for (const z of [-GH, GH]) { const p = new THREE.Mesh(post, postMat); p.position.set(0, .95, z); p.castShadow = true; g.add(p); }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, 2 * GH + .2, 10), postMat); bar.rotation.x = Math.PI / 2; bar.position.set(0, 1.9, 0); bar.castShadow = true; g.add(bar);
  const net = [], d = GD * s, hgt = 1.9;
  const push = (a, b) => net.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  for (let i = 0; i <= 10; i++) { const z = -GH + i * (2 * GH) / 10; push([0, hgt, z], [d, hgt * .55, z]); push([d, hgt * .55, z], [d, 0, z]); }
  for (let j = 0; j <= 5; j++) { const t = j / 5; push([d * t, hgt - (hgt * .45) * t, -GH], [d * t, hgt - (hgt * .45) * t, GH]); }
  for (let j = 0; j <= 5; j++) { const y = hgt * .55 * j / 5; push([d, y, -GH], [d, y, GH]); }
  for (const z of [-GH, GH]) for (let j = 0; j <= 5; j++) { const y = hgt * j / 5; const xd = y > hgt * .55 ? d * (hgt - y) / (hgt * .45) : d; push([0, y, z], [xd, y, z]); }
  const ng = new THREE.BufferGeometry(); ng.setAttribute('position', new THREE.Float32BufferAttribute(net, 3));
  const lines = new THREE.LineSegments(ng, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .65 })); g.add(lines);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(GD, 2 * GH), new THREE.MeshStandardMaterial({ color: 0x76b457, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(d / 2, .012, 0); floor.receiveShadow = true; g.add(floor);
  g.position.x = s * W; scene.add(g);
  return { g, lines };
}
const goals = [makeGoal(-1), makeGoal(1)];

// arquibancadas e torcida
const fans = [];
{
  const stepMat = new THREE.MeshStandardMaterial({ color: 0xe7d8bb, roughness: .9, flatShading: true });
  const stepMat2 = new THREE.MeshStandardMaterial({ color: 0xd9c6a1, roughness: .9, flatShading: true });
  const fanGeo = new THREE.SphereGeometry(.32, 14, 10), eyeGeo = new THREE.SphereGeometry(.06, 6, 5), eyeMat = new THREE.MeshBasicMaterial({ color: 0x241a38 });
  for (const sz of [-1, 1]) {
    for (let r = 0; r < 3; r++) {
      const w = 22 - r * 2.2, z = sz * (H + 1.6 + r * 1.05), y = .25 + r * .45;
      const st = new THREE.Mesh(new THREE.BoxGeometry(w, .5 + r * .9, 1.05), r % 2 ? stepMat2 : stepMat);
      st.position.set(0, (.5 + r * .9) / 2, z); st.castShadow = true; st.receiveShadow = true; scene.add(st);
      const n = Math.floor(w / 1.25);
      for (let i = 0; i < n; i++) {
        if (srand() < .15) continue;
        const x = -w / 2 + .6 + i * (w - 1.2) / (n - 1) + (srand() - .5) * .3;
        const team = x < 0 ? 0 : 1;
        const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(TEAM[team].col).offsetHSL((srand() - .5) * .04, -.1 + srand() * .15, (srand() - .3) * .15), roughness: .6 });
        const g = new THREE.Group(), b = new THREE.Mesh(fanGeo, mat); b.castShadow = true; g.add(b);
        for (const s of [-1, 1]) { const e = new THREE.Mesh(eyeGeo, eyeMat); e.position.set(s * .1, .06, -sz * .28); g.add(e); }
        const baseY = .5 + r * .9 + .3;
        g.position.set(x, baseY, z); scene.add(g);
        fans.push({ g, b, team, baseY, ph: srand() * TAU, jump: 0 });
      }
    }
  }
  // árvores nas pontas
  const trunkGeo = new THREE.CylinderGeometry(.22, .34, 1.7, 7), trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a5e3c, roughness: 1, flatShading: true });
  const leafGeo = new THREE.IcosahedronGeometry(1.5, 0), leafMats = [0x6aa84f, 0x7fb95a, 0x5c9a4a].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: .9, flatShading: true }));
  for (const [x, z, s] of [[-20, -6, 1], [-20, 5, .8], [20, 6, 1], [20, -5, .85], [-18.5, 0, .7], [18.5, 0, .7], [-12, 16, .9], [13, -16, .9], [12, 16, .75], [-13, -16, .8]]) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s);
    const t = new THREE.Mesh(trunkGeo, trunkMat); t.position.y = .85; t.castShadow = true; g.add(t);
    const l = new THREE.Mesh(leafGeo, leafMats[(srand() * 3) | 0]); l.position.y = 2.6; l.castShadow = true; g.add(l);
    scene.add(g);
  }
}
// nuvens
const drifters = [];
{
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, emissive: 0xfff4ea, emissiveIntensity: .35 });
  const puff = new THREE.IcosahedronGeometry(1, 1);
  for (let i = 0; i < 11; i++) {
    const g = new THREE.Group(), n = 4 + ((srand() * 3) | 0);
    for (let j = 0; j < n; j++) { const m = new THREE.Mesh(puff, cloudMat), s = 2 + srand() * 2.5; m.scale.set(s * 1.3, s * .8, s); m.position.set((j - n / 2) * 2.6 + srand(), srand() * 1.2, srand() * 2); g.add(m); }
    const a = srand() * TAU, d = 58 + srand() * 45; g.position.set(Math.cos(a) * d, -20 + srand() * 34, Math.sin(a) * d);
    scene.add(g); drifters.push({ g, a, d, y: g.position.y, sp: .004 + srand() * .006 });
  }
}

// bola
const ballMesh = (() => {
  const geo = new THREE.IcosahedronGeometry(CFG.br, 1);
  const n = geo.attributes.position.count, cols = new Float32Array(n * 3);
  for (let f = 0; f < n / 3; f++) {
    const dark = [0, 5, 10, 15, 22, 27, 33, 38, 44, 51, 57, 63, 68, 74].includes(f);
    for (let v = 0; v < 3; v++) { const c = dark ? .12 : .97; cols[(f * 3 + v) * 3] = c; cols[(f * 3 + v) * 3 + 1] = c; cols[(f * 3 + v) * 3 + 2] = dark ? .18 : .95; }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .45, flatShading: true }));
  m.castShadow = true; scene.add(m); return m;
})();

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


// jogadores
const pViews = [];
const PSCALE = .9;
function nameTex(look, team) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
  const label = `${look.nick} ${look.num}`;
  x.font = '800 30px "Bricolage Grotesque", system-ui, sans-serif';
  const w = Math.min(248, x.measureText(label).width + 28);
  x.fillStyle = team.css; x.beginPath(); x.roundRect((256 - w) / 2, 12, w, 40, 20); x.fill();
  x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, 128, 33);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function buildPlayers() {
  for (const v of pViews) { scene.remove(v.rig.root); scene.remove(v.tag); }
  pViews.length = 0;
  for (let i = 0; i < 4; i++) {
    const team = TEAM[i < 2 ? 0 : 1], look = LOOKS[i];
    const p = { ...look, team: { p: team.p, s: team.s }, gear: { tenis: true, munhequeira: i === 1, faixa: i === 3, medalha: false, lesionado: false } };
    const rig = buildCabecudo(p);
    rig.root.scale.setScalar(PSCALE); scene.add(rig.root);
    setExpr(rig.face, look.expr);
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: nameTex(look, team), transparent: true, depthTest: false }));
    tag.scale.set(1.9, .48, 1); tag.renderOrder = 10; scene.add(tag);
    pViews.push({ rig, tag, look, kick: 0, mood: 0, moodExpr: look.expr, blink: 1 + Math.random() * 3 });
  }
}
buildPlayers();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildPlayers);

function animPlayer(v, p, time, dt, celebrating) {
  const rig = v.rig, b = rig.body, L = rig.legs, A = rig.arms;
  b.position.set(0, 0, 0); b.rotation.set(0, 0, 0);
  for (const l of L) l.rotation.set(0, 0, 0);
  for (const a of A) a.rotation.set(0, 0, 0);
  rig.head.rotation.set(0, 0, 0);
  const sp = Math.min(1, Math.abs(p.v) / CFG.speed), dir = p.v >= 0 ? 1 : -1;
  let sway = 0, drive = 0;
  if (celebrating > 0) {
    const jp = (time * 1.6 + p.i * .3) % 1, up = Math.sin(jp * Math.PI);
    b.position.y = up * .5;
    A[0].rotation.z = -(2.6 + Math.sin(time * 14) * .25); A[1].rotation.z = 2.6 + Math.sin(time * 14 + 1) * .25;
    L[0].rotation.x = -up * .5; L[1].rotation.x = up * .3;
    drive = up * 2;
  } else {
    const ph = p.phase * 1.3;
    const amp = .25 + .8 * sp;
    L[0].rotation.x = Math.sin(ph) * amp * dir; L[1].rotation.x = Math.sin(ph + Math.PI) * amp * dir;
    A[0].rotation.x = Math.sin(ph + Math.PI) * amp * .9; A[1].rotation.x = Math.sin(ph) * amp * .9;
    A[0].rotation.z = -.12; A[1].rotation.z = .12;
    b.position.y = Math.abs(Math.sin(ph)) * .08 * sp;
    b.rotation.x = .18 * sp * dir;
    sway = Math.cos(ph) * .6 * sp;
    if (sp < .08) { const br = Math.sin(time * 2.2 + p.i); b.position.y = br * .008; A[0].rotation.z = -.08 + br * .03; A[1].rotation.z = .08 - br * .03; rig.head.rotation.y = Math.sin(time * .7 + p.i) * .3; }
  }
  if (v.kick > 0) {
    v.kick -= dt; const k = 1 - v.kick / .3;
    const swing = k < .35 ? (k / .35) * .9 : .9 - (k - .35) / .65 * 2.4;
    L[1].rotation.x = swing; A[0].rotation.x = -swing * .6; A[1].rotation.z = .6;
    b.rotation.x = -.1; drive += 1;
  }
  // rosto
  if (v.mood > 0) v.mood -= dt;
  const expr = v.mood > 0 ? v.moodExpr : (p.kickT > 0 ? 'bravo' : v.look.expr);
  setExpr(rig.face, expr);
  v.blink -= dt; let ey = 1; if (v.blink < 0) { ey = .1; if (v.blink < -.12) v.blink = 2 + Math.random() * 4; }
  for (const e of rig.face.eyes) e.scale.y = ey;
  // balanço da cabeça
  const vy = (b.position.y - rig.prevY) / Math.max(dt, 1e-3), ay = (vy - rig.prevVy) / Math.max(dt, 1e-3);
  rig.prevY = b.position.y; rig.prevVy = vy;
  const s = rig.spring;
  s.vx += (-70 * s.ax - 5 * s.vx + THREE.MathUtils.clamp(ay, -60, 60) * .012 + drive * .2) * dt;
  s.vz += (-70 * s.az - 5 * s.vz + sway * 2.2) * dt;
  s.ax = THREE.MathUtils.clamp(s.ax + s.vx * dt, -.5, .5); s.az = THREE.MathUtils.clamp(s.az + s.vz * dt, -.4, .4);
  rig.headPivot.rotation.x = s.ax; rig.headPivot.rotation.z = s.az;
}

// partículas
const PMAX = 600, pPos = new Float32Array(PMAX * 3), pCol = new Float32Array(PMAX * 3), parts = [];
for (let i = 0; i < PMAX; i++) { parts.push({ life: 0, vx: 0, vy: 0, vz: 0, g: 9 }); pPos[i * 3 + 1] = -999; }
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
const points = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: .3, map: dotTex, vertexColors: true, transparent: true, depthWrite: false }));
points.frustumCulled = false; scene.add(points);
let pNext = 0; const tc = new THREE.Color();
function burst(x, y, z, color, n, spd, up = 3, grav = 9, life = .8) {
  tc.set(color);
  for (let i = 0; i < n; i++) {
    const k = pNext = (pNext + 1) % PMAX, p = parts[k], a = Math.random() * TAU, s = spd * (.4 + Math.random() * .8);
    p.life = life * (.7 + Math.random() * .6); p.vx = Math.cos(a) * s; p.vz = Math.sin(a) * s; p.vy = up * (.6 + Math.random() * .8); p.g = grav;
    pPos[k * 3] = x; pPos[k * 3 + 1] = y; pPos[k * 3 + 2] = z; pCol[k * 3] = tc.r; pCol[k * 3 + 1] = tc.g; pCol[k * 3 + 2] = tc.b;
  }
}
function updateParticles(dt) {
  for (let i = 0; i < PMAX; i++) {
    const p = parts[i]; if (p.life <= 0) continue;
    p.life -= dt; p.vy -= p.g * dt;
    pPos[i * 3] += p.vx * dt; pPos[i * 3 + 1] += p.vy * dt; pPos[i * 3 + 2] += p.vz * dt;
    if (p.life <= 0 || pPos[i * 3 + 1] < 0) { p.life = 0; pPos[i * 3 + 1] = -999; }
  }
  pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
}

