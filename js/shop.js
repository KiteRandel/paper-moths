// Peony's shop: a SHOP sign that sometimes stands over a lane, and the little store behind it. Made by KiteRandel.
import * as THREE from 'three';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { PAL, T, toon } from './art.js?v=18';

const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const PINK = '#ff7fb6', PINK_SOFT = '#ffc2dc', PINK_DEEP = '#c94f86';

// ---------------------------------------------------------------- painted canvas signs
function paintSign(c, text, sub) {
  const g = c.getContext('2d'); const w = c.width, h = c.height;
  g.clearRect(0, 0, w, h);
  g.fillStyle = PAL.paper; g.strokeStyle = PAL.ink; g.lineWidth = 7;
  g.beginPath(); g.roundRect(6, 6, w - 12, h - 12, 18); g.fill(); g.stroke();
  g.strokeStyle = PINK; g.lineWidth = 4; g.beginPath(); g.roundRect(16, 16, w - 32, h - 32, 12); g.stroke();
  g.fillStyle = PAL.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `800 ${Math.round(h * (sub ? 0.4 : 0.5))}px 'Shippori Mincho B1', Georgia, serif`;
  g.fillText(text, w / 2, h * (sub ? 0.42 : 0.53));
  if (sub) { g.fillStyle = PINK_DEEP; g.font = `700 ${Math.round(h * 0.17)}px 'Zen Maru Gothic', sans-serif`; g.fillText(sub, w / 2, h * 0.76); }
  // little hearts in the corners
  g.fillStyle = PINK;
  for (const [x, y] of [[34, 34], [w - 34, 34], [34, h - 34], [w - 34, h - 34]]) {
    g.beginPath(); g.moveTo(x, y + 6); g.bezierCurveTo(x - 12, y - 4, x - 4, y - 12, x, y - 4); g.bezierCurveTo(x + 4, y - 12, x + 12, y - 4, x, y + 6); g.fill();
  }
}
function signTexture(text, sub, w = 512, h = 220) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; paintSign(c, text, sub);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  document.fonts?.ready.then(() => { paintSign(c, text, sub); t.needsUpdate = true; });
  return t;
}

