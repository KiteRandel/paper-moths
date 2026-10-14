// Amara & the Paper Moths — an endless rooftop run at dusk. Made by KiteRandel.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PAL, T, makeTextures, toon, toonify } from './art.js?v=46';
import { InkPass } from './post.js?v=46';
import { initAudio, sfx, setMusic, tickMusic, setMuted, snd, setBossMusic, bossMusicState, pauseAudio } from './audio.js?v=46';
import { createBosses } from './boss.js?v=46';
import { createShop } from './shop.js?v=46';
import { createBrief } from './brief.js?v=46';
import { createEnding } from './ending.js?v=46';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];

// =================================================================== renderer & scene
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
$('stage').appendChild(renderer.domElement);
makeTextures();
const ink = new InkPass(renderer);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#c9b3a4');
scene.fog = new THREE.Fog('#cdb8a8', 28, 105);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200);
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight); ink.setSize();
  camera.aspect = innerWidth / innerHeight; camera.fov = camera.aspect < 0.8 ? 68 : 55; camera.updateProjectionMatrix();
});
dispatchEvent(new Event('resize'));

scene.add(new THREE.HemisphereLight('#f3e3d2', '#6b5650', 1.35));
const sun = new THREE.DirectionalLight('#ffe6cc', 1.6); sun.position.set(-6, 10, -8); scene.add(sun); scene.add(sun.target);

const BG = 1;   // layer for things without ink outlines (sky, glows, particles)
function bgOnly(o) { o.traverse((c) => c.layers.set(BG)); return o; }

// sky dome, moon, distant town silhouettes — they follow the camera
const sky = bgOnly(new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), new THREE.MeshBasicMaterial({ map: T.sky, side: THREE.BackSide, fog: false, depthWrite: false })));
sky.material.map.offset.set(0, 0); sky.rotation.x = 0; scene.add(sky);
// remap sky gradient onto latitude: UV v already runs pole→pole on a sphere
const moon = bgOnly(new THREE.Mesh(new THREE.PlaneGeometry(46, 46), new THREE.MeshBasicMaterial({ map: T.moon, transparent: true, fog: false, depthWrite: false })));
scene.add(moon);
const skyline = [];
for (const [tx, dist, h, y] of [[T.far, 140, 34, 2], [T.mid, 112, 30, -2]]) {
  const m = bgOnly(new THREE.Mesh(new THREE.PlaneGeometry(320, h), new THREE.MeshBasicMaterial({ map: tx, transparent: true, fog: false, depthWrite: false })));
  tx.repeat.set(3, 1); m.userData = { dist, y }; scene.add(m); skyline.push(m);
}

// =================================================================== world building blocks
const LANES = [-1.7, 0, 1.7];
const W = 6.4;
const world = new THREE.Group(); scene.add(world);
function scaledUV(geo, su, sv) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return geo; }
const mWalk = toon({ map: T.walk }), mWall = toon({ map: T.wall }), mBrick = toon({ map: T.brick }), mRoof = toon({ map: T.roof }), mWood = toon({ map: T.wood });
const mDark = toon({ color: PAL.umber }), mCream = toon({ color: PAL.cream }), mRope = toon({ color: PAL.ink });
const lanternMat = new THREE.MeshToonMaterial({ map: T.lantern, emissive: new THREE.Color(PAL.ember), emissiveIntensity: 0.7 });

function buildingBlock(len) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(scaledUV(new THREE.PlaneGeometry(W, len), 1.2, len / 5), mWalk); top.rotation.x = -Math.PI / 2; g.add(top);
  const body = new THREE.Mesh(scaledUV(new THREE.BoxGeometry(W, 16, len), len / 8, 2.2), mWall); body.position.y = -8.02; g.add(body);
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(scaledUV(new THREE.BoxGeometry(0.3, 0.4, len), len / 2, 0.2), mBrick); p.position.set(s * (W / 2 + 0.15), 0.2, 0); g.add(p);
  }
  const lip = new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, 0.18, 0.3), mDark); lip.position.set(0, -0.09, len / 2); g.add(lip.clone());
  lip.position.z = -len / 2; g.add(lip);
  return g;
}
function house(w, d, h) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(scaledUV(new THREE.BoxGeometry(w, h, d), w / 4, h / 4), mWall); body.position.y = h / 2; g.add(body);
  const roofH = w * 0.38;
  const shape = new THREE.Shape(); shape.moveTo(-w / 2 - 0.35, 0); shape.lineTo(0, roofH); shape.lineTo(w / 2 + 0.35, 0); shape.lineTo(-w / 2 - 0.35, 0);
  const roof = new THREE.Mesh(scaledUV(new THREE.ExtrudeGeometry(shape, { depth: d + 0.5, bevelEnabled: false }), 0.25, 0.25), mRoof);
  roof.position.set(0, h, -d / 2 - 0.25); g.add(roof);
  if (Math.random() < 0.7) { const ch = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.5), mBrick); ch.position.set(w * 0.22 * (Math.random() < 0.5 ? -1 : 1), h + roofH * 0.6, rand(-d / 3, d / 3)); g.add(ch); }
  return g;
}
function crate(h = 0.9) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.BoxGeometry(1.15, h, 1.0), mWood); b.position.y = h / 2; g.add(b);
  if (Math.random() < 0.5) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.55), mWood); s.position.set(rand(-0.2, 0.2), h + 0.22, 0); s.rotation.y = rand(-0.4, 0.4); g.add(s); }
  return g;
}
function chimney() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(scaledUV(new THREE.BoxGeometry(1.1, 2.6, 1.0), 1, 2.4), mBrick); b.position.y = 1.3; g.add(b);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.2, 1.25), mDark); cap.position.y = 2.7; g.add(cap);
  for (const x of [-0.25, 0.25]) { const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.45, 10), toon({ color: PAL.rose })); pot.position.set(x, 3.0, 0); g.add(pot); }
  return g;
}
function laundry(lanes) {
  // a rope between two poles with hanging cloth over the given lanes — slide under it
  const g = new THREE.Group();
  const x0 = Math.min(...lanes.map((l) => LANES[l])) - 0.95, x1 = Math.max(...lanes.map((l) => LANES[l])) + 0.95;
  for (const x of [x0, x1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.9, 8), mDark); p.position.set(x, 1.45, 0); g.add(p); }
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, x1 - x0, 6), mRope); rope.rotation.z = Math.PI / 2; rope.position.set((x0 + x1) / 2, 2.55, 0); g.add(rope);
  for (let x = x0 + 0.35; x < x1 - 0.3; x += rand(0.55, 0.8)) {
    const h = rand(0.95, 1.3), w = rand(0.45, 0.65);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 1, 4), toon({ map: choice(T.cloth), side: THREE.DoubleSide }));
    cloth.position.set(x, 2.55 - h / 2, 0); cloth.userData.sway = rand(0, 6); g.add(cloth);
    const pin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.05), mCream); pin.position.set(x, 2.57, 0); g.add(pin);
  }
  return g;
}
function lanternString(x0, x1, y) {
  const g = new THREE.Group();
  const n = Math.round(Math.abs(x1 - x0) / 1.4);
  // the string sags between two posts standing on the parapets
  const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push(new THREE.Vector3(x0 + (x1 - x0) * t, y - Math.sin(Math.PI * t) * 0.5, 0)); }
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.018, 4), mRope));
  for (const x of [x0, x1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, y + 0.1, 8), mDark); post.position.set(x, (y + 0.1) / 2 - 0.05, 0); g.add(post); }
  for (let i = 1; i < n; i++) {
    const x = x0 + ((x1 - x0) * i) / n, sag = Math.sin((Math.PI * i) / n) * 0.5;
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.3, 12), lanternMat);
    l.position.set(x, y - sag - 0.3, 0); g.add(l);
    for (const dy of [0.16, -0.16]) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 10), mDark); cap.position.set(x, l.position.y + dy, 0); g.add(cap); }
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.15, 4), mRope); str.position.set(x, l.position.y + 0.24, 0); g.add(str);
    const glow = bgOnly(new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: PAL.glow, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })));
    glow.scale.set(0.9, 0.9, 1); glow.position.copy(l.position); g.add(glow);
  }
  return g;
}

