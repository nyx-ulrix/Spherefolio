// Spherefolio: a CSS-3D sphere of framed project tiles (Fibonacci lattice), an About panel and a terminal, all from data.json.
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const lines = s => String(s ?? '').split('\n').map(l => l.trim()).filter(Boolean);
const links = s => lines(s).map(l => { const [a, b] = l.split('|').map(x => x.trim()); return { label: b ? a : a.replace(/^\w+:(\/\/)?/, ''), url: b || a }; })
  .filter(l => /^(https?:|mailto:)/i.test(l.url));
// Media files are images (.webp) or videos (.mp4/.webm); every file has a <name>-t.webp thumbnail / poster.
const isVid = f => /\.(mp4|webm)$/i.test(f);
const src = f => esc(`uploads/${f}`);
const thumb = f => esc(`uploads/${f.replace(/\.\w+$/, '-t.webp')}`);
const media = (f, full) => isVid(f)
  ? `<video src="${src(f)}" poster="${thumb(f)}" muted loop playsinline ${full ? 'controls autoplay' : 'preload="none"'}></video>`
  : `<img src="${full ? src(f) : thumb(f)}" alt="" draggable="false">`;
const meta = p => esc([p.type, p.year].filter(Boolean).join(' · '));
// Project card: gradient card when empty; a cover image/video replaces it when set. Big title on top, details below.
const card = (p, i) => {
  const f = p.images?.[0], text = `<b>${esc(p.title)}</b>${p.tagline ? `<span>${esc(p.tagline)}</span>` : ''}<small>${meta(p)}</small>`;
  return f
    ? `<span class="media">${media(f)}</span><span class="label">${text}</span>`
    : `<span class="card">${text}</span>`;
};
const bullets = s => { const l = lines(s); return l.length > 1 ? `<ul>${l.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : l.length ? `<p>${esc(l[0])}</p>` : ''; };
const chips = s => lines(s).length ? `<div class="chips">${s.split(',').map(t => `<span>${esc(t.trim())}</span>`).join('')}</div>` : '';
const linkBtns = s => `<div class="links">${links(s).map(l => `<a class="btn" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join('')}</div>`;
const stat = (k, v) => v ? `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>` : '';
// Entries with only a title + one line (skills, languages) render as chips; jobs/education render as bullets.
const entry = it => !it.org && !it.when && lines(it.text).length === 1
  ? `<div class="entry"><b>${esc(it.title)}</b>${chips(it.text)}</div>`
  : `<div class="entry"><div class="entry-head"><b>${esc(it.title)}</b><span class="muted">${esc(it.when)}</span></div>${it.org ? `<div class="muted">${esc(it.org)}</div>` : ''}${bullets(it.text)}</div>`;

const data = await fetch('data.json', { cache: 'no-cache' }).then(r => r.json());
const { site, projects: P, resume } = data;
const S = { size: .38, fill: .8, spin: .06, minTiles: 24, ...data.sphere };
const stage = $('#stage'), sphere = $('#sphere'), caption = $('#caption');
document.title = `${site.name} · Portfolio`;
document.documentElement.style.setProperty('--accent', site.accent || '#ff0490');
document.documentElement.style.setProperty('--pink', site.accent2 || '#f9a8ce'); // secondary colour; light mode deepens it (CSS)

// The name as ASCII art (site.banner) wherever the name is shown; falls back to plain text when there's none.
function banner() { return site.banner ? `<pre class="banner" role="img" aria-label="${esc(site.name)}">${esc(site.banner)}</pre>` : ''; }

// Spinning ASCII donut (a1k0n's donut.c): a z-buffered torus shaded with .,-~:;=!*#$@
function donutFrame(A, B, W = 34, H = 17) {
  const px = Array(W * H).fill(' '), zb = Array(W * H).fill(0), cA = Math.cos(A), sA = Math.sin(A), cB = Math.cos(B), sB = Math.sin(B);
  for (let j = 0; j < 6.28; j += .07) {
    const ct = Math.cos(j), st = Math.sin(j);
    for (let i = 0; i < 6.28; i += .02) {
      const sp = Math.sin(i), cp = Math.cos(i), h = ct + 2, D = 1 / (sp * h * sA + st * cA + 5), t = sp * h * cA - st * sA;
      const x = 0 | (W / 2 + W * .68 * D * (cp * h * cB - t * sB)), y = 0 | (H / 2 + W * .34 * D * (cp * h * sB + t * cB)), o = x + W * y;
      const N = 0 | (8 * ((st * sA - sp * ct * cA) * cB - sp * ct * sA - st * cA - cp * ct * sB));
      if (y >= 0 && y < H && x >= 0 && x < W && D > zb[o]) { zb[o] = D; px[o] = '.,-~:;=!*#$@'[N > 0 ? N : 0]; }
    }
  }
  return Array.from({ length: H }, (_, r) => px.slice(r * W, r * W + W).join('')).join('\n');
}
function spinDonut(el) { // ~20 fps, only while on screen; one still frame for reduced motion
  el.textContent = donutFrame(1, 1); // draw straight away, never blank
  if (still) return;
  let last = 0, seen = true;
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; }).observe(el);
  const step = now => {
    if (!el.isConnected) return; // `clear` removed it
    if (seen && now - last > 50) { last = now; el.textContent = donutFrame(now / 900, now / 1800); }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---- About me: each section is a native <details> dropdown; Summary starts open.
const drop = (name, count, html, open) => `<details${open ? ' open' : ''}><summary>${esc(name)}${count ? `<span class="dim">${count}</span>` : ''}</summary>${html}</details>`;
$('#about-body').innerHTML = `
  ${banner() || `<h2>${esc(site.name)}</h2>`}<p class="muted">${esc(site.role)} · ${esc(site.location)}</p>
  ${linkBtns(site.links)}
  ${drop('Summary', 0, `<p>${esc(site.summary)}</p>`, true)}
  ${resume.map(r => drop(r.name, r.items.length, r.items.map(entry).join(''))).join('')}`;

// ---- Sphere: frames sit on a Fibonacci lattice facing outward; each frame only the wrapper rotates.
let tiles = [], R = 1, rx = -12, ry = 0, vx = 0, vy = 0, drag = null, moved = 0;
function build() {
  const N = P.length && Math.max(P.length, S.minTiles | 0);
  R = Math.min(stage.clientWidth, stage.clientHeight) * S.size;
  const w = R * Math.sqrt(4 * Math.PI / Math.max(N, 1)) * S.fill; // tile side that fills its share of the surface
  stage.style.perspective = `${R * 4}px`;
  sphere.style.cssText = `--w:${w}px;--h:${w * .75}px`;
  sphere.innerHTML = '';
  const photos = [...P.keys()].filter(i => P[i].images?.length), pool = photos.length ? photos : [...P.keys()];
  tiles = Array.from({ length: N }, (_, i) => {
    const phi = Math.acos(1 - 2 * (i + .5) / N), theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const x = R * Math.cos(theta) * Math.sin(phi), y = R * Math.sin(theta) * Math.sin(phi), z = R * Math.cos(phi);
    const p = i < P.length ? i : pool[(i - P.length) % pool.length], el = document.createElement('button'); // extra tiles repeat photo projects
    el.className = 'tile';
    el.dataset.p = p;
    el.innerHTML = card(P[p], p);
    el.setAttribute('aria-label', P[p].title);
    if (i >= P.length) el.tabIndex = -1; // repeated covers: one tab stop per project
    el.style.transform = `translate3d(${x}px,${y}px,${z}px) rotateY(${Math.atan2(x, z)}rad) rotateX(${Math.asin(-y / R)}rad)`;
    sphere.append(el);
    return { el, x, y, z, back: null, video: el.querySelector('video'), live: false };
  });
}

const still = matchMedia('(prefers-reduced-motion: reduce)').matches, D = Math.PI / 180;
let last = performance.now(), frames = 0, fpsAt = last;
function tick(now) {
  const dt = Math.min(now - last, 50) / 16.7;
  last = now;
  if (drag) { vx *= .7; vy *= .7; } // holding still before release shouldn't fling
  else if (target) { // ease toward the project picked in the list (shortest way round)
    vx = vy = 0;
    rx += (target[0] - rx) * Math.min(1, .12 * dt);
    ry += (((target[1] - ry) % 360 + 540) % 360 - 180) * Math.min(1, .12 * dt);
  } else { ry += (vy + (still ? 0 : S.spin)) * dt; rx += vx * dt; vx *= .95 ** dt; vy *= .95 ** dt; }
  rx = Math.max(-88, Math.min(88, rx)); // short of 90° so dragging never flips it over
  sphere.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
  const sx = Math.sin(rx * D), cx = Math.cos(rx * D), sy = Math.sin(ry * D), cy = Math.cos(ry * D);
  for (const t of tiles) {
    const z = t.y * sx + (t.z * cy - t.x * sy) * cx; // tile depth after the wrapper's rotateX·rotateY
    const k = (z / R + 1) / 2;                       // 0 = far side, 1 = facing the viewer
    t.el.style.opacity = (.1 + .9 * k * k).toFixed(2);
    if (t.back !== z < 0) t.el.style.pointerEvents = (t.back = z < 0) ? 'none' : '';
    const live = !still && z > R * .4; // only videos near the front play (and download)
    if (t.video && t.live !== live) (t.live = live) ? t.video.play().catch(() => {}) : t.video.pause();
  }
  frames++;
  if (now - fpsAt > 1000) {
    $('#status').textContent = `${Math.round(frames * 1000 / (now - fpsAt))} FPS · ${P.length} PROJECTS`;
    frames = 0; fpsAt = now;
  }
  requestAnimationFrame(tick);
}

stage.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY]; moved = 0; setMid(null); aim(null); });
addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag[0], dy = e.clientY - drag[1];
  drag = [e.clientX, e.clientY];
  moved += Math.abs(dx) + Math.abs(dy);
  if (moved > 6) stage.classList.add('dragged'); // they've found it: fade the "drag to move" hint
  ry += vy = dx * .25;
  rx += vx = -dy * .25;
});
for (const ev of ['pointerup', 'pointercancel']) addEventListener(ev, () => { drag = null; });
// The corner sphere is a preview: a click expands it to fullscreen, where clicking a card opens the project.
const isFull = () => document.body.classList.contains('full');
const hint = () => isFull() ? 'Projects · drag to spin, click a card' : 'Projects · click to expand';
const setFull = on => {
  document.body.classList.toggle('full', on);
  $('#full').textContent = on ? '✕ Close' : '⤢ Fullscreen';
  caption.textContent = hint();
};
stage.addEventListener('click', e => {
  if (e.detail && moved > 6) return; // that was a drag (e.detail 0 = keyboard click)
  const t = e.target.closest('.tile');
  if (t && (isFull() || !e.detail)) launch(+t.dataset.p);
  else if (!isFull()) setFull(true);
});
sphere.addEventListener('pointerover', e => {
  const t = e.target.closest('.tile'), p = t && P[t.dataset.p];
  if (p) { caption.textContent = `▸ ${[p.title, p.type, p.year].filter(Boolean).join(' · ')}`; rest(+t.dataset.p); }
});
sphere.addEventListener('pointerleave', () => { clearTimeout(closing); caption.textContent = hint(); });
// ---- Project list beside the sphere: hover/focus spins that project's card to the front, click opens it.
let target = null, aimed = null; // target: [rx, ry] in degrees, or null to free-spin
function aim(p) {
  aimed = p;
  const t = p == null ? null : tiles.find(t => +t.el.dataset.p === p);
  target = t && [Math.atan2(t.y, Math.hypot(t.x, t.z)) / D, Math.atan2(-t.x, t.z) / D];
  for (const x of tiles) x.el.classList.toggle('lit', x === t);
  caption.textContent = t ? `▸ ${[P[p].title, P[p].type, P[p].year].filter(Boolean).join(' · ')}` : hint();
}
const plist = $('#projects');
plist.innerHTML = P.map((p, i) => `<li>${p.images?.length // photo thumbnail when there is one; otherwise just a bigger name
  ? `<button class="pl" data-sheet="${i}"><span class="mini"><img src="${thumb(p.images[0])}" alt="" loading="lazy"></span>`
  : `<button class="pl no-img" data-sheet="${i}">`}`
  + `<span><b>${esc(p.title)}</b><small>#${String(i + 1).padStart(2, '0')}${p.type || p.year ? ` · ${meta(p)}` : ''}</small></span></button></li>`).join('');
