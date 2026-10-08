// Amara & the Paper Moths — hand-painted look. Every color here comes from Amara's own texture.
// Made by KiteRandel.
import * as THREE from 'three';

export const PAL = {
  ink: '#3a2a26', deep: '#49332d', umber: '#533d37', cocoa: '#634d44', mauve: '#715b51',
  taupe: '#7c6a60', dusk: '#917b6f', rose: '#a28b7f', ash: '#b4aba5', mist: '#c7c3bf', cream: '#dfd5ca',
  paper: '#efe6da', glow: '#f6dcc0', ember: '#e8b48c', tan: '#c9a88c', spot: '#5a4038',
};
const rnd = (() => { let s = 1337; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const pick = (a) => a[Math.floor(rnd() * a.length)];

function canvas(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, repeat = [1, 1]) {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 4; return t;
}
// soft painterly strokes over a base, like gouache on paper
function paint(g, w, h, base, tones, n = 220, len = [20, 70], alpha = 0.18) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    g.save(); g.globalAlpha = alpha * (0.4 + rnd() * 0.6); g.fillStyle = pick(tones);
    g.translate(rnd() * w, rnd() * h); g.rotate((rnd() - 0.5) * 0.5);
    const L = len[0] + rnd() * (len[1] - len[0]);
    g.beginPath(); g.ellipse(0, 0, L, L * (0.12 + rnd() * 0.18), 0, 0, Math.PI * 2); g.fill(); g.restore();
  }
  grain(g, w, h, 0.05);
}
function grain(g, w, h, a) {
  const d = g.getImageData(0, 0, w, h);
  for (let i = 0; i < d.data.length; i += 4) { const n = (rnd() - 0.5) * 255 * a; d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n; }
  g.putImageData(d, 0, 0);
}
function inkLine(g, x1, y1, x2, y2, wdt = 2, a = 0.55) {
  g.save(); g.strokeStyle = PAL.ink; g.globalAlpha = a; g.lineWidth = wdt; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x1 + (rnd() - 0.5) * 2, y1 + (rnd() - 0.5) * 2);
  g.quadraticCurveTo((x1 + x2) / 2 + (rnd() - 0.5) * 3, (y1 + y2) / 2 + (rnd() - 0.5) * 3, x2, y2); g.stroke(); g.restore();
}