// paper moths: folded-paper wings with a warm glow
const wingGeo = new THREE.PlaneGeometry(0.26, 0.26); wingGeo.translate(0.13, 0, 0);
const mWing = new THREE.MeshToonMaterial({ map: T.wing, alphaTest: 0.5, side: THREE.DoubleSide, emissive: new THREE.Color(PAL.glow), emissiveIntensity: 0.45 });
const mWingGold = new THREE.MeshToonMaterial({ map: T.wing, color: PAL.ember, alphaTest: 0.5, side: THREE.DoubleSide, emissive: new THREE.Color(PAL.ember), emissiveIntensity: 0.6 });
function moth(gold = false) {
  const g = new THREE.Group(); const m = gold ? mWingGold : mWing;
  const l = bgOnly(new THREE.Mesh(wingGeo, m)), r = bgOnly(new THREE.Mesh(wingGeo, m)); r.scale.x = -1; g.add(l, r);   // wings carry their own painted ink line
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.13, 3, 6), toon({ color: PAL.umber })); body.rotation.x = Math.PI / 2; g.add(body);
  const glow = bgOnly(new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: gold ? PAL.ember : PAL.glow, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending })));
  glow.scale.set(gold ? 1.1 : 0.75, gold ? 1.1 : 0.75, 1); g.add(glow);
  g.rotation.x = -0.5;          // wings tilted up toward the camera like a moth at rest
  g.scale.setScalar(gold ? 1.5 : 1.15);
  g.userData = { l, r, t: rand(0, 6) };
  return g;
}
function powerup(kind) {
  const g = new THREE.Group();
  if (kind === 'shield') {          // a roll of bandage, like the ones on Amara's tail
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.3, 18), toon({ color: PAL.paper })); roll.rotation.z = Math.PI / 2; g.add(roll);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.32, 10), toon({ color: PAL.tan })); core.rotation.z = Math.PI / 2; g.add(core);
    const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.6), toon({ color: PAL.paper, side: THREE.DoubleSide })); tail.position.set(0, -0.45, 0.22); tail.rotation.x = 0.4; g.add(tail);
  } else {                           // magnet: a ribbon bow
    const m = toon({ color: PAL.rose, side: THREE.DoubleSide, emissive: new THREE.Color(PAL.rose), emissiveIntensity: 0.25 });
    for (const s of [-1, 1]) { const loop = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.07, 8, 16), m); loop.scale.set(1, 0.7, 0.6); loop.position.x = s * 0.2; g.add(loop);
      const end = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.45), m); end.position.set(s * 0.12, -0.28, 0); end.rotation.z = s * 0.35; g.add(end); }
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), m));
  }
  const glow = bgOnly(new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: PAL.glow, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })));
  glow.scale.set(2, 2, 1); g.add(glow);
  g.userData.kind = kind;
  return g;
}

