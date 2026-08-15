# UFO Invaders — Arcade Space Shooter

A high-energy 80s retro vertical space shooter arcade game built with HTML5 Canvas, Web Audio API, and Node.js Datasheet persistence.

## Features
- **Visuals Matching Reference Screenshot**: Classic blue dome alien UFO saucers, purple hulls, cyan lights, glowing plasma lasers, orange thruster flame trails, yellow spark starburst explosions, and CRT scanline styling.
- **HUD Interface**: Coin score counter top-left (`9876543210`), spaceship life icons top-right (`A A`), wave counter.
- **Top 10 All-Time Datasheet (`datasheet.json`)**:
  - Automatically records top 10 player scores and 3-letter arcade initials.
  - Saved directly to `datasheet.json` via backend server or synchronized with `localStorage`.
- **Audio Synthesizer**: Web Audio API retro arcade laser blasts, hit crunches, explosions, coin pickups, powerups, game over sounds.
- **Powerups**: Dual Plasma Lasers, Triple Spread Shot, Plasma Cannon, Shield, Extra Life, Coin Drops.

## How to Run

### Method 1: Node.js Server (Recommended for File Writing)
To run with full file-writing support for `datasheet.json`:
```bash
node server.js
```
Then open your browser to `http://localhost:3000`.

### Method 2: Direct HTML Launch
You can also open `index.html` directly in any web browser! High scores will persist seamlessly in `localStorage` if running without Node.

## Controls
- **Movement**: `W` `A` `S` `D` or `Arrow Keys` (or Mouse / Touch)
- **Shoot**: `Spacebar` or `Left Mouse Button`
- **Initials Entry**: `W`/`S` or `Up`/`Down` arrows to choose letter, `A`/`D` or `Left`/`Right` to switch box, `Enter` to confirm.
