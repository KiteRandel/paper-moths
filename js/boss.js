// Boss fights: the Twin Lanterns, Wrath & Joy, and Lilac & Glitch. Made by KiteRandel.
import * as THREE from 'three';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { PAL, T, toon } from './art.js?v=46';
import { createChess } from './chess.js?v=46';
import { createPrism } from './prism.js?v=46';

const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const BLUE = '#5d8fe8', ORANGE = '#f0913a', RED = '#d8343c', GOLD = '#ffcf33', LILAC = '#9a5fe0', GREEN = '#3fd45a';
const NOTE_MIDI = [72, 76, 79];   // lane 0 = low, 1 = middle, 2 = high

export function createBosses(ctx) {
  // ctx: { scene, world, player, LANES, bgOnly, sfx, sparkle, addMoth, hurt, addPoints, fx(flash, shake), get speed(), get dist(), get t() }
  const { scene, world, player, LANES, bgOnly, sfx } = ctx;
  const ui = { bar: document.getElementById('bossBar'), name: document.getElementById('bossName'), pips: document.getElementById('bossPips'), banner: document.getElementById('banner'), legend: document.getElementById('legend') };

  // ---------------------------------------------------------------- models
  const B = { tmpl: null, twins: null, wrath: null, joy: null };
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
  const chess = createChess({
    scene, world, player, LANES, sfx, get speed() { return ctx.speed; },
    hurt: (m) => ctx.hurt(m), fx: (a, b) => ctx.fx(a, b), after: (s2, fn) => after(s2, fn), banner: (a, b, c) => banner(a, b, c),
    name: (txt) => { ui.name.textContent = txt; }, hitBoss: () => hitBoss(), isFight: () => st.mode === 'fight' && st.kind === 'chess', anim: (b, n, o) => anim(b, n, o),
  });
  const prism = createPrism({
    player, LANES, sfx, get speed() { return ctx.speed; },
    hurt: (m) => ctx.hurt(m), fx: (a, b) => ctx.fx(a, b), after: (s2, fn) => after(s2, fn), banner: (a, b, c) => banner(a, b, c),
    name: (txt) => { ui.name.textContent = txt; }, hitBoss: () => hitBoss(), isFight: () => st.mode === 'fight' && st.kind === 'prism', anim: (b, n, o) => anim(b, n, o),
    addObstacle: (k, l, z) => ctx.addObstacle?.(k, l, z),
    scene, world, get waveTex() { return waveTex; }, makeHole: (l, z, f) => makeHole(l, z, f), lastAct: () => lastAct, now: () => st.t, noteSprite: (sz) => noteSprite(sz),
  });
  function init(gltf) {
    B.tmpl = gltf;
    const blue = tinted(gltf, '#a9c3ff', BLUE), orange = tinted(gltf, '#ffc790', ORANGE);
    const pair = new THREE.Group(); pair.visible = false; scene.add(pair);
    for (const [b, x, ry] of [[blue, -0.36, 1.05], [orange, 0.36, -1.05]]) { scene.remove(b.g); pair.add(b.g); b.g.position.x = x; b.g.rotation.y = ry; b.g.visible = true; }
    pair.scale.setScalar(1.6); B.twins = { g: pair, blue, orange };
    B.wrath = tinted(gltf, '#ff9a92', RED); B.wrath.g.scale.setScalar(1.7);
    B.joy = tinted(gltf, '#fff0a0', GOLD); B.joy.g.scale.setScalar(1.45);
    // Lilac (composed, singing) and Glitch (green, twitchy, on a leash)
    // Ivory & Onyx: side by side with a chess clock floating between them
    const ivory = tinted(gltf, '#fff4e2', '#fff1cf'), onyx = tinted(gltf, '#4b4148', '#6b5a86');
    const board = new THREE.Group(); board.visible = false; scene.add(board);
    for (const [b, x, ry] of [[ivory, -0.95, Math.PI + 0.25], [onyx, 0.95, Math.PI - 0.25]]) { scene.remove(b.g); board.add(b.g); b.g.position.x = x; b.g.rotation.y = ry; b.g.visible = true; }
    const clock = chess.makeClock(); clock.position.set(0, 0.55, 0.35); clock.scale.setScalar(0.55); board.add(clock);
    board.scale.setScalar(1.6); B.chess = { g: board, white: ivory, black: onyx, clock };
    prism.init(gltf, tinted, scene); B.prism = { g: prism.group };
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

  const st = { won: new Set(), seen: new Set(), mode: 'none', kind: null, hp: 0, maxHp: 3, t: 0, nextAt: 520, order: ['twins', 'wrath', 'duet', 'chess', 'prism'], beaten: 0, startZ: 0, boss: null, z: 0, y: 0, x: 0 };
  const waves = [], holes = [], cracks = [], shots = [], springs = [];
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
    for (const sp of springs) world.remove(sp.mesh); springs.length = 0;
    for (const s2 of steam) scene.remove(s2.sp); steam.length = 0;
    for (const c of cracks) world.remove(c.mesh); cracks.length = 0; clearX();
    for (const s of shots) scene.remove(s.mesh); shots.length = 0;
    if (lantern) world.remove(lantern.mesh); lantern = null; timers = [];
    if (B.twins) B.twins.g.visible = false; if (B.wrath) { B.wrath.g.visible = false; B.joy.g.visible = false; }
    if (B.duet) { B.duet.lilac.g.visible = B.duet.glitch.g.visible = B.duet.leash.visible = false; B.duet.crack = 0; }
    clearDuet(); chess.clear(); if (B.chess) B.chess.g.visible = false; prism.clear();
    st.seen = new Set(); st.won = new Set();
    Object.assign(st, { mode: 'none', kind: null, hp: 0, t: 0, nextAt: 520, beaten: 0, boss: null, slam: null, air: null, fury: null, furyDone: false }); lastAct = -99; furyRows.length = 0;
    ui.legend.classList.add('hidden'); setBar(); ctx.bossMusic(false);
  }
  // called by the track generator the first time it lays a quiet block for a pending boss
  function quietStartsAt(z) { if (st.mode === 'pending' && st.startZ === null) st.startZ = z - 4; }
  function begin() {
    st.mode = 'intro'; timers = []; st.maxHp = 3; st.hp = st.maxHp; st.splitSeen = false;
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
    } else if (st.kind === 'prism') {
      st.boss = B.prism; st.z = p.z - 60; st.y = 2.8; st.x = 0; prism.begin();
      banner('Everyone\u2019s here\u2026', 'all of them, at once', 3.0);
      ui.name.textContent = 'Neon Amara';
    } else if (st.kind === 'chess') {
      const c = B.chess; st.boss = c; c.g.visible = true; st.z = p.z - 60; st.y = 2.4; st.x = 0;
      c.white.g.position.set(-0.95, 0, 0); c.black.g.position.set(0.95, 0, 0);
      anim(c.white, 'Fly'); anim(c.black, 'Fly');
      banner('Ivory & Onyx', 'a game of chess on the rooftops', 3.2);
      ui.name.textContent = 'Ivory & Onyx';
      chess.begin(c);
    } else {
      st.boss = B.wrath; B.wrath.g.visible = true; B.joy.g.visible = true; B.wrath.g.rotation.set(0, 0, 0); B.joy.g.rotation.set(0, 0, 0);
      st.z = p.z - 60; st.y = 3.2; st.x = 0; anim(B.wrath, 'Rage'); anim(B.joy, 'Dance'); B.joy.dance = 'Dance'; B.joy.danceT = 3; st.lastBroken = false; st.fury = null; st.furyDone = false; furyRows.length = 0;
      B.joy.g.position.set(1.7, 2.8, st.z + 0.6); st.air = null; st.slam = null; st.rowsNoSpring = 1;
      banner('Wrath & Joy', 'avoid the red cracks · bounce on Joy\u2019s golden springs!', 3.4);
      ui.name.textContent = 'Wrath & Joy';
    }
    ctx.giveShield();   // a bandage to start every fight
    ctx.bossMusic(true);
    sfx.bossIntro(); setBar();
    after(2.6, () => { st.mode = 'fight'; st.t0 = st.t; st.round = 0; st.slamsSinceHit = 0; if (st.kind === 'twins') { ui.legend.innerHTML = LEGEND.twins; ui.legend.classList.remove('hidden'); volley(); } else if (st.kind === 'chess') { ui.legend.innerHTML = LEGEND.chess; ui.legend.classList.remove('hidden'); chess.start(); } else if (st.kind === 'prism') { ui.legend.innerHTML = LEGEND.prism; ui.legend.classList.remove('hidden'); prism.start(); } else if (st.kind === 'duet') { ui.legend.innerHTML = LEGEND.duet; ui.legend.classList.remove('hidden'); duetCycle(); } else { ui.legend.innerHTML = LEGEND.wrath; ui.legend.classList.remove('hidden'); wrathNext(1.0); } });
  }
  const LEGEND = {
    twins: '<span><b class="b">● blue wave</b> keep running, don\u2019t move</span><span><b class="o">● orange wave</b> slide!</span>',
    twinsSplit: '<span><b class="b">blue side</b> keep running, don\u2019t move</span><span><b class="o">orange side</b> slide!</span><span>pick your side early</span>',
    wrath: '<span><b class="r">● red</b> crater</span><span><b class="o">🔥</b> fire, switch lanes</span><span><b class="y">● gold</b> spring, bounce into Wrath</span><span><b class="r">✖ red X</b> trap, she\u2019ll smash it</span>',
    fury: '<span><b class="r">Wrath has Joy!</b> no springs for 10 seconds</span><span>the roof is cracking everywhere, find the safe lane</span>',
    prism: '<span><b>white ring</b> shrinks around you</span><span>jump the moment it <b class="y">turns gold</b> to knock the ball back</span><span>keep the rally going</span>',
    chess: '<span><b>glowing squares</b> hurt, stand on the other colour</span><span><b>pieces</b> move like chess pieces</span><span><b class="y">gold path</b> your move: take the king</span>',
    duet: '<span><b class="p">♪ low</b> left · <b class="p">♪ mid</b> centre · <b class="p">♪ high</b> right</span><span>then <b class="p">sing it back</b>!</span>',
  };
  function defeated() {
    st.mode = 'outro'; st.beaten++; st.won.add(st.kind); ctx.bossMusic(false);
    ui.legend.classList.add('hidden'); setBar();
    banner(st.kind === 'twins' ? 'The twins drift apart!' : st.kind === 'duet' ? 'The leash snaps!' : st.kind === 'chess' ? 'Checkmate!' : st.kind === 'prism' ? 'The colours scatter!' : 'Wrath calms down… Joy hugs her', `bosses defeated: ${st.beaten}`, 2.8);
    if (st.kind === 'wrath') { clearX(); anim(B.wrath, 'Hug'); anim(B.joy, 'Hug'); st.slam = null; st.air = null; for (const c of cracks) world.remove(c.mesh); cracks.length = 0; }
    if (st.kind === 'duet') { B.duet.leash.visible = false; clearDuet(); sfx.snap(); }
    if (st.kind === 'chess') chess.clear();
    if (st.kind === 'prism') prism.defeated();
    sfx.bossDown(); ctx.fx(0.5, 0.6);
    // shower of moths down the road
    const p = player;
    for (let i = 0; i < 26; i++) ctx.addMoth(LANES[i % 3], 1 + Math.sin(i) * 0.4, p.z - 10 - i * 1.3, i % 9 === 4);
    st.outroT = 0; st.finale = false;
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
    else if (st.kind === 'chess') chess.afterHit(st.hp);
    else if (st.kind === 'prism') prism.afterHit(st.hp);
    else { anim(B.wrath, 'Hit', { once: true, after: 'Rage', fade: 0.1 }); sfx.giggle(); B.joy.spin = 1; setTimeout(() => sfx.growl(), 500); }
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
    // third round: the twins split the roof between them, blue on one side, orange on the other
    if (st.round >= 2) seq = seq.map((c, i) => (i === 0 || Math.random() < 0.7 ? 'split' : c));
    seq.forEach((c, i) => {
      after(i * gap, () => { if (st.mode !== 'fight') return; if (c === 'split') { charge('blue'); charge('orange'); } else charge(c); });
      after(i * gap + 0.5, () => { if (st.mode !== 'fight') return; c === 'split' ? sendSplit() : sendWave(c); });
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
  // a split wave: blue (keep running) over one or two lanes, orange (slide) over the rest
  function sendSplit() {
    const blueLeft = Math.random() < 0.5, nBlue = Math.random() < 0.5 ? 1 : 2;
    const edge = blueLeft ? (nBlue === 1 ? -0.85 : 0.85) : (nBlue === 1 ? 0.85 : -0.85);   // x of the seam between them
    const blueLanes = [0, 1, 2].filter((l) => (blueLeft ? LANES[l] < edge : LANES[l] > edge));
    const g = bgOnly(new THREE.Group());
    for (const c of ['blue', 'orange']) {
      const left = (c === 'blue') === blueLeft;
      const x0 = left ? -3.7 : edge, x1 = left ? edge : 3.7, w = x1 - x0, h = c === 'blue' ? 3.1 : 2.2, y0 = c === 'blue' ? 0 : 0.95;
      const geo = new THREE.PlaneGeometry(w, h, 12, 1);
      const pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i) + (x0 + x1) / 2; pos.setZ(i, -0.035 * x * x); }
      const m = bgOnly(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: waveTex[c], transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false })));
      m.position.set((x0 + x1) / 2, y0 + h / 2, 0);
      const e = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.08), new THREE.MeshBasicMaterial({ color: '#fff6e8', transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide })); e.position.y = -h / 2; m.add(e);
      g.add(m);
    }
    const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 3.2), new THREE.MeshBasicMaterial({ color: '#fff6e8', transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide })); seam.position.set(edge, 1.6, 0.02); g.add(seam);
    g.position.set(0, 0, st.boss.g.position.z + 0.5); world.add(g);
    waves.push({ mesh: g, color: 'split', blueLanes, z: g.position.z, done: false, born: st.t });
    sfx.wave(0); sfx.wave(1);
    if (!st.splitSeen) { st.splitSeen = true; banner('Split wave!', 'blue side: keep running \u00b7 orange side: slide', 2.2); ui.legend.innerHTML = LEGEND.twinsSplit; }
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

  // ---------------------------------------------------------------- Wrath & Joy: cracks, holes, springs
  const goldCrackTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.strokeStyle = '#ffd84a'; g.lineWidth = 5; g.shadowColor = '#ffb000'; g.shadowBlur = 12;
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; g.beginPath(); g.moveTo(64 + Math.cos(a) * 14, 64 + Math.sin(a) * 14); g.lineTo(64 + Math.cos(a) * 52, 64 + Math.sin(a) * 52); g.stroke(); }
    g.beginPath(); g.arc(64, 64, 12, 0, 7); g.fillStyle = '#ffe680'; g.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const fireCrackTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.strokeStyle = '#ff8a1a'; g.lineWidth = 6; g.shadowColor = '#ff3a00'; g.shadowBlur = 14;
    for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(64, 64); let x = 64, y = 64; const a = (i / 8) * Math.PI * 2 + Math.random() * 0.3; for (let k = 0; k < 4; k++) { x += Math.cos(a + rand(-0.5, 0.5)) * 15; y += Math.sin(a + rand(-0.5, 0.5)) * 15; g.lineTo(x, y); } g.stroke(); }
    // a flame mark in the middle
    g.shadowBlur = 8; g.fillStyle = '#ffd04a'; g.beginPath(); g.moveTo(64, 30); g.bezierCurveTo(88, 58, 84, 92, 64, 96); g.bezierCurveTo(44, 92, 40, 58, 64, 30); g.fill();
    g.fillStyle = '#ff6a1a'; g.beginPath(); g.moveTo(64, 56); g.bezierCurveTo(76, 72, 74, 90, 64, 92); g.bezierCurveTo(54, 90, 52, 72, 64, 56); g.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const fireTex = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 256, 0, 0); gr.addColorStop(0, 'rgba(255,240,170,1)'); gr.addColorStop(0.25, 'rgba(255,170,40,.95)'); gr.addColorStop(0.6, 'rgba(240,70,20,.75)'); gr.addColorStop(1, 'rgba(120,20,10,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
    g.globalCompositeOperation = 'destination-in';   // ragged flame edges, one mask path
    g.beginPath(); g.moveTo(32, 0);
    const rows = []; for (let y = 0; y <= 256; y += 8) rows.push([y, 32 * (0.7 + 0.3 * Math.random()) * (0.35 + 0.65 * (y / 256))]);
    for (const [y, w] of rows) g.lineTo(32 + w, y);
    for (const [y, w] of rows.reverse()) g.lineTo(32 - w, y);
    g.closePath(); g.fillStyle = '#fff'; g.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  function wrathNext(delay) { after(delay, () => { if (st.mode === 'fight' && !st.air && !st.fury) makeRow(); }); }
  function makeRow() {
    const p = player, r = st.round;
    const tele = Math.max(0.72, 1.1 - r * 0.12);
    const z = p.z - (ctx.speed * (tele + 0.55) + 6);
    // more red the angrier she gets; Joy plants a spring in most rows, always at least every other row
    const reds = r < 1 ? 1 : 2;
    const gold = st.rowsNoSpring >= 1 || Math.random() < 0.55;
    const lanes = [0, 1, 2].sort(() => Math.random() - 0.5);
    if (Math.random() < 0.6) { lanes.splice(lanes.indexOf(p.lane), 1); lanes.unshift(p.lane); }   // Wrath likes to aim at you
    const row = [];
    const fireChance = [0.25, 0.4, 0.5, 0.55][Math.min(3, Math.floor(r))];
    for (let i = 0; i < reds; i++) row.push({ lane: lanes[i], kind: 'red', fire: Math.random() < fireChance });
    if (gold) row.push({ lane: lanes[reds], kind: 'gold' });
    // the angrier Wrath gets, the more often she smashes Joy's spring (never twice in a row)
    const breakSpring = gold && !st.lastBroken && Math.random() < [0.25, 0.4, 0.55, 0.6][Math.min(3, Math.floor(r))];
    st.lastBroken = breakSpring;
    st.rowsNoSpring = gold && !breakSpring ? 0 : st.rowsNoSpring + 1;
    for (const c of row) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), new THREE.MeshBasicMaterial({ map: c.kind === 'red' ? (c.fire ? fireCrackTex : crackTex) : goldCrackTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      m.rotation.x = -Math.PI / 2; m.position.set(LANES[c.lane], 0.03, z); bgOnly(m); world.add(m);
      c.crack = { mesh: m, born: st.t, tele }; cracks.push(c.crack);
      if (c.kind === 'gold' && breakSpring) {   // a red flicker over the gold: Wrath has her eye on this one
        const warn = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        warn.rotation.x = -Math.PI / 2; warn.position.set(LANES[c.lane], 0.04, z); bgOnly(warn); world.add(warn);
        c.warn = { mesh: warn, born: st.t, tele, flicker: true }; cracks.push(c.warn);
        c.x = markX(c.lane, z);
      }
    }
    sfx.crackWarn(); if (gold) sfx.giggle();
    const reds_ = row.filter((c) => c.kind === 'red');
    st.slam = { row, z, phase: 'aim', tele, breakSpring, wrathLane: reds_[Math.floor(reds_.length / 2)].lane, joyLane: gold ? row.find((c) => c.kind === 'gold').lane : null };
    after(tele - 0.45, () => { if (st.mode === 'fight' && st.slam) { st.slam.phase = 'wind'; anim(B.wrath, 'Slam', { once: true }); if (st.slam.joyLane !== null) { B.joy.busy = true; anim(B.joy, 'Jump', { once: true, after: B.joy.dance || 'Dance' }); } } });
    after(tele, () => { if (st.mode === 'fight' && st.slam) impact(); });
  }
  function impact() {
    const s = st.slam; s.phase = 'impact';
    ctx.fx(0.15, 0.45); sfx.slam();
    for (const c of s.row) {
      world.remove(c.crack.mesh); cracks.splice(cracks.indexOf(c.crack), 1);
      if (c.kind === 'red') { makeHole(c.lane, s.z, c.fire); ctx.sparkle(new THREE.Vector3(LANES[c.lane], 0.3, s.z), PAL.dusk, 14); }
      else { if (c.warn) { world.remove(c.warn.mesh); cracks.splice(cracks.indexOf(c.warn), 1); } c.spring = makeSpring(c.lane, s.z); ctx.sparkle(new THREE.Vector3(LANES[c.lane], 0.5, s.z), GOLD, 16); sfx.springPlant(); }
    }
    s.phase = 'rise';
    after(0.3, () => { B.joy.busy = false; });
    if (s.breakSpring) {
      // Wrath wheels around and stomps Joy's spring flat
      const g = s.row.find((c) => c.kind === 'gold');
      after(0.2, () => { if (st.slam !== s || st.mode !== 'fight') return; s.wrathLane = g.lane; s.phase = 'bwind'; anim(B.wrath, 'Slam', { once: true }); sfx.growl(); });
      after(0.55, () => {
        if (st.slam !== s || st.mode !== 'fight') return;
        s.phase = 'bimpact'; ctx.fx(0.2, 0.55); sfx.slam(); sfx.sad();
        const sp = g.spring; if (sp && !sp.used) { world.remove(sp.mesh); springs.splice(springs.indexOf(sp), 1); }
        if (g.x) { clearX(g.x); g.x = null; }
        makeHole(g.lane, s.z); ctx.sparkle(new THREE.Vector3(LANES[g.lane], 0.6, s.z), GOLD, 14); ctx.sparkle(new THREE.Vector3(LANES[g.lane], 0.6, s.z), RED, 14);
        B.joy.busy = true; anim(B.joy, 'Hit', { once: true, after: B.joy.dance || 'Dance', fade: 0.1 }); after(1.0, () => { B.joy.busy = false; });
        banner('Wrath smashed Joy\u2019s spring!', '', 1.1);
        s.phase = 'rise'; after(0.35, () => { if (st.mode === 'fight') anim(B.wrath, 'Rage'); });
        after(0.8, () => { if (st.slam === s) st.slam = null; if (st.mode === 'fight' && !st.air) { st.round = Math.min(st.round + 0.25, 3); wrathNext(0.6); } });
      });
    } else {
      after(0.35, () => { if (st.mode === 'fight') anim(B.wrath, 'Rage'); });
      after(0.9, () => { if (st.slam === s) st.slam = null; if (st.mode === 'fight' && !st.air) { st.round = Math.min(st.round + 0.25, 3); wrathNext(0.7); } });
    }
  }
  // a big red X: Wrath is going to smash the spring under it
  const xTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.lineCap = 'round';
    for (const [col, w] of [['#3a2a26', 30], ['#d8343c', 20]]) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(24, 24); g.lineTo(104, 104); g.moveTo(104, 24); g.lineTo(24, 104); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const xMarks = [];
  function markX(lane, z) {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 1.65), new THREE.MeshBasicMaterial({ map: xTex, transparent: true, depthWrite: false }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(LANES[lane], 0.06, z); bgOnly(floor); world.add(floor);
    const sign = bgOnly(new THREE.Sprite(new THREE.SpriteMaterial({ map: xTex, transparent: true, depthWrite: false, depthTest: false })));
    sign.scale.set(1.9, 1.9, 1); sign.position.set(LANES[lane], 2.7, z); sign.renderOrder = 5; world.add(sign);
    const m = { floor, sign, born: st.t }; xMarks.push(m); return m;
  }
  function clearX(m) { const list = m ? [m] : [...xMarks]; for (const x of list) { world.remove(x.floor); world.remove(x.sign); xMarks.splice(xMarks.indexOf(x), 1); } }
  function makeSpring(lane, z) {
    const g = new THREE.Group(); g.position.set(LANES[lane], 0, z);
    const gold = toon({ color: '#ffd23a', emissive: new THREE.Color('#a86a00'), emissiveIntensity: 0.5 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.12, 20), toon({ color: PAL.umber })); base.position.y = 0.06; g.add(base);
    for (let i = 0; i < 4; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 6, 20), toon({ color: '#d9d2c6' })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.18 + i * 0.13; g.add(ring); }
    const pad = new THREE.Group(); pad.position.y = 0.72; g.add(pad);
    const centre = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 18), toon({ color: '#7a4a1a' })); pad.add(centre);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const pet = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), gold); pet.scale.set(1, 0.3, 0.55); pet.position.set(Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42); pet.rotation.y = -a; pad.add(pet); }
    const glow = bgOnly(new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: '#ffd84a', transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }))); glow.scale.set(2.8, 2.8, 1); glow.position.y = 0.7; g.add(glow);
    world.add(g); const sp = { lane, z, mesh: g, pad, used: false }; springs.push(sp); return sp;
  }
  function launch(sp) {
    const p = player;
    sp.used = true; p.vy = 13.5; p.grounded = false; p.slideT = 0;
    sfx.boing(); ctx.sparkle(new THREE.Vector3(p.x, 0.6, p.z), GOLD, 18);
    // Wrath is caught off guard: she stops dead ahead in a lane, then tries to dodge
    const lane = LANES.reduce((b, x, i) => (Math.abs(st.x - x) < Math.abs(st.x - LANES[b]) ? i : b), 0);
    st.air = { z: p.z - ctx.speed * 0.62, lane, born: st.t };
    st.slam = null;
    banner('Boing!', 'steer into her!', 0.9);
    if (Math.random() < 0.65 || st.round >= 1.5) after(0.22, () => {
      if (!st.air) return;
      const opts = [st.air.lane - 1, st.air.lane + 1].filter((l) => l >= 0 && l <= 2);
      st.air.lane = opts[Math.floor(Math.random() * opts.length)]; sfx.escape();
    });
  }
  // ---------------------------------------------------------------- Wrath's fury: she seizes Joy, the roof shatters for 10 seconds
  const furyRows = [];
  function startFury() {
    if (st.mode !== 'fight') return;
    st.furyDone = true; st.fury = { until: st.t + 10 }; st.slam = null; st.air = null;
    // every spring still on the roof gets crushed
    for (const sp of [...springs]) if (!sp.used) { world.remove(sp.mesh); springs.splice(springs.indexOf(sp), 1); makeHole(sp.lane, sp.z); ctx.sparkle(new THREE.Vector3(LANES[sp.lane], 0.5, sp.z), RED, 10); }
    for (const c of cracks) world.remove(c.mesh); cracks.length = 0; clearX();
    anim(B.wrath, 'Grab', { fade: 0.15 }); B.joy.busy = true; anim(B.joy, 'Struggle', { fade: 0.15 });
    sfx.growl(); sfx.sad(); ctx.fx(0.3, 0.7);
    banner('Wrath turns on Joy!', 'no springs · survive 10 seconds', 2.2);
    ui.legend.innerHTML = LEGEND.fury;
    let lastSafe = player.lane;
    for (let k = 0; 0.7 + k * 0.55 < 9.6; k++) after(0.7 + k * 0.55, () => { if (st.fury && st.mode === 'fight') lastSafe = furyRow(lastSafe); });
  }
  function furyRow(prevSafe) {
    const p = player, tele = 0.8;
    const z = p.z - (ctx.speed * (tele + 0.3) + 5);
    // one lane always survives; it wanders, but never more than one lane from the last safe lane
    const near = [prevSafe - 1, prevSafe, prevSafe + 1].filter((l) => l >= 0 && l <= 2);
    const safe = near[Math.floor(Math.random() * near.length)];
    const others = [0, 1, 2].filter((l) => l !== safe);
    const reds = Math.random() < 0.75 ? others : [others[Math.floor(Math.random() * 2)]];
    const fires = reds.filter(() => Math.random() < 0.3);
    const row = { z, safe, reds, fires, cracks: [], done: false };
    for (const l of reds) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), new THREE.MeshBasicMaterial({ map: fires.includes(l) ? fireCrackTex : crackTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      m.rotation.x = -Math.PI / 2; m.position.set(LANES[l], 0.03, z); bgOnly(m); world.add(m);
      const c = { mesh: m, born: st.t, tele }; cracks.push(c); row.cracks.push(c);
    }
    furyRows.push(row); sfx.crackWarn();
    after(tele, () => {
      row.done = true;
      for (const c of row.cracks) { world.remove(c.mesh); const i = cracks.indexOf(c); if (i >= 0) cracks.splice(i, 1); }
      if (st.mode !== 'fight') return;
      for (const l of reds) { makeHole(l, z, fires.includes(l)); ctx.sparkle(new THREE.Vector3(LANES[l], 0.3, z), PAL.dusk, 10); }
      ctx.fx(0.05, 0.25); sfx.slam();
    });
    return safe;
  }
  function endFury() {
    st.fury = null; furyRows.length = 0;
    anim(B.wrath, 'Rage'); B.joy.spin = 1;
    anim(B.joy, 'Hit', { once: true, after: B.joy.dance || 'Dance', fade: 0.1 }); after(1.0, () => { B.joy.busy = false; });
    banner('Joy broke free!', 'here comes a spring, finish it!', 1.8); sfx.giggle();
    ui.legend.innerHTML = LEGEND.wrath;
    st.rowsNoSpring = 9; st.lastBroken = true;      // the next row always has a real spring
    wrathNext(0.9);
  }
  function makeHole(lane, z, fire = false) {
    const g = new THREE.Group(); g.position.set(LANES[lane], 0, z);
    let flame = null;
    if (fire) {
      flame = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ map: fireTex, color: '#ffffff', transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide, fog: false });
      const core = new THREE.MeshBasicMaterial({ map: fireTex, color: '#fff3c0', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
      for (const ry of [0, Math.PI / 3, -Math.PI / 3]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 7), mat); pl.position.y = 3.5; pl.rotation.y = ry; flame.add(pl); }
      for (const ry of [Math.PI / 6, -Math.PI / 6]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 5.5), core); pl.position.y = 2.75; pl.rotation.y = ry; flame.add(pl); }
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: '#ff7a1a', transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })); glow.scale.set(4, 4, 1); glow.position.y = 0.8; flame.add(glow);
      bgOnly(flame); g.add(flame); flame.userData.mat = mat;
      sfx.fireburst();
    }
    const pit = new THREE.Mesh(new THREE.PlaneGeometry(1.62, 3.4), pitMat); pit.rotation.x = -Math.PI / 2; pit.position.y = 0.015; g.add(pit);
    for (let i = 0; i < 9; i++) {
      const d = new THREE.Mesh(new THREE.BoxGeometry(rand(0.2, 0.45), 0.08, rand(0.2, 0.4)), debrisMat);
      const side = i % 2 ? 1 : -1; d.position.set(side * rand(0.7, 0.95), 0.05, rand(-1.8, 1.8)); d.rotation.set(rand(-0.4, 0.4), rand(0, 3), rand(-0.4, 0.4)); g.add(d);
    }
    world.add(g); holes.push({ lane, z, z0: z + 1.7, z1: z - 1.7, mesh: g, flame, hurt: false });
  }
  // craters no longer drop you through the roof: stepping in one, or touching a fire pillar at any height, hurts
  function holeAt() { return false; }
  function crateHazards(dt, t) {
    const p = player;
    for (const h of holes) {
      if (h.flame) {
        h.flame.scale.set(1 + Math.sin(t * 13 + h.z) * 0.08, 1 + Math.sin(t * 9 + h.z) * 0.09 + Math.sin(t * 23) * 0.04, 1);
        h.flame.rotation.y = Math.sin(t * 5 + h.z) * 0.25;
      }
      if (h.hurt || !p.alive) continue;
      const inLane = Math.abs(p.x - LANES[h.lane]) < 0.65;
      if (!inLane) continue;
      if (h.flame && Math.abs(p.z - h.z) < 1.0 && p.y < 6) { h.hurt = true; ctx.hurt('Burned by Wrath\u2019s fire!'); ctx.sparkle(new THREE.Vector3(p.x, 1, p.z), '#ff7a1a', 16); }
      else if (Math.abs(p.z - h.z) < 1.45 && p.y < 0.35) { h.hurt = true; ctx.hurt('You stepped in a crater!'); ctx.sparkle(new THREE.Vector3(p.x, 0.4, p.z), PAL.dusk, 12); }
    }
  }

  // ---------------------------------------------------------------- per-frame
  function update(dt) {
    const p = player, t = ctx.t;
    st.t += dt;
    for (const tm of [...timers]) if (st.t >= tm.at) { timers.splice(timers.indexOf(tm), 1); tm.fn(); }
    if (st.mode === 'none' && p.alive && ctx.dist > st.nextAt - 150) { st.mode = 'pending'; st.kind = st.order[st.beaten % st.order.length]; st.startZ = null; }
    if (st.mode === 'pending' && st.startZ !== null && p.z <= st.startZ) {
      // the first time you meet each boss in a run: keep running on empty roofs while a guide explains the fight
      if (!st.seen.has(st.kind) && ctx.brief) { st.seen.add(st.kind); st.mode = 'briefing'; ctx.brief(st.kind, () => { if (st.mode === 'briefing') begin(); }); }
      else { st.seen.add(st.kind); begin(); }
    }

    const b = st.boss;
    if (b && (st.mode === 'intro' || st.mode === 'fight' || st.mode === 'outro')) {
      // fly in, hover ahead of Amara
      let wantZ = p.z - (st.kind === 'twins' ? 15 : st.kind === 'duet' ? 14 : st.kind === 'chess' ? 16 : 12), wantY = st.kind === 'twins' ? 2.2 : st.kind === 'duet' ? 2.3 : st.kind === 'chess' ? 2.0 : 2.6, wantX = st.kind === 'duet' ? -0.9 + Math.sin(t * 0.35) * 0.5 : st.kind === 'chess' ? Math.sin(t * 0.4) * 0.3 : Math.sin(t * 0.7) * 0.9;
      let k = 3;
      let kx = null;
      if (st.kind === 'prism') { const wheel = prism.state && prism.state.phase !== 'fused'; wantZ = p.z - (wheel ? 12 : 16); wantY = wheel ? 3.2 : 2.8; wantX = 0; }
      if (st.kind === 'chess' && chess.queenOn) { wantZ = p.z - 11; wantY = 1.6; wantX = 0; k = 5; }
      if (st.kind === 'wrath' && st.air) { wantZ = st.air.z; wantY = 2.3; wantX = LANES[st.air.lane]; k = 6; kx = 3.2; }
      else if (st.kind === 'wrath' && st.slam) {
        const s = st.slam; wantX = LANES[s.wrathLane];
        if (s.phase === 'wind' || s.phase === 'bwind') { wantY = 3.4; wantZ = lerpZ(p.z - 12, s.z, 0.35); k = s.phase === 'bwind' ? 9 : 5; kx = s.phase === 'bwind' ? 14 : null; }
        else if (s.phase === 'impact' || s.phase === 'bimpact') { wantZ = s.z; wantY = 0; k = 60; }
        else if (s.phase === 'rise') { wantY = 2.6; k = 4; }
      }
      if (st.mode === 'outro') { st.outroT += dt; if (st.kind !== 'prism') { wantZ = st.z - 6 * dt; wantY = st.y + 4 * dt; k = 60; } }
      st.z += (wantZ - st.z) * Math.min(1, dt * k); st.y += (wantY - st.y) * Math.min(1, dt * k); st.x += (wantX - st.x) * Math.min(1, dt * (kx ?? k * 0.8));
      if (st.kind === 'wrath' && st.slam && (st.slam.phase === 'impact' || st.slam.phase === 'bimpact')) { st.z = st.slam.z; st.y = 0; st.x = LANES[st.slam.wrathLane]; }
      b.g.position.set(st.x, st.y + (st.mode === 'fight' ? Math.sin(t * 2) * 0.15 : 0), st.z);
      if (st.mode === 'outro' && st.kind === 'prism') { if (st.outroT > 1.7 && !st.finale) { st.finale = true; st.mode = 'finale'; ctx.finale?.(); } }
      else if (st.mode === 'outro') { if (st.kind !== 'wrath') b.g.rotation.z += dt * 3; b.g.scale.multiplyScalar(1 - dt * 0.35); if (st.outroT > 2.2) { b.g.visible = false; b.g.rotation.z = 0; b.g.scale.setScalar(st.kind === 'wrath' ? 1.7 : st.kind === 'prism' ? 1 : 1.6); if (st.kind === 'prism') prism.clear(); if (st.kind === 'wrath') { B.joy.g.visible = false; B.joy.g.scale.setScalar(1.45); } if (st.kind === 'duet') { B.duet.glitch.g.visible = false; B.duet.glitch.g.scale.setScalar(1.45); B.duet.glitch.g.rotation.z = 0; } st.mode = 'none'; st.boss = null; st.nextAt = ctx.dist + 650; } }
      // mixers + auras
      const list = st.kind === 'twins' ? [B.twins.blue, B.twins.orange] : st.kind === 'duet' ? [B.duet.lilac, B.duet.glitch] : st.kind === 'chess' ? [B.chess.white, B.chess.black] : st.kind === 'prism' ? [] : [B.wrath, B.joy];
      if (st.kind === 'prism') prism.update(dt, t, st.mode === 'fight');
      if (st.kind === 'chess') chess.update(dt, t, st.mode === 'fight');
      if (st.kind === 'duet') updateDuetBodies(dt, t);
      if (st.kind === 'wrath') updateJoy(dt, t);
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
        for (const ch of w.mesh.children) if (ch.material) ch.material.opacity = clamp(1 - Math.abs(d) / 30, 0.25, 1);
        w.mesh.scale.y = 1 + Math.sin((st.t - w.born) * 10) * 0.03;
        if (!w.done && p.z <= w.mesh.position.z) {
          w.done = true;
          const still = st.t - lastAct > 0.45 && p.grounded && p.slideT <= 0;
          const ducked = p.slideT > 0 && p.y < 0.5;
          const lane = [0, 1, 2].reduce((a, l) => (Math.abs(p.x - LANES[l]) < Math.abs(p.x - LANES[a]) ? l : a), 0);
          const kind = w.color === 'split' ? (w.blueLanes.includes(lane) ? 'blue' : 'orange') : w.color;
          const ok = kind === 'blue' ? still : ducked;
          if (ok) { ctx.addPoints(25); ctx.sparkle(new THREE.Vector3(p.x, 1.2, p.z - 0.5), kind === 'blue' ? BLUE : ORANGE, 8); sfx.dodge(); }
          else ctx.hurt(kind === 'blue' ? 'You moved in the blue wave!' : 'Slide under orange waves!');
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

    if (st.mode === 'fight' && st.kind === 'wrath') {
      if (st.fury) { const left = Math.max(0, st.fury.until - st.t); ui.name.textContent = `Wrath & Joy · ${Math.ceil(left)}s`; if (left <= 0) { ui.name.textContent = 'Wrath & Joy'; endFury(); } }
      for (const x of xMarks) { const k = st.t - x.born, pulse = 1 + Math.abs(Math.sin(k * 7)) * 0.25; x.sign.scale.set(1.9 * pulse, 1.9 * pulse, 1); x.sign.position.y = 2.7 + Math.sin(k * 5) * 0.12; x.floor.material.opacity = 0.75 + Math.sin(k * 14) * 0.25; }
      for (const c of cracks) { c.mesh.material.opacity = c.flicker ? (Math.sin((st.t - c.born) * 26) > 0 ? 1 : 0.1) : 0.55 + Math.sin((st.t - c.born) * 18) * 0.45; c.mesh.scale.setScalar(0.8 + Math.min(1, (st.t - c.born) / c.tele) * 0.5); }
      for (const sp of springs) {
        sp.pad.position.y = 0.72 + (sp.used ? Math.max(0, 0.5 - (st.t - (sp.usedT || 0))) : Math.abs(Math.sin(t * 5)) * 0.06);
        if (!sp.used && Math.abs(p.z - sp.z) < 0.9 && Math.abs(p.x - LANES[sp.lane]) < 0.8 && p.y < 0.4) { sp.usedT = st.t; launch(sp); }
      }
      // airborne: did Amara reach Wrath?
      if (st.air && p.z <= st.air.z) {
        const hit = Math.abs(p.x - st.x) < 1.0 && p.y > 1.0;
        st.air = null;
        if (hit) { p.vy = Math.max(p.vy, 5); hitBoss(); if (st.hp > 0) { st.round = Math.min(Math.floor(st.round) + 1, 3); banner('Smack!', `${st.hp} more`, 1.0); if (st.hp === 1 && !st.furyDone) after(1.1, startFury); else wrathNext(1.6); } }
        else { banner('She dodged!', 'catch the next spring', 1.2); wrathNext(1.2); }
      }
    }
    if (st.mode === 'fight' && st.kind === 'duet') updateDuetFight(dt, t);
    crateHazards(dt, t);
    // tidy holes and cracks left behind
    for (const h of [...holes]) if (h.z1 > p.z + 30) { world.remove(h.mesh); holes.splice(holes.indexOf(h), 1); }
    for (const sp of [...springs]) if (sp.z > p.z + 30) { world.remove(sp.mesh); springs.splice(springs.indexOf(sp), 1); }
  }
  const lerpZ = (a, b, k) => a + (b - a) * k;
  function updateJoy(dt, t) {
    const j = B.joy, w = B.wrath.g.position, p = player, s = st.slam;
    let want, k = 5;
    if (st.fury) { want = w.clone().add(new THREE.Vector3(0, 0.05 + Math.sin(t * 11) * 0.04, 0.85)); k = 14; }
    else if (st.mode === 'outro') { want = w.clone().add(new THREE.Vector3(0.55, 0, 0.1)); k = 4; j.g.rotation.y = -1.1; B.wrath.g.rotation.y = 1.1; }
    else if (s && s.joyLane !== null && s.phase === 'wind') { want = new THREE.Vector3(LANES[s.joyLane], 2.4, lerpZ(p.z - 10, s.z, 0.5)); k = 6; }
    else if (s && s.joyLane !== null && s.phase === 'impact') { want = new THREE.Vector3(LANES[s.joyLane], 0.2, s.z); k = 60; }
    else { want = w.clone().add(new THREE.Vector3(st.x > 0.5 ? -1.8 : 1.8, -0.3 + Math.abs(Math.sin(t * 3.2)) * 0.7, 0.8)); }   // bouncy, never still
    j.g.position.lerp(want, Math.min(1, dt * k));
    if (st.fury) { j.g.rotation.y = Math.PI + Math.sin(t * 9) * 0.15; B.wrath.g.rotation.y = 0; }
    else if (st.mode !== 'outro') {
      // Joy never does the same dance for long
      j.danceT = (j.danceT ?? 3) - dt;
      if (j.danceT <= 0 && !j.busy) {
        const opts = ['Dance', 'Twirl', 'Cheer', 'Clap'].filter((d) => d !== j.dance);
        j.dance = opts[Math.floor(Math.random() * opts.length)]; anim(j, j.dance, { fade: 0.35 });
        j.danceT = 2.4 + Math.random() * 1.8; if (Math.random() < 0.4) sfx.giggle();
      }
      j.spin = Math.max(0, (j.spin || 0) - dt);
      if (j.spin > 0) j.g.rotation.y = (1 - j.spin) * Math.PI * 4;
      else if (j.dance === 'Twirl' && !j.busy) j.g.rotation.y += dt * 7;
      else j.g.rotation.y = Math.sin(t * 2.4) * 0.35;
    }
    angerFx(dt, t);
  }
  // Wrath boils over: steam from her head, a throbbing aura and trembling, all worse with every hit
  const steam = [];
  const steamMat = new THREE.SpriteMaterial({ map: T.glow, color: '#5a1a14', transparent: true, opacity: 0.6, depthWrite: false });
  let steamT = 0, growlT = 4;
  function angerFx(dt, t) {
    const w = B.wrath, anger = st.fury ? 1.3 : clamp((st.maxHp - st.hp) / 2, 0, 1);
    w.head = w.head || w.root.getObjectByName('Head');
    // trembling
    const calm = st.mode === 'outro';
    const amp = calm ? 0 : 0.03 + anger * 0.08;
    w.root.position.set((Math.random() - 0.5) * amp, (Math.random() - 0.5) * amp * 0.5, 0);
    // aura: deeper red, bigger and faster with anger
    const pulse = 0.5 + 0.5 * Math.sin(t * (7 + anger * 7));
    w.aura.material.color.set('#ff2a14'); w.aura.material.opacity = 0.55 + pulse * (0.25 + anger * 0.35) + (w.charge || 0);
    w.aura.scale.set(3 + anger * 1.8 + pulse * 0.5, 3.6 + anger * 2 + pulse * 0.5, 1);
    w.root.traverse((o) => { if (o.isMesh) o.material.emissiveIntensity = 0.55 + anger * 0.45 + pulse * 0.15 * anger; });
    // steam puffs
    steamT -= dt;
    if (steamT <= 0 && w.head && w.g.visible && !calm) {
      steamT = 0.22 - anger * 0.14;
      for (const side of [-1, 1]) {
        const sp = bgOnly(new THREE.Sprite(steamMat.clone()));
        sp.position.copy(w.head.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(side * 0.18, 0.25, 0));
        sp.scale.setScalar(0.35); scene.add(sp);
        steam.push({ sp, v: new THREE.Vector3(side * (0.4 + Math.random() * 0.4), 1.4 + Math.random(), 0), life: 0.9 });
      }
    }
    for (const s2 of [...steam]) {
      s2.life -= dt; s2.sp.position.addScaledVector(s2.v, dt); s2.sp.scale.setScalar(0.35 + (0.9 - s2.life) * 1.3); s2.sp.material.opacity = Math.max(0, s2.life) * 0.7;
      if (s2.life <= 0) { scene.remove(s2.sp); s2.sp.material.dispose(); steam.splice(steam.indexOf(s2), 1); }
    }
    growlT -= dt; if (growlT <= 0 && !calm) { growlT = 5 - anger * 2.5 + Math.random() * 2; if (anger > 0) sfx.growl(); }
  }

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
    get prismWheel() { return prism.wheel; }, get prismGroup() { return prism.group; }, noteSprite: (sz) => noteSprite(sz), anim: (b, n, o) => anim(b, n, o),
    debugKill() { if (st.mode === 'fight') { st.hp = 1; hitBoss(); } },
    loopOn() {   // after the ending: keep running the same game from the first boss again
      prism.clear(); timers = []; ui.legend.classList.add('hidden');
      Object.assign(st, { mode: 'none', kind: null, boss: null, finale: false, nextAt: ctx.dist + 450 }); setBar();
    },
    laneLocked() { return st.kind === 'prism' && prism.locked; },
    onJump() { return st.kind === 'chess' && st.mode === 'fight' && chess.queenOn ? chess.queenFire() : false; },
    get beaten() { return st.beaten; }, get won() { return st.won; }, get briefing() { return st.mode === 'briefing'; },
    get state() { return { prism: st.kind === 'prism' ? prism.state : null, chess: st.kind === 'chess' ? chess.state : null, mode: st.mode, kind: st.kind, hp: st.hp, nextAt: Math.round(st.nextAt), slam: st.slam ? { row: st.slam.row.map((c) => ({ lane: c.lane, kind: c.kind === 'gold' && st.slam.breakSpring ? 'trap' : c.kind === 'red' && c.fire ? 'fire' : c.kind })), phase: st.slam.phase, dz: +(player.z - st.slam.z).toFixed(1) } : null, air: st.air ? { lane: st.air.lane, dz: +(player.z - st.air.z).toFixed(1) } : null, springs: springs.filter((x) => !x.used).map((x) => ({ lane: x.lane, dz: +(player.z - x.z).toFixed(1) })), wrathX: +st.x.toFixed(2), fury: st.fury ? { left: +(st.fury.until - st.t).toFixed(1), rows: furyRows.filter((r) => !r.done || player.z - r.z > -2).filter((r) => player.z - r.z > -1.8).map((r) => ({ safe: r.safe, reds: r.reds, fires: r.fires, dz: +(player.z - r.z).toFixed(1) })) } : null, waves: waves.filter((w) => !w.done).map((w) => ({ c: w.color, blue: w.blueLanes, dz: +(player.z - w.mesh.position.z).toFixed(1) })), lantern: lantern ? { lane: lantern.lane, dz: +(player.z - lantern.z).toFixed(1) } : null, holes: holes.length, fires: holes.filter((h) => h.flame).length, duet: duet.phase ? { glyphs: duet.glyphs.length, phase: duet.phase, melody: duet.melody, strike: duet.nextStrike, rows: duet.rows.filter((r) => !r.done).map((r) => ({ i: r.i, dz: +(player.z - r.z).toFixed(1) })) } : null }; },
    debugCrater(lane, dz, fire) { makeHole(lane, player.z - dz, fire); },
    debugPromote() { chess.debugPromote(); },
    debugPrismAttack(k) { return prism.debugAttack(k); },
    debugPrismFinal(hh) { prism.debugFinal(hh); },
    force(kind) { st.mode = 'pending'; st.kind = kind; st.startZ = null; },
    // test hook: pretend some bosses were already beaten and the next one is due now
    skipTo(beaten) { st.beaten = beaten; st.nextAt = ctx.dist + 150; },
  };
}