// falling paper petals around the camera
const petals = [];
const petalMat = new THREE.SpriteMaterial({ map: T.leaf, color: '#efe6da', transparent: true, depthWrite: false, fog: true });
for (let i = 0; i < 46; i++) {
  const s = bgOnly(new THREE.Sprite(petalMat)); s.scale.setScalar(rand(0.12, 0.22)); scene.add(s);
  s.userData = { ox: rand(-10, 10), oy: rand(-1, 9), oz: rand(-30, 4), sp: rand(0.4, 1), ph: rand(0, 6) }; petals.push(s);
}
const sparks = [];
function sparkle(pos, color = PAL.glow, n = 8) {
  for (let i = 0; i < n; i++) {
    const s = bgOnly(new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    s.position.copy(pos); s.scale.setScalar(0.35); scene.add(s);
    sparks.push({ s, v: new THREE.Vector3(rand(-2, 2), rand(0.5, 3), rand(-2, 2)), life: 0.6 });
  }
}

// =================================================================== track generation
let blocks = [], obstacles = [], moths = [], powers = [], decor = [], signs = [];
let genZ = 0;          // world z where the next piece starts (we run toward -z)
let rowsSincePower = 0;
function clearWorld() {
  for (const o of [...world.children]) world.remove(o);
  blocks = []; obstacles = []; moths = []; powers = []; decor = []; signs = []; genZ = 8; rowsSincePower = 0;
}
function addObstacle(kind, lane, z) {
  let mesh, box;
  const x = LANES[lane];
  if (kind === 'crate') { mesh = crate(); box = { x0: x - 0.58, x1: x + 0.58, y0: 0, y1: 0.95, z0: z - 0.5, z1: z + 0.5 }; }
  else if (kind === 'chimney') { mesh = chimney(); box = { x0: x - 0.55, x1: x + 0.55, y0: 0, y1: 3, z0: z - 0.5, z1: z + 0.5 }; }
  mesh.position.set(x, 0, z); world.add(mesh);
  obstacles.push({ kind, mesh, box, lane });
}
function addLaundry(lanes, z) {
  const mesh = laundry(lanes); mesh.position.z = z; world.add(mesh);
  const xs = lanes.map((l) => LANES[l]);
  obstacles.push({ kind: 'laundry', mesh, box: { x0: Math.min(...xs) - 0.85, x1: Math.max(...xs) + 0.85, y0: 0.95, y1: 3, z0: z - 0.3, z1: z + 0.3 } });
}
function addSign(lane, z) { const s = shop.makeSign(); s.position.set(LANES[lane], 0, z); world.add(s); signs.push({ s, lane, z, used: false }); }
function addMoth(x, y, z, gold = false) { const m = moth(gold); m.position.set(x, y, z); world.add(m); moths.push({ m, gold, base: y }); }
function addPower(kind, lane, z) { const p = powerup(kind); p.position.set(LANES[lane], 1.1, z); world.add(p); powers.push({ p, kind }); }
function mothLine(lane, z0, n, step = 1.6, y = 1.0) { for (let i = 0; i < n; i++) addMoth(LANES[lane], y, z0 - i * step); }
function mothArc(lane, zc, span = 6) { for (let i = 0; i <= 6; i++) { const t = i / 6; addMoth(LANES[lane], 1.0 + Math.sin(t * Math.PI) * 1.6, zc + span / 2 - t * span); } }

function generateBlock(speed) {
  if (boss.quiet()) return quietBlock();
  const len = rand(24, 44);
  const z0 = genZ, z1 = genZ - len;
  const b = buildingBlock(len); b.position.set(0, 0, (z0 + z1) / 2); world.add(b);
  blocks.push({ z0, z1, mesh: b });
  // scenery on both sides: rows of pitched-roof houses below/above the run, sometimes lantern strings
  for (const side of [-1, 1]) {
    let z = z0;
    while (z > z1 - 4) {
      const w = rand(3.5, 5.5), d = rand(4, 7), h = rand(6, 18);
      const hs = house(w, d, h); hs.position.set(side * (W / 2 + 1.2 + w / 2 + rand(0, 3.5)), -h + rand(-3, 4.5), z - d / 2); world.add(hs);
      decor.push(hs); z -= d + rand(0.3, 2.5);
    }
  }
  if (Math.random() < 0.55) { const ls = lanternString(-W / 2 - 0.15, W / 2 + 0.15, rand(3.3, 3.8)); ls.position.z = rand(z1 + 4, z0 - 4); world.add(ls); decor.push(ls); }
  // obstacle rows
  const spacing = clamp(6 + speed * 0.25, 8, 12);
  let z = z0 - Math.max(9, speed * 0.85);
  let prevFree = 1;
  while (z > z1 + Math.max(6, speed * 0.6)) {
    const r = Math.random();
    let free = Math.floor(Math.random() * 3);
    if (shopOn && -z > nextShopAt && z < z0 - 12) {              // a SHOP archway over one lane, with nothing else in this row
      const l = prevFree; addSign(l, z); mothLine(l, z + 7, 4); free = l; nextShopAt = -z + 650;
    } else if (r < 0.28) {                                            // one crate
      const l = choice([0, 1, 2]); addObstacle('crate', l, z); free = (l + 1 + Math.floor(Math.random() * 2)) % 3;
      if (Math.random() < 0.6) mothArc(l, z); else mothLine(free, z + 3, 4);
    } else if (r < 0.48) {                                     // two crates, one gap
      for (let l = 0; l < 3; l++) if (l !== free) addObstacle('crate', l, z);
      mothLine(free, z + 4, 5);
    } else if (r < 0.64) {                                     // chimney + crate
      const ch = (free + 1) % 3, cr = (free + 2) % 3; addObstacle('chimney', ch, z); addObstacle('crate', cr, z);
      mothArc(cr, z);
    } else if (r < 0.78) {                                     // laundry across everything: slide!
      addLaundry([0, 1, 2], z); for (let i = -2; i <= 2; i++) addMoth(LANES[prevFree], 0.45, z + i * 1.1);
      free = prevFree;
    } else if (r < 0.9) {                                      // laundry on two lanes, chimney on the third
      const ch = Math.floor(Math.random() * 3); const lanes = [0, 1, 2].filter((l) => l !== ch);
      addObstacle('chimney', ch, z); addLaundry(lanes, z); free = lanes[0];
      mothLine(lanes[1], z + 3, 4, 1.5, 0.45);
    } else {                                                   // crates on all three: jump!
      for (let l = 0; l < 3; l++) addObstacle('crate', l, z);
      mothArc(free, z); free = prevFree;
    }
    if (++rowsSincePower > 9 && Math.random() < 0.3) { addPower(Math.random() < 0.5 ? 'shield' : 'magnet', free, z + spacing / 2); rowsSincePower = 0; }
    else if (Math.random() < 0.06) addMoth(LANES[free], 1.2, z + spacing / 2, true);
    prevFree = free;
    z -= spacing * rand(0.85, 1.25);
  }
  // gap after the block, with a moth arc as a hint to jump
  const gap = clamp(rand(2.6, 3.4) + speed * 0.06, 2.6, 4.4);
  genZ = z1 - gap;
  mothArc(prevFree, z1 - gap / 2, gap + 3);
}

// a long, gap-free roof with only a few moths: the arena for a boss fight
function quietBlock() {
  const len = 40, z0 = genZ, z1 = genZ - len;
  boss.quietStartsAt(z0);
  const b = buildingBlock(len); b.position.set(0, 0, (z0 + z1) / 2); world.add(b);
  blocks.push({ z0, z1, mesh: b });
  for (const side of [-1, 1]) {
    let z = z0;
    while (z > z1 - 4) {
      const w = rand(3.5, 5.5), d = rand(4, 7), h = rand(6, 18);
      const hs = house(w, d, h); hs.position.set(side * (W / 2 + 1.2 + w / 2 + rand(0, 3.5)), -h + rand(-3, 4.5), z - d / 2); world.add(hs);
      decor.push(hs); z -= d + rand(0.3, 2.5);
    }
  }
  if (Math.random() < 0.4) mothLine(Math.floor(Math.random() * 3), z0 - rand(8, 20), 4);
  genZ = z1;   // no gap: the roof keeps going
}

// =================================================================== Amara
const player = {
  root: new THREE.Group(), model: null, mixer: null, actions: {}, current: null,
  lane: 1, x: 0, y: 0, vy: 0, z: 0, grounded: true, slideT: 0, coyote: 0, alive: true, falling: false,
  shield: 0, magnet: 0, shieldFx: null,
};
scene.add(player.root);
const shadow = bgOnly(new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({ color: PAL.ink, transparent: true, opacity: 0.28, depthWrite: false })));
shadow.rotation.x = -Math.PI / 2; scene.add(shadow);
function play(name, fade = 0.15) {
  const a = player.actions[name]; if (!a || a === player.current) return;
  a.reset(); a.enabled = true; a.setEffectiveWeight(1);
  if (name === 'Hit') { a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; } else a.setLoop(THREE.LoopRepeat);
  a.play(); if (player.current) player.current.crossFadeTo(a, fade, false); player.current = a;
}
{ // bandage-swirl shield effect
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.05, 6, 40), toon({ color: PAL.paper, emissive: new THREE.Color(PAL.glow), emissiveIntensity: 0.7 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.9; ring.visible = false; player.root.add(ring); player.shieldFx = ring;
}

// =================================================================== game state
let state = 'title';      // title | run | shop | dead | ending
let bandaidsUsed = 0, shopVisits = 0, loopN = 1;
let rampT = 0, speed = 0, dist = 0, mothsGot = 0, score = 0, combo = 0, comboT = 0, runT = 0, best = 0, shake = 0, deadT = 0, flash = 0;
try { best = +localStorage.getItem('paperMoths.bestBosses') || 0; } catch (_) { /* ignore */ }
$('best').textContent = best;
let shopOn = true, nextShopAt = 240;

// =================================================================== the moth purse: every moth you catch is saved, and spent at the shop
let wallet = 0, walletShown = 0;
try { wallet = walletShown = Math.max(0, +localStorage.getItem('paperMoths.wallet') || 0); } catch (_) { /* ignore */ }
function saveWallet() { try { localStorage.setItem('paperMoths.wallet', wallet); } catch (_) { /* ignore */ } }
function showWallet() { $('walletN').textContent = walletShown; }
function bumpWallet(n) {
  walletShown = Math.min(wallet, walletShown + n); showWallet();
  const el = $('wallet'); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
}
const walletApi = {
  get: () => wallet,
  spend(n) { if (wallet < n) return false; wallet -= n; walletShown = Math.min(walletShown, wallet); saveWallet(); showWallet(); return true; },
};
// a little moth icon drawn from the same paper wing the 3D moths use
let mothIcon = '';
function makeMothIcon() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const img = T.wing.image;
  g.save(); g.translate(32, 32); g.rotate(-0.25); g.drawImage(img, 0, -26, 30, 30); g.restore();
  g.save(); g.translate(32, 32); g.scale(-1, 1); g.rotate(-0.25); g.drawImage(img, 0, -26, 30, 30); g.restore();
  g.fillStyle = PAL.umber; g.beginPath(); g.ellipse(32, 30, 3, 12, 0, 0, 7); g.fill();
  mothIcon = c.toDataURL(); $('walletIcon').src = mothIcon;
}
// collected moths flutter from where they were caught to the purse in the corner
const fliers = [];
function flyToWallet(worldPos, value, gold) {
  const v = worldPos.clone().project(camera);
  const x = (v.x + 1) / 2 * innerWidth, y = (1 - v.y) / 2 * innerHeight;
  if (fliers.length > 40 || v.z > 1) { bumpWallet(value); return; }
  const el = document.createElement('img'); el.src = mothIcon; el.className = gold ? 'flyMoth gold' : 'flyMoth'; document.body.appendChild(el);
  const r = $('wallet').getBoundingClientRect();
  const tx = r.left + 26, ty = r.top + r.height / 2;
  fliers.push({ el, x0: x, y0: y, cx: lerp(x, tx, 0.35) + rand(-80, 80), cy: Math.min(y, ty) - rand(60, 160), tx, ty, t: 0, dur: rand(0.55, 0.75), value, ph: rand(0, 6) });
}
function updateFliers(dt) {
  for (const f of [...fliers]) {
    f.t += dt / f.dur; const t = Math.min(1, f.t), e = t * t * (3 - 2 * t), u = 1 - e;
    const x = u * u * f.x0 + 2 * u * e * f.cx + e * e * f.tx, y = u * u * f.y0 + 2 * u * e * f.cy + e * e * f.ty;
    const flap = 0.55 + 0.45 * Math.abs(Math.sin(f.t * 30 + f.ph));
    f.el.style.transform = `translate(${x - 19}px, ${y - 19}px) scale(${(1.25 - e * 0.55) * flap}, ${1.25 - e * 0.55}) rotate(${Math.sin(f.t * 12) * 20}deg)`;
    if (f.t >= 1) { f.el.remove(); fliers.splice(fliers.indexOf(f), 1); bumpWallet(f.value); }
  }
}

