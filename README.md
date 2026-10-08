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

## Art direction

Everything is drawn to match Amara's illustration. The palette is sampled straight from her texture, objects use soft toon shading, and an ink-outline pass gives every shape the same brown lineart. A paper-grain sepia finish goes over the whole frame. The textures (roof tiles, brick, plaster walls with lit windows, crates, leopard-spot laundry and paper lanterns) are painted in code. The music box waltz and sound effects are synthesized live.

Amara (`assets/amara.glb`) is KiteRandel's character, modeled, rigged and animated in Blender, with run, leap, slide and stumble animations made for this game.

## Run locally

It's a static site with no build step: `npx serve .` and open the URL it prints.

## License

Code: MIT © KiteRandel. The Amara character and model (`assets/amara.glb`) © KiteRandel, all rights reserved.
