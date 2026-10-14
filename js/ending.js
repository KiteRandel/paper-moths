// The ending. Neon Amara splits back into everyone, and each pair says goodbye in their own way. Then they turn into
// streams of coloured paper moths that fly into Amara, giving her a rainbow outline, and she flies off to the moon.
// A sketchbook card closes the run: run again from the start, or loop the same game and keep going. Made by KiteRandel.
import * as THREE from 'three';
import { T } from './art.js?v=43';
import { rainbowHull } from './prism.js?v=43';

const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
// the wheel order in prism.js: blue, orange, Wrath, Joy, Lilac, Glitch, Ivory, Onyx, Pink
const COL = ['#5d8fe8', '#f0913a', '#d8343c', '#ffcf33', '#9a5fe0', '#3fd45a', '#fff1cf', '#6b5a86', '#ff7fb6'];
const VOICE = { blue: ['Blue', '#3a63b8'], orange: ['Orange', '#c4651a'], wrath: ['Wrath', '#b52a2a'], joy: ['Joy', '#b88400'], lilac: ['Lilac', '#7a3fc0'], glitch: ['Glitch', '#2f9a3f'], ivory: ['Ivory', '#9a7a2a'], onyx: ['Onyx', '#4a3a5a'], pink: ['Pink', '#c94f86'] };
const CREDITS = ['Amara & the Paper Moths', 'a game by KiteRandel', 'The Twin Lanterns', 'Wrath & Joy', 'Lilac & Glitch', 'Ivory & Onyx', 'Pink, who runs the shop', 'Neon Amara', 'and you, for running'];
const RIM = 10.6;            // radius of the moon's disc on its 46 m plane
const BYE_AT = 2.2, SLOT = 2.5;