for (const ev of ['pointerover', 'focusin']) plist.addEventListener(ev, e => {
  const b = e.target.closest('[data-sheet]');
  if (!b || performance.now() - scrolledAt < 300) return; // items sliding under a still cursor while scrolling don't count
  aim(+b.dataset.sheet);
  if (ev === 'pointerover') rest(+b.dataset.sheet, true);
});
// Leaving the list goes back to the scrolled-to entry (or free spin), unless project details are open.
plist.addEventListener('pointerleave', () => { clearTimeout(closing); if (openP == null) aim(midP()); });
plist.addEventListener('focusout', e => { if (!plist.contains(e.relatedTarget) && openP == null) aim(midP()); });

// Scroll focus: scrolling the list (or the wheel over the sphere, one entry per notch) focuses the entry in the middle:
// it's highlighted, zoomed a little, and its card spins to the front. It stays focused until the sphere is dragged.
// Only visitor-driven scrolling counts (wheel, touch, keys, scrollbar), not layout shifts while the page loads.
let scrolledAt = 0, userScrollUntil = 0, wheelAt = 0;
const userScrolling = () => { userScrollUntil = performance.now() + 800; };
for (const ev of ['wheel', 'touchmove', 'keydown', 'pointerdown']) plist.addEventListener(ev, userScrolling, { passive: true });
const midP = () => { const m = plist.querySelector('.pl.mid'); return m ? +m.dataset.sheet : null; };
function setMid(b) {
  plist.querySelectorAll('.pl.mid').forEach(x => { if (x !== b) x.classList.remove('mid'); });
  if (b && !b.classList.contains('mid')) { b.classList.add('mid'); aim(+b.dataset.sheet); }
}
plist.addEventListener('scroll', () => {
  if (performance.now() > userScrollUntil) return;
  userScrollUntil = Math.max(userScrollUntil, performance.now() + 300); // momentum scrolling keeps counting
  scrolledAt = performance.now();
  const box = plist.getBoundingClientRect(), mid = box.top + box.height / 2;
  let best = null, bestD = Infinity;
  for (const b of plist.querySelectorAll('.pl')) {
    const r = b.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - mid);
    if (d < bestD) { bestD = d; best = b; }
  }
  setMid(best);
}, { passive: true });
stage.addEventListener('wheel', e => {
  e.preventDefault();
  if (performance.now() - wheelAt < 140) return; // trackpads fire many small events: one step at a time
  wheelAt = performance.now();
  userScrolling();
  plist.scrollBy({ top: Math.sign(e.deltaY) * (plist.querySelector('li')?.offsetHeight || 60), behavior: 'smooth' });
}, { passive: false });
// Spacers above/below the list let the first and last entries reach the middle. Until the visitor scrolls, keep the
// list resting on the first entry (re-applied when the panel resizes).
new ResizeObserver(() => {
  if (!scrolledAt) plist.scrollTop = parseFloat(getComputedStyle(plist, '::before').height) || 0;
}).observe(plist);
new ResizeObserver(() => { build(); if (aimed != null) aim(aimed); }).observe(stage); // also does the first build; rebuilds keep the highlight
requestAnimationFrame(tick);

