# Spherefolio

My portfolio as one screen: a draggable 3D sphere of project cards (top left, click for fullscreen), a terminal with suggestions below it, and About me down the right. The UI is styled after Foundry VTT, in dark or light mode (follows the system; toggle under About me). It's a static site on GitHub Pages (free), and a small local dashboard edits it.

**Live:** https://liewjiaen.com

## How the sphere works

Tiles sit on a Fibonacci lattice (`phi = acos(1 - 2(i+.5)/N)`, `theta = π(1+√5)i`), and each tile is rotated to face outward with `atan2`/`asin`. Each frame rotates only the wrapper (`preserve-3d` inside a `perspective` stage). Tiles fade with depth, and back-facing tiles ignore clicks.
