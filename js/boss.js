// Boss fights: the Twin Lanterns and Crimson Amara. Made by KiteRandel.
import * as THREE from 'three';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { PAL, T, toon } from './art.js';

const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const BLUE = '#5d8fe8', ORANGE = '#f0913a', RED = '#d8343c';

export function createBosses(ctx) {
  // ctx: { scene, world, player, LANES, bgOnly, sfx, sparkle, addMoth, hurt, addPoints, fx(flash, shake), get speed(), get dist(), get t() }
  const { scene, world, player, LANES, bgOnly, sfx } = ctx;
  const ui = { bar: document.getElementById('bossBar'), name: document.getElementById('bossName'), pips: document.getElementById('bossPips'), banner: document.getElementById('banner'), legend: document.getElementById('legend') };

  // ---------------------------------------------------------------- models
  const B = { tmpl: null, twins: null, crimson: null };
  function tinted(gltf, tint, glow) {
    const root = skClone(gltf.scene);
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.frustumCulled = false;
      o.material = toon({ map: o.material.map, color: tint, emissive: new THREE.Color(glow), emissiveIntensity: 0.55 });
    });
    const mixer = new THREE.AnimationMixer(root); const acts = {};
    for (const c of gltf.animations) acts[c.name] = mixer.clipAction(c);
    const aura = bgOnly(new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: glow, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })));
    aura.position.y = 0.9; aura.scale.set(2.6, 3.2, 1);
    const g = new THREE.Group(); g.add(root, aura); g.visible = false; scene.add(g);
    const b = { g, root, mixer, acts, cur: null, aura, glow: new THREE.Color(glow) };
    mixer.addEventListener('finished', () => { if (b.after) { const n = b.after; b.after = null; anim(b, n); } });
    return b;
  }
  function anim(b, name, { once = false, after = null, fade = 0.2 } = {}) {
    const a = b.acts[name]; if (!a) return;
    if (b.cur && b.cur !== a) b.cur.fadeOut(fade);
    a.reset(); a.enabled = true; a.setEffectiveWeight(1);
    a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = once;
    a.fadeIn(fade).play(); b.cur = a; b.after = after;
  }
  function init(gltf) {
    B.tmpl = gltf;
    const blue = tinted(gltf, '#a9c3ff', BLUE), orange = tinted(gltf, '#ffc790', ORANGE);
    const pair = new THREE.Group(); pair.visible = false; scene.add(pair);
    for (const [b, x, ry] of [[blue, -0.36, 1.05], [orange, 0.36, -1.05]]) { scene.remove(b.g); pair.add(b.g); b.g.position.x = x; b.g.rotation.y = ry; b.g.visible = true; }
    pair.scale.setScalar(1.6); B.twins = { g: pair, blue, orange };
    B.crimson = tinted(gltf, '#ff9a92', RED); B.crimson.g.scale.setScalar(1.7);
  }

  // ---------------------------------------------------------------- shared bits
  const waveTex = {};
  for (const [k, col] of [['blue', BLUE], ['orange', ORANGE]]) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.2, col); gr.addColorStop(0.8, col); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.globalAlpha = 0.55; g.fillRect(0, 0, 256, 128); g.globalAlpha = 1;
    g.strokeStyle = 'rgba(255,250,240,.95)'; g.lineWidth = 7; g.lineCap = 'round';
    for (let x = 20; x < 256; x += 54) {
      g.beginPath();
      if (k === 'orange') { g.moveTo(x - 14, 46); g.lineTo(x, 68); g.lineTo(x + 14, 46); g.moveTo(x - 14, 68); g.lineTo(x, 90); g.lineTo(x + 14, 68); }   // ↓ duck!
      else { g.moveTo(x - 16, 56); g.lineTo(x + 16, 56); g.moveTo(x - 16, 74); g.lineTo(x + 16, 74); }                                                   // = hold steady
      g.stroke();
    }
    waveTex[k] = new THREE.CanvasTexture(c); waveTex[k].colorSpace = THREE.SRGBColorSpace;
  }
  const crackTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.strokeStyle = '#ff5a4a'; g.lineWidth = 5; g.shadowColor = '#ff2a1a'; g.shadowBlur = 10;
    for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(64, 64); let x = 64, y = 64; const a = (i / 7) * Math.PI * 2 + Math.random() * 0.4; for (let s = 0; s < 4; s++) { x += Math.cos(a + rand(-0.5, 0.5)) * 15; y += Math.sin(a + rand(-0.5, 0.5)) * 15; g.lineTo(x, y); } g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const pitMat = new THREE.MeshBasicMaterial({ color: '#1e1412' });
  const debrisMat = toon({ color: PAL.dusk });

  const st = { mode: 'none', kind: null, hp: 0, maxHp: 3, t: 0, nextAt: 520, order: ['twins', 'crimson'], beaten: 0, startZ: 0, boss: null, z: 0, y: 0, x: 0 };
  const waves = [], holes = [], cracks = [], shots = [];
  let lantern = null, timers = [], lastAct = -9;
  const after = (secs, fn) => timers.push({ at: st.t + secs, fn });

  function banner(text, sub = '', secs = 2.4) {
    ui.banner.innerHTML = `${text}${sub ? `<small>${sub}</small>` : ''}`; ui.banner.classList.add('on');
    clearTimeout(banner.h); banner.h = setTimeout(() => ui.banner.classList.remove('on'), secs * 1000);
  }
  function setBar() {
    ui.bar.classList.toggle('hidden', !(st.mode === 'intro' || st.mode === 'fight'));
    ui.pips.innerHTML = Array.from({ length: st.maxHp }, (_, i) => `<i class="${i < st.hp ? 'on' : ''}"></i>`).join('');
  }

  // ---------------------------------------------------------------- lifecycle
  function quiet() { return st.mode !== 'none' && st.mode !== 'outro'; }
  function reset() {
    for (const w of waves) world.remove(w.mesh); waves.length = 0;
    for (const h of holes) world.remove(h.mesh); holes.length = 0;
    for (const c of cracks) world.remove(c.mesh); cracks.length = 0;
    for (const s of shots) scene.remove(s.mesh); shots.length = 0;
    if (lantern) world.remove(lantern.mesh); lantern = null; timers = [];
    if (B.twins) B.twins.g.visible = false; if (B.crimson) B.crimson.g.visible = false;
    Object.assign(st, { mode: 'none', kind: null, hp: 0, t: 0, nextAt: 520, beaten: 0, boss: null, slam: null }); lastAct = -99;
    ui.legend.classList.add('hidden'); setBar();
  }
  // called by the track generator the first time it lays a quiet block for a pending boss
  function quietStartsAt(z) { if (st.mode === 'pending' && st.startZ === null) st.startZ = z - 4; }
  function begin() {
    st.mode = 'intro'; timers = []; st.hp = st.maxHp;
    const p = player;
    if (st.kind === 'twins') {
      st.boss = B.twins; B.twins.g.visible = true; st.z = p.z - 60; st.y = 2.5; st.x = 0;
      for (const b of [B.twins.blue, B.twins.orange]) anim(b, 'Hug');
      banner('The Twin Lanterns', 'blue wave: keep running · orange wave: slide!', 3.2);
      ui.name.textContent = 'The Twin Lanterns';
    } else {
      st.boss = B.crimson; B.crimson.g.visible = true; st.z = p.z - 60; st.y = 3.2; st.x = 0; anim(B.crimson, 'Fly');
      banner('Crimson Amara', 'dodge the cracks · hit her when she gets stuck!', 3.2);
      ui.name.textContent = 'Crimson Amara';
    }
    ctx.giveShield();   // a bandage to start every fight
    sfx.bossIntro(); setBar();
    after(2.6, () => { st.mode = 'fight'; st.t0 = st.t; st.round = 0; st.slamsSinceHit = 0; if (st.kind === 'twins') { ui.legend.classList.remove('hidden'); volley(); } else crimsonNext(1.0); });
  }
  function defeated() {
    st.mode = 'outro'; st.beaten++;
    ui.legend.classList.add('hidden'); setBar();
    const bonus = 400 + 200 * st.beaten; ctx.addPoints(bonus);
    banner(st.kind === 'twins' ? 'The twins drift apart!' : 'Crimson Amara crashes out!', `+${bonus} points`, 2.8);
    sfx.bossDown(); ctx.fx(0.5, 0.6);
    // shower of moths down the road
    const p = player;
    for (let i = 0; i < 26; i++) ctx.addMoth(LANES[i % 3], 1 + Math.sin(i) * 0.4, p.z - 10 - i * 1.3, i % 9 === 4);
    st.outroT = 0;
    if (lantern) { world.remove(lantern.mesh); lantern = null; }
    for (const w of waves) world.remove(w.mesh); waves.length = 0;
    for (const c of cracks) world.remove(c.mesh); cracks.length = 0;
    timers = [];
  }
  function hitBoss() {
    st.hp--; setBar(); sfx.bossHit(); ctx.fx(0.35, 0.4);
    const pos = st.boss.g.position.clone().add(new THREE.Vector3(0, 1, 0));
    ctx.sparkle(pos, st.kind === 'twins' ? PAL.glow : RED, 22);
    if (st.kind === 'twins') { for (const b of [B.twins.blue, B.twins.orange]) anim(b, 'Hit', { once: true, after: 'Hug', fade: 0.1 }); }
    else anim(B.crimson, 'Hit', { once: true, after: 'Fly', fade: 0.1 });
    if (st.hp <= 0) after(0.5, defeated);
  }

  // ---------------------------------------------------------------- twins: waves + lanterns
  function volley() {
    const n = 3 + st.round, gap = Math.max(1.05, 1.7 - st.round * 0.22);
    let prev = [], seq = [];
    for (let i = 0; i < n; i++) {
      let c = st.round === 0 && i < 2 ? (i === 0 ? 'blue' : 'orange') : Math.random() < 0.5 ? 'blue' : 'orange';
      if (prev.length >= 2 && prev[prev.length - 1] === c && prev[prev.length - 2] === c) c = c === 'blue' ? 'orange' : 'blue';
      prev.push(c); seq.push(c);
    }
    seq.forEach((c, i) => {
      after(i * gap, () => { if (st.mode !== 'fight') return; charge(c); });
      after(i * gap + 0.5, () => { if (st.mode !== 'fight') return; sendWave(c); });
    });
    after((n - 1) * gap + 0.5 + 1.6, () => { if (st.mode === 'fight') dropLantern(); });
  }
  function charge(c) {
    const b = c === 'blue' ? B.twins.blue : B.twins.orange; b.charge = 0.6; sfx.charge(c === 'blue' ? 0 : 1);
  }
  function sendWave(c) {
    const h = c === 'blue' ? 3.1 : 2.2, y0 = c === 'blue' ? 0 : 0.95;
    const geo = new THREE.PlaneGeometry(7.4, h, 24, 1);
    const pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i); pos.setZ(i, -0.035 * x * x); }   // gently curved toward Amara
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: waveTex[c], transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }));
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 0.08), new THREE.MeshBasicMaterial({ color: '#fff6e8', transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
    edge.position.y = -h / 2; m.add(edge);
    const g = bgOnly(new THREE.Group()); g.add(m); bgOnly(m);
    g.position.set(0, y0 + h / 2, st.boss.g.position.z + 0.5); world.add(g);
    waves.push({ mesh: g, color: c, z: g.position.z, done: false, born: st.t });
    sfx.wave(c === 'blue' ? 0 : 1);
  }
  function dropLantern() {
    const lane = Math.floor(Math.random() * 3), z = player.z - (ctx.speed * 2.3 + 8);
    const mesh = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.55, 12, 4), new THREE.MeshToonMaterial({ map: T.lantern, emissive: new THREE.Color(PAL.ember), emissiveIntensity: 0.9 }));
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.08, 10), toon({ color: PAL.umber })); cap.position.y = 0.31;
    const glow = bgOnly(new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: '#ffd28a', transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }))); glow.scale.set(2.4, 2.4, 1);
    mesh.add(body, cap, glow); mesh.position.set(LANES[lane], 5, z); world.add(mesh);
    lantern = { mesh, lane, z, y: 5 };
    sfx.lanternDrop();
  }
  function throwAtBoss(from) {
    const mesh = lantern.mesh; world.remove(mesh); scene.add(mesh); mesh.position.copy(from);
    shots.push({ mesh, from: from.clone(), t: 0 }); lantern = null; sfx.throw();
  }

  // ---------------------------------------------------------------- crimson: slams, holes, getting stuck
  function crimsonNext(delay) { after(delay, () => { if (st.mode === 'fight') slam(); }); }
  function slam() {
    const p = player;
    const lane = Math.random() < 0.6 ? p.lane : Math.floor(Math.random() * 3);
    const tele = Math.max(0.62, 1.0 - st.round * 0.14);
    const zSlam = p.z - (ctx.speed * (tele + 0.55) + 6);
    const crack = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    crack.rotation.x = -Math.PI / 2; crack.position.set(LANES[lane], 0.03, zSlam); bgOnly(crack); world.add(crack);
    const c = { mesh: crack, lane, z: zSlam, born: st.t, tele };
    cracks.push(c);
    sfx.crackWarn();
    st.slam = { lane, z: zSlam, phase: 'aim', t: 0, tele, crack: c };
    after(tele - 0.45, () => { if (st.mode === 'fight' && st.slam) { st.slam.phase = 'wind'; anim(B.crimson, 'Slam', { once: true }); } });
    after(tele, () => { if (st.mode === 'fight' && st.slam) impact(); });
  }
  function impact() {
    const s = st.slam; s.phase = 'impact';
    world.remove(s.crack.mesh); cracks.splice(cracks.indexOf(s.crack), 1);
    ctx.fx(0.15, 0.45); sfx.slam();
    ctx.sparkle(new THREE.Vector3(LANES[s.lane], 0.3, s.z), PAL.dusk, 16);
    const stuck = st.slamsSinceHit >= 2 || Math.random() < 0.3;
    st.slamsSinceHit++;
    if (stuck) {
      s.phase = 'stuck'; anim(B.crimson, 'Stuck'); sfx.stuck();
      banner('She’s stuck!', 'run into her!', 1.4);
    } else {
      makeHole(s.lane, s.z);
      s.phase = 'rise'; after(0.35, () => { if (st.mode === 'fight') anim(B.crimson, 'Fly'); });
      after(0.9, () => { st.slam = null; if (st.mode === 'fight') { st.round = Math.min(st.round + 0.34, 3); crimsonNext(Math.random() < Math.min(0.15 + st.round * 0.15, 0.5) ? 0.15 : 0.9); } });
    }
  }
  function makeHole(lane, z) {
    const g = new THREE.Group(); g.position.set(LANES[lane], 0, z);
    const pit = new THREE.Mesh(new THREE.PlaneGeometry(1.62, 3.4), pitMat); pit.rotation.x = -Math.PI / 2; pit.position.y = 0.015; g.add(pit);
    for (let i = 0; i < 9; i++) {
      const d = new THREE.Mesh(new THREE.BoxGeometry(rand(0.2, 0.45), 0.08, rand(0.2, 0.4)), debrisMat);
      const side = i % 2 ? 1 : -1; d.position.set(side * rand(0.7, 0.95), 0.05, rand(-1.8, 1.8)); d.rotation.set(rand(-0.4, 0.4), rand(0, 3), rand(-0.4, 0.4)); g.add(d);
    }
    world.add(g); holes.push({ lane, z0: z + 1.7, z1: z - 1.7, mesh: g });
  }
  function holeAt(x, z) { return holes.some((h) => z <= h.z0 && z >= h.z1 && Math.abs(x - LANES[h.lane]) < 0.75); }

  // ---------------------------------------------------------------- per-frame
  function update(dt) {
    const p = player, t = ctx.t;
    st.t += dt;
    for (const tm of [...timers]) if (st.t >= tm.at) { timers.splice(timers.indexOf(tm), 1); tm.fn(); }
    if (st.mode === 'none' && p.alive && ctx.dist > st.nextAt - 150) { st.mode = 'pending'; st.kind = st.order[st.beaten % 2]; st.startZ = null; }
    if (st.mode === 'pending' && st.startZ !== null && p.z <= st.startZ) begin();

    const b = st.boss;
    if (b && (st.mode === 'intro' || st.mode === 'fight' || st.mode === 'outro')) {
      // fly in, hover ahead of Amara
      let wantZ = p.z - (st.kind === 'twins' ? 15 : 12), wantY = st.kind === 'twins' ? 2.2 : 2.6, wantX = Math.sin(t * 0.7) * 0.9;
      let k = 3;
      if (st.kind === 'crimson' && st.slam) {
        const s = st.slam; wantX = LANES[s.lane];
        if (s.phase === 'wind') { wantY = 3.4; wantZ = lerpZ(p.z - 12, s.z, 0.35); k = 5; }
        else if (s.phase === 'impact' || s.phase === 'stuck') { wantZ = s.z; wantY = 0; k = 60; }
        else if (s.phase === 'rise') { wantY = 2.6; k = 4; }
      }
      if (st.mode === 'outro') { st.outroT += dt; wantZ = st.z - 6 * dt; wantY = st.y + 4 * dt; k = 60; }
      st.z += (wantZ - st.z) * Math.min(1, dt * k); st.y += (wantY - st.y) * Math.min(1, dt * k); st.x += (wantX - st.x) * Math.min(1, dt * (k * 0.8));
      if (st.kind === 'crimson' && st.slam && (st.slam.phase === 'impact' || st.slam.phase === 'stuck')) { st.z = st.slam.z; st.y = 0; st.x = LANES[st.slam.lane]; }
      b.g.position.set(st.x, st.y + (st.mode === 'fight' && !(st.slam && st.slam.phase === 'stuck') ? Math.sin(t * 2) * 0.15 : 0), st.z);
      if (st.mode === 'outro') { b.g.rotation.z += dt * 3; b.g.scale.multiplyScalar(1 - dt * 0.35); if (st.outroT > 2.2) { b.g.visible = false; b.g.rotation.z = 0; b.g.scale.setScalar(st.kind === 'twins' ? 1.6 : 1.7); st.mode = 'none'; st.boss = null; st.nextAt = ctx.dist + 650; } }
      // mixers + auras
      const list = st.kind === 'twins' ? [B.twins.blue, B.twins.orange] : [B.crimson];
      for (const m of list) {
        m.mixer.update(dt);
        m.charge = Math.max(0, (m.charge || 0) - dt);
        m.aura.material.opacity = 0.45 + Math.sin(t * 3) * 0.08 + m.charge * 1.0;
        m.aura.scale.set(2.6 + m.charge * 2.5, 3.2 + m.charge * 2.5, 1);
      }
    }

    if (st.mode === 'fight' && st.kind === 'twins') {
      for (const w of [...waves]) {
        const d = w.mesh.position.z - p.z;
        w.mesh.children[0].material.opacity = clamp(1 - Math.abs(d) / 30, 0.25, 1);
        w.mesh.scale.y = 1 + Math.sin((st.t - w.born) * 10) * 0.03;
        if (!w.done && p.z <= w.mesh.position.z) {
          w.done = true;
          const still = st.t - lastAct > 0.45 && p.grounded && p.slideT <= 0;
          const ducked = p.slideT > 0 && p.y < 0.5;
          const ok = w.color === 'blue' ? still : ducked;
          if (ok) { ctx.addPoints(25); ctx.sparkle(new THREE.Vector3(p.x, 1.2, p.z - 0.5), w.color === 'blue' ? BLUE : ORANGE, 8); sfx.dodge(); }
          else ctx.hurt(w.color === 'blue' ? 'You moved in the blue wave!' : 'Slide under orange waves!');
        }
        if (d > 6) { world.remove(w.mesh); waves.splice(waves.indexOf(w), 1); }
      }
      if (lantern) {
        lantern.y = Math.max(1.15, lantern.y - dt * 3.2);
        lantern.mesh.position.y = lantern.y + Math.sin(t * 3) * 0.08; lantern.mesh.rotation.y += dt * 1.5;
        const dz = lantern.z - p.z;
        if (Math.abs(dz) < 1.0 && Math.abs(p.x - LANES[lantern.lane]) < 0.9 && p.y < 1.8) throwAtBoss(lantern.mesh.getWorldPosition(new THREE.Vector3()));
        else if (dz > 2) { world.remove(lantern.mesh); lantern = null; banner('Missed the lantern…', 'catch the next one!', 1.5); st.round = Math.max(0, st.round); after(0.8, () => { if (st.mode === 'fight') volley(); }); }
      }
    }
    for (const s of [...shots]) {
      s.t += dt / 0.55; const k = Math.min(s.t, 1);
      const to = st.boss ? st.boss.g.position.clone().add(new THREE.Vector3(0, 1.1, 0)) : s.from;
      s.mesh.position.lerpVectors(s.from, to, k); s.mesh.position.y += Math.sin(k * Math.PI) * 1.6; s.mesh.rotation.x += dt * 12;
      if (s.t >= 1) {
        scene.remove(s.mesh); shots.splice(shots.indexOf(s), 1);
        if (st.mode === 'fight') { hitBoss(); if (st.hp > 0) { st.round++; after(1.4, () => { if (st.mode === 'fight') volley(); }); } }
      }
    }

    if (st.mode === 'fight' && st.kind === 'crimson') {
      for (const c of cracks) { c.mesh.material.opacity = 0.55 + Math.sin((st.t - c.born) * 18) * 0.45; c.mesh.scale.setScalar(0.8 + Math.min(1, (st.t - c.born) / c.tele) * 0.5); }
      const s = st.slam;
      if (s && s.phase === 'stuck' && p.z <= s.z + 0.7) {
        const sameLane = Math.abs(p.x - LANES[s.lane]) < 0.95 && p.y < 1.5;
        st.slam = null;
        if (sameLane) {
          p.vy = 6; p.grounded = false; st.slamsSinceHit = 0; hitBoss();
          if (st.hp > 0) { st.round = Math.min(st.round + 1, 3); banner('Bonk!', `${st.hp} more`, 1.0); crimsonNext(1.6); }
        } else {
          sfx.escape(); anim(B.crimson, 'Fly'); banner('She got loose!', '', 1.0); crimsonNext(1.2);
        }
      }
    }
    // tidy holes and cracks left behind
    for (const h of [...holes]) if (h.z1 > p.z + 30) { world.remove(h.mesh); holes.splice(holes.indexOf(h), 1); }
  }
  const lerpZ = (a, b, k) => a + (b - a) * k;

  return {
    init, reset, update, quiet, quietStartsAt, holeAt,
    noteAction() { lastAct = st.t; },
    get state() { return { mode: st.mode, kind: st.kind, hp: st.hp, nextAt: Math.round(st.nextAt), slam: st.slam ? { lane: st.slam.lane, phase: st.slam.phase, dz: +(player.z - st.slam.z).toFixed(1) } : null, waves: waves.filter((w) => !w.done).map((w) => ({ c: w.color, dz: +(player.z - w.mesh.position.z).toFixed(1) })), lantern: lantern ? { lane: lantern.lane, dz: +(player.z - lantern.z).toFixed(1) } : null, holes: holes.length }; },
    force(kind) { st.mode = 'pending'; st.kind = kind; st.startZ = null; },
  };
}