// ---- Project sheets: draggable Foundry-style windows, Esc closes the top one.
let zTop = 20;
// Popups have one fixed size (CSS) and always open dead centre; still draggable by the header afterwards.
const center = w => {
  w.style.left = `${Math.max(0, (innerWidth - w.offsetWidth) / 2)}px`;
  w.style.top = `${Math.max(0, (innerHeight - w.offsetHeight) / 2)}px`;
};
addEventListener('resize', () => document.querySelectorAll('.win').forEach(center));
function openWin(id, title, html) {
  let w = document.getElementById(id);
  if (!w) {
    w = document.createElement('section');
    w.className = 'win';
    w.id = id;
    w.setAttribute('role', 'dialog');
    w.innerHTML = '<header><b></b><button class="x" aria-label="Close">✕</button></header><div class="body"></div>';
    document.body.append(w);
    const h = $('header', w);
    h.onpointerdown = e => {
      if (e.target.closest('button')) return;
      const ox = e.clientX - w.offsetLeft, oy = e.clientY - w.offsetTop;
      h.setPointerCapture(e.pointerId);
      h.onpointermove = e => {
        w.style.left = `${Math.min(innerWidth - 60, Math.max(0, e.clientX - ox))}px`;
        w.style.top = `${Math.min(innerHeight - 40, Math.max(0, e.clientY - oy))}px`;
      };
      h.onpointerup = () => { h.onpointermove = null; };
    };
    w.addEventListener('pointerdown', () => { w.style.zIndex = ++zTop; });
  }
  w.style.zIndex = ++zTop;
  w.setAttribute('aria-label', title);
  $('header b', w).textContent = title;
  $('.body', w).innerHTML = html;
  $('.body', w).scrollTop = 0;
  center(w);
  return w;
}

