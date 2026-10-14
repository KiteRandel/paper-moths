// Ivory & Onyx: the chess boss. The roof turns into a chessboard; on each sister's move her squares hurt,
// she drops a chess piece that attacks the way it moves, and then it's your move: follow the knight's path and
// capture their king. Made by KiteRandel.
import * as THREE from 'three';
import { PAL, T, toon } from './art.js?v=30';

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
  const C = { dbg: [], on: false, z0: 0, flip: 0, rows: new Map(), hot: null, pieces: [], path: null, turn: 0, cycleN: 0, blitz: false, sides: null, bodies: null, clock: null, slam: [0, 0] };
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
    // you only count as standing on a square once you're settled in its lane (mid-switch is safe)...
    const lane = [0, 1, 2].find((l) => Math.abs(p.x - LANES[l]) < 0.55); if (lane === undefined) return;
    // ...and the seams between squares are safe, so there's a fair moment to change lanes
    const into = (C.z0 - p.z) - r * ROW; if (into < 1.4 || into > ROW - 1.4) return;
    if (colorOf(lane, r) === row.side) { row.hurt = true; C.dbg.push({ lane, x: +p.x.toFixed(2), into: +into.toFixed(1), side: row.side, safe: [0, 1, 2].filter((l) => colorOf(l, r) !== row.side), y: +p.y.toFixed(2), slide: +p.slideT.toFixed(2), r, rank: row.rank }); hurt(`Stepped on ${who(row.side)}’s square!`); }
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
  function attack(side, forced) {
    const lvl = Math.min(C.round, 3), fast = (side === 1 ? 1.45 : 1.1) + lvl * 0.12, p = player, sp = h.speed;
    const pool = ['rook', 'pawns', 'bishop', 'knight', 'rook', 'bishop', 'knight', 'pawns'].slice(0, 4 + lvl * 2);
    const kind = forced || pool[Math.floor(Math.random() * pool.length)];
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
        hurt({ rook: 'Flattened by a rook!', bishop: 'The bishop got you diagonally!', knight: 'Trampled by a knight!', pawn: 'Pushed over by a pawn!' }[pc.kind]);
      }
      if (pc.z > p.z + 6 || (pc.life && pc.t > pc.life)) { world.remove(pc.mesh); C.pieces.splice(C.pieces.indexOf(pc), 1); }
    }
    for (const m of [...marks]) { m.t += dt; m.mesh.material.opacity = Math.max(0, 1 - m.t / m.life) * 0.8; if (m.t > m.life) { world.remove(m.mesh); marks.splice(marks.indexOf(m), 1); } }
  }

  // ---------------------------------------------------------------- your move, part 1: the promotion race
  // Run your pawn down eight ranks of the board without a scratch. Every rank glows one sister's colour (and the
  // colour keeps switching, so the safe lane does too) while pieces keep dropping. Get hit and your pawn is captured:
  // back to rank 1.
  const RANKS = 8;
  const goldMat = new THREE.MeshBasicMaterial({ color: '#e8a92a', transparent: true, opacity: 0.9, depthWrite: false });
  function hurt(msg) {
    h.hurt(msg);
    if (C.race && !C.race.done && player.alive) { const r = C.race; r.done = true; world.remove(r.line); for (const row of C.rows.values()) { row.side = null; row.rank = 0; } C.race = null; C.restarts++; h.banner('Your pawn was captured!', 'back to rank 1', 1.3); h.after(1.5, () => { if (h.isFight() && !C.race && !C.queen) startRace(); }); }
  }
  function startRace() {
    const p = player, id = ++C.raceId;
    const r0 = rowAt(p.z - (h.speed * 1.25 + 4));
    let side = Math.random() < 0.5 ? 0 : 1;
    for (let i = 0; i < RANKS; i++) {
      const r = r0 + i; if (!C.rows.has(r)) addRow(r);
      if (i > 0 && Math.random() < 0.6) side = 1 - side;
      const row = C.rows.get(r); row.side = side; row.hurt = false; row.rank = i + 1;
    }
    const line = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 0.7), goldMat); line.rotation.x = -Math.PI / 2; line.position.set(0, 0.07, C.z0 - (r0 + RANKS) * ROW); line.layers.set(1); world.add(line);
    C.race = { id, r0, line, done: false };
    // pieces keep coming the whole way down
    const n = 2 + Math.min(C.round, 3), span = (RANKS * ROW) / h.speed;
    for (let i = 0; i < n; i++) h.after(0.35 + i * (span * 0.8 / n), () => { if (C.race && C.race.id === id && !C.race.done && h.isFight()) attack(i % 2, Math.random() < 0.5 ? 'pawns' : 'knight'); });   // only jumpable pieces in the race, so there's always a way through
    h.banner(C.restarts ? 'Rank 1 again…' : 'Your move: promotion race!', 'reach the gold line at rank 8 without getting hit', 1.6); sfx.echoStart();
  }
  function updateRace() {
    const R = C.race; if (!R || R.done) return;
    const rank = rowAt(player.z) - R.r0 + 1;
    h.name(`Ivory & Onyx · rank ${Math.max(1, Math.min(RANKS, rank))}/${RANKS}`);
    goldMat.opacity = 0.65 + Math.sin(performance.now() / 120) * 0.25;
    if (rank > RANKS) promote();
  }

  // ---------------------------------------------------------------- your move, part 2: promotion. You're a queen for a few seconds:
  // the sisters drop down into the lanes and dodge; line up with one and press jump to strike straight down your lane.
  function promote() {
    const R = C.race; R.done = true; world.remove(R.line); C.race = null;
    for (const row of C.rows.values()) { row.side = null; row.rank = 0; }
    for (const pc of C.pieces) world.remove(pc.mesh); C.pieces.length = 0;
    const blitz = C.blitz;
    C.queen = { t: 0, dur: blitz ? 5.5 : 6.5, lanes: [0, 2], hold: [0, 0], cd: 0, next: [1.4, 0.9], react: blitz ? [0.26, 0.18] : [0.36, 0.24] };
    queenFx.visible = true; queenFx.scale.setScalar(0.01);
    h.banner('Promotion!', 'you’re a queen: get in line with a sister and press jump', 2.0); sfx.chord([72, 76, 79, 84]); h.fx?.(0.4, 0.2);
  }
  // the queen's crown and glow, worn by Amara
  const queenFx = new THREE.Group(); queenFx.visible = false;
  {
    const gold = toon({ color: '#e8b33a', emissive: new THREE.Color('#ffcf33'), emissiveIntensity: 0.5 });
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.1, 16, 1, true), gold); queenFx.add(band);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, sp = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 6), gold); sp.position.set(Math.cos(a) * 0.16, 0.11, Math.sin(a) * 0.16); queenFx.add(sp); }
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: '#ffcf33', transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending })); halo.scale.set(1.6, 1.6, 1); halo.layers.set(1); queenFx.add(halo);
    queenFx.position.y = 1.72; player.root.add(queenFx);
  }
  function queenFire() {
    const Q = C.queen; if (!Q || Q.cd > 0) return !!Q;
    Q.cd = 0.5;
    const lane = player.lane, z0 = player.z - 1, z1 = player.z - 20;
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(0.7, Math.abs(z1 - z0)), new THREE.MeshBasicMaterial({ color: '#ffcf33', transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    beam.rotation.x = -Math.PI / 2; beam.position.set(LANES[lane], 1.2, (z0 + z1) / 2); beam.layers.set(1); world.add(beam); mark(beam, 0.45);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(Math.abs(z1 - z0), 3), beam.material.clone()); wall.rotation.y = Math.PI / 2; wall.position.set(LANES[lane], 1.6, (z0 + z1) / 2); wall.layers.set(1); world.add(wall); mark(wall, 0.45);
    sfx.strike();
    const s = Q.lanes.indexOf(lane);
    if (s >= 0) {          // got her!
      C.queen = null; queenFx.visible = false;
      h.banner('Capture!', `${who(C.sides ? C.sides[s] : s)} is taken`, 1.4); sfx.snap();
      h.hitBoss();
    } else sfx.offKey();
    return true;
  }
  function updateQueen(dt) {
    const Q = C.queen; if (!Q) return;
    Q.t += dt; Q.cd -= dt;
    queenFx.scale.lerp(new THREE.Vector3(1, 1, 1), Math.min(1, dt * 8)); queenFx.rotation.y += dt * 2;
    h.name(`Ivory & Onyx · queen ${Math.max(0, Math.ceil(Q.dur - Q.t))}s`);
    for (let s = 0; s < 2; s++) {
      // the moment you line up with her she slips into another lane (Onyx is quicker about it)
      Q.hold[s] = player.lane === Q.lanes[s] ? Q.hold[s] + dt : 0; Q.next[s] -= dt;
      if (Q.hold[s] > Q.react[s] || Q.next[s] <= 0) {
        const opts = [0, 1, 2].filter((l) => l !== Q.lanes[s] && l !== Q.lanes[1 - s]);
        Q.lanes[s] = opts[Math.floor(Math.random() * opts.length)]; Q.hold[s] = 0; Q.next[s] = s === 1 ? rand(0.55, 0.95) : rand(0.9, 1.4);
      }
    }
    if (Q.t > Q.dur) {
      C.queen = null; queenFx.visible = false; sfx.sad();
      h.banner('Your queen was taken…', 'back to their moves', 1.6);
      h.after(1.8, () => { if (h.isFight()) cycle(); });
    }
  }

  // ---------------------------------------------------------------- their moves
  function slamClock(side) {
    C.slam[side] = 1; sfx.crackWarn();
    const b = side === 0 ? C.bodies?.white : C.bodies?.black;
    if (b) { h.anim(b, 'Cast', { once: true, after: 'Fly', fade: 0.1 }); b.charge = 0.6; if (b.acts.Cast) b.acts.Cast.timeScale = side === 1 ? 1.7 : 1; }
  }
  function sideMove(side, then) {
    const s = C.sides ? C.sides[side] : side, lvl = Math.min(C.round, 3);
    slamClock(s);
    h.banner(`${who(s)}’s move`, s === 0 ? 'her squares glow gold, stand on the dark ones' : 'her squares glow purple, stand on the light ones', 1.1);
    colourMove(s, 4 + lvl);
    const quick = s === 1 ? 0.75 : 1;
    h.after(1.0 * quick, () => { if (h.isFight()) attack(s); });
    if (lvl >= 1) h.after(2.0 * quick, () => { if (h.isFight()) attack(s); });           // later on: two pieces a move
    if (lvl >= 3) h.after(2.9 * quick, () => { if (h.isFight()) attack(s); });
    h.after((4.2 + lvl * 0.5) * quick, () => { if (h.isFight()) then(); });
  }
  function cycle() {
    if (!h.isFight()) return;
    C.turn++; h.name('Ivory & Onyx');
    if (C.blitz) {     // after castling: they both move at once
      slamClock(0); slamClock(1);
      h.banner('Blitz!', 'they’re both moving at once', 1.1);
      colourMove(C.turn % 2, 5);
      h.after(0.6, () => { if (h.isFight()) attack(0); });
      h.after(1.1, () => { if (h.isFight()) attack(1); });
      h.after(2.2, () => { if (h.isFight()) attack(1); });
      h.after(3.6, () => { if (h.isFight()) { slamClock(0); slamClock(1); colourMove((C.turn + 1) % 2, 4); attack(0); } });
      h.after(5.0, () => { if (h.isFight()) attack(1); });
      h.after(7.0, () => { if (h.isFight()) startRace(); });
      return;
    }
    sideMove(0, () => sideMove(1, () => startRace()));
  }
  // after the second capture: castling. They swap places, the board flips, and it's blitz from then on
  function castle() {
    C.blitz = true; C.flip = 1 - C.flip; recolor(); C.home = [C.home[1], C.home[0]];
    for (const row of C.rows.values()) row.side = null;
    h.banner('Castling!', 'they swap sides… and the whole board flips', 2.4); sfx.bossIntro(); h.fx?.(0.45, 0.4);
    h.after(2.6, () => cycle());
  }

  // ---------------------------------------------------------------- lifecycle
  function begin(bodies) {
    clear();
    Object.assign(C, { on: true, bodies, z0: player.z - 10, flip: 0, turn: 0, round: 0, cycleN: 0, blitz: false, restarts: 0, raceId: 0, race: null, queen: null, home: [-0.95, 0.95] });
  }
  function start() { cycle(); }
  function afterHit(hp) {
    C.round++; C.restarts = 0;
    for (const b of [C.bodies.white, C.bodies.black]) h.anim(b, 'Hit', { once: true, after: 'Fly', fade: 0.1 });
    if (hp === 2 && !C.blitz) h.after(1.4, () => { if (h.isFight()) castle(); });
    else if (hp > 0) h.after(1.8, () => { if (h.isFight()) cycle(); });
  }
  function clear() {
    for (const row of C.rows.values()) world.remove(row.g); C.rows.clear();
    for (const pc of C.pieces) world.remove(pc.mesh); C.pieces.length = 0;
    for (const m of marks) world.remove(m.mesh); marks.length = 0;
    if (C.race) world.remove(C.race.line); C.race = null; C.queen = null; queenFx.visible = false; C.on = false;
  }
  function update(dt, t, fighting) {
    if (!C.on) return;
    updateBoard(t);
    if (fighting) { checkSquares(); updatePieces(dt); updateRace(); updateQueen(dt); }
    // the floating chess clock between them
    if (C.bodies?.clock) {
      const ck = C.bodies.clock;
      for (let s = 0; s < 2; s++) { C.slam[s] = Math.max(0, C.slam[s] - dt * 3); ck.userData.btn[s].position.y = 0.36 - C.slam[s] * 0.1; }
      ck.userData.hand[C.turn % 2].rotation.z -= dt * (C.blitz ? 9 : 3);
      ck.visible = !C.queen;
    }
    // the sisters: side by side (swapped after castling), or down in the lanes dodging your queen
    if (C.bodies) {
      [C.bodies.white, C.bodies.black].forEach((b, s) => {
        const wx = C.queen ? LANES[C.queen.lanes[s]] / 1.6 : C.home[s], wy = C.queen ? -0.55 : 0;
        b.g.position.x += (wx - b.g.position.x) * Math.min(1, dt * (C.queen ? 14 : 4));
        b.g.position.y += (wy - b.g.position.y) * Math.min(1, dt * 6); b.g.position.z += (0 - b.g.position.z) * Math.min(1, dt * 4);
      });
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
    queenFire, get queenOn() { return !!C.queen; },
    debugPromote() { if (!C.race) startRace(); promote(); },
    get state() {
      if (!C.on) return null;
      const p = player, pr = rowAt(p.z);
      const hot = []; for (let r = pr; r <= pr + 4; r++) { const row = C.rows.get(r); if (row && row.side !== null) hot.push({ r, side: row.side, safe: [0, 1, 2].filter((l) => colorOf(l, r) !== row.side), dz: +(p.z - (C.z0 - r * ROW)).toFixed(1) }); }
      return { dbg: C.dbg.slice(-4), row: pr, flip: C.flip, blitz: C.blitz, round: C.round, hot, pieces: C.pieces.map((pc) => ({ kind: pc.kind, x: +pc.x.toFixed(2), dz: +(p.z - pc.z).toFixed(1), y: +pc.y.toFixed(1) })),
        race: C.race && !C.race.done ? { rank: rowAt(p.z) - C.race.r0 + 1, restarts: C.restarts } : null, queen: C.queen ? { lanes: [...C.queen.lanes], left: +(C.queen.dur - C.queen.t).toFixed(1) } : null };
    },
  };
}
