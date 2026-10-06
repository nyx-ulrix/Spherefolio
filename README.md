# Portfolio

My portfolio as one screen: project cards on a 3D spiral that turns as you scroll, with the project names listed big in the corner, plus a Developer mode with a terminal and About me. Dark or light mode follows the system (toggle under About me). It's a static site on GitHub Pages (free), and a small local dashboard edits it.

**Live:** https://liewjiaen.com

## How the spiral works

Cards sit on a helix: card i is turned `i × 40°` around the vertical axis, pushed out to the radius and dropped a little, so nine cards make a turn and turns never overlap. Each frame only the wrapper turns and rises (`preserve-3d` inside a `perspective` stage), easing toward the card you scrolled to. Cards dim with depth, and ones facing away ignore clicks.
