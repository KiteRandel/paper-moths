// Boss fights: the Twin Lanterns and Crimson Amara. Made by KiteRandel.
import * as THREE from 'three';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { PAL, T, toon } from './art.js';

const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const BLUE = '#5d8fe8', ORANGE = '#f0913a', RED = '#d8343c', LILAC = '#9a5fe0', GREEN = '#3fd45a';
const NOTE_MIDI = [72, 76, 79];   // lane 0 = low, 1 = middle, 2 = high

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
    // Lilac (composed, singing) and Glitch (green, twitchy, on a leash)
    const lilac = tinted(gltf, '#d9c2ff', LILAC), glitch = tinted(gltf, '#c4ffbd', GREEN);
    const bone = (root, ...names) => { for (const n of names) { const o = root.getObjectByName(n); if (o) return o; } return null; };
    lilac.hand = bone(lilac.root, 'HandL', 'Hand.L', 'Hand_L');
    glitch.neck = bone(glitch.root, 'Neck');
    // a collar on Glitch's neck, placed in the bind pose then parented to the bone
    glitch.root.updateMatrixWorld(true);
    if (glitch.neck) {
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.018, 8, 20), toon({ color: '#2a1f2e', emissive: new THREE.Color(LILAC), emissiveIntensity: 0.6 }));
      collar.rotation.x = Math.PI / 2; collar.position.copy(glitch.neck.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(0, 0.03, 0));
      scene.add(collar); collar.updateMatrixWorld(true); glitch.neck.attach(collar);
    }
    lilac.g.scale.setScalar(1.6); glitch.g.scale.setScalar(1.45);
    const leash = new THREE.Mesh(new THREE.BufferGeometry(), toon({ color: '#3a2440', emissive: new THREE.Color(LILAC), emissiveIntensity: 0.8 }));
    leash.frustumCulled = false; leash.visible = false; scene.add(leash);
    B.duet = { g: lilac.g, lilac, glitch, leash, crack: 0 };
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

  const st = { mode: 'none', kind: null, hp: 0, maxHp: 3, t: 0, nextAt: 520, order: ['twins', 'crimson', 'duet'], beaten: 0, startZ: 0, boss: null, z: 0, y: 0, x: 0 };
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
    if (B.duet) { B.duet.lilac.g.visible = B.duet.glitch.g.visible = B.duet.leash.visible = false; B.duet.crack = 0; }
    clearDuet();
    Object.assign(st, { mode: 'none', kind: null, hp: 0, t: 0, nextAt: 520, beaten: 0, boss: null, slam: null }); lastAct = -99;
    ui.legend.classList.add('hidden'); setBar(); ctx.bossMusic(false);
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
    } else if (st.kind === 'duet') {
      const d = B.duet; st.boss = d.lilac; d.lilac.g.visible = d.glitch.g.visible = d.leash.visible = true; d.crack = 0;
      st.z = p.z - 60; st.y = 2.4; st.x = 0; anim(d.lilac, 'Sing'); anim(d.glitch, 'Thrash');
      d.glitch.g.position.set(1.6, 2, st.z + 1);
      banner('Lilac & Glitch', 'remember her song · dodge Glitch · sing it back!', 3.4);
      ui.name.textContent = 'Lilac & Glitch';
    } else {
      st.boss = B.crimson; B.crimson.g.visible = true; st.z = p.z - 60; st.y = 3.2; st.x = 0; anim(B.crimson, 'Fly');
      banner('Crimson Amara', 'dodge the cracks · hit her when she gets stuck!', 3.2);
      ui.name.textContent = 'Crimson Amara';
    }
    ctx.giveShield();   // a bandage to start every fight
    ctx.bossMusic(true);
    sfx.bossIntro(); setBar();
    after(2.6, () => { st.mode = 'fight'; st.t0 = st.t; st.round = 0; st.slamsSinceHit = 0; if (st.kind === 'twins') { ui.legend.innerHTML = LEGEND.twins; ui.legend.classList.remove('hidden'); volley(); } else if (st.kind === 'duet') { ui.legend.innerHTML = LEGEND.duet; ui.legend.classList.remove('hidden'); duetCycle(); } else crimsonNext(1.0); });
  }
  const LEGEND = {
    twins: '<span><b class="b">● blue wave</b> keep running, don\u2019t move</span><span><b class="o">● orange wave</b> slide!</span>',
    duet: '<span><b class="p">♪ low</b> left · <b class="p">♪ mid</b> centre · <b class="p">♪ high</b> right</span><span>then <b class="p">sing it back</b>!</span>',
  };
  function defeated() {
    st.mode = 'outro'; st.beaten++; ctx.bossMusic(false);
    ui.legend.classList.add('hidden'); setBar();
    const bonus = 400 + 200 * st.beaten; ctx.addPoints(bonus);
    banner(st.kind === 'twins' ? 'The twins drift apart!' : st.kind === 'duet' ? 'The leash snaps!' : 'Crimson Amara crashes out!', `+${bonus} points`, 2.8);
    if (st.kind === 'duet') { B.duet.leash.visible = false; clearDuet(); sfx.snap(); }
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
    else if (st.kind === 'duet') { anim(B.duet.lilac, 'Hit', { once: true, after: 'Sing', fade: 0.1 }); B.duet.crack++; }
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
      let wantZ = p.z - (st.kind === 'twins' ? 15 : st.kind === 'duet' ? 14 : 12), wantY = st.kind === 'twins' ? 2.2 : st.kind === 'duet' ? 2.3 : 2.6, wantX = st.kind === 'duet' ? -0.9 + Math.sin(t * 0.35) * 0.5 : Math.sin(t * 0.7) * 0.9;
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
      if (st.mode === 'outro') { b.g.rotation.z += dt * 3; b.g.scale.multiplyScalar(1 - dt * 0.35); if (st.outroT > 2.2) { b.g.visible = false; b.g.rotation.z = 0; b.g.scale.setScalar(st.kind === 'crimson' ? 1.7 : 1.6); if (st.kind === 'duet') { B.duet.glitch.g.visible = false; B.duet.glitch.g.scale.setScalar(1.45); B.duet.glitch.g.rotation.z = 0; } st.mode = 'none'; st.boss = null; st.nextAt = ctx.dist + 650; } }
      // mixers + auras
      const list = st.kind === 'twins' ? [B.twins.blue, B.twins.orange] : st.kind === 'duet' ? [B.duet.lilac, B.duet.glitch] : [B.crimson];
      if (st.kind === 'duet') updateDuetBodies(dt, t);
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
    if (st.mode === 'fight' && st.kind === 'duet') updateDuetFight(dt, t);
    // tidy holes and cracks left behind
    for (const h of [...holes]) if (h.z1 > p.z + 30) { world.remove(h.mesh); holes.splice(holes.indexOf(h), 1); }
  }
  const lerpZ = (a, b, k) => a + (b - a) * k;

  // ================================================================ Lilac & Glitch
  const noteTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(210,170,255,.9)'); gr.addColorStop(1, 'rgba(154,95,224,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    g.font = 'bold 84px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 6; g.strokeStyle = '#3a2440'; g.fillStyle = '#fbf3ff';
    g.strokeText('\u266A', 62, 66); g.fillText('\u266A', 62, 66);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const beamTex = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d');
    for (let y = 0; y < 256; y += 4) { g.fillStyle = `rgba(${80 + Math.random() * 120 | 0},255,${120 + Math.random() * 100 | 0},${0.35 + Math.random() * 0.6})`; g.fillRect(Math.random() * 10, y, 64 - Math.random() * 20, 2 + Math.random() * 3); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapT = THREE.RepeatWrapping; return t;
  })();
  function noteSprite(size) {
    const g = new THREE.Group();
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: '#c58cff', transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })); glow.scale.setScalar(size * 1.9);
    const n = new THREE.Sprite(new THREE.SpriteMaterial({ map: noteTex, transparent: true, depthWrite: false })); n.scale.setScalar(size);
    g.add(glow, n); g.material = n.material; return bgOnly(g);
  }
  const duet = { phase: null, melody: [], beat: 0.6, glyphs: [], rows: [], beams: [], nextStrike: null, jitT: 0, off: new THREE.Vector3(1.6, -0.5, 0.8) };
  function clearDuet() {
    for (const gl of duet.glyphs) scene.remove(gl.s); duet.glyphs = [];
    for (const r of duet.rows) for (const o of r.orbs) world.remove(o); duet.rows = [];
    for (const b of duet.beams) world.remove(b.m); duet.beams = [];
    duet.phase = null; duet.nextStrike = null;
  }
  function makeMelody(n) {
    const m = [];
    for (let i = 0; i < n; i++) {
      let l = Math.floor(Math.random() * 3);
      if (i >= 2 && m[i - 1] === l && m[i - 2] === l) l = (l + 1 + Math.floor(Math.random() * 2)) % 3;
      m.push(l);
    }
    if (new Set(m).size === 1) m[n - 1] = (m[0] + 1) % 3;
    return m;
  }
  function duetCycle() {
    if (st.mode !== 'fight') return;
    clearDuet();
    const lvl = Math.min(Math.floor(st.round), 2);
    const n = 3 + lvl; duet.beat = [0.62, 0.54, 0.47][lvl];
    duet.melody = makeMelody(n); duet.phase = 'sing';
    // 1) Lilac sings: each note sends a glowing note to hover over its lane
    duet.melody.forEach((lane, i) => after(0.4 + i * duet.beat, () => {
      if (st.mode !== 'fight') return;
      sfx.sing(NOTE_MIDI[lane], duet.beat * 0.95);
      const s = noteSprite(1.7); s.position.copy(B.duet.lilac.g.position).add(new THREE.Vector3(0, 2.6, 0)); scene.add(s);
      duet.glyphs.push({ s, lane, i, t: 0 });
      B.duet.lilac.charge = 0.4;
    }));
    const singEnd = 0.4 + n * duet.beat;
    // 2) Glitch replays the song as strikes down each lane, same rhythm
    after(singEnd + 0.9, () => { if (st.mode === 'fight') { duet.phase = 'strike'; sfx.glitchGo(); banner('Dodge!', '', 0.8); } });
    duet.melody.forEach((lane, i) => {
      const at = singEnd + 1.3 + i * duet.beat * 1.1;
      after(at - 0.32, () => { if (st.mode === 'fight') { duet.nextStrike = { lane, i }; glitchTo(lane); } });
      after(at, () => { if (st.mode === 'fight') strike(lane, i); });
    });
    const strikeEnd = singEnd + 1.3 + n * duet.beat * 1.1;
    // 3) the echo: rows of notes to sing back
    after(strikeEnd + 0.5, () => { if (st.mode === 'fight') echoRows(); });
  }
  function glitchTo(lane) {
    const g = B.duet.glitch; g.lunge = { lane, t: 0 };
    g.g.position.set(LANES[lane], 0.9, player.z - 7); sfx.glitch();
  }
  function strike(lane, i) {
    duet.nextStrike = null;
    const gl = duet.glyphs.find((x) => x.i === i); if (gl) { ctx.sparkle(gl.s.position.clone(), LILAC, 8); scene.remove(gl.s); duet.glyphs.splice(duet.glyphs.indexOf(gl), 1); }
    const mat = new THREE.MeshBasicMaterial({ map: beamTex, color: '#7dff8a', transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const m = new THREE.Group(); m.position.set(LANES[lane], 0, player.z - 4.5); m.material = mat;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 13), mat); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.06;
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(13, 3.0), mat); wall.rotation.y = Math.PI / 2; wall.position.y = 1.5;
    m.add(floor, wall); bgOnly(m); world.add(m);
    duet.beams.push({ m, t: 0 });
    sfx.strike(); ctx.fx(0.08, 0.25);
    const p = player;
    if (Math.abs(p.x - LANES[lane]) < 0.85) ctx.hurt('Glitch caught you in her lane!');
    else ctx.addPoints(20);
  }
  function echoRows() {
    duet.phase = 'echo'; banner('Sing it back!', 'run through her notes in order', 1.8); sfx.echoStart();
    const p = player, gap = Math.max(7, ctx.speed * 0.62), z0 = p.z - (ctx.speed * 1.3 + 10);
    duet.melody.forEach((lane, i) => {
      const z = z0 - i * gap, orbs = [];
      for (let l = 0; l < 3; l++) {
        const s = noteSprite(1.35); s.position.set(LANES[l], 1.15, z); world.add(s); orbs.push(s);
      }
      duet.rows.push({ i, z, lane, orbs, done: false });
    });
    duet.echoOk = 0;
  }
  function updateDuetBodies(dt, t) {
    const d = B.duet, p = player, g = d.glitch;
    // Glitch: twitchy hover beside Lilac, snapping to new spots, unless she's mid-lunge
    if (st.mode === 'outro') {
      g.g.position.lerp(d.lilac.g.position.clone().add(new THREE.Vector3(Math.sin(t * 9) * 1.2, Math.cos(t * 7), 0)), Math.min(1, dt * 6)); g.g.rotation.z += dt * 9;
    } else if (g.lunge) {
      g.lunge.t += dt;
      const k = Math.min(1, g.lunge.t / 0.32);
      g.g.position.set(LANES[g.lunge.lane] + (Math.random() - 0.5) * 0.15, 0.9 - k * 0.5, lerpZ(p.z - 7, p.z - 1.5, k * k));
      g.g.rotation.x = -0.6 * k;
      if (g.lunge.t > 0.55) { g.lunge = null; g.g.rotation.x = 0; }
    } else {
      duet.jitT -= dt;
      if (duet.jitT <= 0) { duet.jitT = 0.12 + Math.random() * 0.35; duet.off.set(1.4 + Math.random() * 0.9, -0.8 + Math.random() * 1.2, 0.4 + Math.random() * 1.2); if (Math.random() < 0.5) duet.off.x *= -1; }
      const want = d.lilac.g.position.clone().add(duet.off);
      g.g.position.lerp(want, Math.random() < 0.15 ? 1 : Math.min(1, dt * 10));   // sometimes she just blinks there
    }
    g.g.rotation.y = Math.atan2(p.x - g.g.position.x, p.z - g.g.position.z) + (Math.random() - 0.5) * 0.3;
    const flick = Math.random() < 0.12;
    g.g.scale.set(1.45 * (flick ? 1.18 : 1), 1.45 * (flick ? 0.86 : 1), 1.45);
    g.aura.material.color.set(flick ? '#ffffff' : GREEN);
    // the leash: from Lilac's left hand to Glitch's collar, sagging, rebuilt every frame
    if (d.leash.visible && d.lilac.hand && g.neck) {
      const a = d.lilac.hand.getWorldPosition(new THREE.Vector3()), b = g.neck.getWorldPosition(new THREE.Vector3());
      const len = a.distanceTo(b), mid = a.clone().lerp(b, 0.5); mid.y -= Math.max(0, 1.6 - len * 0.12);
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      d.leash.geometry.dispose();
      d.leash.geometry = new THREE.TubeGeometry(curve, 24, 0.028 - Math.min(d.crack, 2) * 0.006, 5, false);
      d.leash.material.emissiveIntensity = 0.8 + (d.crack ? Math.max(0, Math.sin(t * 20)) * d.crack * 0.6 : 0);
    }
  }
  function updateDuetFight(dt, t) {
    const p = player;
    // notes from the song fly out and hover over their lanes, ahead of Amara
    duet.glyphs.forEach((gl) => {
      gl.t += dt; const k = Math.min(1, gl.t / 0.5);
      const want = new THREE.Vector3(LANES[gl.lane], 2.6 + Math.sin(t * 3 + gl.i) * 0.12, p.z - 9 - gl.i * 0.6);
      gl.s.position.lerp(want, k < 1 ? Math.min(1, dt * 7) : 1);
      gl.s.material.opacity = 0.85 + Math.sin(t * 6 + gl.i) * 0.15;
    });
    for (const b of [...duet.beams]) {
      b.t += dt; b.m.material.opacity = Math.max(0, 1 - Math.max(0, b.t - 0.15) / 0.35); b.m.material.map.offset.y -= dt * 4;
      if (b.t > 0.45) { world.remove(b.m); duet.beams.splice(duet.beams.indexOf(b), 1); }
    }
    // the echo rows: whichever lane Amara runs through is the note she sings
    if (duet.phase === 'echo') {
      for (const r of duet.rows) for (const o of r.orbs) { o.position.y = 1.15 + Math.sin(t * 4 + r.i) * 0.1; }
      const row = duet.rows.find((r) => !r.done);
      if (row && p.z <= row.z) {
        row.done = true;
        const lane = LANES.reduce((best, x, i) => (Math.abs(p.x - x) < Math.abs(p.x - LANES[best]) ? i : best), 0);
        const ok = lane === row.lane && p.y < 2.2;
        for (const o of row.orbs) world.remove(o);
        if (ok) {
          duet.echoOk++; sfx.sing(NOTE_MIDI[lane], 0.45, true); ctx.sparkle(new THREE.Vector3(p.x, 1.3, p.z), LILAC, 12); ctx.addPoints(30);
          if (duet.echoOk === duet.melody.length) {
            duet.phase = 'resolve'; sfx.chord(duet.melody.map((l) => NOTE_MIDI[l]));
            banner('Perfect echo!', st.hp > 1 ? 'the leash is cracking…' : '', 1.4);
            hitBoss();
            if (st.hp > 0) { st.round++; after(1.8, duetCycle); }
          }
        } else {
          duet.phase = 'resolve'; sfx.offKey(); banner('Off key…', 'listen again', 1.4);
          for (const r of duet.rows) if (!r.done) { r.done = true; for (const o of r.orbs) world.remove(o); }
          after(1.6, duetCycle);
        }
      }
    }
  }

  return {
    init, reset, update, quiet, quietStartsAt, holeAt,
    noteAction() { lastAct = st.t; },
    get state() { return { mode: st.mode, kind: st.kind, hp: st.hp, nextAt: Math.round(st.nextAt), slam: st.slam ? { lane: st.slam.lane, phase: st.slam.phase, dz: +(player.z - st.slam.z).toFixed(1) } : null, waves: waves.filter((w) => !w.done).map((w) => ({ c: w.color, dz: +(player.z - w.mesh.position.z).toFixed(1) })), lantern: lantern ? { lane: lantern.lane, dz: +(player.z - lantern.z).toFixed(1) } : null, holes: holes.length, duet: duet.phase ? { glyphs: duet.glyphs.length, phase: duet.phase, melody: duet.melody, strike: duet.nextStrike, rows: duet.rows.filter((r) => !r.done).map((r) => ({ i: r.i, dz: +(player.z - r.z).toFixed(1) })) } : null }; },
    force(kind) { st.mode = 'pending'; st.kind = kind; st.startZ = null; },
  };
}
