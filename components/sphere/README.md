# Sphere view (archived, not deployed)

The original landing view: project cards on a draggable CSS-3D sphere (Fibonacci lattice), with the project list,
About drawer, Developer mode and the terminal. It was replaced by the Spiral view as the landing page.

Only `docs/` is published to GitHub Pages, so nothing in `components/` goes live. These three files are a complete
snapshot of the site at the time (they read the same `docs/data.json` and `docs/uploads/`).

To bring the sphere back, copy them over the live ones:

```bash
cp components/sphere/{app.js,style.css,index.html} docs/
```