export function createShop(ctx) {
  // ctx: { renderer, ink, sfx, bgOnly, wallet: { get(), spend(n) }, bandaids: { get(), add(n), max }, onLeave() }
  const { sfx, bgOnly } = ctx;
  const PRICE = { bandaid: 50 };
  const signTex = signTexture('SHOP', null, 512, 200);
  const mDark = toon({ color: PAL.umber }), mPink = toon({ color: PINK_SOFT, side: THREE.DoubleSide, emissive: new THREE.Color(PINK), emissiveIntensity: 0.25 });
  const mHem = toon({ color: PINK_DEEP, side: THREE.DoubleSide });

  // ---------------------------------------------------------------- the sign on the roof (an archway with a pink curtain you run through)
  function makeSign() {
    const g = new THREE.Group();
    for (const x of [-0.82, 0.82]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.1, 8), mDark); p.position.set(x, 1.55, 0); g.add(p); }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 0.14), mDark); bar.position.y = 2.6; g.add(bar);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 0.68), new THREE.MeshBasicMaterial({ map: signTex, transparent: true, side: THREE.DoubleSide }));
    board.position.set(0, 3.05, 0.02); g.add(board);
    const strips = [];
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.85, 1, 3), mPink); s.geometry.translate(0, -0.425, 0);
      s.position.set(-0.53 + i * 0.53, 2.55, 0); g.add(s); strips.push(s);
      const hem = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.08), mHem); hem.position.set(0, -0.82, 0.005); s.add(hem);
    }
    const glow = bgOnly(new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: PINK, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending })));
    glow.scale.set(3.2, 2.2, 1); glow.position.y = 2.9; g.add(glow);
    g.userData = { strips, glow };
    return g;
  }
  function animSign(sign, t) {
    const u = sign.userData;
    u.strips.forEach((s, i) => { s.rotation.x = Math.sin(t * 3 + i) * 0.12; });
    u.glow.material.opacity = 0.6 + Math.sin(t * 4) * 0.2;
  }

  // ---------------------------------------------------------------- the store
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#d9b8ad');
  scene.add(new THREE.HemisphereLight('#fff0e6', '#7a5a58', 1.4));
  const key = new THREE.DirectionalLight('#ffe2d2', 1.4); key.position.set(3, 6, 5); scene.add(key);
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 60);
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.fov = camera.aspect < 0.8 ? 66 : 50; camera.updateProjectionMatrix(); });
  camera.aspect = innerWidth / innerHeight; camera.fov = camera.aspect < 0.8 ? 66 : 50; camera.updateProjectionMatrix();

  const paper = (() => {   // striped pink wallpaper with tiny moth-dust dots
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.fillStyle = '#f1dfd8'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#e9c3cf'; for (let x = 0; x < 128; x += 32) g.fillRect(x, 0, 12, 128);
    g.fillStyle = 'rgba(160,90,110,.35)'; for (let y = 8; y < 128; y += 32) for (let x = 22; x < 128; x += 32) { g.beginPath(); g.arc(x, y + (x % 64 ? 16 : 0), 2.2, 0, 7); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  })();
  const mWood = toon({ map: T.wood }), mWall = toon({ map: paper }), mCream = toon({ color: PAL.cream }), mPaper = toon({ color: PAL.paper }), mTan = toon({ color: PAL.tan });
  const uvs = (geo, su, sv) => { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return geo; };
  const floor = new THREE.Mesh(uvs(new THREE.PlaneGeometry(14, 10), 3, 2), mWood); floor.rotation.x = -Math.PI / 2; floor.position.z = 1; scene.add(floor);
  const back = new THREE.Mesh(uvs(new THREE.PlaneGeometry(14, 7), 9, 4.5), mWall); back.position.set(0, 3.5, -3); scene.add(back);
  for (const s of [-1, 1]) { const side = new THREE.Mesh(uvs(new THREE.PlaneGeometry(10, 7), 6, 4.5), mWall); side.position.set(s * 5, 3.5, 1); side.rotation.y = -s * Math.PI / 2; scene.add(side); }
  // pink wainscot along the back wall
  const trim = new THREE.Mesh(new THREE.BoxGeometry(14, 1.1, 0.08), toon({ color: '#e7a9c0' })); trim.position.set(0, 0.55, -2.96); scene.add(trim);
  // the shop's name over the shelves
  const nameBoard = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.1), new THREE.MeshBasicMaterial({ map: signTexture('Peony’s', 'bandaids · moth trades', 512, 220), transparent: true }));
  nameBoard.position.set(0, 3.4, -2.9); scene.add(nameBoard);
  // shelves full of jars, bandage rolls and boxes
  for (const [y, w] of [[1.55, 5.4], [2.35, 5.4]]) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 0.45), mWood); shelf.position.set(0, y, -2.75); scene.add(shelf);
    for (let x = -w / 2 + 0.3; x < w / 2 - 0.2; x += rand(0.32, 0.5)) {
      const r = Math.random(); let m;
      if (r < 0.35) { m = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.13, 14), mPaper); m.rotation.z = Math.PI / 2; m.position.y = y + 0.16; }   // bandage roll
      else if (r < 0.7) { m = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.28, 12), toon({ color: [PINK_SOFT, PAL.cream, PAL.ember][Math.floor(rand(0, 3))] })); m.position.y = y + 0.18; }   // jar
      else { m = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.2), toon({ color: [PAL.rose, '#e7a9c0', PAL.tan][Math.floor(rand(0, 3))] })); m.position.y = y + 0.14; m.rotation.y = rand(-0.3, 0.3); }
      m.position.x = x; m.position.z = -2.72; scene.add(m);
    }
  }
  // moth jars that glow
  for (const x of [-2.3, 2.3]) {
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.38, 14), toon({ color: PAL.glow, emissive: new THREE.Color(PAL.glow), emissiveIntensity: 0.6 })); jar.position.set(x, 2.58, -2.72); scene.add(jar);
    const gl = bgOnly(new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: PAL.glow, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }))); gl.scale.setScalar(1.1); gl.position.copy(jar.position); scene.add(gl);
  }
  // hanging paper lanterns
  const lMat = new THREE.MeshToonMaterial({ map: T.lantern, color: '#ffd6e6', emissive: new THREE.Color(PINK), emissiveIntensity: 0.45 });
  const lanterns = [];
  for (const x of [-2.6, -0.9, 0.9, 2.6]) {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.42, 14), lMat); l.position.set(x, 4.2, -1.2); scene.add(l); lanterns.push(l);
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.4, 4), mDark); str.position.set(x, 5.1, -1.2); scene.add(str);
    const gl = bgOnly(new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: '#ffc0d8', transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }))); gl.scale.setScalar(1.6); gl.position.copy(l.position); scene.add(gl);
  }
  // the counter, with a bandaid on display
  const counter = new THREE.Group(); counter.position.set(0, 0, -0.75); scene.add(counter);
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.95, 0.8), mWood); body.position.y = 0.475; counter.add(body);
  const top = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.08, 0.95), mCream); top.position.y = 0.99; counter.add(top);
  const front = new THREE.Mesh(new THREE.BoxGeometry(3.62, 0.22, 0.02), toon({ color: '#e7a9c0' })); front.position.set(0, 0.72, 0.41); counter.add(front);
  const display = new THREE.Group(); display.position.set(0.95, 1.22, 0.1); counter.add(display);
  { // a fat bandage roll with a tail, like the pickups on the roof
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.2, 18), mPaper); roll.rotation.z = Math.PI / 2; display.add(roll);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.21, 10), mTan); core.rotation.z = Math.PI / 2; display.add(core);
    const gl = bgOnly(new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: PAL.glow, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }))); gl.scale.setScalar(1.1); display.add(gl);
  }
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.2), new THREE.MeshBasicMaterial({ map: signTexture('50', null, 200, 96), transparent: true })); tag.position.set(0.95, 1.06, 0.5); tag.rotation.x = -0.5; counter.add(tag);
  // a little bell and a sleepy plant on the counter
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon({ color: PAL.ember })); bell.position.set(-1.2, 1.03, 0.15); counter.add(bell);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.2, 10), toon({ color: PAL.rose })); pot.position.set(-1.55, 1.13, -0.05); counter.add(pot);
  for (let i = 0; i < 5; i++) { const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), toon({ color: '#8d9a6e' })); leaf.scale.set(0.6, 1.4, 0.6); leaf.position.set(-1.55 + Math.cos(i * 1.3) * 0.07, 1.33, -0.05 + Math.sin(i * 1.3) * 0.07); leaf.rotation.z = Math.cos(i * 1.3) * 0.5; counter.add(leaf); }

  // ---------------------------------------------------------------- Peony (pink Amara) and Amara as the customer
  const P = { keeper: null, customer: null, mixers: [] };
  function rig(root, gltf) {
    const mixer = new THREE.AnimationMixer(root); const acts = {};
    for (const c of gltf.animations) acts[c.name] = mixer.clipAction(c);
    const b = { root, mixer, acts, cur: null, after: null };
    mixer.addEventListener('finished', () => { if (b.after) { const n = b.after; b.after = null; anim(b, n); } });
    P.mixers.push(mixer); return b;
  }
  function anim(b, name, { once = false, after = null, fade = 0.25 } = {}) {
    const a = b?.acts[name]; if (!a) return;
    if (b.cur && b.cur !== a) b.cur.fadeOut(fade);
    a.reset(); a.enabled = true; a.setEffectiveWeight(1);
    a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = once;
    a.fadeIn(fade).play(); b.cur = a; b.after = after;
  }
  function init(gltf) {
    const pink = skClone(gltf.scene);
    pink.traverse((o) => { if (!o.isMesh) return; o.frustumCulled = false; o.material = toon({ map: o.material.map, color: PINK_SOFT, emissive: new THREE.Color(PINK), emissiveIntensity: 0.35 }); });
    pink.position.set(0, 0, -1.7); pink.rotation.y = Math.PI; scene.add(pink);
    const aura = bgOnly(new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: PINK, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }))); aura.position.set(0, 1.0, -1.75); aura.scale.set(2.4, 2.8, 1); scene.add(aura);
    P.keeper = rig(pink, gltf); anim(P.keeper, 'Idle', { fade: 0 });
    const me = skClone(gltf.scene);
    me.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
    me.position.set(-1.15, 0, 0.75); me.rotation.y = -0.5; scene.add(me);
    P.customer = rig(me, gltf); anim(P.customer, 'Idle', { fade: 0 });
  }

  // ---------------------------------------------------------------- UI + flow
  const $ = (id) => document.getElementById(id);
  const ui = { root: $('shop'), say: $('shopSay'), have: $('shopHave'), buy: $('buyBand'), leave: $('leaveBtn'), fade: $('fade') };
  const S = { open: false, t: 0, busy: false };
  const LINES = {
    hello: ['Welcome in! Mind the moth dust.', 'Oh, a customer! Come in, come in.', 'You look like you could use a bandaid.', 'Back again? I saved you the good ones.'],
    bought: ['Thank you~ stay safe up there!', 'One bandaid, wrapped with love.', 'That one’s extra sticky. Good luck!', 'Pleasure doing business!'],
    broke: ['Hmm, you’ll need a few more moths for that.', 'Come back with more moths, sweet pea!', 'Not quite enough moths yet…'],
    full: ['You can only carry three, silly!', 'Your pockets are full of bandaids already!'],
    bye: ['Bye bye! Don’t trip!', 'See you on the rooftops!'],
  };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  let sayT = null;
  function say(kind) {
    ui.say.textContent = pick(LINES[kind]); ui.say.classList.remove('pop'); void ui.say.offsetWidth; ui.say.classList.add('pop');
    clearTimeout(sayT);
  }
  function refresh() {
    const n = ctx.bandaids.get(), have = ctx.wallet.get();
    ui.have.textContent = `You have ${n} / ${ctx.bandaids.max}`;
    ui.buy.disabled = n >= ctx.bandaids.max || have < PRICE.bandaid;
    ui.buy.classList.toggle('poor', have < PRICE.bandaid);
  }
  function buy() {
    if (!S.open || S.busy) return;
    if (ctx.bandaids.get() >= ctx.bandaids.max) { say('full'); sfx.offKey(); return; }
    if (!ctx.wallet.spend(PRICE.bandaid)) { say('broke'); sfx.offKey(); anim(P.keeper, 'Idle'); return; }
    ctx.bandaids.add(1); sfx.power(); say('bought');
    anim(P.keeper, 'Clap', { once: true, after: 'Idle' });
    display.scale.setScalar(1.35);
    refresh();
  }
  function open() {
    if (S.open || S.busy) return;
    S.busy = true; ui.fade.classList.add('on'); sfx.bell();
    setTimeout(() => {
      S.open = true; S.t = 0; ui.root.classList.remove('hidden'); document.body.classList.add('shopping'); refresh(); say('hello');
      anim(P.keeper, 'Cheer', { once: true, after: 'Idle', fade: 0.05 });
      ui.fade.classList.remove('on'); setTimeout(() => { S.busy = false; }, 300);
    }, 380);
  }
  function leave() {
    if (!S.open || S.busy) return;
    S.busy = true; say('bye'); sfx.click(); anim(P.keeper, 'Twirl');
    setTimeout(() => {
      ui.fade.classList.add('on');
      setTimeout(() => {
        S.open = false; ui.root.classList.add('hidden'); document.body.classList.remove('shopping'); ctx.onLeave();
        ui.fade.classList.remove('on'); S.busy = false;
      }, 380);
    }, 450);
  }
  ui.buy.addEventListener('click', buy);
  ui.leave.addEventListener('click', leave);
  addEventListener('keydown', (e) => {
    if (!S.open) return;
    const k = e.key.toLowerCase();
    if (k === 'enter' || k === 'b') { e.preventDefault(); buy(); }
    else if (k === 'escape' || k === 'arrowup' || k === 'w' || k === ' ') { e.preventDefault(); leave(); }
  });

  function update(dt) {
    S.t += dt;
    for (const m of P.mixers) m.update(dt);
    display.rotation.y += dt * 1.5; display.position.y = 1.22 + Math.sin(S.t * 2.5) * 0.04; display.scale.lerp(new THREE.Vector3(1, 1, 1), Math.min(1, dt * 6));
    lanterns.forEach((l, i) => { l.rotation.z = Math.sin(S.t * 1.3 + i) * 0.06; });
    // a slow, gentle drift of the camera
    camera.position.set(0.45 + Math.sin(S.t * 0.25) * 0.2, 1.75, 3.3);
    camera.lookAt(0.05, 1.5, -1.4);
  }
  function render(ink, t) { ink.render(scene, camera, t); }

  return { init, makeSign, animSign, open, leave, buy, update, render, get open_() { return S.open; }, get busy() { return S.busy; }, PRICE };
}
