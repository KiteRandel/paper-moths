// Boss guides: the first time you meet each boss in a run, Amara keeps running on empty roofs while this card
// explains the fight, with pictures of each attack. Press Space twice (or tap the button twice) to start. Made by KiteRandel.

const GUIDES = {
  twins: {
    name: 'The Twin Lanterns',
    blurb: 'A blue Amara and an orange Amara, flying ahead of you in each other’s arms. They take turns sending waves rolling down the roof.',
    steps: [
      { img: 'twins_1', title: '<b class="b">Blue wave</b>: hold still', text: 'Don’t change lanes, jump or slide while a blue wave passes. Just keep running straight through it.' },
      { img: 'twins_2', title: '<b class="o">Orange wave</b>: slide!', text: 'Orange waves float at chest height. Press <kbd>↓</kbd> to slide under them.' },
      { img: 'twins_3', title: 'Catch the lantern', text: 'After each set of waves a glowing lantern falls into one lane. Run into it and Amara throws it right back at the twins. That’s one hit.' },
    ],
    win: 'Land <b>3 lantern hits</b> to win. The waves get faster each round.',
  },
  wrath: {
    name: 'Wrath & Joy',
    blurb: 'Furious red Wrath smashes the roof while giddy yellow Joy dances around her. Joy’s springs are your way up to Wrath.',
    steps: [
      { img: 'wrath_1', title: 'Watch the cracks', text: 'Cracks flash across the roof before each slam. <b class="r">Red</b>: a crater that hurts, so switch lanes or jump it. <b class="o">Flaming</b>: a fire pillar too tall to jump, so switch lanes.' },
      { img: 'wrath_2', title: 'Bounce on <b class="y">Joy’s spring</b>', text: 'A <b class="y">gold</b> crack means Joy plants a sunflower spring there. Run onto it to launch high into the air. If a gold crack <b class="r">flickers red</b>, Wrath is about to stomp that spring flat, so stay away!' },
      { img: 'wrath_3', title: 'Smack into Wrath', text: 'In mid-air, steer into Wrath’s lane with <kbd>←</kbd> <kbd>→</kbd> and crash into her. She tries to dodge sideways, so follow her.' },
    ],
    win: 'Hit Wrath <b>3 times</b> and she runs out of fury.',
  },
  prism: {
    name: 'Neon Amara',
    blurb: 'Every Amara you\u2019ve faced, all at once. With their powers combined they become one glowing white Amara with a neon rainbow outline, and she wants to play catch.',
    steps: [
      { img: 'prism_1', title: 'With their powers combined', text: 'They spin in a wheel and fuse together. Enjoy the light show.' },
      { img: 'prism_2', title: 'Knock the ball back', text: 'She throws a glowing ball at you. A <b>white ring</b> shrinks around your feet: jump the moment it <b class="y">turns gold</b> and you\u2019ll be at the top of your jump when the ball arrives, knocking it straight back.' },
      { img: 'prism_3', title: 'Win the rally', text: 'She returns it faster every time, and between returns the Amaras inside her mix their attacks in new pairs. Listen for who\u2019s calling out the move. Keep the rally going long enough and she finally misses. Get hit by the ball and the rally starts over.' },
    ],
    win: 'Win <b>3 rallies</b> to scatter her colours. Each one is longer and faster than the last.',
  },
  chess: {
    name: 'Ivory & Onyx',
    blurb: 'Prim, polite Ivory and fast, sloppy Onyx are playing chess, and the rooftop is their board. Survive their moves, promote your pawn, and take them down as a queen.',
    steps: [
      { img: 'chess_1', title: 'Watch the board', text: 'On <b>Ivory\u2019s move</b> her cream squares glow and hurt. On <b>Onyx\u2019s move</b> her dark squares do. Only stand on the other colour: weave between the middle and side lanes, or jump a square.' },
      { img: 'chess_2', title: 'Dodge the pieces', text: 'Each move drops a piece that attacks the way it moves. <b>Rooks</b> slide straight down a lane, <b>bishops</b> cut diagonally across, <b>knights</b> hop in L-shapes (watch the rings), and <b>pawns</b> march in a wall with one gap. You can jump the pawns.' },
      { img: 'chess_3', title: 'Promote, then strike', text: 'Your move: race your pawn down <b>8 ranks</b> to the <b class="y">gold line</b>. One hit sends you back to rank 1. Reach it and Amara becomes a <b>queen</b>: the sisters drop into the lanes, so get in line with one and press <kbd>jump</kbd> to strike. They dodge the moment you line up, so be quick!' },
    ],
    win: 'Capture them <b>3 times</b> for checkmate. It only gets faster from there.'
  },
  duet: {
    name: 'Lilac & Glitch',
    blurb: 'Composed purple Lilac sings while twitchy green Glitch strains at the leash in her hand. Learn the song, then sing it back.',
    steps: [
      { img: 'duet_1', title: 'Remember her song', text: 'Lilac sings a short melody. Each note floats over a lane: <b class="p">low = left</b>, <b class="p">middle = centre</b>, <b class="p">high = right</b>. Remember the order.' },
      { img: 'duet_2', title: 'Dodge Glitch', text: 'Glitch replays the song as strikes down those same lanes, in the same rhythm. Get out of each lane before she lunges into it.' },
      { img: 'duet_3', title: 'Sing it back', text: 'Rows of notes come at you. For each row, run through the lane of that note in the song, in order. Get the whole song right for one hit.' },
    ],
    win: 'Sing it back <b>3 times</b> and the leash snaps. The songs get longer and faster each time.',
  },
};

export function createBrief({ sfx }) {
  const el = document.getElementById('brief');
  const S = { on: false, presses: 0, cb: null, t: 0 };
  function render(kind) {
    const g = GUIDES[kind];
    el.querySelector('.bName').textContent = g.name;
    el.querySelector('.bBlurb').innerHTML = g.blurb;
    el.querySelector('.bSteps').innerHTML = g.steps.map((s, i) => `
      <figure class="bStep"><div class="bPic"><img src="assets/guide/${s.img}.jpg" alt="" /><span class="bNum">${i + 1}</span></div>
      <figcaption><h3>${s.title}</h3><p>${s.text}</p></figcaption></figure>`).join('');
    el.querySelector('.bWin').innerHTML = `${g.win} You get a free 🩹 bandaid when the fight starts.`;
    el.className = `brief on ${kind}`;
    setPresses(0);
  }
  function setPresses(n) {
    S.presses = n;
    el.querySelectorAll('.bDots i').forEach((d, i) => d.classList.toggle('on', i < n));
    el.querySelector('.bGo').classList.toggle('armed', n === 1);
    el.querySelector('.bGoText').innerHTML = n === 1 ? 'once more to start the fight!' : 'twice to start the fight';
  }
  function show(kind, cb) {
    S.on = true; S.cb = cb; S.t = performance.now();
    render(kind); document.body.classList.add('briefing'); sfx.bossIntro?.();
  }
  function press() {
    if (!S.on || performance.now() - S.t < 600) return;      // a short grace so a held key doesn't skip it
    sfx.click();
    if (S.presses === 0) { setPresses(1); return; }
    S.on = false; el.className = 'brief'; document.body.classList.remove('briefing');
    const cb = S.cb; S.cb = null; cb?.();
  }
  function hide() { S.on = false; S.cb = null; el.className = 'brief'; document.body.classList.remove('briefing'); }
  el.querySelector('.bGo').addEventListener('click', press);
  return { show, press, hide, get on() { return S.on; } };
}
