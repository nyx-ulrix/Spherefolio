# Spherefolio

My portfolio as one screen: a draggable 3D sphere of project cards (top left, click for fullscreen), a terminal with suggestions below it, and About me down the right. The UI is styled after Foundry VTT, in dark or light mode (follows the system; toggle under About me). It's a static site on GitHub Pages (free), and a small local dashboard edits it.

**Live:** https://liewjiaen.com

## Editing (on this PC)

Double-click **`Spherefolio.cmd`** (or run `node server.js`). The GM dashboard opens at http://127.0.0.1:7420/admin/.

- **Projects** (up to 50): add, reorder, edit, and drop images or short videos (MP4/WebM, up to 50 MB). The first one replaces the card on the sphere. Images are resized and converted to WebP in the browser.
- **Site & UI**: name, headline, summary, contact links, accent + secondary colour, sphere size, tile fill, and spin.
- **Resume & jobs**: sections and entries. Each section shows in About me and becomes a terminal command.
- **Publish**: commits `docs/` and pushes. GitHub Pages redeploys in about a minute.

Everything saves to `docs/data.json` and `docs/uploads/`. Only `docs/` is served; the dashboard and `server.js` never run online.

Needs Node 18+ and git signed in to GitHub. No npm install.

## How the sphere works

Tiles sit on a Fibonacci lattice (`phi = acos(1 - 2(i+.5)/N)`, `theta = π(1+√5)i`), and each tile is rotated to face outward with `atan2`/`asin`. Each frame rotates only the wrapper (`preserve-3d` inside a `perspective` stage). Tiles fade with depth, and back-facing tiles ignore clicks.