// Details close when you interact outside them, click another project, or rest (350 ms) on another visible
// project — a project under the popup can't be hovered, and passing over others on the way doesn't count.
let openP = null, closing;
function closeSheet() {
  clearTimeout(closing);
  if (openP == null) return;
  $('#win-project')?.remove();
  openP = null;
  sphere.querySelectorAll('.launched').forEach(el => el.classList.remove('launched')); // the card returns to the sphere
  aim(midP());
}
// Opening a project: spin its card to the centre, then grow the popup out of that card toward the viewer (the card
// leaves the sphere while its popup is open).
let launches = 0;
async function launch(i) {
  if (still) return openProject(i);
  const token = ++launches;
  aim(i);
  const t0 = performance.now();
  await new Promise(done => {
    const wait = () => {
      const off = target ? Math.hypot(target[0] - rx, (((target[1] - ry) % 360) + 540) % 360 - 180) : 0;
      off < 1.5 || performance.now() - t0 > 900 ? done() : requestAnimationFrame(wait);
    };
    requestAnimationFrame(wait);
  });
  if (token !== launches) return; // another project was clicked meanwhile
  const card = tiles.find(t => +t.el.dataset.p === i)?.el, from = card?.getBoundingClientRect();
  openProject(i);
  const w = $('#win-project'), to = w.getBoundingClientRect();
  if (!from?.width) return;
  card.classList.add('launched');
  w.animate([
    { transform: `translate(${from.left + from.width / 2 - (to.left + to.width / 2)}px, ${from.top + from.height / 2 - (to.top + to.height / 2)}px) scale(${from.width / to.width}, ${from.height / to.height})`, opacity: .5 },
    { transform: 'none', opacity: 1 },
  ], { duration: 480, easing: 'cubic-bezier(.2, .9, .25, 1)' });
}
function rest(p, fromList) {
  clearTimeout(closing);
  if (openP != null && p !== openP) closing = setTimeout(() => { closeSheet(); if (fromList) aim(p); }, 350);
}
function openProject(i) {
  openP = i;
  if (!target) target = [rx, ry]; // hold the sphere still so cards don't drift under the cursor
  const p = P[i], im = p.images || [];
  const head = `<div><h2>${esc(p.title)}</h2><p class="muted">${esc(p.tagline)}</p>
    <dl class="stats">${stat('Year', p.year)}${stat('Type', p.type)}${stat('Slot', `#${String(i + 1).padStart(2, '0')}`)}</dl></div>`;
  // Media on top: all visible at once and large (~half the screen), no scrolling; click any item to open it full size
  // in the viewer (‹ › to flip). one = single item; pair = side by side; feat = cover large left, the rest stacked beside it.
  const n = im.length, big = j => n <= 2 || j === 0; // full-res where the tile is large; 480px thumbs for the stacked ones
  const tile = (f, j) => `<button class="mthumb" data-v="${j}" aria-label="View ${isVid(f) ? 'video' : 'image'} ${j + 1}">`
    + `<img src="${big(j) && !isVid(f) ? src(f) : thumb(f)}" alt="">${isVid(f) ? '<i class="badge">▶</i>' : ''}</button>`;
  const grid = n === 1 ? '<div class="mgrid one">' : n === 2 ? '<div class="mgrid pair">'
    : `<div class="mgrid feat" style="--cols:${Math.ceil((n - 1) / 2)}">`;
  openWin('win-project', p.title, `
    ${n ? `${grid}${im.map(tile).join('')}</div>${head}` : `<div class="sheet-top"><div class="portrait">${card(p, i)}</div>${head}</div>`}
    ${chips(p.tools)}${bullets(p.text)}${linkBtns(p.links)}
    <div class="viewer" hidden><button class="vx btn" aria-label="Back to project">✕</button><button class="vnav" data-step="-1" aria-label="Previous">‹</button><div class="vmedia"></div><button class="vnav" data-step="1" aria-label="Next">›</button></div>`);
}
function view(j) {
  const im = P[openP].images, v = $('#win-project .viewer');
  j = (j + im.length) % im.length;
  v.dataset.i = j;
  v.hidden = false;
  $('.vmedia', v).innerHTML = media(im[j], true);
  v.querySelectorAll('.vnav').forEach(b => { b.hidden = im.length < 2; });
}
function closeViewer() { // true if a viewer was open (so Esc steps back one level at a time)
  const v = $('#win-project .viewer');
  if (!v || v.hidden) return false;
  v.hidden = true;
  $('.vmedia', v).innerHTML = '';
  return true;
}

