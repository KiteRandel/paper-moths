// Ivory & Onyx: the chess boss. The roof turns into a chessboard; on each sister's move her squares hurt,
// she drops a chess piece that attacks the way it moves, and then it's your move: follow the knight's path and
// capture their king. Made by KiteRandel.
import * as THREE from 'three';
import { PAL, T, toon } from './art.js?v=29';

const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const IVORY = '#fff1cf', ONYX = '#6b5a86';
export const ROW = 8;   // length of one board square along the roof

// ---------------------------------------------------------------- chess pieces, turned on a lathe like little paper-and-ink sculptures
function lathe(profile, mat, seg = 20) { return new THREE.Mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), seg), mat); }
const BASE = [[0, 0], [0.5, 0], [0.52, 0.08], [0.44, 0.14], [0.36, 0.2], [0.3, 0.26]];
function makePiece(kind, white) {
  const mat = toon({ color: white ? '#efe6da' : '#3a3036', emissive: new THREE.Color(white ? '#fff3dc' : '#2a2036'), emissiveIntensity: white ? 0.25 : 0.35 });
  const g = new THREE.Group();
  if (kind === 'pawn') {
    g.add(lathe([...BASE, [0.2, 0.42], [0.16, 0.62], [0.24, 0.66], [0.14, 0.7], [0, 0.7]], mat));
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), mat); head.position.y = 0.86; g.add(head);
  } else if (kind === 'rook') {
    g.add(lathe([...BASE, [0.3, 1.4], [0.42, 1.48], [0.42, 1.78], [0.3, 1.78], [0.3, 1.66], [0, 1.66]], mat));
    for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.2), mat); const a = i * Math.PI / 2 + Math.PI / 4; m.position.set(Math.cos(a) * 0.32, 1.88, Math.sin(a) * 0.32); g.add(m); }
  } else if (kind === 'bishop') {
    g.add(lathe([...BASE, [0.18, 1.0], [0.3, 1.08], [0.14, 1.14], [0, 1.14]], mat));
    const mitre = lathe([[0, 0], [0.24, 0.05], [0.3, 0.3], [0.2, 0.6], [0.06, 0.78], [0, 0.8]], mat); mitre.position.y = 1.12; g.add(mitre);
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.08), toon({ color: white ? '#3a2a26' : '#efe6da' })); slit.position.set(0, 1.55, 0.18); slit.rotation.z = -0.6; g.add(slit);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), mat); ball.position.y = 1.98; g.add(ball);
  } else if (kind === 'knight') {
    g.add(lathe(BASE.concat([[0.32, 0.36], [0, 0.36]]), mat));
    const s = new THREE.Shape();   // a horse's head in profile
    s.moveTo(-0.32, 0); s.lineTo(0.3, 0); s.lineTo(0.22, 0.5); s.quadraticCurveTo(0.42, 0.62, 0.5, 0.86); s.lineTo(0.36, 0.98);
    s.quadraticCurveTo(0.14, 0.9, 0.06, 1.0); s.lineTo(0.02, 1.2); s.lineTo(-0.1, 1.04); s.quadraticCurveTo(-0.4, 0.86, -0.32, 0);
    const head = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.36, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 }), mat);
    head.position.set(0, 0.34, -0.18); head.rotation.y = Math.PI / 2; g.add(head);
  } else if (kind === 'king') {
    g.add(lathe([...BASE, [0.26, 1.2], [0.36, 1.3], [0.22, 1.38], [0.3, 1.62], [0.1, 1.72], [0, 1.72]], mat));
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.1), mat); v.position.y = 1.92; g.add(v);
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.1), mat); h.position.y = 1.98; g.add(h);
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: white ? IVORY : ONYX, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.set(2, 2.4, 1); glow.position.y = 0.9; glow.layers.set(1); g.add(glow);
  return g;
}