// =================================================================== bandaids: stack up to three, each one blocks a hit
const MAX_BANDAIDS = 1;     // one bandaid at a time: it doesn't stack
function setBandaids(n) {
  player.shield = clamp(n, 0, 99); player.shieldFx.visible = player.shield > 0;
  $('pShield').classList.toggle('hidden', player.shield <= 0);
  $('pShieldN').textContent = player.shield > 1 && player.shield < 99 ? ` \u00d7${player.shield}` : '';
}
// paper scissors (from the shop): automatically snip away the next obstacle coming at you in your lane
let scissors = 0;
function setScissors(n) {
  scissors = clamp(n, 0, 3);
  $('pSnip').classList.toggle('hidden', scissors <= 0);
  $('pSnipN').textContent = scissors > 1 ? ` \u00d7${scissors}` : '';
}
const scissorsApi = { get: () => scissors, add(n) { setScissors(scissors + n); }, max: 3 };
function snipAhead() {
  const p = player; if (scissors <= 0 || !p.alive) return;
  const reach = speed * 0.4 + 1.2;
  const o = obstacles.filter((o) => !o.dead && p.x + 0.3 > o.box.x0 && p.x - 0.3 < o.box.x1 && o.box.z1 < p.z + 0.2 && p.z - o.box.z1 < reach)
    .filter((o) => !(o.kind === 'laundry' && p.slideT > 0) && !(o.kind === 'crate' && p.y > 1.1))      // already ducking/clearing it: save the snip
    .sort((a, b) => b.box.z1 - a.box.z1)[0];
  if (!o) return;
  o.dead = true; world.remove(o.mesh); setScissors(scissors - 1);
  const at = new THREE.Vector3((o.box.x0 + o.box.x1) / 2, 1, (o.box.z0 + o.box.z1) / 2);
  sparkle(at, PAL.paper, 22); sparkle(at, '#ff9cc8', 10); sfx.snap(); flash = Math.max(flash, 0.15);
  for (let i = 0; i < 10; i++) {   // little paper scraps flutter off
    const s = bgOnly(new THREE.Sprite(new THREE.SpriteMaterial({ map: T.leaf, color: '#efe6da', transparent: true, depthWrite: false })));
    s.position.copy(at); s.scale.setScalar(0.25); scene.add(s); sparks.push({ s, v: new THREE.Vector3(rand(-3, 3), rand(1, 4), rand(-2, 2)), life: 0.6 });
  }
}
const bandaidApi = { get: () => player.shield, add(n) { if (player.shield >= 99) return; setBandaids(Math.min(MAX_BANDAIDS, player.shield + n)); }, max: MAX_BANDAIDS };

// =================================================================== first-run tutorial: slow motion until you press the right key
const tut = { on: false, done: false, waiting: null, jumped: false, slid: false, scale: 1, target: 1, crateZ: 0, laundryZ: 0 };
try { tut.done = localStorage.getItem('paperMoths.tutorial') === 'done'; } catch (_) { /* ignore */ }
const touchUI = matchMedia('(hover: none)').matches;
function showTut(kind) {
  const el = $('tut');
  el.querySelector('.keys').innerHTML = touchUI
    ? `<span class="swipe ${kind}">${kind === 'jump' ? '\u261D\uFE0F' : '\u261D\uFE0F'}</span>`
    : (kind === 'jump' ? ['W', '\u2191', 'Space'] : ['S', '\u2193']).map((k, i) => `<kbd style="animation-delay:${i * 0.18}s"${k === 'Space' ? ' class="wide"' : ''}>${k}</kbd>`).join('<i>or</i>');
  el.querySelector('.say').textContent = kind === 'jump' ? (touchUI ? 'Swipe up to jump the crates!' : 'Jump over the crates!') : (touchUI ? 'Swipe down to slide under!' : 'Slide under the laundry!');
  el.className = `tut on ${kind}`;
}
function hideTut() { const el = $('tut'); if (el) el.className = 'tut'; }
function tutResolve() {
  tut.waiting = null; tut.target = 1; hideTut(); sfx.power();
  if (tut.jumped && tut.slid) finishTut();
}
function finishTut() {
  tut.on = false; tut.done = true;
  try { localStorage.setItem('paperMoths.tutorial', 'done'); } catch (_) { /* ignore */ }
  setTimeout(() => { const b = $('banner'); b.innerHTML = 'You\u2019ve got it!<small>now catch those moths</small>'; b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 1600); }, 900);
}
function updateTut() {
  if (!tut.on || state !== 'run') return;
  const p = player;
  if (!tut.jumped && !tut.waiting) {
    const d = p.z - (tut.crateZ + 0.5);
    if (!p.grounded && d < 5 && d > -1) tut.jumped = true;                       // already jumping: nothing to teach
    else if (d < 4.2 && d > 0) { tut.waiting = 'jump'; tut.target = tut.scale = 0.04; tut.cut = true; showTut('jump'); }
  }
  if (tut.jumped && !tut.slid && !tut.waiting) {
    const d = p.z - (tut.laundryZ + 0.3);
    if (p.slideT > 0 && d < 5 && d > -1) { tut.slid = true; finishTut(); }
    else if (d < 4.2 && d > 0) { tut.waiting = 'slide'; tut.target = tut.scale = 0.04; tut.cut = true; showTut('slide'); }
  }
}