// ---- Terminal
const tbody = $('#term .body'), out = $('#term-out'), tin = $('#term-in');
const print = (html, cls = '') => { out.insertAdjacentHTML('beforeend', `<div class="${cls}">${html || ' '}</div>`); tbody.scrollTop = tbody.scrollHeight; };
const cmd = c => `<a data-cmd="${esc(c)}">${esc(c)}</a>`;
const pad = (text, n, html = esc(text)) => html + ' '.repeat(Math.max(1, n - String(text).length));
const ext = l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">[${esc(l.label)}]</a>`;
const key = name => name.toLowerCase().match(/[a-z0-9]+/)?.[0] ?? '';
// Every tool/skill across projects → project indexes, most-used first.
const stacks = [...P.reduce((m, p, i) => {
  for (const t of lines(p.tools.replaceAll(',', '\n'))) m.set(t, [...(m.get(t) || []), i]);
  return m;
}, new Map())].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
// Each row starts with the project's cover thumbnail (or a blank of the same width, so the columns stay aligned).
const tthumb = i => P[i].images?.length ? `<img class="tthumb" src="${thumb(P[i].images[0])}" alt="" loading="lazy" data-open="${i}">` : '<span class="tthumb"></span>';
function table(ids, note) {
  const tw = Math.max(8, ...P.map(p => p.title.length)) + 2, yw = Math.max(5, ...P.map(p => String(p.type).length)) + 2;
  print(`<span class="tthumb blank"></span><span class="dim">#   ${pad('PROJECT', tw)}${pad('TYPE', yw)}YEAR</span>\n`
    + ids.map(i => `<span class="trow"${P[i].images?.length ? ` data-img="${thumb(P[i].images[0])}"` : ''}>${tthumb(i)}${String(i + 1).padStart(2, '0')}  ${pad(P[i].title, tw, `<a data-open="${i}">${esc(P[i].title)}</a>`)}${pad(P[i].type, yw)}${esc(P[i].year)}</span>`).join('\n')
    + `\n<span class="dim">  ${note} · </span>${cmd('open')}<span class="dim"> &lt;n&gt; for details, or click a card on the sphere</span>`, 'pre');
}
const cmds = {
  help: () => print([['ls [filter]', 'list projects'], ['stack [skill]', 'projects by skill / tool'], ['open <n|name>', 'show one project'], ['whoami', 'summary + contact'],
    ...resume.map(r => [key(r.name), r.name]), ['clear', 'clear the screen']]
    .map(([c, d]) => '  ' + pad(c, 18, `<a data-cmd="${c.split(' ')[0]}">${esc(c)}</a>`) + `<span class="dim">${esc(d)}</span>`).join('\n'), 'pre'),
  ls: (q = '') => {
    const ids = P.map((_, i) => i).filter(i => `${P[i].title} ${P[i].type} ${P[i].tools} ${P[i].year}`.toLowerCase().includes(q.toLowerCase()));
    table(ids, `${ids.length}/${P.length} shown`);
  },
  stack: (q = '') => {
    if (!q) return print(`<span class="dim">skills used across projects (click one):</span>\n` + stacks.map(([t, ids]) => `${cmd(`stack ${t}`)}<span class="dim">×${ids.length}</span>`).join('   '));
    const s = q.toLowerCase(), hit = stacks.find(([t]) => t.toLowerCase() === s) || stacks.find(([t]) => t.toLowerCase().includes(s));
    if (!hit) return print(`no project uses "${esc(q)}" · see ${cmd('stack')}`);
    table(hit[1], `${hit[1].length} project${hit[1].length > 1 ? 's' : ''} using ${esc(hit[0])}`);
  },
  open: (q = '') => {
    const i = /^\d+$/.test(q) ? q - 1 : q ? P.findIndex(p => p.title.toLowerCase().includes(q.toLowerCase())) : -1, p = P[i];
    if (!p) return print(`usage: open &lt;number|name&gt; · see ${cmd('ls')}`);
    const im = p.images || [];
    print(`<b class="hl">── ${esc(p.title)} ${'─'.repeat(Math.max(3, 44 - p.title.length))}</b>
${esc(p.tagline)}
<span class="dim">year</span> ${esc(p.year)}   <span class="dim">type</span> ${esc(p.type)}
<span class="dim">tools</span> ${esc(p.tools)}
${lines(p.text).map(l => ` • ${esc(l)}`).join('\n')}
${links(p.links).map(ext).join(' ')}${im.length ? '\n' + im.map(f => `<img src="${thumb(f)}" alt="">`).join('') : ''}`);
  },
  whoami: () => print(`${banner() || `<b class="hl">${esc(site.name)}</b>\n`}${esc(site.role)} · ${esc(site.location)}\n\n${esc(site.summary)}\n\n${links(site.links).map(ext).join(' ')}`),
  clear: () => { out.innerHTML = ''; },
};
for (const r of resume) cmds[key(r.name)] = () => print(`<b class="hl">── ${esc(r.name)} ──</b>` + r.items.map(it =>
  `\n\n<b>${esc(it.title)}</b>${it.org ? ` · ${esc(it.org)}` : ''}${it.when ? `  <span class="dim">${esc(it.when)}</span>` : ''}\n${lines(it.text).map(l => ` • ${esc(l)}`).join('\n')}`).join(''));
