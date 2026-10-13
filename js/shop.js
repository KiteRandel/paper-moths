// The shop: a SHOP sign that sometimes stands over a lane, and the little store behind it. Made by KiteRandel.
import * as THREE from 'three';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { PAL, T, toon } from './art.js?v=23';

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
  const PRICE = { bandaid: 3000, scissors: 5000 };
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
  // the counter, with a bandaid and a pair of scissors on display
  const counter = new THREE.Group(); counter.position.set(0, 0, -0.75); scene.add(counter);
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.95, 0.8), mWood); body.position.y = 0.475; counter.add(body);
  const top = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.08, 0.95), mCream); top.position.y = 0.99; counter.add(top);
  const front = new THREE.Mesh(new THREE.BoxGeometry(3.62, 0.22, 0.02), toon({ color: '#e7a9c0' })); front.position.set(0, 0.72, 0.41); counter.add(front);
  const display = new THREE.Group(); display.position.set(0.55, 1.22, 0.1); counter.add(display);
  { // a fat bandage roll with a tail, like the pickups on the roof
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.2, 18), mPaper); roll.rotation.z = Math.PI / 2; display.add(roll);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.21, 10), mTan); core.rotation.z = Math.PI / 2; display.add(core);
    const gl = bgOnly(new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: PAL.glow, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }))); gl.scale.setScalar(1.1); display.add(gl);
  }
  const snips = new THREE.Group(); snips.position.set(1.35, 1.24, 0.1); counter.add(snips);
  { // paper scissors: two silver blades crossed in an X, with pink finger loops
    const blade = toon({ color: '#e4e4ec', emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.15 }), loop = toon({ color: PINK, emissive: new THREE.Color(PINK), emissiveIntensity: 0.2 });
    for (const sgn of [-1, 1]) {
      const arm = new THREE.Group(); arm.rotation.z = sgn * 0.32; snips.add(arm);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 0.02), blade); b.position.y = 0.16; arm.add(b);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 4), blade); tip.position.y = 0.38; arm.add(tip);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.022, 6, 16), loop); ring.position.set(sgn * 0.02, -0.1, 0); arm.add(ring);
    }
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.05, 8), mDark); pin.rotation.x = Math.PI / 2; pin.position.y = -0.02; snips.add(pin);
    const gl = bgOnly(new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: '#ffd6e6', transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }))); gl.scale.setScalar(1.1); snips.add(gl);
  }
  for (const [txt, x] of [['3000', 0.55], ['5000', 1.35]]) {
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.2), new THREE.MeshBasicMaterial({ map: signTexture(txt, null, 230, 96), transparent: true })); tag.position.set(x, 1.06, 0.5); tag.rotation.x = -0.5; counter.add(tag);
  }
  // a little bell and a sleepy plant on the counter
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon({ color: PAL.ember })); bell.position.set(-1.2, 1.03, 0.15); counter.add(bell);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.2, 10), toon({ color: PAL.rose })); pot.position.set(-1.55, 1.13, -0.05); counter.add(pot);
  for (let i = 0; i < 5; i++) { const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), toon({ color: '#8d9a6e' })); leaf.scale.set(0.6, 1.4, 0.6); leaf.position.set(-1.55 + Math.cos(i * 1.3) * 0.07, 1.33, -0.05 + Math.sin(i * 1.3) * 0.07); leaf.rotation.z = Math.cos(i * 1.3) * 0.5; counter.add(leaf); }

  // ---------------------------------------------------------------- the pink Amara shopkeeper and Amara as the customer
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
    // her twin out on the roof, for when you run past the shop
    if (ctx.mainScene) {
      const r = skClone(gltf.scene);
      r.traverse((o) => { if (!o.isMesh) return; o.frustumCulled = false; o.material = toon({ map: o.material.map, color: PINK_SOFT, emissive: new THREE.Color(PINK), emissiveIntensity: 0.45 }); });
      const lie = new THREE.Group(); lie.add(r); r.position.x = 0; lie.rotation.z = Math.PI / 2; lie.position.x = 0.85;
      const g = new THREE.Group(); g.add(lie);
      const aura = bgOnly(new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: PINK, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }))); aura.position.y = 0.9; aura.scale.set(2.4, 3, 1); g.add(aura);
      g.scale.setScalar(1.25); g.visible = false; ctx.mainScene.add(g);
      const rb = rig(r, gltf); P.mixers.pop(); rb.g = g; H.b = rb; H.lie = lie;
    }
  }

  // ---------------------------------------------------------------- miss the shop and she comes after you: she lounges in the air over the side roofs
  // for ~20 s, smug as anything, calling down grey-white lightning onto the roof ahead of you
  const ACTIVE = 20;
  const ringTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.fillStyle = 'rgba(60,56,70,.35)'; g.beginPath(); g.arc(64, 64, 54, 0, 7); g.fill();
    g.strokeStyle = '#3d3a48'; g.lineWidth = 11; g.beginPath(); g.arc(64, 64, 50, 0, 7); g.stroke();
    g.strokeStyle = 'rgba(250,250,255,1)'; g.lineWidth = 5; g.shadowColor = '#ffffff'; g.shadowBlur = 8;
    g.setLineDash([12, 8]); g.beginPath(); g.arc(64, 64, 50, 0, 7); g.stroke(); g.setLineDash([]);
    g.lineWidth = 3;
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + Math.random() * 0.4; let x = 64, y = 64; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += Math.cos(a + rand(-0.7, 0.7)) * 11; y += Math.sin(a + rand(-0.7, 0.7)) * 11; g.lineTo(x, y); } g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const scorchTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 60); gr.addColorStop(0, 'rgba(40,36,44,.95)'); gr.addColorStop(0.55, 'rgba(70,64,74,.7)'); gr.addColorStop(1, 'rgba(70,64,74,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(235,235,250,.9)'; g.lineWidth = 2.5;
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; let x = 64, y = 64; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += Math.cos(a + rand(-0.6, 0.6)) * 10; y += Math.sin(a + rand(-0.6, 0.6)) * 10; g.lineTo(x, y); } g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const cloudTex = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
    for (let i = 0; i < 9; i++) { const x = 40 + i * 22 + rand(-6, 6), y = 70 + rand(-14, 10), r = rand(22, 36);
      const gr = g.createRadialGradient(x, y, 2, x, y, r); gr.addColorStop(0, 'rgba(120,118,128,.95)'); gr.addColorStop(1, 'rgba(120,118,128,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const boltCore = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, fog: false });
  const boltGlow = new THREE.MeshBasicMaterial({ color: '#c9cbd8', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  function boltMesh(x, z) {
    const pts = []; let px = x, pz = z;
    for (let y = 13; y >= 0; y -= rand(0.8, 1.4)) { pts.push(new THREE.Vector3(px, y, pz)); px = x + rand(-0.45, 0.45); pz = z + rand(-0.3, 0.3); }
    pts.push(new THREE.Vector3(x, 0, z));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1);
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.07, 5), boltCore));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.26, 6), boltGlow));
    // a little fork off to one side
    const k = Math.floor(pts.length * rand(0.3, 0.6)); const f0 = pts[k]; const fork = [f0, f0.clone().add(new THREE.Vector3(rand(-1.4, 1.4), -rand(1.2, 2.2), rand(-0.5, 0.5)))];
    fork.push(fork[1].clone().add(new THREE.Vector3(rand(-0.8, 0.8), -rand(0.8, 1.6), 0)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(fork), 10, 0.04, 4), boltCore));
    return bgOnly(g);
  }
  const HL = {
    missed: ['Oh, so you didn’t need my help?', 'Wow. You just ran right past me.', 'Rude! I had bandaids on sale!', 'Fine. I see how it is.', 'You missed my shop! On purpose?!', 'Too good for my bandaids, huh?'],
    drop: ['Watch your step~', 'Zap! Hehe.', 'Should’ve stopped by!', 'Shocking, isn’t it?', 'Bet you wish you had a bandaid now!', 'Left or right? Hehe.', 'My shop was RIGHT THERE.', 'I could do this all day~', 'Ooh, that one was close!', 'Still think you don’t need me?'],
    hit: ['Ouch! A bandaid would help with that~', 'Told you that you needed my help!', 'Hehe, crispy!'],
    bye: ['Hmph. Come visit next time!', 'Okay, okay, I’m done. Bye!', 'Next time, come in!'],
  };
  const H = { b: null, lie: null, on: false, t: 0, side: 1, nextDrop: 0, leaving: false, said: 0, strikes: [] };
  const bubble = document.getElementById('heckle');
  let bubbleT = 0;
  function heckleSay(kind) { bubble.textContent = pick(HL[kind]); bubble.classList.add('on'); bubbleT = 2.6; }
  function heckle(side) {
    if (!H.b || H.on) return;
    const p = ctx.player;
    H.on = true; H.leaving = false; H.t = 0; H.said = 0; H.side = side || (Math.random() < 0.5 ? -1 : 1); H.nextDrop = 2.4;
    H.b.g.visible = true; H.b.g.position.set(H.side * 3, 8, p.z + 5);
    anim(H.b, 'Lounge', { fade: 0 }); sfx.giggle();
    setTimeout(() => { if (H.on) heckleSay('missed'); }, 500);
  }
  function stopHeckle(say = true) {
    if (!H.on || H.leaving) return;
    H.leaving = true; H.t = Math.max(H.t, ACTIVE); if (say) heckleSay('bye');
  }
  function clearStrike(st) { for (const o of [st.ring, st.cloud, st.bolt, st.scorch, st.flare]) if (o) ctx.mainScene.remove(o); }
  function resetHeckle() {
    H.on = false; H.leaving = false; if (H.b) H.b.g.visible = false; bubble.classList.remove('on'); bubbleT = 0;
    for (const st of H.strikes) clearStrike(st); H.strikes.length = 0;
  }
  // call lightning down on one or two lanes a little way ahead (never all three)
  function strike() {
    const p = ctx.player;
    const n = Math.random() < 0.4 ? 2 : 1;
    const lanes = [0, 1, 2].sort(() => Math.random() - 0.5).slice(0, n);
    if (n === 1 && Math.random() < 0.55) lanes[0] = p.lane;
    let z = p.z - (ctx.speed * 1.05 + 2);
    for (let k = 0; k < 4 && !ctx.freeAt(z); k++) z -= 3;
    if (!ctx.freeAt(z)) return false;
    for (const l of lanes) {
      const x = ctx.LANES[l];
      const ring = bgOnly(new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, depthWrite: false })));
      ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.04, z); ctx.mainScene.add(ring);
      const cloud = bgOnly(new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0, depthWrite: false })));
      cloud.scale.set(5, 2.5, 1); cloud.position.set(x, 11, z); ctx.mainScene.add(cloud);
      H.strikes.push({ lane: l, x, z, t: 0, phase: 'warn', ring, cloud, bolt: null, scorch: null, flare: null, hurt: false });
    }
    sfx.crackle();
    if (H.said < 6 && Math.random() < 0.5) { heckleSay('drop'); H.said++; }
    return true;
  }
  const WARN = 0.9, BOLT = 0.32, BURN = 1.3;
  function updateStrikes(dt) {
    const p = ctx.player;
    for (const st of [...H.strikes]) {
      st.t += dt;
      if (st.phase === 'warn') {
        const k = st.t / WARN;
        st.ring.material.opacity = 0.5 + 0.5 * Math.abs(Math.sin(st.t * 18));
        st.ring.rotation.z += dt * 3; st.ring.scale.setScalar(1.25 - k * 0.3);
        st.cloud.material.opacity = Math.min(0.9, k * 1.4); st.cloud.position.y = 11 + Math.sin(st.t * 9) * 0.1;
        if (st.t >= WARN) {
          st.phase = 'bolt'; st.t = 0; ctx.mainScene.remove(st.ring); st.ring = null;
          st.bolt = boltMesh(st.x, st.z); ctx.mainScene.add(st.bolt);
          st.flare = bgOnly(new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: '#ffffff', transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending })));
          st.flare.scale.setScalar(3.2); st.flare.position.set(st.x, 0.5, st.z); ctx.mainScene.add(st.flare);
          st.scorch = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), new THREE.MeshBasicMaterial({ map: scorchTex, transparent: true, depthWrite: false }));
          st.scorch.rotation.x = -Math.PI / 2; st.scorch.position.set(st.x, 0.03, st.z); bgOnly(st.scorch); ctx.mainScene.add(st.scorch);
          sfx.thunder(); ctx.fx?.(0.28, 0.25);
        }
      } else if (st.phase === 'bolt') {
        st.bolt.visible = Math.sin(st.t * 70) > -0.4;
        if (st.t > BOLT * 0.5 && !st.reflash) { st.reflash = true; ctx.mainScene.remove(st.bolt); st.bolt = boltMesh(st.x, st.z); ctx.mainScene.add(st.bolt); }
        st.flare.material.opacity = 1 - st.t / BOLT * 0.5;
        if (st.t >= BOLT) { st.phase = 'burn'; st.t = 0; ctx.mainScene.remove(st.bolt); st.bolt = null; }
      } else {
        const k = st.t / BURN;
        st.flare.material.opacity = (0.35 + 0.35 * Math.random()) * (1 - k); st.flare.scale.setScalar(1.6 + Math.random() * 0.6);
        st.scorch.material.opacity = 1 - k * k; st.cloud.material.opacity = 0.9 * (1 - k);
        if (st.t >= BURN) { clearStrike(st); H.strikes.splice(H.strikes.indexOf(st), 1); continue; }
      }
      // the bolt hits at any height; the crackling scorch mark only hurts if you run through it on the ground
      if (!st.hurt && p.alive && st.phase !== 'warn' && Math.abs(p.x - st.x) < 0.65 && Math.abs(p.z - st.z) < 0.9 && (st.phase === 'bolt' || p.y < 0.6)) {
        st.hurt = true; ctx.hurt('Zapped by her lightning!'); if (H.on && !H.leaving) heckleSay('hit');
      }
    }
  }
  function updateHeckle(dt, camera) {
    if (bubbleT > 0) { bubbleT -= dt; if (bubbleT <= 0) bubble.classList.remove('on'); }
    updateStrikes(dt);
    if (!H.on || !H.b) return;
    const p = ctx.player, b = H.b, g = b.g;
    H.t += dt; b.mixer.update(dt);
    if (!H.leaving && (H.t > ACTIVE + 0.5 || !ctx.canHeckle())) stopHeckle(H.t > ACTIVE + 0.5);
    let want;
    if (H.leaving) want = new THREE.Vector3(H.side * 7, 10, p.z - 4);
    else want = new THREE.Vector3(H.side * (3.4 + Math.sin(H.t * 0.7) * 0.2), 3.1 + Math.sin(H.t * 1.6) * 0.3, p.z - 5.5);
    g.position.lerp(want, Math.min(1, dt * (H.leaving ? 1.4 : 3)));
    g.rotation.y = Math.PI - H.side * 0.35; g.rotation.x = Math.sin(H.t * 1.1) * 0.05;
    H.lie.rotation.z = Math.PI / 2 + Math.sin(H.t * 1.3) * 0.05;
    if (!H.leaving && H.t > H.nextDrop && H.t < ACTIVE) { H.nextDrop = H.t + (strike() ? rand(1.1, 1.6) : 0.3); }
    if (H.leaving && H.t > ACTIVE + 3.5) { H.on = false; g.visible = false; }
    // keep her speech bubble over her
    const v = g.position.clone().add(new THREE.Vector3(0, 1.9, 0)).project(camera);
    const x = Math.min(innerWidth - 150, Math.max(150, (v.x + 1) / 2 * innerWidth)), y = Math.max(150, (1 - v.y) / 2 * innerHeight);
    bubble.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
  }
  function hazards() { return H.strikes.map((st) => ({ lane: st.lane, z: st.z, phase: st.phase })); }

  // ---------------------------------------------------------------- UI + flow
  const $ = (id) => document.getElementById(id);
  const ui = { root: $('shop'), say: $('shopSay'), have: { bandaid: $('shopHave'), scissors: $('shopHaveS') }, buy: { bandaid: $('buyBand'), scissors: $('buySnip') }, leave: $('leaveBtn'), fade: $('fade') };
  const S = { open: false, t: 0, busy: false };
  const LINES = {
    hello: ['Welcome in! Mind the moth dust.', 'Oh, a customer! Come in, come in.', 'You look like you could use a bandaid.', 'Back again? I saved you the good ones.'],
    bought: ['Thank you~ stay safe up there!', 'One bandaid, wrapped with love.', 'That one’s extra sticky. Good luck!', 'Pleasure doing business!'],
    broke: ['Hmm, you’ll need a few more moths for that.', 'Come back with more moths, sweet pea!', 'Not quite enough moths yet…'],
    full: ['You can only carry three, silly!', 'Your pockets are full already!'],
    snipped: ['Snip snip! Nothing can stop you now.', 'My sharpest pair, just for you~', 'They’ll cut through anything. Probably.', 'Ooh, big spender!'],
    bye: ['Bye bye! Don’t trip!', 'See you on the rooftops!'],
  };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  let sayT = null;
  function say(kind) {
    ui.say.textContent = pick(LINES[kind]); ui.say.classList.remove('pop'); void ui.say.offsetWidth; ui.say.classList.add('pop');
    clearTimeout(sayT);
  }
  const ITEMS = { bandaid: { stock: () => ctx.bandaids, show: () => display, line: 'bought' }, scissors: { stock: () => ctx.scissors, show: () => snips, line: 'snipped' } };
  function refresh() {
    const have = ctx.wallet.get();
    for (const k of Object.keys(ITEMS)) {
      const st = ITEMS[k].stock(), n = st.get();
      ui.have[k].textContent = `You have ${n} / ${st.max}`;
      ui.buy[k].disabled = n >= st.max || have < PRICE[k];
      ui.buy[k].classList.toggle('poor', have < PRICE[k]);
    }
  }
  function buy(kind = 'bandaid') {
    if (!S.open || S.busy) return;
    const it = ITEMS[kind], st = it.stock();
    if (st.get() >= st.max) { say('full'); sfx.offKey(); return; }
    if (!ctx.wallet.spend(PRICE[kind])) { say('broke'); sfx.offKey(); anim(P.keeper, 'Idle'); return; }
    st.add(1); sfx.power(); if (kind === 'scissors') sfx.snap(); say(it.line);
    anim(P.keeper, 'Clap', { once: true, after: 'Idle' });
    it.show().scale.setScalar(1.35);
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
  ui.buy.bandaid.addEventListener('click', () => buy('bandaid'));
  ui.buy.scissors.addEventListener('click', () => buy('scissors'));
  ui.leave.addEventListener('click', leave);
  addEventListener('keydown', (e) => {
    if (!S.open) return;
    const k = e.key.toLowerCase();
    if (k === '1' || k === 'enter') { e.preventDefault(); buy('bandaid'); }
    else if (k === '2') { e.preventDefault(); buy('scissors'); }
    else if (k === 'escape' || k === 'arrowup' || k === 'w' || k === ' ') { e.preventDefault(); leave(); }
  });

  function update(dt) {
    S.t += dt;
    for (const m of P.mixers) m.update(dt);
    display.rotation.y += dt * 1.5; display.position.y = 1.22 + Math.sin(S.t * 2.5) * 0.04; display.scale.lerp(new THREE.Vector3(1, 1, 1), Math.min(1, dt * 6));
    snips.rotation.y -= dt * 1.2; snips.position.y = 1.24 + Math.sin(S.t * 2.5 + 1.5) * 0.04; snips.scale.lerp(new THREE.Vector3(1, 1, 1), Math.min(1, dt * 6));
    lanterns.forEach((l, i) => { l.rotation.z = Math.sin(S.t * 1.3 + i) * 0.06; });
    // a slow, gentle drift of the camera
    camera.position.set(0.45 + Math.sin(S.t * 0.25) * 0.2, 1.75, 3.3);
    camera.lookAt(0.05, 1.5, -1.4);
  }
  function render(ink, t) { ink.render(scene, camera, t); }

  return { get hecklerObj() { return H.b?.g; }, init, heckle, stopHeckle, resetHeckle, updateHeckle, hazards, get heckling() { return H.on; }, makeSign, animSign, open, leave, buy, update, render, get open_() { return S.open; }, get busy() { return S.busy; }, PRICE };
}
