// Neon Amara: the final boss. Every coloured Amara floats in, they spin in a wheel ("with our powers combined!")
// and fuse into one glowing white Amara with a neon rainbow outline. She plays a rally with you: she throws a ball,
// you jump at the right moment to knock it back, and it gets faster every return. Keep the rally going long enough
// (3, then 5, then 7 returns, with obstacles in the last stage) and she finally misses. Made by KiteRandel.
import * as THREE from 'three';
import { T } from './art.js?v=46';
import { makeSpikes, riseSpikes, makePiece } from './chess.js?v=46';

const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const WHEEL = [   // [body tint, glow]
  ['#a9c3ff', '#5d8fe8'], ['#ffc790', '#f0913a'], ['#ff9a92', '#d8343c'], ['#fff0a0', '#ffcf33'], ['#d9c2ff', '#9a5fe0'],
  ['#c4ffbd', '#3fd45a'], ['#fff4e2', '#fff1cf'], ['#4b4148', '#6b5a86'], ['#ffc2dc', '#ff7fb6'],
];
const NEED = [3, 5, 7];          // returns needed in each stage before she misses
const FLIGHT = [1.55, 1.4, 1.3]; // first throw of each stage (seconds), then 14% faster every return

// a rainbow outline that hugs the skinned body: the same mesh, pushed out along its normals, drawn back-faces only
export function rainbowHull(src, thick) {
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
    const T2 = flightTime();
    P.ball = { dir: 'in', t: 0, T: T2, from: handPos().sub(me()), hue: Math.random() };
    h.anim(P.neon, 'Cast', { once: true, after: 'Fly', fade: 0.08 }); if (P.neon.acts.Cast) P.neon.acts.Cast.timeScale = 1.6;
    P.ballMesh.visible = true; P.ring.visible = true; sfx.throw();
    setName();
  }
  function flightTime() { return FLIGHT[P.stage] * Math.pow(0.86, P.count); }
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
      // forgiving hit window: it counts from 0.2 s before arrival, and the ball hangs above you for 0.35 s after
      const late = B.t - B.T;
      if (late > 0) pos.y -= Math.min(late, 0.35) * 1.2;
      if (left < 0.2 && p.alive && p.y > 0.8) B.hitNow = true;
      if (B.hitNow || late > 0.35) {
        if (B.hitNow) {                         // knocked it back!
          if (P.locked && neonEl) { neonEl.style.setProperty('--heat', Math.min(1, (P.count + 1) / 7)); neonEl.classList.remove('kick'); void neonEl.offsetWidth; neonEl.classList.add('kick'); }
          P.count++; B.dir = 'out'; B.t = 0; B.T = Math.max(0.42, 0.75 * Math.pow(0.9, P.count)); B.from = pos.clone().sub(me());
          sfx.bossHit(); h.fx(0.18, 0.15); P.ring.visible = false; setName();
        } else {                                // it hit her
          P.ball = null; P.ballMesh.visible = false; P.ring.visible = false; P.shadow.visible = false; P.count = 0;
          h.hurt('Neon Amara’s ball got you!');
          if (p.alive) { h.banner('Rally broken!', 'back to zero', 1.2); setName(); h.after(1.6, () => { if (h.isFight()) (P.stage === 2 ? finaleStep : opener)(); }); }
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
          const wait = Math.max(0.25, (P.busyUntil || 0) - h.now() - 0.3);    // let the last attack finish first
          if (P.stage === 2) h.after(0.15, finaleStep);
          else if (list) h.after(wait, () => combo(list, throwBall));
          else h.after(wait, throwBall);
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
    [['twins', 'wrath'], ['firewave', 'split'], ['split', 'twins', 'firewave']],                                             // stage 1: the Twin Lanterns and Wrath
    [['glitch', 'chess'], ['burnsong', 'tidal'], ['knightsong', 'rook'], ['tidal', 'wrath', 'burnsong'], ['rook', 'knightsong']],  // stage 2: Lilac & Glitch, Ivory & Onyx
    [],
  ];
  // each attack says when the ball should arrive mid-attack ({ dur, ball }): the last one in a combo is thrown
  // so it lands right then, so you're dodging and timing the jump at the same time (often one jump does both)
  function combo(list, then) {
    let i = 0;
    const next = () => {
      if (!h.isFight() || P.phase !== 'fused') return;
      const k = list[i++]; P.attack = { kind: k }; const r = ATTACK[k]();
      const dur = typeof r === 'number' ? r : r.dur, ball = typeof r === 'number' ? r : r.ball;
      if (i < list.length) { h.after(dur * 0.8, next); return; }
      P.busyUntil = h.now() + dur;
      h.after(Math.max(0, ball - flightTime()), then);
    };
    next();
  }
  // the chained finale: each throw comes with one of them echoing her own attack down your lane, timed to the ball
  const FINALE = ['blue', 'crater', 'orange', 'knight', 'blue', 'crater', 'orange'];
  function finaleStep() {
    if (!h.isFight() || P.phase !== 'fused') return;
    const k = FINALE[P.count % FINALE.length], T2 = flightTime();
    const lead = k === 'crater' ? 1.6 : k === 'knight' ? 0.95 : 2.15;    // hazard start → when the ball should arrive
    const A = Math.max(T2 + 0.05, lead);
    P.attack = { kind: 'finale-' + k };
    h.after(A - lead, () => {
      if (!h.isFight()) return;
      if (k === 'blue' || k === 'orange') { echo(k === 'blue' ? 0 : 1, k === 'blue' ? 'Hold still, then swing!' : 'Duck, then swing!'); wave(k === 'blue' ? [0, 1, 2] : [], 1.5); }
      else if (k === 'crater') { echo(2, 'Jump it AND hit it!'); cracks([1], player.z - h.speed * 1.6, [], 1.0); }
      else { const w = Math.random() < 0.5; echo(w ? 6 : 7, w ? 'Hop the knight, darling.' : 'Over the knight!'); knightDrop(1, w); }
    });
    h.after(A - T2, throwBall);
  }
  const opener = () => { const c = COMBOS[P.stage][0]; if (c) combo(c, throwBall); else finaleStep(); };
  const fx = [];   // little self-updating effects: { update(dt) -> keep?, meshes }
  function addFx(o) { fx.push(o); return o; }
  function killFx(o) { for (const m of o.meshes) (m.parent || h.scene).remove(m); fx.splice(fx.indexOf(o), 1); }
  function flashAura(col) { P.neon.aura.material.color.set(col); P.auraHold = 1.2; }
  // ---------------------------------------------------------------- who's talking: the fused bosses keep piping up
  const VOICE = { blue: ['Blue', '#3a63b8'], orange: ['Orange', '#c4651a'], wrath: ['Wrath', '#b52a2a'], joy: ['Joy', '#b88400'], lilac: ['Lilac', '#7a3fc0'], glitch: ['Glitch', '#2f9a3f'], ivory: ['Ivory', '#9a7a2a'], onyx: ['Onyx', '#4a3a5a'], pink: ['Pink', '#c94f86'] };
  const voiceEl = document.getElementById('voice');
  let voiceT = null;
  function say(who, text, secs = 1.4) {
    if (!voiceEl) return; const [name, col] = VOICE[who];
    voiceEl.querySelector('b').textContent = name; voiceEl.querySelector('b').style.color = col; voiceEl.querySelector('span').textContent = text;
    voiceEl.classList.remove('on'); void voiceEl.offsetWidth; voiceEl.classList.add('on');
    clearTimeout(voiceT); voiceT = setTimeout(() => voiceEl.classList.remove('on'), secs * 1000);
  }
  const BICKER = [
    [['wrath', 'That was YOUR fault!'], ['joy', 'Was not~!']],
    [['onyx', 'You moved too slow!'], ['ivory', 'I was being *polite*.']],
    [['glitch', 'Zzt—blame Lilac—zzt'], ['lilac', 'You were off-key. Again.']],
    [['blue', 'You let go of my hand!'], ['orange', 'You let go of MINE!']],
    [['joy', 'Can we still be fused after this?'], ['wrath', 'NO.']],
    [['ivory', 'This is not how chess works.'], ['glitch', 'zzzt—is now—']],
  ];
  function bicker() {
    const pair = BICKER[Math.floor(Math.random() * BICKER.length)];
    say(pair[0][0], pair[0][1], 1.5); h.after(1.6, () => say(pair[1][0], pair[1][1], 1.5));
    P.glitchT = 0.7;      // the fusion flickers for a moment
  }

  // ---------------------------------------------------------------- the building blocks
  const ring = (lane, z, col) => { const m = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.8, 24), new THREE.MeshBasicMaterial({ color: col, transparent: true, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.set(LANES[lane], 0.06, z); m.layers.set(1); h.scene.add(m); return m; };
  const laneOf = () => [0, 1, 2].reduce((a, l) => (Math.abs(player.x - LANES[l]) < Math.abs(player.x - LANES[a]) ? l : a), 0);
  // a wave rolling down the roof at you. blueLanes: which lanes are blue (the rest orange). onPass runs as it reaches you.
  function wave(blueLanes, T2, onPass) {
    const g = new THREE.Group();
    const all = blueLanes.length === 3 || blueLanes.length === 0;
    const parts = all ? [[blueLanes.length ? 'blue' : 'orange', -3.7, 3.7]] : (() => {
      const blueLeft = blueLanes.includes(0), edge = blueLeft ? (blueLanes.length === 1 ? -0.85 : 0.85) : (blueLanes.length === 1 ? 0.85 : -0.85);
      return blueLeft ? [['blue', -3.7, edge], ['orange', edge, 3.7]] : [['orange', -3.7, edge], ['blue', edge, 3.7]];
    })();
    for (const [c, x0, x1] of parts) {
      const hgt = c === 'blue' ? 3.1 : 2.2, y0 = c === 'blue' ? 0 : 0.95;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, hgt), new THREE.MeshBasicMaterial({ map: h.waveTex[c], transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }));
      m.position.set((x0 + x1) / 2, y0 + hgt / 2, 0); m.layers.set(1); g.add(m);
    }
    h.scene.add(g); sfx.wave(blueLanes.length ? 0 : 1);
    let t = 0;
    addFx({ meshes: [g], update(dt) {
      t += dt; const k = t / T2; g.position.set(0, 0, player.z - 16 * (1 - k));
      if (k >= 1) {
        const p = player, blue = blueLanes.includes(laneOf()), still = h.now() - h.lastAct() > 0.45 && p.grounded && p.slideT <= 0, ducked = p.slideT > 0 && p.y < 0.5;
        if (blue ? still : ducked) sfx.dodge(); else h.hurt(blue ? 'You moved in the blue wave!' : 'Slide under orange waves!');
        onPass?.(); return false;
      }
      return true;
    } });
  }
  // Wrath's cracks: flash for `tele` seconds, then become craters (fire = a pillar too tall to jump)
  function cracks(lanes, z, fireLanes, tele) {
    const marks = lanes.map((l) => ring(l, z, fireLanes.includes(l) ? '#ff8a1a' : '#d8343c'));
    let t = 0;
    addFx({ meshes: marks, update(dt) {
      t += dt; for (const m of marks) m.material.opacity = 0.5 + Math.abs(Math.sin(t * 14)) * 0.5;
      if (t >= tele) { for (const l of lanes) h.makeHole(l, z, fireLanes.includes(l)); sfx.slam(); h.fx(0.15, 0.45); return false; }
      return true;
    } });
  }
  // Lilac's song: notes hover over lanes, then `then(lane, i)` fires for each note in the same rhythm
  function song(n, beat, onNote, words) {
    const melody = [];
    for (let i = 0; i < n; i++) { let l = Math.floor(Math.random() * 3); if (i && l === melody[i - 1] && Math.random() < 0.6) l = (l + 1 + Math.floor(Math.random() * 2)) % 3; melody.push(l); }
    // never all three lanes in a row (there's always somewhere to stand)
    for (let i = 2; i < n; i++) if (new Set(melody.slice(i - 2, i + 1)).size === 3) melody[i] = melody[i - 1];
    const notes = [];
    melody.forEach((lane, i) => h.after(0.3 + i * beat, () => {
      if (!h.isFight()) return;
      sfx.sing([72, 76, 79][lane], beat * 0.9);
      const s = h.noteSprite(1.8); h.scene.add(s);
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 9), new THREE.MeshBasicMaterial({ color: '#b98aff', transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
      stripe.rotation.x = -Math.PI / 2; stripe.layers.set(1); h.scene.add(stripe);
      const note = { lane, t: 0 }; notes.push(note);
      addFx({ meshes: [s, stripe], update(dt) {
        note.t += dt; const pop = Math.min(1, note.t * 6);
        s.position.set(LANES[lane], 2.5 + Math.sin(note.t * 4 + i) * 0.12, player.z - 8); s.scale.setScalar(0.4 + pop * 0.6);
        stripe.position.set(LANES[lane], 0.06, player.z - 6.5); stripe.material.opacity = 0.2 + Math.abs(Math.sin(note.t * 5)) * 0.2;
        return !note.done;
      } });
    }));
    const singEnd = 0.3 + n * beat + 0.8;
    h.after(singEnd - 0.35, () => { if (h.isFight()) words?.(); });
    melody.forEach((lane, i) => h.after(singEnd + i * beat * 1.1, () => {
      if (!h.isFight()) return;
      const note = notes.find((q) => q.lane === lane && !q.done); if (note) note.done = true;
      onNote(lane, i);
    }));
    return singEnd + n * beat * 1.1;
  }
  // Glitch strikes a lane. burn: the lane stays on fire a moment afterwards
  function strike(lane, burn) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 14), new THREE.MeshBasicMaterial({ color: '#7dff8a', transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    m.rotation.x = -Math.PI / 2; m.layers.set(1); h.scene.add(m);
    sfx.strike(); h.fx(0.08, 0.25);
    if (Math.abs(player.x - LANES[lane]) < 0.85) h.hurt('Glitch caught you in her lane!');
    let t = 0;
    addFx({ meshes: [m], update(dt) { t += dt; m.position.set(LANES[lane] + (Math.random() - 0.5) * 0.1, 0.07, player.z - 6); m.material.opacity = Math.max(0, 1 - t / 0.4); return t < 0.4; } });
    if (!burn) return;
    const fire = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 13), new THREE.MeshBasicMaterial({ map: h.fireTex || null, color: '#ff7a1a', transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    fire.rotation.x = -Math.PI / 2; fire.layers.set(1); h.scene.add(fire);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(13, 1.4), new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    wall.rotation.y = Math.PI / 2; wall.layers.set(1); h.scene.add(wall);
    let b = 0, hurt = false;
    addFx({ meshes: [fire, wall], update(dt) {
      b += dt; const x = LANES[lane] + (Math.random() - 0.5) * 0.06;
      fire.position.set(x, 0.08, player.z - 5.5); wall.position.set(x, 0.7 + Math.sin(b * 30) * 0.05, player.z - 5.5);
      const o = b < 0.15 ? b / 0.15 : Math.max(0, 1 - (b - 0.6) / 0.2); fire.material.opacity = 0.8 * o; wall.material.opacity = 0.55 * o;
      if (!hurt && b > 0.1 && b < 0.7 && Math.abs(player.x - LANES[lane]) < 0.75) { hurt = true; h.hurt('Burned by the song!'); }
      return b < 0.8;
    } });
  }
  // a knight drops onto a lane ahead of you (low enough to jump)
  function knightDrop(lane, white) {
    const z = player.z - h.speed * 0.95;
    const mark = ring(lane, z, white ? '#fff1cf' : '#a88ad8');
    const k = makePiece('knight', white); k.scale.set(1.25, 1.0, 1.25); if (!white) k.rotation.y = Math.PI; k.position.set(LANES[lane], 6, z); h.world.add(k);
    sfx.springPlant();
    let t = 0, hurt = false;
    addFx({ meshes: [mark, k], update(dt) {
      t += dt; k.position.y = t < 0.45 ? 6 * (1 - t / 0.45) : 0; mark.material.opacity = t < 0.45 ? 0.9 : 0.3;
      if (!hurt && t >= 0.45 && Math.abs(player.x - LANES[lane]) < 0.7 && Math.abs(player.z - z) < 0.6 && player.y < 0.9) { hurt = true; h.hurt('Trampled by a knight!'); }
      return player.z > z - 4;
    } });
  }
  // Ivory & Onyx's squares (with spikes). tide: a wave washes over the board, flipping which squares are spiked
  function board(side0, rows, tide) {
    const ROW = 8, z0 = player.z - (h.speed * 1.3 + 4) - (tide ? 6 : 0);
    const sides = Array.from({ length: rows }, () => side0);
    const tiles = [];
    for (let r = 0; r < rows; r++) for (let l = 0; l < 3; l++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.66, ROW - 0.1), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.set(LANES[l], 0.05, z0 - (r + 0.5) * ROW); m.layers.set(1); h.scene.add(m);
      const sp = makeSpikes(); sp.position.set(LANES[l], 0.06, z0 - (r + 0.5) * ROW); h.scene.add(sp);
      tiles.push({ l, r, m, sp, t0: 0 });
    }
    const paint = (r, now) => { for (const q of tiles) if (q.r === r) {
      const hot = (q.l + r) % 2 === sides[r];
      q.m.material.color.set(hot ? (sides[r] === 0 ? '#e8a92a' : '#4a2a6a') : (sides[r] === 0 ? '#3a3036' : '#efe6da')); q.m.material.opacity = hot ? 0.85 : 0.55;
      q.sp.visible = hot; if (hot) { q.sp.setSide(sides[r]); q.t0 = now; }
    } };
    let t = 0; for (let r = 0; r < rows; r++) paint(r, 0);
    // the tide: a shimmering wall that sweeps from beyond the board right up to you
    let tideMesh = null, tidePos = 0; const flipped = new Set();
    const far = player.z - z0 + rows * ROW + 4, TT = 2.6;
    if (tide) {
      tideMesh = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 2.6), new THREE.MeshBasicMaterial({ map: h.waveTex.blue, color: '#cfe8ff', transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }));
      tideMesh.layers.set(1); h.scene.add(tideMesh);
    }
    const hurtRows = new Set();
    addFx({ meshes: [...tiles.flatMap((q) => [q.m, q.sp]), ...(tideMesh ? [tideMesh] : [])], update(dt) {
      t += dt;
      for (const q of tiles) { if (q.sp.visible) riseSpikes(q.sp, (t - q.t0) * 3.5, t); }
      if (tideMesh) {
        tidePos = Math.min(1, t / TT); const tz = player.z - far * (1 - tidePos);
        tideMesh.position.set(0, 1.3, tz); tideMesh.material.opacity = tidePos >= 1 ? 0 : 0.9;
        for (let r = 0; r < rows; r++) if (!flipped.has(r) && tz > z0 - (r + 1) * ROW && tz < z0 - r * ROW + ROW) {
          // only flip rows the tide has fully crossed, while they're still ahead of you
          if (tz > z0 - r * ROW) { flipped.add(r); if (z0 - r * ROW < player.z - 3) { sides[r] = 1 - sides[r]; paint(r, t); sfx.wave(0); } }
        }
      }
      const p = player, into = z0 - p.z, r = Math.floor(into / ROW), within = into - r * ROW;
      if (r >= 0 && r < rows && !hurtRows.has(r) && p.grounded && p.y < 0.3 && within > 1.4 && within < ROW - 1.4) {
        const lane = [0, 1, 2].find((l) => Math.abs(p.x - LANES[l]) < 0.55);
        if (lane !== undefined && (lane + r) % 2 === sides[r]) { hurtRows.add(r); h.hurt(`Stepped on ${sides[r] === 0 ? 'Ivory' : 'Onyx'}’s square!`); }
      }
      return p.z > z0 - rows * ROW - 3;
    } });
    return (player.z - (z0 - rows * ROW)) / h.speed + 0.2;
  }
  const randBlue = (split) => { if (!split) return Math.random() < 0.5 ? [0, 1, 2] : []; const left = Math.random() < 0.5, n = Math.random() < 0.5 ? 1 : 2; return left ? [0, 1].slice(0, n) : [2, 1].slice(0, n); };

  const ATTACK = {
    // ---- the originals
    twins() {
      const bl = randBlue(false); flashAura(bl.length ? '#5d8fe8' : '#f0913a');
      bl.length ? say('blue', 'Hold still…') : say('orange', 'Duck!');
      h.banner(bl.length ? 'Blue wave!' : 'Orange wave!', bl.length ? 'keep running, don’t move' : 'slide!', 0.9);
      wave(bl, 1.7); return { dur: 2.15, ball: 2.45 };
    },
    split() {
      const bl = randBlue(true); flashAura('#c97ab0'); say('orange', 'Pick a side!');
      h.banner('Split wave!', 'blue side: keep running · orange side: slide', 1.0);
      wave(bl, 1.8); return { dur: 2.25, ball: 2.55 };
    },
    wrath() {
      const z = player.z - (h.speed * 1.35 + 5), n = Math.random() < 0.5 ? 1 : 2, lanes = [0, 1, 2].sort(() => Math.random() - 0.5).slice(0, n), fire = Math.random() < 0.45 ? [lanes[0]] : [];
      flashAura('#d8343c'); say('wrath', 'SMASH!'); sfx.crackWarn(); h.banner('Wrath’s slam!', fire.length ? 'cracks and fire, switch lanes' : 'red cracks: stay out or jump', 0.9);
      cracks(lanes, z, fire, 1.0); const reach = (player.z - z) / h.speed;
      return { dur: 1.0 + reach * 0.8, ball: reach };     // jump the crater and hit the ball in one go (or dodge the fire)
    },
    glitch() {
      flashAura('#9a5fe0'); say('lilac', 'La, la, laaa~'); h.banner('Lilac’s song', 'remember the notes: Glitch strikes those lanes', 1.1);
      const n = 3 + (P.count >= 3 ? 1 : 0), beat = 0.55;
      const dur = song(n, beat, (lane) => strike(lane, false), () => { flashAura('#3fd45a'); say('glitch', 'Zzzt—!'); sfx.glitchGo(); h.banner('Glitch!', 'dodge the lanes she sang', 0.8); }) + 0.4;
      return { dur, ball: 0.3 + n * beat + 0.8 + 1.5 * beat * 1.1 };     // the ball lands between her strikes
    },
    chess() {
      const side = Math.random() < 0.5 ? 0 : 1; flashAura(side === 0 ? '#ffd98a' : '#6b5a86'); sfx.crackWarn();
      side === 0 ? say('ivory', 'Your move, darling.') : say('onyx', 'Too slow!');
      h.banner(side === 0 ? 'Ivory’s move' : 'Onyx’s move', side === 0 ? 'stand on the dark squares' : 'stand on the light squares', 0.9);
      const dur = board(side, 3, false); return { dur, ball: dur * 0.5 };
    },
    rook() {
      const white = Math.random() < 0.5, lane = player.lane, z = player.z - (h.speed * 1.7 + 12);
      flashAura(white ? '#ffd98a' : '#6b5a86'); sfx.crackWarn(); white ? say('ivory', 'Rook to your lane.') : say('onyx', 'Out of my way!'); h.banner('Rook!', 'it slides down your lane, switch!', 0.9);
      const rk = makePiece('rook', white); rk.scale.setScalar(1.25); rk.position.set(LANES[lane], 7, z); h.world.add(rk);
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1), new THREE.MeshBasicMaterial({ color: white ? '#fff1cf' : '#a88ad8', transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
      strip.rotation.x = -Math.PI / 2; strip.layers.set(1); h.scene.add(strip);
      let t = 0, rz = z, hurt = false;
      addFx({ meshes: [rk, strip], update(dt) {
        t += dt;
        if (t < 0.6) rk.position.y = 7 - (t / 0.6) * 7; else { rk.position.y = 0; rz += 5.5 * dt; }
        rk.position.z = rz;
        const len = Math.max(0.5, player.z - rz); strip.scale.y = len; strip.position.set(LANES[lane], 0.06, rz + len / 2); strip.material.opacity = t < 0.8 ? 0.7 : 0.25;
        if (!hurt && t > 0.6 && Math.abs(player.x - LANES[lane]) < 0.7 && Math.abs(player.z - rz) < 0.7 && player.y < 2.4) { hurt = true; h.hurt('Flattened by a rook!'); }
        return rz < player.z + 4;
      } });
      const meet = 0.6 + (player.z - z - h.speed * 0.6) / (h.speed + 5.5);
      return { dur: meet + 0.4, ball: meet + 0.55 };      // right after you dodge it
    },

    // ---- fused: two bosses' attacks working together
    // Firewave: a twins wave, and in its wake Wrath's cracks open into craters (an orange wave sets one alight)
    firewave() {
      const bl = randBlue(Math.random() < 0.4), T2 = 1.7, orange = bl.length < 3;
      flashAura('#ff5a2a'); say(bl.length ? 'blue' : 'orange', bl.length ? 'Hold still…' : 'Duck…'); h.after(0.7, () => say('wrath', '…and BURN!'));
      h.banner('Firewave!', 'ride the wave, then dodge what it leaves behind', 1.1);
      const z = player.z - h.speed * (T2 + 0.95), lanes = [0, 1, 2].sort(() => Math.random() - 0.5).slice(0, Math.random() < 0.5 ? 1 : 2);
      const fire = orange ? [lanes[0]] : [];
      wave(bl, T2);
      cracks(lanes, z, fire, T2 + 0.05);
      return { dur: T2 + 1.4, ball: T2 + 0.95 };     // the ball arrives over the craters: one jump clears both
    },
    // Burning song: Lilac sings, and every lane Glitch strikes stays on fire for a moment
    burnsong() {
      flashAura('#c0402a'); say('lilac', 'A hot little tune~'); h.banner('Burning song', 'the lanes she sings will burn', 1.1);
      const n = 3 + (P.count >= 3 ? 1 : 0), beat = 0.62;
      const dur = song(n, beat, (lane) => strike(lane, true), () => { flashAura('#ff7a1a'); say('wrath', 'Make it HOTTER!'); sfx.fireburst?.(); }) + 1.0;
      return { dur, ball: 0.3 + n * beat + 0.8 + 1.5 * beat * 1.1 };
    },
    // Tidal board: the squares light up, then a tide sweeps over and flips which ones are spiked
    tidal() {
      const side = Math.random() < 0.5 ? 0 : 1; flashAura('#7fb6ff');
      say('orange', 'Surf’s up!'); h.after(1.0, () => say(side === 0 ? 'ivory' : 'onyx', side === 0 ? 'Mind the board.' : 'Flip it!'));
      h.banner('Tidal board', 'the tide flips the spikes as it passes', 1.2);
      const dur = board(side, 3, true); return { dur, ball: dur * 0.55 };
    },
    // Knight's song: every note Lilac sings drops a knight onto that lane, so you hop through her tune
    knightsong() {
      flashAura('#9a7ad8'); say('lilac', 'A little waltz…'); h.banner('Knight’s song', 'each note drops a knight: hop through the tune', 1.1);
      const white = Math.random() < 0.5;
      const dur = song(4, 0.6, (lane) => knightDrop(lane, white), () => say(white ? 'ivory' : 'onyx', white ? 'Knights, if you please.' : 'Hop to it!')) + 0.9;
      return { dur, ball: 0.3 + 4 * 0.6 + 0.8 + 3 * 0.6 * 1.1 + 0.95 };     // lands on the last knight: hop it and hit it
    },
  };
  // the finale: one ghost of each of them flickers beside her as she throws
  const ECHO = [[0, 'blue', 'Faster!'], [2, 'wrath', 'Hit it HARDER!'], [4, 'lilac', 'In time, now~'], [5, 'glitch', 'zzt—again—'], [6, 'ivory', 'Check…'], [7, 'onyx', '…and mate!'], [3, 'joy', 'Wheee!'], [8, 'pink', 'Ugh. Fine. Go.']];
  const WHO = ['blue', 'orange', 'wrath', 'joy', 'lilac', 'glitch', 'ivory', 'onyx', 'pink'];
  function echo(idx, text) {
    const [i0, who0, line0] = ECHO[P.count % ECHO.length], i = idx ?? i0, who = idx !== undefined ? WHO[idx] : who0, line = text || line0, b = P.wheel[i];
    b.g.visible = true; b.g.position.set((P.count % 2 ? 1 : -1) * 2.2, 0.2, 0.6); b.g.scale.setScalar(0.01); h.anim(b, 'Cast', { once: true, after: 'Fly', fade: 0.05 });
    b.echoT = 1.1; say(who, line, 1.0); flashAura(['#5d8fe8', '#f0913a', '#d8343c', '#ffcf33', '#9a5fe0', '#3fd45a', '#fff1cf', '#6b5a86', '#ff7fb6'][i]);
  }
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
    bicker();
    if (hp > 0) {
      h.after(1.8, () => { if (!h.isFight()) return; if (P.stage === 2) chainUp(); else h.banner('Stage 2', 'keep the rally going for 5', 1.8); setName(); });
      h.after(3.6, () => { if (h.isFight()) (P.stage === 2 ? finaleStep : opener)(); });
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
    if (P.phase === 'fused') for (const b of P.wheel) if (b.echoT > 0) {
      b.echoT -= dt; const k = b.echoT > 0.9 ? (1.1 - b.echoT) / 0.2 : Math.min(1, b.echoT / 0.3);
      b.g.scale.setScalar(1.0 * Math.max(0.01, k)); if (b.echoT <= 0) b.g.visible = false;
    }
    if (P.glitchT > 0) { P.glitchT -= dt; P.neon.aura.material.color.setHSL(Math.random(), 1, 0.6); P.neon.g.position.x = (Math.random() - 0.5) * 0.25; if (P.glitchT <= 0) P.neon.g.position.x = 0; }
  }
  return {
    init, begin, start, update, afterHit, defeated, clear,
    debugAttack(k) { return ATTACK[k](); },
    debugFinal(heat = 0.8) { P.stage = 2; P.count = 0; chainUp(); if (neonEl) neonEl.style.setProperty('--heat', heat); },
    get group() { return P.g; }, get wheel() { return P.wheel; }, get locked() { return !!P.locked; },
    get state() { return P.on ? { attack: P.attack ? P.attack.kind : null, fxN: fx.length, locked: !!P.locked, phase: P.phase, stage: P.stage, count: P.count, need: NEED[P.stage], ball: P.ball ? { dir: P.ball.dir, left: +(P.ball.T - P.ball.t).toFixed(2), T: +P.ball.T.toFixed(2) } : null } : null; },
  };
}
