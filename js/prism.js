// Neon Amara: the final boss. Every coloured Amara floats in, they spin in a wheel ("with our powers combined!")
// and fuse into one glowing white Amara with a neon rainbow outline. She plays a rally with you: she throws a ball,
// you jump at the right moment to knock it back, and it gets faster every return. Keep the rally going long enough
// (3, then 5, then 7 returns, with obstacles in the last stage) and she finally misses. Made by KiteRandel.
import * as THREE from 'three';
import { T } from './art.js?v=33';

const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const WHEEL = [   // [body tint, glow]
  ['#a9c3ff', '#5d8fe8'], ['#ffc790', '#f0913a'], ['#ff9a92', '#d8343c'], ['#fff0a0', '#ffcf33'], ['#d9c2ff', '#9a5fe0'],
  ['#c4ffbd', '#3fd45a'], ['#fff4e2', '#fff1cf'], ['#4b4148', '#6b5a86'], ['#ffc2dc', '#ff7fb6'],
];
const NEED = [3, 5, 7];          // returns needed in each stage before she misses
const FLIGHT = [1.55, 1.4, 1.3]; // first throw of each stage (seconds), then 14% faster every return

// a rainbow outline that hugs the skinned body: the same mesh, pushed out along its normals, drawn back-faces only
function rainbowHull(src, thick) {
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const uni = { uThick: { value: thick }, uTime: { value: 0 } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uni);
    sh.vertexShader = 'uniform float uThick;\n' + sh.vertexShader.replace('#include <skinning_vertex>', '#include <skinning_vertex>\n  transformed += normalize(objectNormal) * uThick;');
    sh.fragmentShader = 'uniform float uTime;\nvec3 hue2rgb(float h){ return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }\n' +
      sh.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( hue2rgb(fract(gl_FragCoord.y / 260.0 + gl_FragCoord.x / 900.0 - uTime * 0.35)) * 1.35, 1.0 );');
  };
  const hull = new THREE.SkinnedMesh(src.geometry, mat);
  hull.bind(src.skeleton, src.bindMatrix); hull.frustumCulled = false; hull.layers.set(1);
  return { hull, uni };
}