function resetRun() {
  boss.reset(); shop.resetHeckle();
  clearWorld();
  player.lane = 1; player.x = 0; player.y = 0; player.vy = 0; player.z = 0; player.grounded = true; player.slideT = 0;
  player.alive = true; player.falling = false; setBandaids(0); setScissors(0); player.magnet = 0;
  ending.cleanup(); bandaidsUsed = 0; shopVisits = 0; setLoop(1);
  nextShopAt = 240; rampT = 0; brief.hide(); speed = 0; dist = 0; mothsGot = 0; mothPoints = 0; score = 0; combo = 0; comboT = 0; runT = 0; deadT = 0;
  genZ = 6;
  // a starting runway (longer on the first run, with the tutorial crates and laundry on it)
  tut.on = !tut.done; tut.waiting = null; tut.jumped = false; tut.slid = false; tut.target = 1; tut.scale = 1; hideTut();
  const runEnd = tut.on ? -64 : -32;
  const start = buildingBlock(8 - runEnd); start.position.set(0, 0, (8 + runEnd) / 2); world.add(start); blocks.push({ z0: 8, z1: runEnd, mesh: start });
  for (const side of [-1, 1]) for (let z = 6; z > runEnd; z -= 6) { const h = rand(6, 14); const hs = house(4.5, 5, h); hs.position.set(side * rand(6.2, 8.5), -h + rand(-2, 3.5), z - 2.5); world.add(hs); }
  const ls = lanternString(-W / 2 - 0.15, W / 2 + 0.15, 3.6); ls.position.z = -6; world.add(ls);
  genZ = runEnd; mothLine(1, -8, 6);
  if (tut.on) {
    tut.crateZ = -26; tut.laundryZ = -48;
    for (let l = 0; l < 3; l++) addObstacle('crate', l, tut.crateZ);
    mothArc(1, tut.crateZ);
    addLaundry([0, 1, 2], tut.laundryZ); for (let i = -2; i <= 2; i++) addMoth(LANES[1], 0.45, tut.laundryZ + i * 1.1);
  }
  const gap = 3; mothArc(1, runEnd - gap / 2, gap + 3); genZ = runEnd - gap;
  while (genZ > -140) generateBlock(10);
}
function startRun() {
  if (paused) setPaused(false);
  initAudio(); sfx.click(); setMusic(true);
  $('title').classList.add('hidden'); $('over').classList.add('hidden'); $('hud').classList.remove('hidden');
  if (state !== 'title') resetRun();
  state = 'run'; speed = 12; play('Run');
}
function die(kind) {
  if (!player.alive) return;
  player.alive = false; state = 'dead'; deadT = 0; setBossMusic(false);
  if (kind === 'fall') { sfx.fall(); play('Leap'); } else { sfx.hit(); play('Hit', 0.08); shake = 0.5; flash = 0.45; }
  brief.hide();
  const beaten = boss.beaten;
  const isBest = beaten > best;
  if (isBest) { best = beaten; try { localStorage.setItem('paperMoths.bestBosses', best); } catch (_) { /* ignore */ } }
  setTimeout(() => {
    $('oBosses').textContent = beaten; $('oDist').textContent = `${Math.floor(dist)} m`; $('oMoths').textContent = mothsGot; $('oBest').textContent = best;
    $('oTitle').textContent = isBest ? 'A new record!' : kind === 'fall' ? 'Missed the jump…' : lastHurt || 'Bonk!';
    lastHurt = '';
    $('over').classList.remove('hidden'); $('best').textContent = best;
  }, 1300);
}
let mothPoints = 0;
const brief = createBrief({ sfx });
let noBrief = false;
const boss = createBosses({
  brief: (kind, cb) => { if (noBrief) cb(); else brief.show(kind, cb); },
  scene, world, player, LANES, bgOnly, sfx, sparkle, addMoth, bossMusic: setBossMusic,
  get speed() { return speed; }, get dist() { return dist; }, get t() { return elapsed; },
  addPoints(n) { mothPoints += n; },
  fx(f, sh) { flash = Math.max(flash, f); shake = Math.max(shake, sh); },
  giveShield() { bandaidApi.add(1); },
  hurt(msg) { hurtPlayer(msg); },
  addObstacle: (k, l, z) => addObstacle(k, l, z),
  finale: () => startEnding(),
});
// =================================================================== the ending: goodbyes, the moths fly into Amara, and off to the moon
const ending = createEnding({
  scene, player, camera, sfx, sparkle, play: (n) => play(n), speed: () => speed,
  wheel: () => boss.prismWheel, group: () => boss.prismGroup, noteSprite: (s) => boss.noteSprite(s), anim: (b, n, o) => boss.anim(b, n, o),
  stats: () => ({ bosses: boss.beaten, dist, moths: mothsGot, bandaids: bandaidsUsed, loop: loopN }),
  shopVisits: () => shopVisits, mothIcon: () => mothIcon,
  onAgain: () => startRun(),
  onLoop: () => loopAgain(),
});
function setLoop(n) { loopN = n; const el = $('loopTag'); if (el) { el.textContent = n > 1 ? ` \u00b7 loop ${n}` : ''; } }
function startEnding() {
  if (state !== 'run' || !player.alive) return;
  state = 'ending'; brief.hide(); shop.resetHeckle(); slideHeld = false;
  const beaten = boss.beaten; if (beaten > best) { best = beaten; try { localStorage.setItem('paperMoths.bestBosses', best); } catch (_) { /* ignore */ } $('best').textContent = best; }
  ending.start();
}
function loopAgain() {
  // the same game again, from the first boss, without losing anything
  const f = $('fade'); f.classList.add('on');
  setTimeout(() => {
    const z = ending.anchorZ ?? player.z;
    ending.cleanup(); boss.loopOn();
    const p = player; p.z = z; p.lane = 1; p.x = 0; p.y = 0; p.vy = 0; p.grounded = true; p.falling = false; p.slideT = 0; p.root.position.set(0, 0, z);
    for (const o of [...obstacles]) if (o.box.z1 < z + 2 && o.box.z0 > z - 40) { world.remove(o.mesh); obstacles.splice(obstacles.indexOf(o), 1); }
    if (!onBlockAt(z) || !onBlockAt(z - 30)) { const run = buildingBlock(40); run.position.set(0, 0, z - 18); world.add(run); blocks.push({ z0: z + 2, z1: z - 38, mesh: run }); }
    setLoop(loopN + 1); speed = 12; rampT = 0; state = 'run'; play('Run', 0);
    camPos.set(0, 2.55, z + 4.3); camLook.set(0, 1.15, z - 6);
    f.classList.remove('on');
    const b = $('banner'); b.innerHTML = `Loop ${loopN}<small>here we go again!</small>`; b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 2000);
  }, 380);
}
let lastHurt = '';
const hurtLog = [];
function hurtPlayer(msg) {
  if (!player.alive) return;
  hurtLog.push(msg); if (hurtLog.length > 40) hurtLog.shift();
  if (player.shield > 0) { bandaidsUsed++; setBandaids(player.shield - 1); sfx.shield(); flash = 0.35; shake = 0.3; sparkle(player.root.position.clone().add(new THREE.Vector3(0, 1, 0)), PAL.paper, 16); }
  else { lastHurt = msg; die('hit'); }
}
function collectMoth(mo) {
  const at = mo.m.getWorldPosition(new THREE.Vector3());
  world.remove(mo.m); moths.splice(moths.indexOf(mo), 1);
  const value = mo.gold ? 5 : 1; wallet += value; saveWallet(); flyToWallet(at, value, mo.gold);
  combo = comboT > 0 ? combo + 1 : 1; comboT = 1.3;
  const mult = Math.min(1 + Math.floor(combo / 5), 5);
  mothsGot++; mothPoints += (mo.gold ? 50 : 10) * mult;
  mo.gold ? sfx.bell() : sfx.moth(combo % 11);
  sparkle(at, mo.gold ? PAL.ember : PAL.glow, mo.gold ? 14 : 7);
}

function enterShop() {
  if (boss.quiet() || !shopOn) return;
  state = 'shop'; shopVisits++; sfx.power(); shop.open();
}
function leaveShop() {
  // clear a little breathing room ahead, then back to running
  const p = player;
  for (const o of [...obstacles]) if (o.box.z1 < p.z + 1 && o.box.z0 > p.z - 22) { world.remove(o.mesh); obstacles.splice(obstacles.indexOf(o), 1); }
  state = 'run'; play('Run', 0);
  const b = $('banner'); b.innerHTML = 'Back to the roof!'; b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 1200);
}
const shop = createShop({
  canvas: renderer.domElement,
  sfx, bgOnly, wallet: walletApi, bandaids: bandaidApi, scissors: scissorsApi, onLeave: leaveShop,
  mainScene: scene, player, LANES, get speed() { return speed; },
  canHeckle: () => state === 'run' && player.alive && !boss.quiet(),
  // somewhere she can call lightning down: on a roof, not near a gap's edge, and clear of other obstacles
  hurt: (msg) => hurtPlayer(msg),
  fx(f, sh) { flash = Math.max(flash, f); shake = Math.max(shake, sh); },
  freeAt: (z) => blocks.some((b) => z < b.z0 - 2 && z > b.z1 + 2.5) && !obstacles.some((o) => !o.dead && o.box.z0 - 2.6 < z && o.box.z1 + 2.6 > z),
});

// =================================================================== input
const act = { left() { if (tut.waiting || brief.on || boss.laneLocked()) return; boss.noteAction(); if (player.lane > 0) { player.lane--; sfx.lane(); } }, right() { if (tut.waiting || brief.on || boss.laneLocked()) return; boss.noteAction(); if (player.lane < 2) { player.lane++; sfx.lane(); } },
  jump() { if (tut.waiting === 'slide' || brief.on) return; if (boss.onJump()) return; boss.noteAction(); if (tut.waiting === 'jump') { tut.jumped = true; tutResolve(); } if (player.grounded || player.coyote > 0) { player.vy = 9.2; player.grounded = false; player.coyote = 0; player.slideT = 0; sfx.jump(); } },
  slide() { if (tut.waiting === 'jump' || brief.on) return; boss.noteAction(); if (tut.waiting === 'slide') { tut.slid = true; tutResolve(); } if (!player.grounded) { player.vy = Math.min(player.vy, -16); player.slideT = 0.75; } else if (player.slideT <= 0) { player.slideT = 0.75; sfx.slide(); } } };