Object.assign(cmds, { projects: cmds.ls, about: cmds.whoami, cls: cmds.clear });

// Suggestions under the prompt: shown on focus/click/typing, filtered by what's typed, click (or Tab) to use.
const sug = $('#suggest');
function suggest() {
  const q = tin.value.trim().toLowerCase();
  const groups = [
    ['Try', [['ls', 'all projects'], ['stack', 'by skill'], ['whoami', 'about me'], ...resume.map(r => [key(r.name), r.name]), ['help', 'every command']], 8],
    ['Open', P.map((p, i) => [`open ${i + 1}`, p.title]), 5],
    ['By skill', stacks.map(([t, ids]) => [`stack ${t}`, `×${ids.length}`]), 8],
  ].map(([name, items, n]) => [name, items.filter(([c, l]) => !q || `${c} ${l}`.toLowerCase().includes(q)).slice(0, q ? 6 : n)])
    .filter(([, items]) => items.length);
  sug.innerHTML = groups.map(([name, items]) => `<div class="sg-row"><span class="dim">${name}</span>${items.map(([c, l]) =>
    `<button class="sg" data-cmd="${esc(c)}"><b>${esc(c)}</b> ${esc(l)}</button>`).join('')}</div>`).join('');
  sug.hidden = !groups.length;
  tbody.scrollTop = tbody.scrollHeight;
}
tin.addEventListener('focus', suggest);
tin.addEventListener('click', suggest);
tin.addEventListener('input', suggest);
tin.addEventListener('blur', () => { sug.hidden = true; });
sug.onmousedown = e => e.preventDefault(); // keep focus in the input so clicking a suggestion doesn't blur it away first