// ---------------------------------------------------------------- board textures
function squareTex(white) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = white ? '#e9ddcb' : '#40353a'; g.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 260; i++) { g.fillStyle = white ? `rgba(113,91,81,${Math.random() * 0.12})` : `rgba(239,230,218,${Math.random() * 0.06})`; g.fillRect(Math.random() * 64, Math.random() * 256, 2, 2); }
  g.strokeStyle = white ? 'rgba(83,61,55,.55)' : 'rgba(20,14,18,.8)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, 61, 253);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function glowTex(white) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 64, 0);
  if (white) { gr.addColorStop(0, 'rgba(240,170,60,.95)'); gr.addColorStop(0.5, 'rgba(255,214,120,.75)'); gr.addColorStop(1, 'rgba(240,170,60,.95)'); }
  else { gr.addColorStop(0, 'rgba(60,30,90,.95)'); gr.addColorStop(0.5, 'rgba(25,12,40,.8)'); gr.addColorStop(1, 'rgba(60,30,90,.95)'); }
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
  g.strokeStyle = white ? 'rgba(120,60,10,.9)' : 'rgba(170,120,230,1)'; g.lineWidth = 4;
  for (let i = 0; i < 6; i++) { g.beginPath(); let x = rand(8, 56), y = rand(10, 240); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += rand(-10, 10); y += rand(-16, 16); g.lineTo(x, y); } g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function clockFaceTex(label) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#efe6da'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.strokeStyle = '#3a2a26'; g.lineWidth = 6; g.stroke();
  g.lineWidth = 3; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.beginPath(); g.moveTo(64 + Math.cos(a) * 46, 64 + Math.sin(a) * 46); g.lineTo(64 + Math.cos(a) * 54, 64 + Math.sin(a) * 54); g.stroke(); }
  g.fillStyle = '#3a2a26'; g.font = "700 20px 'Zen Maru Gothic', sans-serif"; g.textAlign = 'center'; g.fillText(label, 64, 96);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createChess(h) {
  // h: { scene, world, player, LANES, sfx, hurt, get speed(), after, banner, hitBoss, isFight(), anim, legend(html) }
  const { world, player, LANES, sfx } = h;
  const sqGeo = new THREE.PlaneGeometry(1.68, ROW - 0.08);
  const baseMat = [new THREE.MeshBasicMaterial({ map: squareTex(true) }), new THREE.MeshBasicMaterial({ map: squareTex(false) })];
  const hotMat = [new THREE.MeshBasicMaterial({ map: glowTex(true), transparent: true, depthWrite: false }), new THREE.MeshBasicMaterial({ map: glowTex(false), transparent: true, depthWrite: false })];
  const pathMat = new THREE.MeshBasicMaterial({ color: '#e8a92a', transparent: true, opacity: 0.8, depthWrite: false });
  const C = { on: false, z0: 0, flip: 0, rows: new Map(), hot: null, pieces: [], path: null, turn: 0, cycleN: 0, blitz: false, sides: null, bodies: null, clock: null, slam: [0, 0] };
  const colorOf = (lane, r) => (lane + r + C.flip) % 2;          // 0 = ivory square, 1 = onyx square
  const rowAt = (z) => Math.floor((C.z0 - z) / ROW);
  const rowMid = (r) => C.z0 - (r + 0.5) * ROW;
  const who = (side) => (side === 0 ? 'Ivory' : 'Onyx');

  // ---------------------------------------------------------------- the board
  function addRow(r) {
    const g = new THREE.Group(); g.position.z = rowMid(r);
    const sq = [], hot = [];
    for (let l = 0; l < 3; l++) {
      const m = new THREE.Mesh(sqGeo, baseMat[colorOf(l, r)]); m.rotation.x = -Math.PI / 2; m.position.set(LANES[l], 0.012, 0); m.layers.set(1); g.add(m); sq.push(m);
      const o = new THREE.Mesh(sqGeo, hotMat[0]); o.rotation.x = -Math.PI / 2; o.position.set(LANES[l], 0.03, 0); o.visible = false; o.layers.set(1); g.add(o); hot.push(o);
    }
    world.add(g); C.rows.set(r, { g, sq, hot, side: null, hurt: false });
  }
  function recolor() { for (const [r, row] of C.rows) row.sq.forEach((m, l) => { m.material = baseMat[colorOf(l, r)]; }); }
  function updateBoard(t) {
    const pr = rowAt(player.z);
    for (let r = Math.max(0, pr - 2); r <= pr + 9; r++) if (!C.rows.has(r)) addRow(r);
    for (const [r, row] of C.rows) {
      if (r < pr - 3) { world.remove(row.g); C.rows.delete(r); continue; }
      row.hot.forEach((o, l) => {
        o.visible = row.side !== null && colorOf(l, r) === row.side;
        if (o.visible) { o.material = hotMat[row.side]; }
      });
    }
    hotMat[0].opacity = 0.7 + Math.sin(t * 9) * 0.2; hotMat[1].opacity = 0.7 + Math.sin(t * 9) * 0.2;
  }
  // a sister's move: her colour lights up for a stretch of the board ahead, and those squares hurt to stand on
  function colourMove(side, n = 3) {
    const r0 = rowAt(player.z - (h.speed * 1.35 + 4));
    for (let r = r0; r < r0 + n; r++) { if (!C.rows.has(r)) addRow(r); const row = C.rows.get(r); row.side = side; row.hurt = false; }
  }
  function checkSquares() {
    const p = player; if (!p.alive || !p.grounded || p.y > 0.3) return;
    const r = rowAt(p.z), row = C.rows.get(r); if (!row || row.side === null || row.hurt) return;
    const lane = p.x < (LANES[0] + LANES[1]) / 2 ? 0 : p.x > (LANES[1] + LANES[2]) / 2 ? 2 : 1;
    // a little forgiveness at the ends of each square
    const into = (C.z0 - p.z) - r * ROW; if (into < 0.6 || into > ROW - 0.6) return;
    if (colorOf(lane, r) === row.side) { row.hurt = true; h.hurt(`Stepped on ${who(row.side)}’s square!`); }
  }

  // ---------------------------------------------------------------- pieces
  function piece(kind, side, lane, z, opts = {}) {
    const mesh = makePiece(kind, side === 0); const x = LANES[lane];
    const pc = { kind, side, mesh, x, z, vx: 0, vz: 0, y: 7, h: 2.2, hurt: false, t: 0, land: 0.45, ...opts };
    mesh.position.set(x, pc.y, z); mesh.rotation.y = side === 0 ? 0 : Math.PI;
    if (kind === 'pawn') mesh.scale.setScalar(1.15); else mesh.scale.setScalar(1.25);
    world.add(mesh); C.pieces.push(pc);
    return pc;
  }
  function laneStrip(lane, z0, z1, color) {   // telegraph: a glowing stripe down a lane (or a diagonal)
    const len = Math.abs(z1 - z0), m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, len), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.rotation.x = -Math.PI / 2; m.position.set(LANES[lane], 0.05, (z0 + z1) / 2); m.layers.set(1); world.add(m);
    return m;
  }
  const marks = [];
  function mark(mesh, life) { marks.push({ mesh, t: 0, life }); }
  function attack(side) {
    const lvl = Math.min(C.cycleN, 2), fast = side === 1 ? 1.35 : 1, p = player, sp = h.speed;
    const pool = ['rook', 'pawns', 'rook', 'bishop', 'knight', 'pawns', 'bishop', 'knight'].slice(0, 3 + lvl * 2);
    const kind = pool[Math.floor(Math.random() * pool.length)];
    if (kind === 'rook') {        // slides straight down your lane
      const lane = p.lane, z = p.z - (sp * 1.9 + 12);
      mark(laneStrip(lane, z, p.z - 3, side === 0 ? IVORY : '#a88ad8'), 1.2);
      h.after(0.55 / fast, () => { if (h.isFight()) { piece('rook', side, lane, z, { vz: 6 * fast }); sfx.slam(); } });
      return 'Rook';
    }
    if (kind === 'bishop') {      // cuts diagonally across all three lanes
      const from = Math.random() < 0.5 ? 0 : 2, z = p.z - (sp * 2.3 + 12), T2 = (sp * 2.3 + 12) / (sp + 4 * fast);
      const dir = from === 0 ? 1 : -1;
      const vz = 4 * fast, vx = dir * (LANES[2] - LANES[0]) / (T2 * 0.95);
      piece('bishop', side, from, z, { vz, vx, h: 2.0, land: 0.3 });
      // dotted diagonal: the squares it will slide across
      for (let i = 0; i <= 8; i++) { const tt = T2 * 0.95 * i / 8, m = new THREE.Mesh(new THREE.CircleGeometry(0.17, 10), new THREE.MeshBasicMaterial({ color: side === 0 ? IVORY : '#a88ad8', transparent: true, opacity: 0.8, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(LANES[from] + vx * tt, 0.05, z + vz * tt); m.layers.set(1); world.add(m); mark(m, T2 + 0.3); }
      sfx.slam(); return 'Bishop';
    }
    if (kind === 'knight') {      // three hops in L-shapes, landing in front of you
      let lane = Math.random() < 0.5 ? 0 : 2;
      const hops = 3, gap = 0.95 / fast;
      for (let i = 0; i < hops; i++) h.after(i * gap, () => {
        if (!h.isFight()) return;
        const target = player.lane !== lane ? player.lane : (lane + (Math.random() < 0.5 ? 1 : 2)) % 3;
        lane = target;
        const z = player.z - h.speed * (0.65 + 0.45);
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.72, 24), new THREE.MeshBasicMaterial({ color: side === 0 ? IVORY : '#a88ad8', transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
        ring.rotation.x = -Math.PI / 2; ring.position.set(LANES[lane], 0.06, z); ring.layers.set(1); world.add(ring); mark(ring, 1.6);
        const pc = piece('knight', side, lane, z, { y: 6, land: 0.6, h: 1.0, life: 1.6 }); sfx.springPlant();
      });
      return 'Knight';
    }
    // a wall of pawns marching at you, one gap (and they're low enough to jump)
    const gapLane = Math.floor(Math.random() * 3), z = p.z - (sp * 1.8 + 12);
    for (let l = 0; l < 3; l++) if (l !== gapLane) piece('pawn', side, l, z, { vz: 2.5 * fast, h: 0.9, y: 5, land: 0.35 });
    sfx.slam(); return 'Pawns';
  }
  function updatePieces(dt) {
    const p = player;
    for (const pc of [...C.pieces]) {
      pc.t += dt;
      const falling = pc.t < pc.land;
      pc.y = falling ? Math.max(0, pc.y - dt * (pc.y / Math.max(0.05, pc.land - pc.t + 0.02))) : 0;
      if (!falling) { pc.z += pc.vz * dt; pc.x += pc.vx * dt; if (pc.vx) pc.x = Math.max(LANES[0] - 0.2, Math.min(LANES[2] + 0.2, pc.x)); }
      pc.mesh.position.set(pc.x, pc.y, pc.z);
      if (!falling && pc.landed !== true) { pc.landed = true; h.fx?.(0.05, pc.kind === 'pawn' ? 0.1 : 0.25); }
      if (!pc.hurt && p.alive && Math.abs(p.x - pc.x) < 0.7 && Math.abs(p.z - pc.z) < 0.6 && p.y < pc.h + pc.y) {
        pc.hurt = true;
        h.hurt({ rook: 'Flattened by a rook!', bishop: 'The bishop got you diagonally!', knight: 'Trampled by a knight!', pawn: 'Pushed over by a pawn!' }[pc.kind]);
      }
      if (pc.z > p.z + 6 || (pc.life && pc.t > pc.life)) { world.remove(pc.mesh); C.pieces.splice(C.pieces.indexOf(pc), 1); }
    }
    for (const m of [...marks]) { m.t += dt; m.mesh.material.opacity = Math.max(0, 1 - m.t / m.life) * 0.8; if (m.t > m.life) { world.remove(m.mesh); marks.splice(marks.indexOf(m), 1); } }
  }

  // ---------------------------------------------------------------- your move: a knight's path to their king
  function yourMove() {
    const p = player, a = p.lane;
    const r0 = rowAt(p.z - (h.speed * 1.5 + 6));
    const opts = [0, 1, 2].filter((l) => l !== a), b = opts[Math.floor(Math.random() * opts.length)];
    const fw = 3 - Math.abs(b - a);              // a knight's L: 2 forward + 1 across, or 1 forward + 2 across
    const squares = []; for (let i = 0; i < fw; i++) squares.push([a, r0 + i]); squares.push([b, r0 + fw]);
    const meshes = squares.map(([l, r]) => { const m = new THREE.Mesh(sqGeo, pathMat); m.rotation.x = -Math.PI / 2; m.position.set(LANES[l], 0.05, rowMid(r)); m.layers.set(1); world.add(m); return m; });
    const kingSide = C.turn % 2;
    const king = makePiece('king', kingSide === 0); king.scale.setScalar(1.6);
    const crown = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: '#ffcf33', transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })); crown.scale.set(2.2, 2.2, 1); crown.position.y = 1.9; crown.layers.set(1); king.add(crown); king.position.set(LANES[b], 0, rowMid(r0 + fw) - ROW * 0.2); world.add(king);
    for (const row of C.rows.values()) row.side = null;           // no hot squares on your move
    C.path = { lane: b, z: king.position.z, king, meshes, done: false, kingSide, t: 0 };
    h.banner('Your move!', 'follow the gold knight’s path and take their king', 1.8); sfx.echoStart();
  }
  function updatePath(dt) {
    const P = C.path; if (!P) return;
    P.t += dt; pathMat.opacity = 0.72 + Math.sin(P.t * 8) * 0.18;
    P.king.rotation.y += dt * 1.2;
    const p = player;
    if (!P.done && Math.abs(p.z - P.z) < 0.9 && Math.abs(p.x - LANES[P.lane]) < 0.8 && p.y < 2.2) {
      P.done = true; sfx.snap(); h.fx?.(0.3, 0.3);
      P.king.rotation.z = 1.4; P.king.position.y = 0.3;
      h.banner('Capture!', `${who(P.kingSide)}’s king topples`, 1.4);
      h.hitBoss(P.kingSide);
      h.after(1.0, () => clearPath());
      return;
    }
    if (!P.done && p.z < P.z - 2) {
      P.done = true; sfx.offKey(); h.banner('Missed the king…', 'it’s their move again', 1.4);
      h.after(0.6, () => clearPath()); h.after(1.4, () => { if (h.isFight()) cycle(); });
    }
  }
  function clearPath() { if (!C.path) return; world.remove(C.path.king); for (const m of C.path.meshes) world.remove(m); C.path = null; }

  // ---------------------------------------------------------------- turns
  function slamClock(side) {
    C.slam[side] = 1; sfx.crackWarn();
    const b = side === 0 ? C.bodies?.white : C.bodies?.black;
    if (b) { h.anim(b, 'Cast', { once: true, after: 'Fly', fade: 0.1 }); b.charge = 0.6; if (b.acts.Cast) b.acts.Cast.timeScale = side === 1 ? 1.7 : 1; }
  }
  function sideMove(side, then) {
    const s = C.sides ? C.sides[side] : side;
    slamClock(s);
    h.banner(`${who(s)}’s move`, s === 0 ? `her ivory squares glow, stand on the dark ones` : `her onyx squares glow, stand on the light ones`, 1.2);
    colourMove(s, C.blitz ? 3 : 3);
    h.after(C.blitz ? 0.4 : (s === 1 ? 0.9 : 1.4), () => { if (h.isFight()) attack(s); });
    h.after(C.blitz ? 3.2 : (s === 1 ? 3.6 : 4.4), () => { if (h.isFight()) then(); });
  }
  function cycle() {
    if (!h.isFight()) return;
    if (C.blitz) {     // after castling: both of them at once
      slamClock(0); slamClock(1);
      h.banner('Blitz!', 'they’re both moving at once', 1.2);
      colourMove(C.turn % 2, 3);
      h.after(0.5, () => { if (h.isFight()) attack(0); });
      h.after(1.1, () => { if (h.isFight()) attack(1); });
      h.after(4.0, () => { if (h.isFight()) { C.turn++; colourMove(C.turn % 2, 2); } });
      h.after(6.2, () => { if (h.isFight()) yourMove(); });
      return;
    }
    sideMove(0, () => sideMove(1, () => { C.cycleN++; yourMove(); }));
  }
  // after the second capture: castling. They swap places, the board flips, and it's blitz from here on
  function castle() {
    C.blitz = true; C.flip = 1 - C.flip; recolor();
    for (const row of C.rows.values()) row.side = null;
    if (C.bodies) { const w = C.bodies.white.g.position.x; C.swapT = 0; C.swapFrom = w; }
    h.banner('Castling!', 'they swap sides… and the whole board flips', 2.4); sfx.bossIntro(); h.fx?.(0.45, 0.4);
    h.after(2.6, () => cycle());
  }

  // ---------------------------------------------------------------- lifecycle
  function begin(bodies) {
    clear();
    C.on = true; C.bodies = bodies; C.z0 = player.z - 10; C.flip = 0; C.turn = 0; C.cycleN = 0; C.blitz = false; C.swapT = null;
  }
  function start() { cycle(); }
  function afterHit(hp) {
    clearPath(); C.turn++;
    if (hp === 1 && !C.blitz) h.after(1.4, () => { if (h.isFight()) castle(); });
    else if (hp > 0) h.after(1.6, () => { if (h.isFight()) cycle(); });
  }
  function clear() {
    for (const row of C.rows.values()) world.remove(row.g); C.rows.clear();
    for (const pc of C.pieces) world.remove(pc.mesh); C.pieces.length = 0;
    for (const m of marks) world.remove(m.mesh); marks.length = 0;
    clearPath(); C.on = false;
  }
  function update(dt, t, fighting) {
    if (!C.on) return;
    updateBoard(t);
    if (fighting) { checkSquares(); updatePieces(dt); updatePath(dt); }
    // the floating chess clock between them
    if (C.bodies?.clock) {
      const ck = C.bodies.clock;
      for (let s = 0; s < 2; s++) { C.slam[s] = Math.max(0, C.slam[s] - dt * 3); ck.userData.btn[s].position.y = 0.36 - C.slam[s] * 0.1; }
      ck.userData.hand[C.turn % 2].rotation.z -= dt * (C.blitz ? 9 : 3);
    }
    // castling: they glide past each other to swap sides
    if (C.bodies && C.swapT !== null && C.swapT < 1) {
      C.swapT = Math.min(1, C.swapT + dt / 1.2); const k = C.swapT * C.swapT * (3 - 2 * C.swapT);
      C.bodies.white.g.position.x = -0.95 + 1.9 * k; C.bodies.black.g.position.x = 0.95 - 1.9 * k;
      C.bodies.white.g.position.z = Math.sin(k * Math.PI) * 0.8; C.bodies.black.g.position.z = -Math.sin(k * Math.PI) * 0.8;
    }
  }
  function makeClock() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.62, 0.45), toon({ map: T.wood })); g.add(body);
    const hand = [], btn = [];
    for (const [s, x] of [[0, -0.36], [1, 0.36]]) {
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.24, 24), new THREE.MeshBasicMaterial({ map: clockFaceTex(s === 0 ? 'IVORY' : 'ONYX') })); face.position.set(x, 0.02, 0.231); g.add(face);
      const hd = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.01), toon({ color: '#3a2a26' })); hd.geometry.translate(0, 0.09, 0); hd.position.set(x, 0.02, 0.24); g.add(hd); hand.push(hd);
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.12, 12), toon({ color: s === 0 ? '#efe6da' : '#3a3036' })); b.position.set(x, 0.36, 0); g.add(b); btn.push(b);
    }
    g.userData = { hand, btn };
    return g;
  }
  return {
    begin, start, update, clear, afterHit, makeClock, makePiece,
    get state() {
      if (!C.on) return null;
      const p = player, pr = rowAt(p.z);
      const hot = []; for (let r = pr; r <= pr + 4; r++) { const row = C.rows.get(r); if (row && row.side !== null) hot.push({ r, side: row.side, safe: [0, 1, 2].filter((l) => colorOf(l, r) !== row.side), dz: +(p.z - (C.z0 - r * ROW)).toFixed(1) }); }
      return { row: pr, flip: C.flip, blitz: C.blitz, turn: C.turn % 2, hot, pieces: C.pieces.map((pc) => ({ kind: pc.kind, x: +pc.x.toFixed(2), dz: +(p.z - pc.z).toFixed(1), y: +pc.y.toFixed(1) })), path: C.path && !C.path.done ? { lane: C.path.lane, dz: +(p.z - C.path.z).toFixed(1) } : null };
    },
  };
}