// =================================================================== test shortcut: type 3-7-9-7 to jump straight to the chess boss
function jumpToBoss(kind) {
  const p = player;
  if (boss.state.mode !== 'none') boss.reset();
  shop.resetHeckle();
  for (const o of [...obstacles]) if (o.box.z1 < p.z + 1) { world.remove(o.mesh); obstacles.splice(obstacles.indexOf(o), 1); }
  for (const b of [...blocks]) if (b.z0 < p.z - 0.01) { world.remove(b.mesh); blocks.splice(blocks.indexOf(b), 1); }
  for (const sg of signs) sg.used = true;
  const cur = blocks.find((b) => p.z <= b.z0 && p.z >= b.z1);
  const top = cur ? cur.z1 : p.z + 2;
  const run = buildingBlock(12); run.position.set(0, 0, top - 6); world.add(run); blocks.push({ z0: top, z1: top - 12, mesh: run });
  genZ = top - 12; boss.force(kind); while (genZ > p.z - 150) generateBlock(speed || 10);
}
let cheat = '';
addEventListener('keydown', (e) => {
  if (!/^[0-9]$/.test(e.key)) return;
  cheat = (cheat + e.key).slice(-4);
  const codes = { 3797: ['chess', 'Ivory &amp; Onyx'], 7973: ['prism', 'Neon Amara'] }, hit = codes[cheat];
  if (!hit) return;
  cheat = '';
  const go = () => { jumpToBoss(hit[0]); const b = $('banner'); b.innerHTML = `Test mode<small>skipping ahead to ${hit[1]}</small>`; b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 1600); };
  if (state === 'title' || state === 'dead') { if (state === 'title' || deadT > 1.3) { startRun(); setTimeout(go, 50); } }
  else if (state === 'run' && !paused) go();
});

// =================================================================== pause (Esc, or the pause button)
let paused = false;
function setPaused(on) {
  if (on && state !== 'run') return;
  paused = on; pauseAudio(on); slideHeld = false;
  $('pause').classList.toggle('hidden', !on); $('pauseBtn').textContent = on ? '\u25B6' : '\u23F8';
}
$('pauseBtn').addEventListener('click', () => setPaused(!paused));
$('resumeBtn').addEventListener('click', () => setPaused(false));
addEventListener('blur', () => { slideHeld = false; });
// hold S / down to keep sliding for as long as you like
let slideHeld = false;
addEventListener('keyup', (e) => { const k = e.key.toLowerCase(); if (k === 'arrowdown' || k === 's') slideHeld = false; });
addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (state === 'title' || (state === 'dead' && deadT > 1.3)) { if (k === ' ' || k === 'enter') { e.preventDefault(); startRun(); } return; }
  if (state === 'ending') { if ((k === ' ' || k === 'enter' || k === 'escape') && !e.repeat) { e.preventDefault(); if (ending.phase === 'peek') ending.peek(false); else ending.skipPress(); } return; }
  if (state !== 'run') return;
  if (k === 'escape') { e.preventDefault(); if (!e.repeat) setPaused(!paused); return; }
  if (paused) return;
  if (brief.on) { if (k === ' ' || k === 'enter') { e.preventDefault(); if (!e.repeat) brief.press(); } return; }
  if (k === 'arrowleft' || k === 'a') act.left();
  else if (k === 'arrowright' || k === 'd') act.right();
  else if (k === 'arrowup' || k === 'w' || k === ' ') { e.preventDefault(); act.jump(); }
  else if (k === 'arrowdown' || k === 's') { e.preventDefault(); slideHeld = true; if (!e.repeat) act.slide(); }
});
let touch = null;
addEventListener('touchstart', (e) => { const t = e.touches[0]; touch = { x: t.clientX, y: t.clientY, done: false }; }, { passive: true });
addEventListener('touchmove', (e) => {
  if (!touch || touch.done || state !== 'run' || paused) return; const t = e.touches[0];
  const dx = t.clientX - touch.x, dy = t.clientY - touch.y;
  if (Math.hypot(dx, dy) < 28) return; touch.done = true;
  if (Math.abs(dx) > Math.abs(dy)) (dx < 0 ? act.left : act.right)(); else if (dy < 0) act.jump(); else { act.slide(); slideHeld = true; }   // keep the finger down to keep sliding
}, { passive: true });
addEventListener('touchend', (e) => { if (touch && !touch.done && state === 'run' && !paused && !e.target.closest?.('button')) act.jump(); touch = null; slideHeld = false; });
$('playBtn').addEventListener('click', startRun);
$('againBtn').addEventListener('click', startRun);
$('muteBtn').addEventListener('click', () => { initAudio(); setMuted(!snd.muted); $('muteBtn').textContent = snd.muted ? '♪̸' : '♪'; });