const hist = [];
let hp = 0;
function run(line) {
  sug.hidden = true;
  print(`<span class="hl">visitor@sphere</span>:~$ ${esc(line)}`);
  line = line.trim();
  if (!line) return;
  hist.push(line);
  hp = hist.length;
  const [c, ...a] = line.split(/\s+/), name = c.toLowerCase();
  Object.hasOwn(cmds, name) ? cmds[name](a.join(' ')) : print(`command not found: ${esc(c)} · type ${cmd('help')}`);
}
// Boot splash: the ASCII name with a spinning donut beside it (or the plain name), then the hints.
[`<span class="dim">SPHEREFOLIO OS v1.0.3 · link established · latency 1ms · ${P.length} projects · ${resume.length} dossiers</span>`,
  site.banner ? ['splash', `${banner()}<pre class="donut" aria-hidden="true"></pre>`] : `<b class="hl">${esc(site.name)}</b>`,
  esc(site.role),
  `type ${cmd('help')} or try ${cmd('ls')} ${cmd('stack')} ${cmd('whoami')} ${resume.slice(0, 2).map(r => cmd(key(r.name))).join(' ')} · click the prompt for suggestions`, '',
].forEach((l, i) => setTimeout(() => {
  if (!Array.isArray(l)) return print(l);
  print(l[1], l[0]);
  spinDonut(out.lastElementChild.querySelector('.donut'));
}, i * 110));
$('#term-form').onsubmit = e => { e.preventDefault(); run(tin.value); tin.value = ''; };
tin.onkeydown = e => {
  const first = !sug.hidden && sug.querySelector('[data-cmd]');
  if (e.key === 'Tab' && first) { e.preventDefault(); tin.value = first.dataset.cmd; return suggest(); }
  if (e.key === 'Escape') sug.hidden = true;
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
  e.preventDefault();
  hp = Math.max(0, Math.min(hist.length, hp + (e.key === 'ArrowUp' ? -1 : 1)));
  tin.value = hist[hp] ?? '';
};
tbody.onclick = e => { if (!getSelection().toString() && !e.target.closest('a')) tin.focus(); };

