# Spherefolio

My portfolio as a draggable 3D sphere of project tiles, with a terminal view for people who'd rather type. The UI is styled after Foundry VTT. It's a static site on GitHub Pages (free), and a small local dashboard edits it.

**Live:** https://nyx-ulrix.github.io/Spherefolio/

## Editing (on this PC)

Double-click **`Spherefolio.cmd`** (or run `node server.js`). The GM dashboard opens at http://127.0.0.1:4000/admin/.

- **Projects** (up to 50): add, reorder, edit, and drop images. The first image is the cover. Images are resized and converted to WebP in the browser.
- **Site & UI**: name, headline, summary, contact links, accent colour, sphere size, tile fill, and spin.
- **Resume & jobs**: sections and entries. Each section becomes a profile tab and a terminal command.
- **Publish**: commits `docs/` and pushes. GitHub Pages redeploys in about a minute.

Everything saves to `docs/data.json` and `docs/uploads/`. Only `docs/` is served; the dashboard and `server.js` never run online.

Needs Node 18+ and git signed in to GitHub. No npm install.

## How the sphere works

Tiles sit on a Fibonacci lattice (`phi = acos(1 - 2(i+.5)/N)`, `theta = π(1+√5)i`), and each tile is rotated to face outward with `atan2`/`asin`. Each frame rotates only the wrapper (`preserve-3d` inside a `perspective` stage). Tiles fade with depth, and back-facing tiles ignore clicks.