// =================================================================== update
const tmp = new THREE.Vector3();
function onBlockAt(z) { return blocks.some((b) => z <= b.z0 && z >= b.z1); }
function updatePlayer(dt) {
  const p = player;
  if (state === 'run') {
    runT += dt; if (!brief.on) rampT += dt;
    speed = Math.min(21, 12 + rampT * 0.09);
    p.z -= speed * dt; dist += speed * dt;
  } else if (state === 'dead') {
    speed = Math.max(0, speed - 30 * dt); p.z -= speed * dt;
  }
  // lanes
  const tx = LANES[p.lane]; const dx = tx - p.x; p.x += dx * Math.min(1, dt * 14);
  p.root.rotation.z = -dx * 0.12;
  // vertical
  const support = onBlockAt(p.z) && !boss.holeAt(p.x, p.z);
  if (!p.grounded || !support) {
    p.vy -= 26 * dt; p.y += p.vy * dt;
    if (support && p.y <= 0 && p.vy <= 0 && !p.falling) { p.y = 0; p.vy = 0; p.grounded = true; sfx.land(); if (p.slideT > 0) sfx.slide(); }
    else if (p.grounded && !support) { p.grounded = false; p.coyote = 0.1; }
    if (!support && p.y < -0.4) p.falling = true;
    if (p.y < -2.2 && p.alive) die('fall');
  }
  if (p.coyote > 0) p.coyote -= dt;
  if (slideHeld && p.grounded && !brief.on && tut.waiting !== 'jump') p.slideT = Math.max(p.slideT, 0.3);   // held down: stay low
  if (p.slideT > 0 && p.grounded) p.slideT -= dt;
  if (p.shield > 0) { p.shieldFx.rotation.z += dt * 4; p.shieldFx.position.y = 0.9 + Math.sin(runT * 5) * 0.15; }
  if (p.magnet > 0) { p.magnet -= dt; if (p.magnet <= 0) $('pMagnet').classList.add('hidden'); }
  p.root.position.set(p.x, p.y, p.z);
  shadow.visible = support; shadow.position.set(p.x, 0.02, p.z); shadow.scale.setScalar(clamp(1 - p.y * 0.25, 0.4, 1));
  // animation state
  if (p.alive && state === 'run') {
    if (!p.grounded) play('Leap', 0.1);
    else if (p.slideT > 0) play('Slide', 0.08);
    else play('Run', 0.12);
    if (p.current === p.actions.Run) p.current.timeScale = speed / 10.5;
  }
  p.mixer?.update(dt);
}
function hits(box, x, y, z, h) {
  return x + 0.3 > box.x0 && x - 0.3 < box.x1 && y + h > box.y0 && y < box.y1 && z + 0.25 > box.z0 && z - 0.25 < box.z1;
}
function updateWorld(dt) {
  const p = player; const h = p.slideT > 0 && p.grounded ? 0.75 : 1.5;
  snipAhead();
  if (p.alive) for (const o of obstacles) {
    if (o.dead || Math.abs(o.box.z0 - p.z) > 3) continue;
    if (hits(o.box, p.x, p.y, p.z, h)) {
      if (p.shield > 0) { bandaidsUsed++; setBandaids(p.shield - 1); o.dead = true; sparkle(o.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), PAL.paper, 16); world.remove(o.mesh); sfx.shield(); flash = 0.3; }
      else die('hit');
    }
  }
  // moths
  for (const mo of [...moths]) {
    const m = mo.m; const ud = m.userData; ud.t += dt * 14;
    ud.l.rotation.y = Math.sin(ud.t) * 0.9; ud.r.rotation.y = -Math.sin(ud.t) * 0.9;
    m.position.y = mo.base + Math.sin(ud.t * 0.15) * 0.08;
    if (p.alive && p.magnet > 0 && m.position.z < p.z + 0.5 && m.position.z > p.z - 9) collectMoth(mo);     // the ribbon whisks them straight into your purse
    else if (p.alive && m.position.distanceTo(tmp.set(p.x, p.y + 0.9, p.z)) < 0.95) collectMoth(mo);
    else if (m.position.z > p.z + 8) { world.remove(m); moths.splice(moths.indexOf(mo), 1); }
  }
  for (const pw of [...powers]) {
    pw.p.rotation.y += dt * 2; pw.p.position.y = 1.1 + Math.sin(runT * 3) * 0.15;
    if (p.alive && pw.p.position.distanceTo(tmp.set(p.x, p.y + 0.9, p.z)) < 1.1) {
      world.remove(pw.p); powers.splice(powers.indexOf(pw), 1); sfx.power(); sparkle(pw.p.position, PAL.glow, 14);
      if (pw.kind === 'shield') bandaidApi.add(1);
      else { p.magnet = 9; $('pMagnet').classList.remove('hidden'); }
    }
  }
  for (const sg of signs) {
    shop.animSign(sg.s, runT);
    if (!sg.used && p.alive && state === 'run' && p.z < sg.z - 1.5) { sg.used = true; if (!boss.quiet()) shop.heckle(); }      // ran right past her shop!
    if (!sg.used && p.alive && state === 'run' && p.lane === sg.lane && Math.abs(p.x - LANES[sg.lane]) < 0.6 && p.z < sg.z + 0.3 && p.z > sg.z - 1.5) { sg.used = true; enterShop(); }
  }
  signs = signs.filter((sg) => (sg.z > p.z + 25 ? (world.remove(sg.s), false) : true));
  for (const o of obstacles) if (o.kind === 'laundry') o.mesh.children.forEach((c) => { if (c.userData.sway !== undefined) c.rotation.x = Math.sin(runT * 3 + c.userData.sway) * 0.12; });
  // recycle behind, generate ahead
  if (state === 'run') boss.update(dt);
  shop.updateHeckle(dt, camera);
  while (genZ > p.z - 150) generateBlock(speed || 10);
  const behind = p.z + 25;
  blocks = blocks.filter((b) => (b.z1 > behind ? (world.remove(b.mesh), false) : true));
  obstacles = obstacles.filter((o) => (o.box.z0 > behind ? (world.remove(o.mesh), false) : true));
  decor = decor.filter((d) => (d.position.z > behind + 10 ? (world.remove(d), false) : true));
  powers = powers.filter((pw) => (pw.p.position.z > behind ? (world.remove(pw.p), false) : true));
  if (comboT > 0) { comboT -= dt; if (comboT <= 0) combo = 0; }
}
function updateFx(dt, t) {
  for (const s of petals) {
    const u = s.userData; u.oy -= dt * u.sp * 0.8; u.oz += dt * (speed * 0.15 + 0.5);
    if (u.oy < -2 || u.oz > 6) { u.oy = rand(5, 9); u.oz = rand(-30, -5); u.ox = rand(-10, 10); }
    s.position.set(camera.position.x + u.ox + Math.sin(t * u.sp + u.ph) * 0.6, camera.position.y + u.oy - 3, camera.position.z + u.oz);
    s.material.rotation = Math.sin(t + u.ph);
  }
  for (const sp of [...sparks]) {
    sp.life -= dt; sp.v.y -= 4 * dt; sp.s.position.addScaledVector(sp.v, dt); sp.s.material.opacity = Math.max(0, sp.life / 0.6);
    if (sp.life <= 0) { scene.remove(sp.s); sparks.splice(sparks.indexOf(sp), 1); }
  }
}
// camera
const camPos = new THREE.Vector3(2.5, 1.7, -4), camLook = new THREE.Vector3(0, 1.1, 0);
function updateCamera(dt, t) {
  const p = player; let want, look, rate = 5;
  if (state === 'title') {
    const a = Math.sin(t * 0.15) * 0.35;
    want = new THREE.Vector3(p.x + Math.sin(a) * 3.4 + 0.6, 1.45, p.z - Math.cos(a) * 3.4);
    look = new THREE.Vector3(p.x, 1.0, p.z);
  } else if (state === 'ending') {
    const c = ending.cam(); want = c.want; look = c.look; rate = c.k; if (c.snap) { camPos.copy(want); camLook.copy(look); }
  } else {
    want = new THREE.Vector3(p.x * 0.6, 2.55 + p.y * 0.4, p.z + 4.3);
    look = new THREE.Vector3(p.x * 0.65, 1.15 + p.y * 0.35, p.z - 6);
    if (p.falling) { want.y = 3.1; look.y = p.y; }
  }
  camPos.lerp(want, Math.min(1, dt * (state === 'title' ? 2 : rate))); camLook.lerp(look, Math.min(1, dt * (state === 'ending' ? rate * 1.2 : 6)));
  camera.position.copy(camPos);
  if (shake > 0) { shake -= dt; camera.position.x += rand(-0.15, 0.15) * shake * 2; camera.position.y += rand(-0.15, 0.15) * shake * 2; }
  camera.lookAt(camLook);
  if (debugCam && shop.hecklerObj?.visible) { const g = shop.hecklerObj.position; camera.position.set(g.x * 0.6, g.y + 0.5, g.z + 2.6); camera.lookAt(g.x, g.y + 0.3, g.z); }
  sky.position.copy(camera.position);
  if (state === 'ending' && ending.moonAt) { moon.position.copy(ending.moonAt); moon.rotation.set(0, 0, 0); }
  else { moon.position.set(camera.position.x + 30, 34, camera.position.z - 130); moon.lookAt(camera.position); }
  for (const s of skyline) { s.position.set(camera.position.x, s.userData.y, camera.position.z - s.userData.dist); }
  sun.position.set(p.x - 6, 10, p.z - 8); sun.target.position.set(p.x, 0, p.z);
}
function updateHUD() {
  $('bossN').textContent = boss.beaten;
  for (const b of document.querySelectorAll('.badge')) {       // each boss badge lights up the first time you beat that boss this run
    const got = boss.won.has(b.dataset.kind);
    if (got !== b.classList.contains('got')) { b.classList.toggle('got', got); if (got) { b.classList.remove('pop'); void b.getBoundingClientRect(); b.classList.add('pop'); } }
  }
  document.body.classList.toggle('bossing', !$('legend').classList.contains('hidden'));
}

// =================================================================== loop + boot
const clock = new THREE.Clock(); let elapsed = 0, simScale = 1, frames = 0;
let stepHook = null, debugCam = false;   // automated playtests can steer from inside the fixed-step loop
function frame() {
  requestAnimationFrame(frame); frames++;
  const raw = Math.min(clock.getDelta(), 0.1);
  tut.scale += (tut.target - tut.scale) * Math.min(1, raw * (tut.target < tut.scale ? 9 : 6));
  let total = paused ? 0 : raw * simScale * tut.scale;
  while (total > 1e-6) {
    const dt = Math.min(total, 1 / 60); total -= dt; elapsed += dt;
    if (state === 'shop') { shop.update(dt); continue; }
    if (state === 'ending') { ending.update(dt, elapsed); updateFx(dt, elapsed); updateCamera(dt, elapsed); continue; }
    if (state !== 'title') { if (state === 'run' && stepHook) stepHook(dt); updateTut(); if (tut.cut) { tut.cut = false; break; } updatePlayer(dt); updateWorld(dt); if (state === 'dead') deadT += dt; }
    else { player.mixer?.update(dt); for (const mo of moths) { const ud = mo.m.userData; ud.t += dt * 10; ud.l.rotation.y = Math.sin(ud.t) * 0.9; ud.r.rotation.y = -Math.sin(ud.t) * 0.9; } }
    updateFx(dt, elapsed); updateCamera(dt, elapsed);
  }
  if (state === 'run') updateHUD();
  tickMusic(1 + (speed - 12) / 40);
  if (!paused) updateFliers(raw);
  flash = Math.max(0, flash - 0.03); ink.quad.material.uniforms.flash.value = flash;
  if (shop.open_) shop.render(ink, elapsed); else ink.render(scene, camera, elapsed);
}

