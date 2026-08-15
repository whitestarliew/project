# SPEC.md — Arena Shooter

Build a top-down wave-based arena shooter. Read this whole file before writing code.

---

## 1. Hard constraints (do not violate)

- **Stack:** vanilla JavaScript + HTML5 Canvas 2D. Nothing else.
- **No frameworks.** No React, no Phaser, no Three.js, no jQuery.
- **No npm, no package.json, no build step, no bundler.**
- **No external assets.** No `.png`, `.jpg`, `.mp3`, `.wav`, `.ttf`, no CDN links, no fonts. Every visual is drawn with canvas primitives. Every sound is synthesized with the Web Audio API.
- **Single file.** All HTML, CSS and JS live in `index.html`. Do not split into modules.
- **Must run from `file://`.** Opening `index.html` directly in a browser must work with zero server. This means no ES modules, no `fetch()` of local files.
- Target: works in Firefox and Chromium on Linux.

---

## 2. Files to produce

```
index.html    the entire game
run.sh        launcher (see section 9)
README.md     controls, how to run, how to tune
```

Nothing else. Do not create a `src/`, `assets/`, or `dist/` folder.

---

## 3. Visual style

Procedural shapes and color. No sprites, ever.

- Dark background (near-black, `#0a0a12`).
- Everything is a polygon or circle drawn with `stroke()` and sometimes a translucent `fill()`.
- Neon look: bright saturated strokes with `shadowBlur` glow.
- Colors defined in **HSL**, so hue is a single number per entity type. Never hardcode hex per entity.
- Line width 2, `lineJoin = 'round'`.
- Arena is a bounded rectangle with a visible border. The player cannot leave it.

---

## 4. Player

- Drawn as a triangle pointing toward the mouse cursor.
- **Movement:** WASD and arrow keys, 8-directional, with acceleration and friction (not instant stop). Movement is independent of aim.
- **Aim:** always faces the mouse pointer.
- **Fire:** hold left mouse button. Fires at `fireRate` interval.
- Has HP, shown as a bar. Contact with an enemy deals damage and grants ~0.7s of invulnerability with a flashing effect.
- Starts each run with base stats from CONFIG.

---

## 5. Enemies

Five types. Each has its own hue, shape, HP, speed, and behavior. Spawn from outside the arena edge and walk in.

| Type | Shape | Behavior |
|---|---|---|
| Chaser | Circle | Moves straight at the player. Cheap, spawns in numbers. |
| Darter | Small triangle | Very fast, low HP, moves in short bursts with pauses. |
| Tank | Hexagon | Slow, high HP, large. Knockback-resistant. |
| Turret | Square | Keeps distance, stops at range and fires slow projectiles at the player. |
| Splitter | Pentagon | On death, spawns 2 smaller Splitters (only splits once). |

All enemies rotate slowly while moving. Enemy projectiles are distinct in color from player bullets.

---

## 6. Wave system

- Wave N spawns a budget of enemies. Budget grows each wave. Enemy types unlock progressively: Chaser from wave 1, Darter from 2, Turret from 4, Tank from 5, Splitter from 7.
- Enemy HP and speed scale mildly with wave number.
- Every 5th wave is a **boss**: a single large enemy with high HP, a unique shape (many-sided polygon), and a radial burst attack.
- When all enemies of a wave are dead, the wave ends and the upgrade screen opens.
- Show a brief "WAVE N" title card at the start of each wave.

---

## 7. Upgrade system

After each cleared wave, present **3 randomly chosen upgrades** as cards. Player clicks one, then the next wave begins.

Upgrade pool (each stackable, show current level on the card):

- Fire Rate — shoot faster
- Damage — bullets hit harder
- Move Speed
- Max HP (also heals that amount)
- Multishot — +1 bullet in a spread
- Pierce — bullets pass through one extra enemy
- Bullet Speed
- Homing — bullets curve slightly toward enemies
- Regen — slowly recover HP
- Knockback — push enemies back on hit

Never offer the same upgrade twice in one choice. Some upgrades should have a max level.

---

## 8. Feel and polish (do not skip this section)

These matter more than features:

- **Particles:** when an enemy dies, break its polygon into line fragments that fly outward, spin, and fade.
- **Screen shake:** small on player shot, medium on enemy death, large on player damage and boss death.
- **Hit flash:** enemies flash white for ~60ms when damaged.
- **Bullet trails:** short fading trail behind each bullet.
- **Hitstop:** freeze the game for ~40ms on boss hits.
- **Sound (Web Audio only, all synthesized):**
  - shoot — short square-wave blip, slight random pitch
  - enemy hit — click
  - enemy death — filtered noise burst
  - player hurt — low descending tone
  - upgrade pick — rising two-note chime
  - Include a mute toggle (M key).

---

## 9. run.sh

```sh
#!/bin/sh
xdg-open "$(dirname "$0")/index.html"
```

Make it executable. In README.md, tell the user to run `chmod +x run.sh` once, and note that in GNOME Files they must enable Preferences → Behavior → Executable Text Files → "Run them" for double-click to work.

---

## 10. CONFIG object

Put a single `CONFIG` object at the very top of the script, above everything else. Every tunable number in the entire game lives there and nowhere else — no magic numbers buried in functions.

Must include at minimum: arena size, player speed/accel/friction/HP/invuln time, base fire rate, bullet speed/damage/lifetime, per-enemy-type stats (hp, speed, size, hue, score), wave scaling factors, upgrade step values, particle counts, shake magnitudes, audio volume.

---

## 11. HUD and states

- **HUD:** score, wave number, HP bar, list of acquired upgrades.
- **States:** title screen → playing → upgrade screen → game over → back to title.
- Game over shows final score, wave reached, and best score kept in memory for the session.
- **P** pauses.

---

## 12. Code organization

Single file, but ordered with comment-banner sections:

```
CONFIG
UTILITIES        (rng, math helpers, color)
AUDIO            (Web Audio synth)
INPUT            (keyboard, mouse)
ENTITIES         (player, enemy, bullet, particle)
WAVES            (spawning, scaling)
UPGRADES         (pool, selection, application)
UPDATE           (per-frame logic)
DRAW             (rendering)
STATES           (title, play, upgrade, gameover)
LOOP             (requestAnimationFrame, fixed timestep)
```

Use a **fixed timestep** for the update loop so game speed does not vary with monitor refresh rate. Render can interpolate or not.

---

## 13. Build order

Build in this order and make sure each step actually runs before moving on:

1. Canvas, game loop, arena border, player that moves.
2. Aiming and shooting.
3. One enemy type (Chaser) with collision and death.
4. Wave system and the wave-clear condition.
5. Upgrade screen with 3 working upgrades.
6. Remaining enemy types.
7. Bosses.
8. Full upgrade pool.
9. Particles, screen shake, hit flash, hitstop.
10. Audio.
11. Title screen, game over, pause, HUD.
12. `run.sh` and `README.md`.

Do not attempt all of this in one pass. After each step, stop and confirm it runs.