export function createEnding(h) {
  // h: { scene, player, play, camera, sfx, sparkle, wheel(), group(), noteSprite, stats(), shopVisits(), mothIcon(), onAgain, onLoop }
  const { scene, player, sfx } = h;
  const E = { on: false, t: 0, phase: null, anchorZ: 0, speed: 0, moonAt: null, timers: [], moths: [], trail: [], floaters: [], hist: [], hull: [], thick: 0, snap: false };
  const $ = (id) => document.getElementById(id);
  const after = (s, fn) => E.timers.push({ at: E.t + s, fn });

  // ---------------------------------------------------------------- little helpers
  const wingGeo = new THREE.PlaneGeometry(0.26, 0.26); wingGeo.translate(0.13, 0, 0);
  const mats = {};
  function moth(col, s = 1.2) {
    const m = mats[col] || (mats[col] = new THREE.MeshBasicMaterial({ map: T.wing, color: new THREE.Color(col).lerp(new THREE.Color('#ffffff'), 0.35), alphaTest: 0.5, side: THREE.DoubleSide }));
    const g = new THREE.Group(); const l = new THREE.Mesh(wingGeo, m), r = new THREE.Mesh(wingGeo, m); r.scale.x = -1; g.add(l, r);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: col, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending })); glow.scale.setScalar(0.8); g.add(glow);
    g.traverse((o) => o.layers.set(1)); g.rotation.x = -0.5; g.scale.setScalar(s); g.userData = { l, r, t: rand(0, 6) }; scene.add(g);
    return g;
  }
  function flap(g, dt, sp = 18) { const u = g.userData; u.t += dt * sp; u.l.rotation.y = Math.sin(u.t) * 0.9; u.r.rotation.y = -Math.sin(u.t) * 0.9; }
  const voiceEl = $('voice'); let voiceT = null;
  function say(who, text, secs = 1.5) {
    if (!voiceEl) return; const [name, col] = VOICE[who];
    voiceEl.querySelector('b').textContent = name; voiceEl.querySelector('b').style.color = col; voiceEl.querySelector('span').textContent = text;
    voiceEl.classList.remove('on'); void voiceEl.offsetWidth; voiceEl.classList.add('on');
    clearTimeout(voiceT); voiceT = setTimeout(() => voiceEl.classList.remove('on'), secs * 1000);
  }
  function anim(b, name, o) { h.anim(b, name, o); }
  function popBadge(kind) { const b = document.querySelector(`.badge[data-kind="${kind}"]`); if (!b) return; b.classList.add('got'); b.classList.remove('pop'); void b.getBoundingClientRect(); b.classList.add('pop'); }
  const bodies = () => h.wheel();
  const linePos = (i) => new THREE.Vector3((i - 4) * 1.05, 3.0 + Math.sin(E.t * 1.5 + i) * 0.15, E.anchorZ - 9);

  // ---------------------------------------------------------------- the goodbyes, one pair at a time
  const BYE = [
    { kind: 'twins', ids: [0, 1], go(b) {
      anim(b[0], 'Hug'); anim(b[1], 'Hug'); b[0].ry = Math.PI + 0.75; b[1].ry = Math.PI - 0.75;
      say('blue', 'Thanks for holding still for us.', 1.3); after(1.25, () => say('orange', '…and for sliding!', 1.2));
    } },
    { kind: 'wrath', ids: [2, 3], go(b) {
      anim(b[0], 'Clap'); anim(b[1], 'Cheer'); b[0].ry = Math.PI + 0.3;
      say('wrath', '…Fine. You were good.', 1.3); after(1.25, () => { say('joy', 'SO GOOD!!', 1.2); sfx.giggle(); });
    } },
    { kind: 'duet', ids: [4, 5], go(b) {
      anim(b[0], 'Sing'); anim(b[1], 'Dance');
      say('lilac', 'One last song~', 1.2);
      [[0.15, 72, -0.9], [0.55, 76, 0], [0.95, 79, 0.9]].forEach(([at, m, x]) => after(at, () => {
        sfx.sing?.(m, 0.42, true);
        const n = h.noteSprite(0.9); n.position.copy(b[0].g.position).add(new THREE.Vector3(x, 2.4, 0)); scene.add(n); E.floaters.push({ o: n, life: 1.6, vy: 0.9 });
      }));
      after(1.3, () => { say('glitch', 'zzt— free! —zzt', 1.1); sfx.glitch(); });
    } },
    { kind: 'chess', ids: [6, 7], go(b) {
      anim(b[0], 'Idle'); anim(b[1], 'Idle'); b[0].ry = Math.PI + 0.25; b[1].ry = Math.PI - 0.25;
      after(0.15, () => { b[0].tilt = 0.5; b[1].tilt = 0.5; sfx.dodge(); }); after(1.5, () => { b[0].tilt = 0; b[1].tilt = 0; });
      say('ivory', 'A lovely game. Thank you.', 1.3); after(1.25, () => say('onyx', 'Rematch. Soon.', 1.2));
    } },
    { kind: 'prism', ids: [8], go(b) {
      anim(b[0], 'Perch'); sfx.giggle();
      const shy = h.shopVisits() === 0;
      say('pink', shy ? 'You never bought a single thing. Rude.' : 'Don’t spend all those moths at once~', 1.3);
      after(1.3, () => say('pink', shy ? '…Fine. Go on, then.' : 'Shop’s open whenever.', 1.1));
    } },
  ];
  const front = (ids) => ids.length === 1 ? [new THREE.Vector3(0, 0.9, E.anchorZ - 3.6)] : [new THREE.Vector3(-0.8, 0.25, E.anchorZ - 3.8), new THREE.Vector3(0.8, 0.25, E.anchorZ - 3.8)];

  // ---------------------------------------------------------------- start
  function start() {
    const p = player; const g = h.group();
    Object.assign(E, { on: true, t: 0, phase: 'stop', anchorZ: p.z - h.speed() * h.speed() / 28, speed: h.speed(), moonAt: null, timers: [], snap: false, thick: 0 });
    E.hist = [];
    // take over Neon Amara's colours: bring the group back to world space without a jump
    const ws = bodies().map((b) => b.g.getWorldPosition(new THREE.Vector3()));
    g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); g.scale.setScalar(1); g.visible = true;
    bodies().forEach((b, i) => {
      b.g.visible = true; b.g.position.copy(ws[i]); b.g.scale.setScalar(1.25); b.g.rotation.x = 0; b.g.rotation.y = Math.PI;
      b.tgt = null; b.ry = Math.PI; b.tilt = 0; b.sc = 1.25; b.echoT = 0; anim(b, 'Fly');
    });
    // the rainbow outline she'll earn, one colour at a time
    if (!E.hull.length) p.model.traverse((o) => { if (o.isSkinnedMesh) { const r = rainbowHull(o, 0); o.parent.add(r.hull); E.hull.push({ mesh: r.hull, uni: r.uni }); } });
    setThick(0);
    document.body.classList.add('ending'); setArmed(false); $('endSkip').classList.remove('hidden');
    // the goodbyes
    BYE.forEach((g2, i) => {
      after(BYE_AT + i * SLOT, () => {
        const bs = g2.ids.map((k) => bodies()[k]); const fr = front(g2.ids);
        bs.forEach((b, j) => { b.tgt = fr[j]; });
        g2.go(bs);
        after(SLOT - 0.15, () => bs.forEach((b) => { b.tgt = null; b.ry = Math.PI; b.tilt = 0; anim(b, 'Fly'); }));
      });
    });
    const absorbAt = BYE_AT + BYE.length * SLOT + 0.2;
    after(absorbAt - 0.4, () => { E.phase = 'absorb'; h.play('Idle'); bodies().forEach((b, i) => { b.tgt = new THREE.Vector3((i - 4) * 0.95, 1.6 + Math.sin(i) * 0.4, E.anchorZ - 5.5); }); });
    BYE.forEach((g2, i) => after(absorbAt + i * 0.8, () => absorb(g2)));
    const flyAt = absorbAt + BYE.length * 0.8 + 1.6;
    after(flyAt - 1.3, () => { h.play('Twirl'); sfx.bossDown(); h.sparkle(new THREE.Vector3(p.x, 1.2, p.z), '#ffffff', 30); });
    after(flyAt, fly);
  }

  // ---------------------------------------------------------------- the moths fly into her
  function absorb(g2) {
    const p = player;
    for (const k of g2.ids) {
      const b = bodies()[k]; b.sc = 0.01; after(0.5, () => { b.g.visible = false; });
      const from = b.g.position.clone().add(new THREE.Vector3(0, 1.0, 0));
      for (let j = 0; j < 10; j++) {
        const m = moth(COL[k], 1.0);
        m.position.copy(from).add(new THREE.Vector3(rand(-0.6, 0.6), rand(-0.6, 0.6), rand(-0.3, 0.3)));
        E.moths.push({ m, from: m.position.clone(), d: j * 0.05, k: 0, T: rand(1.0, 1.25), ph: rand(0, 6), spin: rand(0.8, 1.3) * (j % 2 ? 1 : -1), col: COL[k], j });
      }
    }
    sfx.echoStart();
    after(1.15, () => {
      popBadge(g2.kind); setThick(E.thick + 1);
      sfx.chord([60 + E.thick * 2, 64 + E.thick * 2, 67 + E.thick * 2]);
      h.sparkle(new THREE.Vector3(p.x, 1.1, p.z), COL[g2.ids[0]], 18);
    });
  }
  function setThick(n) { E.thick = n; for (const x of E.hull) { x.uni.uThick.value = 0.005 * n; x.mesh.visible = n > 0; } }

  // ---------------------------------------------------------------- off to the moon
  function fly() {
    const p = player, c = h.camera.position;
    E.phase = 'fly'; E.flyT = 0; E.flyDur = 6.8;
    E.moonAt = new THREE.Vector3(c.x + 30, 34, c.z - 130);
    E.p0 = new THREE.Vector3(p.x, p.y, p.z); E.p1 = E.p0.clone().add(new THREE.Vector3(2, 14, -45)); E.p2 = E.moonAt.clone().add(new THREE.Vector3(0, RIM - 0.4, 0.4));
    h.play('Leap'); sfx.power(); after(0.45, () => h.play('Fly'));
    for (let i = 0; i < 26; i++) E.trail.push(moth(COL[i % COL.length], 1.0));
    CREDITS.forEach((txt, i) => after(0.5 + i * 0.62, () => credit(txt)));
  }
  function credit(txt) {
    const box = $('credits'); if (!box) return;
    const el = document.createElement('div'); el.className = 'credMoth';
    el.style.left = `${8 + Math.random() * 70}%`; el.style.animationDuration = `${rand(4.6, 5.6)}s`;
    el.innerHTML = `<i><img src="${h.mothIcon()}" alt="" /><span></span></i>`; el.querySelector('span').textContent = txt;
    box.append(el); setTimeout(() => el.remove(), 6200);
  }
  function bez(a, b, c, k) { const u = 1 - k; return a.clone().multiplyScalar(u * u).addScaledVector(b, 2 * u * k).addScaledVector(c, k * k); }
  function landed() {
    const p = player;
    E.phase = 'card'; p.root.position.copy(E.p2); p.root.rotation.set(0, Math.PI, 0); p.y = E.p2.y;
    h.play('Perch'); sfx.chord([67, 71, 74, 79]);
    $('endSkip').classList.add('hidden');
    after(0.9, showCard);
  }

  // ---------------------------------------------------------------- the card
  function showCard() {
    const s = h.stats();
    $('eBosses').textContent = s.bosses; $('eDist').textContent = `${Math.floor(s.dist)} m`; $('eMoths').textContent = s.moths; $('eBand').textContent = s.bandaids; $('eLoop').textContent = s.loop;
    const img = $('endMoon').querySelector('img'); if (!img.src && T.moon.image?.toDataURL) img.src = T.moon.image.toDataURL();
    $('endCard').classList.remove('hidden');
  }
  function peek(on) {
    E.phase = on ? 'peek' : 'card';
    $('endCard').classList.toggle('hidden', on); $('endPeek').classList.toggle('hidden', !on);
    const bs = bodies();
    bs.forEach((b, i) => {
      if (!on) { b.g.visible = false; return; }
      const a = Math.PI / 2 + (i < 4 ? (i - 4) : (i - 3)) * 0.085;     // around the top of the moon, Amara in the middle
      b.g.visible = true; b.sc = 0.9; b.g.scale.setScalar(0.9); b.tgt = null;
      b.g.position.copy(E.moonAt).add(new THREE.Vector3(Math.cos(a) * RIM, Math.sin(a) * RIM - 0.4, 0.4 + (i % 2) * 0.05));
      b.g.rotation.set(0, Math.PI, -(a - Math.PI / 2)); anim(b, 'Perch', { fade: 0 }); b.mixer.update(rand(0, 2));
    });
    if (on) sfx.giggle(); else sfx.click();
  }

  // ---------------------------------------------------------------- skip straight to the card (press twice, so one stray tap doesn't)
  let armT = null;
  function setArmed(on) {
    const b = $('endSkip'); clearTimeout(armT);
    b.classList.toggle('armed', on); b.innerHTML = on ? 'press <kbd>Space</kbd> again to skip' : 'press <kbd>Space</kbd> twice to skip';
    if (on) armT = setTimeout(() => setArmed(false), 2500);
  }
  function skipPress() {
    if (!E.on || E.phase === 'card' || E.phase === 'peek') return;
    if (!$('endSkip').classList.contains('armed')) { setArmed(true); sfx.click(); return; }
    setArmed(false); skip();
  }
  function skip() {
    if (!E.on || E.phase === 'card' || E.phase === 'peek') return;
    E.timers = [];
    for (const o of E.moths) scene.remove(o.m); E.moths = [];
    for (const f of E.floaters) scene.remove(f.o); E.floaters = [];
    for (const b of bodies()) { b.g.visible = false; b.tgt = null; }
    for (const k of ['twins', 'wrath', 'duet', 'chess', 'prism']) popBadge(k);
    setThick(5);
    if (!E.moonAt) { const c = h.camera.position; E.moonAt = new THREE.Vector3(c.x + 30, 34, c.z - 130); E.p2 = E.moonAt.clone().add(new THREE.Vector3(0, RIM - 0.4, 0.4)); }
    if (!E.trail.length) for (let i = 0; i < 26; i++) E.trail.push(moth(COL[i % COL.length], 1.0));
    voiceEl?.classList.remove('on'); E.snap = true;
    landed();
  }

  // ---------------------------------------------------------------- per frame
  function update(dt, t) {
    if (!E.on) return;
    E.t += dt;
    for (const tm of [...E.timers]) if (E.t >= tm.at) { E.timers.splice(E.timers.indexOf(tm), 1); tm.fn(); }
    const p = player;
    if (E.phase === 'stop' || E.phase === 'absorb') {
      if (E.speed > 0) { E.speed = Math.max(0, E.speed - 14 * dt); p.z -= E.speed * dt; if (E.speed === 0) h.play('Idle'); }
      p.root.position.set(p.x, p.y, p.z);
    }
    // the gang
    for (const [i, b] of bodies().entries()) {
      if (!b.g.visible) continue;
      b.mixer.update(dt); b.aura.material.opacity = 0.45 + Math.sin(t * 3 + i) * 0.1;
      if (E.phase === 'peek') continue;
      const want = b.tgt || linePos(i);
      b.g.position.lerp(want, Math.min(1, dt * 3.2));
      b.g.rotation.z += (0 - b.g.rotation.z) * Math.min(1, dt * 4);
      b.g.rotation.y += (b.ry - b.g.rotation.y) * Math.min(1, dt * 5);
      b.g.rotation.x += (b.tilt - b.g.rotation.x) * Math.min(1, dt * 7);
      const s = b.g.scale.x + (b.sc - b.g.scale.x) * Math.min(1, dt * 6); b.g.scale.setScalar(Math.max(0.01, s));
    }
    // moths spiralling into her
    const chest = new THREE.Vector3(p.root.position.x, p.root.position.y + 1.0, p.root.position.z);
    for (const o of [...E.moths]) {
      flap(o.m, dt, 22);
      if (o.d > 0) { o.d -= dt; continue; }
      o.k = Math.min(1, o.k + dt / o.T); const k = smooth(o.k), r = (1 - k) * 1.3, a = o.ph + k * Math.PI * 3 * o.spin;
      o.m.position.lerpVectors(o.from, chest, k).add(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r * 0.7 + Math.sin(k * Math.PI) * 0.8, Math.sin(a) * r * 0.4));
      o.m.scale.setScalar(1.0 * (1 - k * 0.6));
      if (o.k >= 1) { scene.remove(o.m); E.moths.splice(E.moths.indexOf(o), 1); if (o.j % 3 === 0) sfx.moth(o.j); }
    }
    // the flight
    if (E.phase === 'fly') {
      E.flyT += dt; const k = Math.min(1, E.flyT / E.flyDur), e = smooth(k);
      const pos = bez(E.p0, E.p1, E.p2, e), ahead = bez(E.p0, E.p1, E.p2, Math.min(1, e + 0.02));
      p.root.position.copy(pos);
      const d = ahead.sub(pos); const yaw = Math.atan2(-d.x, -d.z);
      p.root.rotation.y = k < 0.85 ? yaw : yaw + (Math.PI - yaw) * smooth((k - 0.85) / 0.15);
      p.root.rotation.z = Math.sin(E.flyT * 2) * 0.08;
      if (k >= 1) landed();
    }
    // the trail of moths behind her (and circling the moon once she lands)
    E.hist.push(p.root.position.clone()); if (E.hist.length > 200) E.hist.shift();
    E.trail.forEach((m, i) => {
      flap(m, dt);
      if (E.phase === 'fly') { const hp = E.hist[Math.max(0, E.hist.length - 1 - (i + 1) * 3)]; const a = t * 3 + i; m.position.copy(hp).add(new THREE.Vector3(Math.cos(a) * 0.5, 1.0 + Math.sin(a) * 0.4, 0)); }
      else if (E.moonAt) { const a = t * 0.35 + (i / E.trail.length) * Math.PI * 2; m.position.copy(E.moonAt).add(new THREE.Vector3(Math.cos(a) * (RIM + 1.5 + (i % 3) * 0.6), Math.sin(a) * (RIM + 1.5 + (i % 3) * 0.6), 1.2)); }
    });
    for (const f of [...E.floaters]) { f.life -= dt; f.o.position.y += f.vy * dt; if (f.o.material) f.o.material.opacity = Math.min(1, f.life); if (f.life <= 0) { scene.remove(f.o); E.floaters.splice(E.floaters.indexOf(f), 1); } }
    p.mixer?.update(dt);
    for (const x of E.hull) x.uni.uTime.value = t;
  }
  // the camera, for main.js
  function cam() {
    const p = player.root.position; let want, look, k = 3;
    if (E.phase === 'fly' || E.phase === 'card' || E.phase === 'peek') {
      const fin = E.moonAt.clone().add(new THREE.Vector3(0, 6, 25)), finLook = E.moonAt.clone().add(new THREE.Vector3(0, 6.5, 0));
      if (E.phase === 'peek') { want = E.moonAt.clone().add(new THREE.Vector3(0, RIM + 1.4, 7.5)); look = E.moonAt.clone().add(new THREE.Vector3(0, RIM + 0.3, 0)); k = 2.5; }
      else if (E.phase === 'card') { want = fin; look = finLook; k = 2; }
      else {
        const w = smooth((E.flyT / E.flyDur - 0.5) / 0.5);
        want = p.clone().add(new THREE.Vector3(-1.2, 1.4, 6.5)).lerp(fin, w);
        look = p.clone().add(new THREE.Vector3(0, 1, -4)).lerp(finLook, Math.min(1, w + 0.15)); k = 4;
      }
    } else if (E.phase === 'absorb') { want = new THREE.Vector3(1.4, 2.3, p.z + 5.6); look = new THREE.Vector3(0, 1.5, p.z - 3); }
    else { want = new THREE.Vector3(1.6, 1.9, p.z + 4.4); look = new THREE.Vector3(0, 1.7, p.z - 5); }
    const snap = E.snap; E.snap = false;
    return { want, look, k, snap };
  }
  function cleanup() {
    E.on = false; E.phase = null; E.timers = [];
    for (const o of E.moths) scene.remove(o.m); E.moths = [];
    for (const m of E.trail) scene.remove(m); E.trail = [];
    for (const f of E.floaters) scene.remove(f.o); E.floaters = [];
    for (const b of bodies()) { b.g.visible = false; b.g.rotation.set(0, Math.PI, 0); b.g.scale.setScalar(1.25); b.tgt = null; }
    setThick(0); player.root.rotation.set(0, 0, 0);
    $('endCard').classList.add('hidden'); $('endPeek').classList.add('hidden'); $('endSkip').classList.add('hidden');
    const cr = $('credits'); if (cr) cr.innerHTML = '';
    document.body.classList.remove('ending'); voiceEl?.classList.remove('on');
  }

  $('endAgain').addEventListener('click', () => { sfx.click(); h.onAgain(); });
  $('endLoop').addEventListener('click', () => { sfx.click(); h.onLoop(); });
  $('endMoon').addEventListener('click', () => peek(true));
  $('endPeek').addEventListener('click', () => peek(false));
  $('endSkip').addEventListener('click', skipPress);

  return {
    start, update, cam, skip, skipPress, cleanup, peek,
    get on() { return E.on; }, get anchorZ() { return E.on ? E.anchorZ : null; }, get phase() { return E.phase; }, get moonAt() { return E.phase === 'fly' || E.phase === 'card' || E.phase === 'peek' ? E.moonAt : null; },
    get state() { return E.on ? { phase: E.phase, t: +E.t.toFixed(1), thick: E.thick, moths: E.moths.length, trail: E.trail.length } : null; },
  };
}