new GLTFLoader().load('assets/amara.glb', (gltf) => {
  const model = gltf.scene; toonify(model);
  model.rotation.y = Math.PI;                 // she runs toward -z
  model.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
  player.root.add(model); player.model = model;
  boss.init(gltf); shop.init(gltf); makeMothIcon(); showWallet(); $('wallet').classList.remove('hidden');
  player.mixer = new THREE.AnimationMixer(model);
  for (const c of gltf.animations) player.actions[c.name] = player.mixer.clipAction(c);
  resetRun();
  // a few moths fluttering around her on the title screen
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; addMoth(Math.cos(a) * 1.4, 1.2 + Math.sin(i) * 0.5, Math.sin(a) * 1.4 - 0.5); }
  play('Idle', 0);
  $('playBtn').disabled = false; $('playBtn').textContent = 'Start running';
  window.__ready = true;
}, undefined, (e) => { console.error(e); $('playBtn').textContent = 'Could not load Amara'; });
frame();

window.moths = {
  get boss() { return boss.state; }, get hurts() { return hurtLog.slice(); }, debugWin(k) { boss.won.add(k); }, set noBrief(v) { noBrief = v; }, get briefing() { return brief.on; }, briefPress() { brief.press(); },
  heckle(side) { shop.heckle(side); }, set debugCam(v) { debugCam = v; }, get heckling() { return shop.heckling; }, get bolts() { return shop.hazards().map((h) => ({ lane: h.lane, phase: h.phase, dz: +(player.z - h.z).toFixed(1) })); },
  set shopOff(v) { shopOn = !v; },
  get wallet() { return { wallet, shown: walletShown, fliers: fliers.length }; },
  set wallet(n) { wallet = walletShown = n; saveWallet(); showWallet(); },
  get shop() { return { open: shop.open_, busy: shop.busy, signs: signs.map((sg) => ({ lane: sg.lane, dz: +(player.z - sg.z).toFixed(1), used: sg.used })), nextAt: nextShopAt }; },
  shopBuy(k) { shop.buy(k); }, shopItem(k) { return shop.itemScreen(k); }, set scissors(n) { setScissors(n); }, get scissors() { return scissors; }, shopLeave() { shop.leave(); },
  signAhead(dz = 14, lane = player.lane) {   // put a shop sign right ahead in the current lane (for testing)
    const z = player.z - dz;
    for (const o of [...obstacles]) if (Math.abs(o.box.z0 - z) < 6) { world.remove(o.mesh); obstacles.splice(obstacles.indexOf(o), 1); }
    addSign(lane, z);
  },
  crater(lane, dz, fire) { boss.debugCrater(lane, dz, fire); }, promote() { boss.debugPromote(); }, prismAttack(k) { return boss.debugPrismAttack(k); }, prismFinal(hh) { boss.debugPrismFinal(hh); },
  get tut() { return { on: tut.on, done: tut.done, waiting: tut.waiting, scale: +tut.scale.toFixed(2), jumped: tut.jumped, slid: tut.slid }; },
  resetTutorial() { tut.done = false; try { localStorage.removeItem('paperMoths.tutorial'); } catch (_) { /* ignore */ } },
  bossSkip(n) { boss.skipTo(n); }, get ending() { return ending.state; }, endNow() { if (state === 'run') { boss.won.add('prism'); startEnding(); } }, endSkip() { ending.skip(); }, bossKill() { boss.debugKill(); }, endPeek(v) { ending.peek(v); }, endLoop() { loopAgain(); }, endAgain() { startRun(); },
  get music() { return bossMusicState(); },
  set stepHook(fn) { stepHook = fn; },
  // jump straight to a boss: clear what's ahead and lay a fresh runway
  forceBoss(kind) { jumpToBoss(kind); },
  _forceBossOld(kind) {
    const p = player;
    for (const o of [...obstacles]) if (o.box.z1 < p.z + 1) { world.remove(o.mesh); obstacles.splice(obstacles.indexOf(o), 1); }
    for (const b of [...blocks]) if (b.z0 < p.z - 0.01) { world.remove(b.mesh); blocks.splice(blocks.indexOf(b), 1); }
    const cur = blocks.find((b) => p.z <= b.z0 && p.z >= b.z1);
    const top = cur ? cur.z1 : p.z + 2;
    const run = buildingBlock(12); run.position.set(0, 0, top - 6); world.add(run); blocks.push({ z0: top, z1: top - 12, mesh: run });
    genZ = top - 12; boss.force(kind); while (genZ > p.z - 150) generateBlock(speed || 10);
  },
  get state() { return { state, speed: +speed.toFixed(2), dist: +dist.toFixed(1), moths: mothsGot, score: Math.floor(dist) + mothPoints, lane: player.lane, y: +player.y.toFixed(2), slide: +player.slideT.toFixed(2), paused, alive: player.alive, shield: player.shield, magnet: +player.magnet.toFixed(1), obstacles: obstacles.length, combo }; },
  act, startRun, set simScale(v) { simScale = v; }, get frames() { return frames; },
  nextObstacle() { return obstacles.filter((o) => !o.dead && o.box.z1 < player.z).sort((a, b) => b.box.z1 - a.box.z1)[0]; },
  set god(v) { setBandaids(v ? 99 : 0); },
  // tiny autopilot used for automated playtests
  autopilot(gapsOnly = false) {
    const p = player; if (!p.alive || state !== 'run') return;
    const ahead = obstacles.filter((o) => !o.dead && o.box.z1 < p.z + 0.3 && o.box.z1 > p.z - 7.5);
    const laneBlocked = (l, kinds) => ahead.some((o) => LANES[l] > o.box.x0 && LANES[l] < o.box.x1 && (!kinds || kinds.includes(o.kind)));
    const zap = shop.hazards().filter((h) => h.z < p.z + 1.2 && h.z > p.z - speed * 1.3).map((h) => h.lane);
    if (zap.includes(p.lane)) { const ok = [0, 1, 2].filter((l) => !zap.includes(l) && !laneBlocked(l)).sort((a, b) => Math.abs(a - p.lane) - Math.abs(b - p.lane))[0]; if (ok !== undefined && ok !== p.lane) { ok < p.lane ? act.left() : act.right(); return; } }
    const near = ahead.filter((o) => p.x + 0.3 > o.box.x0 && p.x - 0.3 < o.box.x1).sort((a, b) => b.box.z1 - a.box.z1)[0];
    const edge = blocks.find((b) => p.z <= b.z0 && p.z >= b.z1);
    if (edge && p.grounded && p.z - edge.z1 < speed * 0.22) { act.jump(); return; }
    if (gapsOnly) return;
    if (!near) return;
    const d = p.z - near.box.z1;
    if (near.kind === 'laundry') { if (d < speed * 0.35 && p.slideT <= 0) act.slide(); return; }
    const free = [0, 1, 2].filter((l) => !laneBlocked(l)).sort((a, b) => Math.abs(a - p.lane) - Math.abs(b - p.lane));
    if (free.length && Math.abs(free[0] - p.lane) === 1) { free[0] < p.lane ? act.left() : act.right(); return; }
    if (free.length && Math.abs(free[0] - p.lane) === 2) { act.left === undefined; free[0] < p.lane ? act.left() : act.right(); return; }
    if (near.kind === 'crate' && d < speed * 0.2) act.jump();
  },
};