// ------------------------------------------------------------------ textures
export const T = {};
export function makeTextures() {
  // roof tiles: rows of rounded shingles
  { const [c, g] = canvas(512); paint(g, 512, 512, PAL.mauve, [PAL.umber, PAL.taupe, PAL.cocoa, PAL.dusk], 160);
    for (let y = 0; y < 512; y += 42) for (let x = -32 + ((y / 42) % 2) * 32; x < 544; x += 64) {
      g.fillStyle = pick([PAL.mauve, PAL.taupe, PAL.cocoa, PAL.umber]); g.globalAlpha = 0.55;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + 62, y); g.lineTo(x + 62, y + 30); g.quadraticCurveTo(x + 31, y + 46, x, y + 30); g.closePath(); g.fill();
      g.globalAlpha = 1; inkLine(g, x, y + 30, x + 31, y + 40, 2, 0.45); inkLine(g, x + 31, y + 40, x + 62, y + 30, 2, 0.45);
    }
    T.roof = tex(c, [1, 1]); }
  // flat rooftop walkway: worn planks / slate
  { const [c, g] = canvas(512); paint(g, 512, 512, PAL.taupe, [PAL.mauve, PAL.dusk, PAL.rose, PAL.cocoa], 260, [30, 120], 0.16);
    for (let y = 0; y < 512; y += 64) { inkLine(g, 0, y, 512, y, 2, 0.35); for (let x = (y / 64) % 2 * 90; x < 512; x += 180) inkLine(g, x, y, x, y + 64, 1.5, 0.3); }
    T.walk = tex(c, [1, 1]); }
  // brick (chimneys, parapets)
  { const [c, g] = canvas(256); paint(g, 256, 256, PAL.rose, [PAL.dusk, PAL.taupe, PAL.ember, PAL.mauve], 80, [10, 40], 0.2);
    for (let y = 0; y < 256; y += 24) { inkLine(g, 0, y, 256, y, 1.5, 0.4); for (let x = ((y / 24) % 2) * 26; x < 256; x += 52) inkLine(g, x, y, x, y + 24, 1.5, 0.4); }
    T.brick = tex(c); }
  // plaster wall with windows (some warmly lit)
  { const [c, g] = canvas(512); paint(g, 512, 512, PAL.ash, [PAL.mist, PAL.cream, PAL.dusk, PAL.rose], 240, [30, 140], 0.16);
    for (let y = 40; y < 512; y += 128) for (let x = 40; x < 512; x += 128) {
      const lit = rnd() < 0.35;
      g.fillStyle = lit ? PAL.glow : pick([PAL.umber, PAL.cocoa, PAL.deep]); g.fillRect(x, y, 52, 66);
      if (lit) { g.globalAlpha = 0.25; g.fillStyle = PAL.ember; g.fillRect(x - 6, y - 6, 64, 78); g.globalAlpha = 1; }
      g.strokeStyle = PAL.ink; g.globalAlpha = 0.7; g.lineWidth = 3; g.strokeRect(x, y, 52, 66);
      g.lineWidth = 2; g.beginPath(); g.moveTo(x + 26, y); g.lineTo(x + 26, y + 66); g.moveTo(x, y + 30); g.lineTo(x + 52, y + 30); g.stroke();
      g.globalAlpha = 1; g.fillStyle = PAL.cocoa; g.fillRect(x - 6, y + 66, 64, 7);
    }
    T.wall = tex(c); }
  // wood (crates)
  { const [c, g] = canvas(256); paint(g, 256, 256, PAL.tan, [PAL.dusk, PAL.rose, PAL.ember, PAL.cream], 120, [30, 120], 0.22);
    for (let y = 0; y <= 256; y += 64) inkLine(g, 0, y, 256, y, 3, 0.55);
    inkLine(g, 4, 4, 252, 252, 4, 0.5); inkLine(g, 4, 4, 4, 252, 4, 0.6); inkLine(g, 252, 4, 252, 252, 4, 0.6);
    T.wood = tex(c); }
  // fabrics for laundry: leopard spots (like Amara's tail), stripes, bandage cream
  T.cloth = [];
  { const [c, g] = canvas(256); paint(g, 256, 256, PAL.tan, [PAL.cream, PAL.ember], 50, [20, 60], 0.2);
    for (let i = 0; i < 22; i++) { const x = rnd() * 256, y = rnd() * 256, r = 9 + rnd() * 8; g.strokeStyle = PAL.spot; g.lineWidth = 5; g.globalAlpha = 0.8; g.beginPath(); g.arc(x, y, r, rnd() * 3, rnd() * 3 + 3.6); g.stroke(); }
    T.cloth.push(tex(c)); }
  { const [c, g] = canvas(256); paint(g, 256, 256, PAL.cream, [PAL.mist, PAL.paper], 40, [20, 60], 0.2);
    for (let x = 0; x < 256; x += 40) { g.fillStyle = PAL.rose; g.globalAlpha = 0.7; g.fillRect(x, 0, 14, 256); }
    T.cloth.push(tex(c)); }
  { const [c, g] = canvas(256); paint(g, 256, 256, PAL.paper, [PAL.cream, PAL.mist], 60, [30, 90], 0.2);
    for (let y = 10; y < 256; y += 34) inkLine(g, 0, y + rnd() * 6, 256, y + rnd() * 6, 1.2, 0.35);
    T.cloth.push(tex(c)); }
  { const [c, g] = canvas(256); paint(g, 256, 256, PAL.mauve, [PAL.dusk, PAL.taupe], 60, [20, 60], 0.2);
    for (let i = 0; i < 60; i++) { g.fillStyle = PAL.cream; g.globalAlpha = 0.7; g.beginPath(); g.arc(rnd() * 256, rnd() * 256, 3, 0, 7); g.fill(); }
    T.cloth.push(tex(c)); }
  // sky gradient for the background dome
  { const [c, g] = canvas(16, 512); const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, '#5a4842'); gr.addColorStop(0.28, '#8c7468'); gr.addColorStop(0.44, '#c9b3a4'); gr.addColorStop(0.5, '#e8d6c5'); gr.addColorStop(0.58, '#d6c3b4'); gr.addColorStop(1, '#a8948a');
    g.fillStyle = gr; g.fillRect(0, 0, 16, 512); T.sky = tex(c); T.sky.wrapS = T.sky.wrapT = THREE.ClampToEdgeWrapping; }
  // soft glow, moon, paper leaf, distant skyline
  { const [c, g] = canvas(128); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,240,220,1)'); gr.addColorStop(0.3, 'rgba(246,220,192,0.55)'); gr.addColorStop(1, 'rgba(246,220,192,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); T.glow = tex(c); }
  { const [c, g] = canvas(512); const gr = g.createRadialGradient(256, 256, 110, 256, 256, 256);
    gr.addColorStop(0, 'rgba(246,234,218,0.5)'); gr.addColorStop(1, 'rgba(246,234,218,0)'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    const mg = g.createRadialGradient(230, 230, 20, 256, 256, 120); mg.addColorStop(0, '#f7efe4'); mg.addColorStop(1, '#e6d8c8');
    g.fillStyle = mg; g.beginPath(); g.arc(256, 256, 118, 0, 7); g.fill();
    g.globalAlpha = 0.18; g.fillStyle = PAL.rose;
    for (const [x, y, r] of [[300, 220, 26], [220, 300, 18], [290, 310, 12], [215, 215, 10]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    g.globalAlpha = 1; g.strokeStyle = 'rgba(58,42,38,0.45)'; g.lineWidth = 3; g.beginPath(); g.arc(256, 256, 118, 0, 7); g.stroke();
    T.moon = tex(c); }
  { // one moth wing (left half), painted paper with ink veins
    const [c, g] = canvas(128); g.clearRect(0, 0, 128, 128);
    g.beginPath(); g.moveTo(4, 64); g.bezierCurveTo(20, 6, 96, -4, 124, 30); g.bezierCurveTo(112, 60, 90, 70, 70, 70);
    g.bezierCurveTo(96, 86, 104, 118, 74, 124); g.bezierCurveTo(44, 126, 18, 96, 4, 64); g.closePath();
    const wg = g.createLinearGradient(0, 64, 128, 64); wg.addColorStop(0, '#f7ecdc'); wg.addColorStop(1, '#efd6bc');
    g.fillStyle = wg; g.fill(); g.strokeStyle = PAL.ink; g.lineWidth = 4; g.stroke();
    g.lineWidth = 1.6; g.globalAlpha = 0.6;
    for (const [x, y] of [[110, 26], [96, 50], [80, 112], [60, 120]]) { g.beginPath(); g.moveTo(8, 64); g.quadraticCurveTo((8 + x) / 2, (64 + y) / 2 - 6, x, y); g.stroke(); }
    g.globalAlpha = 0.5; g.fillStyle = PAL.rose; g.beginPath(); g.arc(70, 38, 9, 0, 7); g.fill();
    g.strokeStyle = PAL.spot; g.lineWidth = 3; g.beginPath(); g.arc(70, 38, 12, 0.5, 4.5); g.stroke();
    T.wing = tex(c); T.wing.wrapS = T.wing.wrapT = THREE.ClampToEdgeWrapping; }
  { // paper lantern skin: cream paper with ribs
    const [c, g] = canvas(128); g.fillStyle = '#f6dcc0'; g.fillRect(0, 0, 128, 128);
    for (let y = 8; y < 128; y += 16) { g.strokeStyle = 'rgba(58,42,38,0.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); }
    g.fillStyle = 'rgba(232,180,140,0.5)'; g.fillRect(0, 0, 128, 10); g.fillRect(0, 118, 128, 10);
    T.lantern = tex(c); }
  { const [c, g] = canvas(64); g.fillStyle = PAL.paper; g.beginPath(); g.moveTo(32, 2); g.quadraticCurveTo(62, 30, 32, 62); g.quadraticCurveTo(2, 30, 32, 2); g.fill();
    g.strokeStyle = 'rgba(58,42,38,0.5)'; g.lineWidth = 2; g.stroke(); g.beginPath(); g.moveTo(32, 6); g.lineTo(32, 58); g.stroke(); T.leaf = tex(c); }
  for (const [name, col, hmin, hmax, seed] of [['far', '#9a8378', 60, 160, 3], ['mid', '#7d675e', 90, 230, 7]]) {
    const [c, g] = canvas(1024, 256); g.fillStyle = col; let x = 0;
    while (x < 1024) {
      const w = 40 + rnd() * 90, h = hmin + rnd() * (hmax - hmin);
      g.fillRect(x, 256 - h, w, h);
      if (rnd() < 0.6) { g.beginPath(); g.moveTo(x - 6, 256 - h); g.lineTo(x + w / 2, 256 - h - 20 - rnd() * 30); g.lineTo(x + w + 6, 256 - h); g.fill(); }
      if (rnd() < 0.4) g.fillRect(x + w * 0.7, 256 - h - 30, 10, 30);
      for (let k = 0; k < 4; k++) if (rnd() < 0.25) { g.fillStyle = 'rgba(246,220,192,0.75)'; g.fillRect(x + 8 + rnd() * (w - 20), 256 - h + 14 + rnd() * (h - 30), 7, 9); g.fillStyle = col; }
      x += w + rnd() * 6;
    }
    T[name] = tex(c, [1, 1]); T[name].wrapS = THREE.RepeatWrapping;
  }
  return T;
}

// ------------------------------------------------------------------ materials: toon shading with 3 soft bands
let gradient;
function gradientMap() {
  if (gradient) return gradient;
  const data = new Uint8Array([140, 200, 255]);
  gradient = new THREE.DataTexture(data, 3, 1, THREE.RedFormat); gradient.minFilter = gradient.magFilter = THREE.NearestFilter; gradient.needsUpdate = true;
  return gradient;
}
const cache = new Map();
export function toon(opts) {
  const key = JSON.stringify(opts, (k, v) => (v && v.isTexture ? v.uuid : v));
  if (cache.has(key)) return cache.get(key);
  const m = new THREE.MeshToonMaterial({ gradientMap: gradientMap(), ...opts });
  if (typeof opts.color === 'string') m.color = new THREE.Color(opts.color);
  cache.set(key, m); return m;
}
export function toonify(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    const old = o.material;
    o.material = new THREE.MeshToonMaterial({ map: old.map, gradientMap: gradientMap(), color: 0xffffff, emissive: new THREE.Color(0x2a1a14), emissiveIntensity: 0.25 });
  });
}
