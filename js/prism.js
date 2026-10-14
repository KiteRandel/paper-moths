// Neon Amara: the final boss. Every coloured Amara floats in, they spin in a wheel ("with our powers combined!")
// and fuse into one glowing white Amara with a neon rainbow outline. She plays a rally with you: she throws a ball,
// you jump at the right moment to knock it back, and it gets faster every return. Keep the rally going long enough
// (3, then 5, then 7 returns, with obstacles in the last stage) and she finally misses. Made by KiteRandel.
import * as THREE from 'three';
import { T } from './art.js?v=39';
import { makeSpikes, riseSpikes } from './chess.js?v=39';

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
      h.after(2.8, () => { if (h.isFight()) opener(); });
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
          if (P.locked && neonEl) { neonEl.style.setProperty('--heat', Math.min(1, (P.count + 1) / 7)); neonEl.classList.remove('kick'); void neonEl.offsetWidth; neonEl.classList.add('kick'); }
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
        } else {
          sfx.dodge();
          const list = COMBOS[P.stage][P.count];
          if (list) combo(list, throwBall);
          else h.after(0.22, throwBall);
        }
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
  // ---------------------------------------------------------------- borrowed attacks, in boss order
  const COMBOS = [
    [['twins', 'wrath'], ['wrath', 'split'], ['split', 'wrath']],                                            // stage 1: the Twin Lanterns and Wrath
    [['glitch', 'chess'], ['rook', 'glitch'], ['chess', 'rook'], ['glitch', 'chess'], ['rook', 'glitch']],  // stage 2: Lilac & Glitch, Ivory & Onyx
    [],
  ];
  function combo(list, then) {
    let i = 0;
    const next = () => {
      if (!h.isFight() || P.phase !== 'fused') return;
      if (i >= list.length) { then(); return; }
      const k = list[i++]; P.attack = { kind: k }; const dur = ATTACK[k]();
      h.after(i < list.length ? dur * 0.8 : dur, next);
    };
    next();
  }
  const opener = () => { const c = COMBOS[P.stage][0]; if (c) combo(c, throwBall); else throwBall(); };
  const fx = [];   // little self-updating effects: { update(dt) -> keep?, meshes }
  function addFx(o) { fx.push(o); return o; }
  function killFx(o) { for (const m of o.meshes) (m.parent || h.scene).remove(m); fx.splice(fx.indexOf(o), 1); }
  function flashAura(col) { P.neon.aura.material.color.set(col); P.auraHold = 1.2; }
  const ATTACK = {
    // the Twin Lanterns: a blue (keep running) or orange (slide) wave
    twins() {
      const c = Math.random() < 0.5 ? 'blue' : 'orange', hgt = c === 'blue' ? 3.1 : 2.2, y0 = c === 'blue' ? 0 : 0.95;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(7.4, hgt), new THREE.MeshBasicMaterial({ map: h.waveTex[c], transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }));
      m.layers.set(1); h.scene.add(m); flashAura(c === 'blue' ? '#5d8fe8' : '#f0913a'); sfx.wave(c === 'blue' ? 0 : 1);
      h.banner(c === 'blue' ? 'Blue wave!' : 'Orange wave!', c === 'blue' ? 'keep running, don\u2019t move' : 'slide!', 0.9);
      let t = 0; const T2 = 1.7;
      addFx({ meshes: [m], update(dt) {
        t += dt; const k = t / T2; m.position.set(0, y0 + hgt / 2, player.z - 16 * (1 - k));
        if (k >= 1) {
          const p = player, still = h.now() - h.lastAct() > 0.45 && p.grounded && p.slideT <= 0, ducked = p.slideT > 0 && p.y < 0.5;
          if (c === 'blue' ? still : ducked) sfx.dodge(); else h.hurt(c === 'blue' ? 'You moved in the blue wave!' : 'Slide under orange waves!');
          return false;
        }
        return true;
      } });
      return T2 + 0.45;
    },
    // the twins, split: blue over one or two lanes, orange over the rest
    split() {
      const blueLeft = Math.random() < 0.5, nBlue = Math.random() < 0.5 ? 1 : 2;
      const edge = blueLeft ? (nBlue === 1 ? -0.85 : 0.85) : (nBlue === 1 ? 0.85 : -0.85);
      const blueLanes = [0, 1, 2].filter((l) => (blueLeft ? LANES[l] < edge : LANES[l] > edge));
      const g = new THREE.Group();
      for (const c of ['blue', 'orange']) {
        const left = (c === 'blue') === blueLeft, x0 = left ? -3.7 : edge, x1 = left ? edge : 3.7, hgt = c === 'blue' ? 3.1 : 2.2, y0 = c === 'blue' ? 0 : 0.95;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, hgt), new THREE.MeshBasicMaterial({ map: h.waveTex[c], transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }));
        m.position.set((x0 + x1) / 2, y0 + hgt / 2, 0); m.layers.set(1); g.add(m);
      }
      const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 3.2), new THREE.MeshBasicMaterial({ color: '#fff6e8', transparent: true, depthWrite: false })); seam.position.set(edge, 1.6, 0.02); seam.layers.set(1); g.add(seam);
      h.scene.add(g); flashAura('#c97ab0'); sfx.wave(0); sfx.wave(1);
      h.banner('Split wave!', 'blue side: keep running \u00b7 orange side: slide', 1.0);
      let t = 0; const T2 = 1.8;
      addFx({ meshes: [g], update(dt) {
        t += dt; const k = t / T2; g.position.set(0, 0, player.z - 16 * (1 - k));
        if (k >= 1) {
          const p = player, lane = [0, 1, 2].reduce((a, l) => (Math.abs(p.x - LANES[l]) < Math.abs(p.x - LANES[a]) ? l : a), 0);
          const blue = blueLanes.includes(lane), still = h.now() - h.lastAct() > 0.45 && p.grounded && p.slideT <= 0, ducked = p.slideT > 0 && p.y < 0.5;
          if (blue ? still : ducked) sfx.dodge(); else h.hurt(blue ? 'You moved in the blue wave!' : 'Slide under orange waves!');
          return false;
        }
        return true;
      } });
      return T2 + 0.45;
    },
    // Ivory & Onyx: a rook slides straight down your lane
    rook() {
      const white = Math.random() < 0.5, lane = player.lane, z = player.z - (h.speed * 1.7 + 12);
      flashAura(white ? '#ffd98a' : '#6b5a86'); sfx.crackWarn(); h.banner('Rook!', 'it slides down your lane, switch!', 0.9);
      const mat = new THREE.MeshToonMaterial({ color: white ? '#efe6da' : '#3a3036' });
      const rk = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 1.9, 18), mat); body.position.y = 0.95; rk.add(body);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.5, 0.35, 18), mat); top.position.y = 2.05; rk.add(top);
      for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.25, 0.22), mat); const a = i * Math.PI / 2 + 0.78; b.position.set(Math.cos(a) * 0.4, 2.33, Math.sin(a) * 0.4); rk.add(b); }
      rk.position.set(LANES[lane], 7, z); rk.scale.setScalar(1.15); h.world.add(rk);
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1), new THREE.MeshBasicMaterial({ color: white ? '#fff1cf' : '#a88ad8', transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
      strip.rotation.x = -Math.PI / 2; strip.layers.set(1); h.scene.add(strip);
      let t = 0, rz = z, hurt = false;
      addFx({ meshes: [rk, strip], update(dt) {
        t += dt;
        if (t < 0.6) { rk.position.y = 7 - (t / 0.6) * 7; } else { rk.position.y = 0; rz += 5.5 * dt; }
        rk.position.z = rz;
        const len = Math.max(0.5, player.z - rz); strip.scale.y = len; strip.position.set(LANES[lane], 0.06, rz + len / 2); strip.material.opacity = t < 0.8 ? 0.7 : 0.25;
        if (!hurt && t > 0.6 && Math.abs(player.x - LANES[lane]) < 0.7 && Math.abs(player.z - rz) < 0.7 && player.y < 2.4) { hurt = true; h.hurt('Flattened by a rook!'); }
        return rz < player.z + 4;
      } });
      return 0.6 + (player.z - z) / (h.speed + 5.5) + 0.2;
    },
    // Wrath: red cracks flash, then she smashes craters (sometimes a pillar of fire)
    wrath() {
      const z = player.z - (h.speed * 1.35 + 5), n = Math.random() < 0.5 ? 1 : 2;
      const lanes = [0, 1, 2].sort(() => Math.random() - 0.5).slice(0, n), fire = Math.random() < 0.45 ? lanes[0] : -1;
      flashAura('#d8343c'); sfx.crackWarn(); h.banner('Wrath\u2019s slam!', fire >= 0 ? 'cracks and fire, switch lanes' : 'red cracks: stay out or jump', 0.9);
      const marks = lanes.map((l) => { const m = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.8, 24), new THREE.MeshBasicMaterial({ color: l === fire ? '#ff8a1a' : '#d8343c', transparent: true, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.set(LANES[l], 0.06, z); m.layers.set(1); h.scene.add(m); return m; });
      let t = 0;
      addFx({ meshes: marks, update(dt) {
        t += dt; for (const m of marks) m.material.opacity = 0.5 + Math.abs(Math.sin(t * 14)) * 0.5;
        if (t >= 1.0) { for (const l of lanes) h.makeHole(l, z, l === fire); sfx.slam(); h.fx(0.15, 0.45); return false; }
        return true;
      } });
      return 1.0 + (player.z - z) / h.speed * 0.8;
    },
    // Lilac & Glitch: she sings a little tune first, each note hovering over a lane (low = left, middle = centre,
    // high = right). Then Glitch strikes those same lanes, in the same order and rhythm.
    glitch() {
      flashAura('#9a5fe0'); h.banner('Lilac’s song', 'remember the notes: Glitch strikes those lanes', 1.1);
      const n = 3 + (P.count >= 3 ? 1 : 0), beat = 0.55, melody = [];
      for (let i = 0; i < n; i++) { let l = Math.floor(Math.random() * 3); if (i && l === melody[i - 1] && Math.random() < 0.6) l = (l + 1 + Math.floor(Math.random() * 2)) % 3; melody.push(l); }
      const notes = [];
      melody.forEach((lane, i) => h.after(0.3 + i * beat, () => {
        if (!h.isFight()) return;
        sfx.sing([72, 76, 79][lane], beat * 0.9);
        const s = h.noteSprite(1.8); h.scene.add(s);
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 9), new THREE.MeshBasicMaterial({ color: '#b98aff', transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
        stripe.rotation.x = -Math.PI / 2; stripe.layers.set(1); h.scene.add(stripe);
        const note = { s, lane, t: 0 }; notes.push(note);
        addFx({ meshes: [s, stripe], update(dt) {
          note.t += dt; const pop = Math.min(1, note.t * 6);
          s.position.set(LANES[lane], 2.5 + Math.sin(note.t * 4 + i) * 0.12, player.z - 8); s.scale.setScalar(0.4 + pop * 0.6);
          stripe.position.set(LANES[lane], 0.06, player.z - 6.5); stripe.material.opacity = 0.2 + Math.abs(Math.sin(note.t * 5)) * 0.2;
          return !note.done;
        } });
      }));
      const singEnd = 0.3 + n * beat + 0.8;
      h.after(singEnd - 0.3, () => { if (h.isFight()) { flashAura('#3fd45a'); sfx.glitchGo(); h.banner('Glitch!', 'dodge the lanes she sang', 0.8); } });
      melody.forEach((lane, i) => h.after(singEnd + i * beat * 1.1, () => {
        if (!h.isFight()) return;
        const note = notes.find((q) => q.lane === lane && !q.done); if (note) note.done = true;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 14), new THREE.MeshBasicMaterial({ color: '#7dff8a', transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
        m.rotation.x = -Math.PI / 2; m.layers.set(1); h.scene.add(m);
        sfx.strike(); h.fx(0.08, 0.25);
        if (Math.abs(player.x - LANES[lane]) < 0.85) h.hurt('Glitch caught you in her lane!');
        let t = 0;
        addFx({ meshes: [m], update(dt) { t += dt; m.position.set(LANES[lane] + (Math.random() - 0.5) * 0.1, 0.07, player.z - 6); m.material.opacity = Math.max(0, 1 - t / 0.4); return t < 0.4; } });
      }));
      return singEnd + n * beat * 1.1 + 0.4;
    },
    // Ivory & Onyx: a stretch of glowing chess squares; stand on the other colour
    chess() {
      const side = Math.random() < 0.5 ? 0 : 1, ROW = 8, z0 = player.z - (h.speed * 1.3 + 4), rows = 3;
      flashAura(side === 0 ? '#ffd98a' : '#6b5a86'); sfx.crackWarn();
      h.banner(side === 0 ? 'Ivory\u2019s move' : 'Onyx\u2019s move', side === 0 ? 'stand on the dark squares' : 'stand on the light squares', 0.9);
      const meshes = [], hot = [];
      for (let r = 0; r < rows; r++) for (let l = 0; l < 3; l++) {
        const isHot = (l + r) % 2 === side, col = isHot ? (side === 0 ? '#e8a92a' : '#4a2a6a') : (side === 0 ? '#3a3036' : '#efe6da');
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1.66, ROW - 0.1), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: isHot ? 0.85 : 0.55, depthWrite: false }));
        m.rotation.x = -Math.PI / 2; m.position.set(LANES[l], 0.05, z0 - (r + 0.5) * ROW); m.layers.set(1); h.scene.add(m); meshes.push(m);
        if (isHot) { const sp = makeSpikes(); sp.visible = true; sp.setSide(side); sp.position.set(LANES[l], 0.06, z0 - (r + 0.5) * ROW); h.scene.add(sp); meshes.push(sp); hot.push({ l, r, m, sp }); }
      }
      const hurtRows = new Set(); let t = 0;
      addFx({ meshes, update(dt) {
        t += dt; for (const q of hot) { q.m.material.opacity = 0.7 + Math.sin(t * 9) * 0.2; riseSpikes(q.sp, t * 3.5, t); }
        const p = player, into = z0 - p.z, r = Math.floor(into / ROW), within = into - r * ROW;
        if (r >= 0 && r < rows && !hurtRows.has(r) && p.grounded && p.y < 0.3 && within > 1.4 && within < ROW - 1.4) {
          const lane = [0, 1, 2].find((l) => Math.abs(p.x - LANES[l]) < 0.55);
          if (lane !== undefined && (lane + r) % 2 === side) { hurtRows.add(r); h.hurt(`Stepped on ${side === 0 ? 'Ivory' : 'Onyx'}\u2019s square!`); }
        }
        return p.z > z0 - rows * ROW - 3;
      } });
      return (player.z - (z0 - rows * ROW)) / h.speed + 0.2;
    },
  };
  // the last stage: she chains you to the middle lane
  const chains = new THREE.Group(); chains.visible = false;
  function chainUp() {
    if (!chains.parent) {
      for (const sx of [-0.85, 0.85]) for (let i = 0; i < 14; i++) {
        const link = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 6, 14), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        link.position.set(sx, 0.12, -i * 0.42); link.rotation.y = i % 2 ? Math.PI / 2 : 0; link.layers.set(1); chains.add(link);
      }
      const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 8, 32), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); cuff.rotation.x = Math.PI / 2; cuff.position.y = 0.15; cuff.layers.set(1); chains.add(cuff);
      h.scene.add(chains);
    }
    player.lane = 1; P.locked = true; chains.visible = true; neonFx(true);
    h.banner('Chained!', 'no more dodging: just hit it back 7 times', 2.0); sfx.snap(); h.fx(0.35, 0.3);
  }
  function unchain() { P.locked = false; chains.visible = false; neonFx(false); }
  const neonEl = document.getElementById('neonFx');
  function neonFx(on) { if (!neonEl) return; neonEl.classList.toggle('on', on); if (!on) neonEl.style.setProperty('--heat', 0); }
  function afterHitReset() { if (neonEl) neonEl.style.setProperty('--heat', 0); }
  function afterHit(hp) {
    P.stage = Math.min(2, P.stage + 1); P.count = 0;
    h.anim(P.neon, 'Hit', { once: true, after: 'Fly', fade: 0.1 });
    if (hp > 0) {
      h.after(1.8, () => { if (!h.isFight()) return; if (P.stage === 2) chainUp(); else h.banner('Stage 2', 'keep the rally going for 5', 1.8); setName(); });
      h.after(3.6, () => { if (h.isFight()) (P.stage === 2 ? throwBall : opener)(); });
    }
  }
  function defeated() {   // she splits back into all of them, and they drift away
    unchain(); for (const o of [...fx]) killFx(o);
    P.phase = 'split'; P.t = 0; P.ball = null; P.ballMesh.visible = false; P.ring.visible = false; P.shadow.visible = false; for (const s of P.trail) s.visible = false;
    P.neon.g.visible = false; for (const b of P.wheel) { b.g.visible = true; b.g.scale.setScalar(1.25); h.anim(b, 'Hug'); }
  }
  function clear() {
    unchain(); for (const o of [...fx]) killFx(o);
    P.on = false; P.phase = null; P.ball = null;
    if (P.g) P.g.visible = false;
    if (P.ballMesh) { P.ballMesh.visible = false; P.ring.visible = false; P.shadow.visible = false; for (const s of P.trail) s.visible = false; }
  }

  function update(dt, t, fighting) {
    if (!P.on) return;
    P.t += dt;
    for (const u of P.hulls) u.uTime.value = t;
    for (const b of bodies()) if (b.g.visible) { b.mixer.update(dt); b.aura.material.opacity = 0.45 + Math.sin(t * 3) * 0.1; }
    if (P.neon.g.visible) { if (!(P.auraHold > 0)) P.neon.aura.material.color.setHSL((t * 0.25) % 1, 1, 0.75); P.neon.aura.scale.set(3.2, 3.8, 1); P.neon.g.scale.lerp(new THREE.Vector3(1.7, 1.7, 1.7), Math.min(1, dt * 4)); }
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
    for (const o of [...fx]) if (!o.update(dt)) killFx(o);
    if (P.locked) { player.lane = 1; chains.position.set(player.x, 0, player.z); chains.children.forEach((c, i) => c.material.color.setHSL(((t * 0.5) + i * 0.03) % 1, 1, 0.65)); }
    if (P.auraHold > 0) P.auraHold -= dt;
  }
  return {
    init, begin, start, update, afterHit, defeated, clear,
    debugAttack(k) { return ATTACK[k](); },
    debugFinal(heat = 0.8) { P.stage = 2; P.count = 0; chainUp(); if (neonEl) neonEl.style.setProperty('--heat', heat); },
    get group() { return P.g; }, get locked() { return !!P.locked; },
    get state() { return P.on ? { attack: P.attack ? P.attack.kind : null, fxN: fx.length, locked: !!P.locked, phase: P.phase, stage: P.stage, count: P.count, need: NEED[P.stage], ball: P.ball ? { dir: P.ball.dir, left: +(P.ball.T - P.ball.t).toFixed(2), T: +P.ball.T.toFixed(2) } : null } : null; },
  };
}