export function createPrism(h) {
  // h: { scene, world, player, LANES, sfx, hurt, fx, after, banner, hitBoss, isFight, anim, name, get speed(), addObstacle }
  const { world, player, LANES, sfx } = h;
  const P = { on: false, phase: null, t: 0, stage: 0, count: 0, ball: null, wheel: [], neon: null, hulls: [], aura: null, g: null };

  function init(gltf, tinted, scene) {
    const g = new THREE.Group(); g.visible = false; scene.add(g); P.g = g;
    for (const [tint, glow] of WHEEL) { const b = tinted(gltf, tint, glow); scene.remove(b.g); g.add(b.g); b.g.visible = true; b.g.scale.setScalar(1.25); b.g.rotation.y = Math.PI; P.wheel.push(b); }
    const n = tinted(gltf, '#ffffff', '#ffffff'); scene.remove(n.g); g.add(n.g); n.g.visible = false; n.g.rotation.y = Math.PI; n.g.scale.setScalar(1.7);
    n.root.traverse((o) => { if (o.isSkinnedMesh) { const r = rainbowHull(o, 0.03); o.parent.add(r.hull); P.hulls.push(r.uni); } });
    n.aura.material.color.set('#ffffff'); P.neon = n;
    // the ball
    const ball = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 14), new THREE.MeshBasicMaterial({ color: '#ff5d8f' })); ball.add(core);
    const ink = new THREE.Mesh(new THREE.SphereGeometry(0.44, 20, 14), new THREE.MeshBasicMaterial({ color: '#2a1c1a', side: THREE.BackSide })); ball.add(ink);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' })); shine.position.set(-0.13, 0.14, 0.24); ball.add(shine);
    P.ballCore = core;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: '#ffffff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); glow.scale.setScalar(2.2); ball.add(glow);
    ball.traverse((o) => o.layers.set(1)); ball.visible = false; scene.add(ball);
    P.ballMesh = ball; P.ballGlow = glow;
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), new THREE.MeshBasicMaterial({ color: '#2a1c1a', transparent: true, opacity: 0.35, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.layers.set(1); shadow.visible = false; scene.add(shadow); P.shadow = shadow;
    P.trail = []; for (let i = 0; i < 10; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.layers.set(1); s.visible = false; scene.add(s); P.trail.push(s); }
    // the timing ring around Amara's feet: jump when it closes
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.56, 40), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    ring.rotation.x = -Math.PI / 2; ring.layers.set(1); ring.visible = false; scene.add(ring); P.ring = ring;
  }
  const bodies = () => [...P.wheel, P.neon];

  // ---------------------------------------------------------------- the fusion
  function begin() {
    Object.assign(P, { on: true, phase: 'gather', t: 0, stage: 0, count: 0, ball: null, spin: 0 });
    P.g.visible = true; P.neon.g.visible = false;
    P.wheel.forEach((b, i) => { b.g.visible = true; b.g.scale.setScalar(1.25); b.g.position.set((i - 4) * 0.9, 0, 0); h.anim(b, 'Fly'); });
  }
  function start() {   // fight begins: the wheel spins, they fuse
    P.phase = 'wheel'; P.t = 0;
    h.banner('With our powers combined!', '', 2.6); sfx.chord([60, 64, 67, 72, 76]);
    h.after(2.0, () => sfx.chord([62, 66, 69, 74, 78]));
    h.after(3.6, () => sfx.chord([64, 68, 71, 76, 80, 83]));
    h.after(5.0, () => {
      if (!h.isFight()) return;
      P.phase = 'fused'; for (const b of P.wheel) b.g.visible = false;
      P.neon.g.visible = true; P.neon.g.scale.setScalar(0.2); h.anim(P.neon, 'Fly');
      h.fx(0.9, 0.6); sfx.bossIntro();
      h.banner('Neon Amara', 'jump when the ring closes to knock her ball back', 2.6);
      h.after(2.8, () => { if (h.isFight()) throwBall(); });
    });
  }

  // ---------------------------------------------------------------- the rally
  const handPos = () => P.neon.g.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0.4, 1.6, 0.4));
  const me = () => new THREE.Vector3(player.x, 0, player.z);   // the ball flies in Amara's running frame, so it really travels
  function throwBall() {
    if (!h.isFight() || P.phase !== 'fused') return;
    const T2 = FLIGHT[P.stage] * Math.pow(0.86, P.count);
    P.ball = { dir: 'in', t: 0, T: T2, from: handPos().sub(me()), hue: Math.random() };
    h.anim(P.neon, 'Cast', { once: true, after: 'Fly', fade: 0.08 }); if (P.neon.acts.Cast) P.neon.acts.Cast.timeScale = 1.6;
    P.ballMesh.visible = true; P.ring.visible = true; sfx.throw();
    // last stage: the roof isn't empty any more
    if (P.stage === 2 && Math.random() < 0.75) {
      const z = player.z - (h.speed * (T2 + 0.9) + 6), lane = Math.floor(Math.random() * 3);
      h.addObstacle(Math.random() < 0.55 ? 'crate' : 'chimney', lane, z);
    }
    setName();
  }
  function setName() { h.name(`Neon Amara · rally ${P.count}/${NEED[P.stage]}`); }
  function updateBall(dt) {
    const B = P.ball; if (!B) return;
    const p = player; B.t += dt; const k = Math.min(1, B.t / B.T);
    const pos = new THREE.Vector3();
    if (B.dir === 'in') {
      const to = new THREE.Vector3(0, 1.55, -0.35);
      pos.lerpVectors(B.from, to, k).add(me()); pos.y += Math.sin(k * Math.PI) * 1.4;
      // ring: closes at the moment to jump (about 0.35 s before the ball arrives)
      const left = B.T - B.t, s = Math.max(0, (left - 0.33) / Math.max(0.2, B.T - 0.33));
      P.ring.position.set(p.x, 0.05, p.z); P.ring.scale.setScalar(0.9 + s * 3.2);
      P.ring.material.color.set(s < 0.05 ? '#ffd84a' : '#ffffff'); P.ring.material.opacity = 0.5 + (1 - s) * 0.5;
      if (k >= 1) {
        if (p.alive && p.y > 1.0) {             // knocked it back!
          P.count++; B.dir = 'out'; B.t = 0; B.T = Math.max(0.42, 0.75 * Math.pow(0.9, P.count)); B.from = pos.clone().sub(me());
          sfx.bossHit(); h.fx(0.18, 0.15); P.ring.visible = false; setName();
        } else {                                // it hit her
          P.ball = null; P.ballMesh.visible = false; P.ring.visible = false; P.shadow.visible = false; P.count = 0;
          h.hurt('Neon Amara’s ball got you!');
          if (p.alive) { h.banner('Rally broken!', 'back to zero', 1.2); setName(); h.after(1.4, () => { if (h.isFight()) throwBall(); }); }
          return;
        }
      }
    } else {
      const to = handPos().sub(me());
      pos.lerpVectors(B.from, to, k).add(me()); pos.y += Math.sin(k * Math.PI) * 1.0;
      if (k >= 1) {
        P.ball = null;
        if (P.count >= NEED[P.stage]) {         // too fast for her: it smacks her instead
          P.ballMesh.visible = false; P.shadow.visible = false;
          h.banner('She missed!', P.stage < 2 ? 'the rally starts again, longer and faster' : '', 1.6);
          h.hitBoss();
        } else { sfx.dodge(); h.after(0.22, throwBall); }
        if (P.ball === null && P.count < NEED[P.stage]) P.ballMesh.visible = true;
      }
    }
    P.ballMesh.position.copy(pos);
    // rainbow trail
    B.hue = (B.hue + dt * 1.5) % 1;
    for (let i = P.trail.length - 1; i > 0; i--) { P.trail[i].position.copy(P.trail[i - 1].position); P.trail[i].material.color.copy(P.trail[i - 1].material.color); }
    P.trail[0].position.copy(pos); P.trail[0].material.color.setHSL(B.hue, 1, 0.6);
    P.trail.forEach((s, i) => { s.visible = true; s.scale.setScalar(1.0 - i * 0.08); s.material.opacity = 0.7 - i * 0.06; });
    P.ballGlow.material.color.setHSL(B.hue, 1, 0.6); P.ballCore.material.color.setHSL(B.hue, 0.95, 0.55);
    P.shadow.visible = true; P.shadow.position.set(pos.x, 0.04, pos.z); P.shadow.scale.setScalar(Math.max(0.4, 1.4 - pos.y * 0.2));
  }
  function afterHit(hp) {
    P.stage = Math.min(2, P.stage + 1); P.count = 0;
    h.anim(P.neon, 'Hit', { once: true, after: 'Fly', fade: 0.1 });
    if (hp > 0) {
      h.after(1.8, () => { if (!h.isFight()) return; h.banner(P.stage === 1 ? 'Stage 2' : 'Final stage', P.stage === 1 ? 'keep the rally going for 5' : '7 in a row · and watch the roof', 1.8); setName(); });
      h.after(3.6, () => { if (h.isFight()) throwBall(); });
    }
  }
  function defeated() {   // she splits back into all of them, and they drift away
    P.phase = 'split'; P.t = 0; P.ball = null; P.ballMesh.visible = false; P.ring.visible = false; P.shadow.visible = false; for (const s of P.trail) s.visible = false;
    P.neon.g.visible = false; for (const b of P.wheel) { b.g.visible = true; b.g.scale.setScalar(1.25); h.anim(b, 'Hug'); }
  }
  function clear() {
    P.on = false; P.phase = null; P.ball = null;
    if (P.g) P.g.visible = false;
    if (P.ballMesh) { P.ballMesh.visible = false; P.ring.visible = false; P.shadow.visible = false; for (const s of P.trail) s.visible = false; }
  }

  function update(dt, t, fighting) {
    if (!P.on) return;
    P.t += dt;
    for (const u of P.hulls) u.uTime.value = t;
    for (const b of bodies()) if (b.g.visible) { b.mixer.update(dt); b.aura.material.opacity = 0.45 + Math.sin(t * 3) * 0.1; }
    if (P.neon.g.visible) { P.neon.aura.material.color.setHSL((t * 0.25) % 1, 1, 0.75); P.neon.aura.scale.set(3.2, 3.8, 1); P.neon.g.scale.lerp(new THREE.Vector3(1.7, 1.7, 1.7), Math.min(1, dt * 4)); }
    if (P.phase === 'gather') {            // all of them, side by side
      P.wheel.forEach((b, i) => b.g.position.lerp(new THREE.Vector3((i - 4) * 0.9, Math.sin(t * 2 + i) * 0.15, 0), Math.min(1, dt * 3)));
    } else if (P.phase === 'wheel') {      // round and round, faster and tighter, until they fuse
      const k = Math.min(1, P.t / 5), r = k < 0.6 ? 2.4 : 2.4 * (1 - (k - 0.6) / 0.4);
      P.spin += dt * (1.2 + k * k * 9);
      P.wheel.forEach((b, i) => { const a = P.spin + (i / P.wheel.length) * Math.PI * 2; b.g.position.lerp(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r + 0.6, 0), Math.min(1, dt * 6)); b.g.scale.setScalar(1.25 * (k < 0.8 ? 1 : 1 - (k - 0.8) * 3)); b.aura.material.opacity = 0.5 + k * 0.5; });
    } else if (P.phase === 'split') {      // and apart again
      const k = Math.min(1, P.t / 2.2);
      P.wheel.forEach((b, i) => { const a = (i / P.wheel.length) * Math.PI * 2; b.g.position.set(Math.cos(a) * k * 5, Math.sin(a) * k * 3.5 + 0.8, -k * 3); b.g.rotation.z += dt * 2; });
    }
    if (fighting) updateBall(dt);
  }
  return {
    init, begin, start, update, afterHit, defeated, clear,
    get group() { return P.g; },
    get state() { return P.on ? { phase: P.phase, stage: P.stage, count: P.count, need: NEED[P.stage], ball: P.ball ? { dir: P.ball.dir, left: +(P.ball.T - P.ball.t).toFixed(2), T: +P.ball.T.toFixed(2) } : null } : null; },
  };
}
