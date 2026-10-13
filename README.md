# Amara & the Paper Moths

**An evening rooftop run, a game by [KiteRandel](https://github.com/KiteRandel).**

Amara chases glowing paper moths across a sepia town at dusk. Leap the gaps between roofs, duck under the laundry lines, dodge chimneys and crates, and catch moths in a row to build up your combo.

**Play it:** https://kiterandel.github.io/paper-moths/

## Controls

| | Keyboard | Touch |
| --- | --- | --- |
| Change lanes | ← → or A D | swipe left/right |
| Leap | ↑, W or Space | swipe up or tap |
| Slide | ↓ or S (in the air: drop fast) | swipe down |

## Things to know

- Your first run starts with a quick tutorial: time slows right before a row of crates and a laundry line, and waits until you press jump or slide.

- **Moths** are worth 10 points, and catching them in quick succession raises your multiplier, up to ×5. Golden moths are worth 50.
- Every moth you catch flutters into your **moth purse** in the bottom-right corner. Golden moths count as 5. The purse is saved between runs.
- 🩹 A **bandaid** absorbs one bump. You can carry up to 3.
- 🎀 A **ribbon** whisks nearby moths straight into your purse for a few seconds.
- 🛍️ Every so often a pink **SHOP** sign stands over one lane. Run through its curtain to visit a little shop where a pink Amara sells 🩹 bandaids for 3000 moths and ✂️ paper scissors for 5000. The scissors snip away the next obstacle coming at you in your lane. You can carry up to 3 of each. Press 1 or 2 to buy, and Esc or Space to head back to the roof. Skip the shop and she takes it personally: she lounges smugly in the air over the rooftops for about 20 seconds, teasing you and calling grey-white lightning down onto the roof ahead. A crackling ring marks where each bolt will land, and the scorched spot it leaves still hurts for a moment, so switch lanes. There's always a lane that's safe.
- Things get faster the longer you run. Your best score is saved in your browser.

## Bosses

Every few hundred metres a boss swoops in over the rooftops. You get a free bandaid at the start of each fight.

- **The Twin Lanterns**: a blue Amara and an orange Amara, flying ahead of you in each other's arms. They send waves rolling back down the roofs at you.
  - 🔵 **Blue wave:** keep running and don't touch anything. Jumping, sliding or changing lanes as it passes hurts you.
  - 🟠 **Orange wave:** slide under it.
  - After each round of waves they drop a golden paper lantern into one lane. Catch it and Amara flings it back at them. Three hits and they drift apart.
- **Wrath & Joy**: furious red Wrath (steaming, trembling, growling, and angrier with every hit) smashes the roof while giddy yellow Joy dances around her, giggling, flitting between twirls, cheers, claps and dances.
  - Cracks flash across the roof before each slam. 🔴 **Red crack:** Wrath smashes a crater there, and stepping in it hurts, so switch lanes or jump it. 🔥 **Flaming crack:** that crater erupts into a pillar of fire too tall to jump, so you have to switch lanes. The angrier she gets, the more fire. 🟡 **Gold crack:** Joy cannonballs down and plants a golden sunflower spring.
  - **Bounce on Joy's spring** to launch high into the air straight at Wrath. She tries to dodge into another lane, so steer in mid-air and smack into her. Watch out: when a gold crack **flickers red**, Wrath is about to stomp that spring flat into a hole, and she does it more often the angrier she gets. The angrier she gets, the more red cracks per row. After your second hit Wrath snaps and grabs Joy by the throat: for 10 seconds every spring is crushed and the roof shatters around you row after row, so find the safe lane each time. Then Joy kicks free and plants one last spring for the finishing blow. Three hits and Wrath runs out of fury, and Joy hugs her as they float away.
- **Lilac & Glitch**: composed purple Lilac sings while twitchy green Glitch strains at the leash in her hand.
  - Each note of Lilac's song points to a lane: 🎵 low = left, middle = centre, high = right. A glowing note floats over each lane as she sings.
  - Then Glitch replays the song as strikes, tearing down those lanes in the same order and rhythm. Be out of the lane on the beat!
  - **Sing it back:** rows of note orbs appear across the roof. Run through the right lane for each note to echo the melody. A perfect echo cracks the leash, and one wrong note means listening again. Three perfect echoes snap the leash for good. Songs get longer and faster each time.

Beating a boss earns a big score bonus and a shower of moths.

## Art direction

Everything is drawn to match Amara's illustration. The palette is sampled straight from her texture, objects use soft toon shading, and an ink-outline pass gives every shape the same brown lineart. A paper-grain sepia finish goes over the whole frame. The textures (roof tiles, brick, plaster walls with lit windows, crates, leopard-spot laundry and paper lanterns) are painted in code. While you run, a slowed, softened, reverb-washed version of "Rush Hour" plays; boss fights fade in "Dreamtone Bloom". Sound effects are synthesized live.

Amara (`assets/amara.glb`) is KiteRandel's character, modeled, rigged and animated in Blender, with run, leap, slide and stumble animations made for this game, plus flying, embracing, slamming, singing and glitching animations for the bosses.

## Run locally

It's a static site with no build step: `npx serve .` and open the URL it prints.

## License

Code: MIT © KiteRandel. The Amara character and model (`assets/amara.glb`) © KiteRandel, all rights reserved. The music (`assets/main-theme.mp3`, a calmer edit of "Rush Hour", and `assets/boss-theme.mp3`, "Dreamtone Bloom") is from Magnific, used under KiteRandel's Magnific license. It is not covered by the MIT license and may not be reused or redistributed.