// Clicked commands (links, suggestions, project names) type themselves into the prompt first, so visitors learn them.
let typing = false;
async function typeRun(line) {
  if (typing) return;
  typing = true;
  for (let k = 1; k <= line.length; k++) { tin.value = line.slice(0, k); await new Promise(r => setTimeout(r, 22)); }
  await new Promise(r => setTimeout(r, 160));
  tin.value = '';
  typing = false;
  run(line);
}

// Hovering a project row in ls/stack pops a large preview of its cover beside the row (fixed, so nothing gets clipped).
const tprev = Object.assign(document.createElement('img'), { className: 'tprev', alt: '', hidden: true });
document.body.append(tprev);
out.addEventListener('pointerover', e => {
  const row = e.target.closest('.trow[data-img]');
  if (!row) { tprev.hidden = true; return; }
  const r = row.getBoundingClientRect(), box = tbody.getBoundingClientRect();
  tprev.src = row.dataset.img;
  tprev.style.left = `${Math.max(box.left + 8, Math.min(r.right + 16, box.right - 256))}px`;
  tprev.style.top = `${Math.max(box.top + 8, Math.min(r.top + r.height / 2 - 90, box.bottom - 188))}px`;
  tprev.hidden = false;
});
out.addEventListener('pointerleave', () => { tprev.hidden = true; });
tbody.addEventListener('scroll', () => { tprev.hidden = true; });

// ---- Global input
document.addEventListener('click', e => {
  if (e.target.matches('.viewer, .vmedia')) return closeViewer(); // click the backdrop around full-size media
  const t = e.target.closest('[data-open],[data-sheet],[data-cmd],[data-v],[data-step],#full,#theme,.vx,.x');
  if (!t) return;
  const d = t.dataset;
  if (t.id === 'full') setFull(!isFull());
  else if (t.id === 'theme') setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
  else if (d.sheet) launch(+d.sheet);
  else if (d.open) typeRun(`open ${+d.open + 1}`);
  else if (d.cmd) typeRun(d.cmd);
  else if (d.v) view(+d.v);
  else if (d.step) view(+$('#win-project .viewer').dataset.i + +d.step);
  else if (t.matches('.vx')) closeViewer();
  else closeSheet();
});

// Light / dark: follows the system until the visitor picks one (index.html sets it before first paint).
function setTheme(t, save = true) {
  document.documentElement.dataset.theme = t;
  if (save) try { localStorage.theme = t; } catch {}
  $('#theme').textContent = t === 'light' ? '☾ Dark' : '☀ Light';
}
setTheme(document.documentElement.dataset.theme || 'dark', false);
matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => { // system flips (e.g. at sunset)
  let saved; try { saved = localStorage.theme; } catch {}
  if (!saved) setTheme(e.matches ? 'light' : 'dark', false);
});

// Project details never block the view: interacting (click, tap, drag, focus) anywhere outside them closes them.
// Capture phase, so the list/sphere handlers that run next can re-aim the sphere.
for (const ev of ['pointerdown', 'focusin'])
  document.addEventListener(ev, e => { if (!e.target.closest?.('.win')) closeSheet(); }, true);

addEventListener('keydown', e => {
  if (e.key === 'Escape') return closeViewer() || (openP != null ? closeSheet() : setFull(false)); // viewer, then details, then fullscreen
  const v = $('#win-project .viewer');
  if (v && !v.hidden && /^Arrow(Left|Right)$/.test(e.key)) return view(+v.dataset.i + (e.key === 'ArrowRight' ? 1 : -1));
  // Typing anywhere goes to the terminal (unless the sphere is covering it).
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !isFull() && !e.target.closest('input, textarea, button, a')) tin.focus();
});
