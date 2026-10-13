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

- **Moths** are worth 10 points, and catching them in quick succession raises your multiplier, up to ×5. Golden moths are worth 50.
- 🩹 A **bandage roll** absorbs one bump.
- 🎀 A **ribbon** pulls nearby moths to you for a few seconds.
- Things get faster the longer you run. Your best score is saved in your browser.

## Bosses

Every few hundred metres a boss swoops in over the rooftops. You get a free bandage at the start of each fight.

- **The Twin Lanterns**: a blue Amara and an orange Amara, flying ahead of you in each other's arms. They send waves rolling back down the roofs at you.
  - 🔵 **Blue wave:** keep running and don't touch anything. Jumping, sliding or changing lanes as it passes hurts you.
  - 🟠 **Orange wave:** slide under it.
  - After each round of waves they drop a golden paper lantern into one lane. Catch it and Amara flings it back at them. Three hits and they drift apart.
- **Wrath & Joy**: furious red Wrath smashes the roof while giddy yellow Joy bounces around her, giggling.
  - Cracks flash across the roof before each slam. 🔴 **Red crack:** Wrath smashes a hole there, so stay out of that lane or jump it. 🟡 **Gold crack:** Joy cannonballs down and plants a golden sunflower spring.
  - **Bounce on Joy's spring** to launch high into the air straight at Wrath. She tries to dodge into another lane, so steer in mid-air and smack into her. The angrier she gets, the more red cracks per row. Three hits and Wrath runs out of fury, and Joy hugs her as they float away.
- **Lilac & Glitch**: composed purple Lilac sings while twitchy green Glitch strains at the leash in her hand.
  - Each note of Lilac's song points to a lane: 🎵 low = left, middle = centre, high = right. A glowing note floats over each lane as she sings.
  - Then Glitch replays the song as strikes, tearing down those lanes in the same order and rhythm. Be out of the lane on the beat!
  - **Sing it back:** rows of note orbs appear across the roof. Run through the right lane for each note to echo the melody. A perfect echo cracks the leash, and one wrong note means listening again. Three perfect echoes snap the leash for good. Songs get longer and faster each time.

Beating a boss earns a big score bonus and a shower of moths.

## Art direction

Everything is drawn to match Amara's illustration. The palette is sampled straight from her texture, objects use soft toon shading, and an ink-outline pass gives every shape the same brown lineart. A paper-grain sepia finish goes over the whole frame. The textures (roof tiles, brick, plaster walls with lit windows, crates, leopard-spot laundry and paper lanterns) are painted in code. The music box waltz and sound effects are synthesized live. Boss fights fade in their own theme, "Dreamtone Bloom".

Amara (`assets/amara.glb`) is KiteRandel's character, modeled, rigged and animated in Blender, with run, leap, slide and stumble animations made for this game, plus flying, embracing, slamming, singing and glitching animations for the bosses.

## Run locally

It's a static site with no build step: `npx serve .` and open the URL it prints.

## License

Code: MIT © KiteRandel. The Amara character and model (`assets/amara.glb`) © KiteRandel, all rights reserved. The boss theme (`assets/boss-theme.mp3`, "Dreamtone Bloom") is from Magnific, used under KiteRandel's Magnific license. It is not covered by the MIT license and may not be reused or redistributed.
