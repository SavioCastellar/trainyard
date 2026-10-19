// Animação padrão do atleta a partir do `Corpo` de sim/src/movimento.ts (posição, velocidade, giro,
// acelerações). Aprovada no Laboratório de movimento (2026-10-18). Script clássico: espera THREE no escopo.
// Uso: const est = novoEstadoAnim(); a cada quadro: animarAtleta(rig, corpo, est, { dt, rdt, x, z, olhar, ... }).

/* inclinação escolhida pelo Savio no laboratório */
const ANIM_PADRAO = { curva: true, frente: true, postura: true, mola: true, kCurva: .3, kFrente: 1, kPostura: 1, limite: 35, resp: 10 };

function novoEstadoAnim() {
  return { lean: 0, pitch: 0, headY: 0, stepPh: 0, spring: { a: 0, v: 0, b: 0, w: 0 }, prevY: 0, prevVy: 0, blink: 2, comemora: 0 };
}

/**
 * rig: buildCabecudo(...); corpo: { x, z, vx, vz, h, w, aFrente, aLado, passada }; est: novoEstadoAnim()
 * o.dt: tempo de simulação do quadro (já multiplicado pela velocidade de reprodução); o.rdt: tempo real do quadro
 * o.x, o.z: posição a desenhar (interpolada entre passos, se houver); o.olhar: {x, z} para onde a cabeça vira (ou null)
 * o.parado: atleta travado (atordoado, caído) — balança e não anda; o.velMax: para a amplitude da passada
 * o.inc: ajustes de inclinação (padrão ANIM_PADRAO); o.expr: expressão de repouso; o.comemorar: true no quadro do acerto
 */
function animarAtleta(rig, c, est, o) {
  const I = o.inc || ANIM_PADRAO, dt = o.dt, rdt = o.rdt, b = rig.body, Lg = rig.legs, A = rig.arms;
  const x = o.x ?? c.x, z = o.z ?? c.z;
  rig.root.position.set(x, o.y ?? 0, z); rig.root.rotation.y = Math.PI / 2 - c.h;
  b.position.set(0, 0, 0); b.rotation.set(0, 0, 0);
  for (const l of Lg) l.rotation.set(0, 0, 0);
  for (const a of A) a.rotation.set(0, 0, 0);
  if (o.comemorar) est.comemora = .45;
  const sp = Math.hypot(c.vx, c.vz), k = Math.min(1, sp / (o.velMax || 5.5));
  if (o.parado) {
    // travado: balanço lento, braços caídos
    const t = performance.now() / 1000;
    b.rotation.z = Math.sin(t * 5) * .1; b.rotation.x = -.1; A[0].rotation.z = -.05; A[1].rotation.z = .05;
    est.lean = 0; est.pitch = 0; setExpr(rig.face, 'triste');
  } else {
    let ph = c.passada * 2.3, amp = .15 + .85 * k;
    // girando quase parado: passinhos no lugar
    if (sp < .8 && Math.abs(c.w) > .8) { est.stepPh += Math.abs(c.w) * dt * 2.6; ph = est.stepPh; amp = .35; }
    Lg[0].rotation.x = Math.sin(ph) * amp; Lg[1].rotation.x = Math.sin(ph + Math.PI) * amp;
    A[0].rotation.x = Math.sin(ph + Math.PI) * amp * .9; A[1].rotation.x = Math.sin(ph) * amp * .9;
    A[0].rotation.z = -.12 - .1 * k; A[1].rotation.z = .12 + .1 * k;
    b.position.y = Math.abs(Math.sin(ph)) * .07 * Math.max(k, amp > .3 && sp < .8 ? .4 : 0);
    const lim = I.limite * Math.PI / 180;
    const leanT = I.curva ? THREE.MathUtils.clamp(c.aLado * .035 * I.kCurva, -lim, lim) : 0;
    const pitchT = THREE.MathUtils.clamp((I.postura ? .18 * k * I.kPostura : 0) + (I.frente ? c.aFrente * .02 * I.kFrente : 0), -lim, lim);
    est.lean += (leanT - est.lean) * Math.min(1, rdt * I.resp);
    est.pitch += (pitchT - est.pitch) * Math.min(1, rdt * I.resp * .8);
    b.rotation.z = est.lean; b.rotation.x = est.pitch;
    if (est.comemora > 0) {
      est.comemora -= rdt; const up = Math.sin(Math.max(0, .45 - est.comemora) / .45 * Math.PI);
      A[0].rotation.z = -.12 - 1.1 * up; A[1].rotation.z = .12 + 1.1 * up; setExpr(rig.face, 'feliz');
    } else setExpr(rig.face, o.expr || rig.restExpr || 'neutro');
  }
  // cabeça antecipa: olha para o que importa; sem nada, para o lado do giro
  let look = 0;
  if (o.olhar) { let a = Math.atan2(o.olhar.z - z, o.olhar.x - x) - c.h; look = Math.atan2(Math.sin(a), Math.cos(a)); }
  else look = Math.sign(c.w) * Math.min(.6, Math.abs(c.w) * .2);
  look = THREE.MathUtils.clamp(look, -1.1, 1.1);
  est.headY += (-look - est.headY) * Math.min(1, rdt * 9);
  rig.headPivot.rotation.y = est.headY;
  // piscar e mola da cabeça
  est.blink -= rdt; let ey = 1; if (est.blink < 0) { ey = .1; if (est.blink < -.12) est.blink = 2 + Math.random() * 3; }
  for (const e of rig.face.eyes) e.scale.y = ey;
  const vy = (b.position.y - est.prevY) / Math.max(rdt, 1e-3), ay = (vy - est.prevVy) / Math.max(rdt, 1e-3);
  est.prevY = b.position.y; est.prevVy = vy;
  const s = est.spring, mola = I.mola;
  s.v += (-70 * s.a - 6 * s.v + (mola ? THREE.MathUtils.clamp(ay, -60, 60) * .01 - c.aFrente * .02 : 0)) * rdt;
  s.w += (-70 * s.b - 6 * s.w + (mola ? c.aLado * .03 : 0)) * rdt;
  s.a = THREE.MathUtils.clamp(s.a + s.v * rdt, -.4, .4); s.b = THREE.MathUtils.clamp(s.b + s.w * rdt, -.35, .35);
  rig.headPivot.rotation.x = s.a; rig.headPivot.rotation.z = s.b;
}
