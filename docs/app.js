// Portfolio: a Spiral view of project cards (a CSS-3D helix), an About panel and a terminal, all from data.json.
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
const bullets = s => { const l = lines(s); return l.length > 1 ? `<ul>${l.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : l.length ? `<p>${esc(l[0])}</p>` : ''; };
const chips = s => lines(s).length ? `<div class="chips">${s.split(',').map(t => `<span>${esc(t.trim())}</span>`).join('')}</div>` : '';
const linkBtns = s => `<div class="links">${links(s).map(l => `<a class="btn" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join('')}</div>`;
// Optional narrative write-up per project: paragraphs separated by a blank line.
const writeup = p => p.writeup?.trim() ? `<h3>Write-up</h3>${p.writeup.trim().split(/\n\s*\n/).map(x => `<p>${esc(x.trim())}</p>`).join('')}` : '';
// Entries with only a title + one line (skills, languages) render as chips; jobs/education render as bullets.
const entry = it => !it.org && !it.when && lines(it.text).length === 1
  ? `<div class="entry"><b>${esc(it.title)}</b>${chips(it.text)}</div>`
  : `<div class="entry"><div class="entry-head"><b>${esc(it.title)}</b><span class="muted">${esc(it.when)}</span></div>${it.org ? `<div class="muted">${esc(it.org)}</div>` : ''}${bullets(it.text)}</div>`;

const data = await fetch('data.json', { cache: 'no-cache' }).then(r => r.json());
const { site, projects: P, resume } = data;
const stage = $('#stage'), spiral = $('#spiral');
document.title = `${site.name} · Portfolio`;
document.documentElement.style.setProperty('--accent', site.accent || '#ff0490');
document.documentElement.style.setProperty('--pink', site.accent2 || '#f9a8ce'); // secondary colour; light mode deepens it (CSS)

// The name as ASCII art (site.banner) wherever the name is shown; falls back to plain text when there's none.
function banner() { return site.banner ? `<pre class="banner" role="img" aria-label="${esc(site.name)}">${esc(site.banner)}</pre>` : ''; }

// ---- About me: each section is a native <details> dropdown; Summary starts open.
const drop = (name, count, html, open) => `<details${open ? ' open' : ''}><summary>${esc(name)}${count ? `<span class="dim">${count}</span>` : ''}</summary>${html}</details>`;
$('#about-body').innerHTML = `
  ${banner()}<h2 class="about-name">${esc(site.name)}</h2><p class="muted">${esc(site.location)}</p>
  ${linkBtns(site.links)}
  ${drop('Summary', 0, `<p>${esc(site.summary)}</p>`, true)}
  ${resume.map(r => drop(r.name, r.items.length, r.items.map(entry).join(''))).join('')}`;

// ---- Spiral view: project cards on a helix ribbon that winds past the viewer. Scrolling turns it (wheel, swipe, arrow
// keys, or tabbing through the cards) and it settles with one card in front: the focused project.
const STEP = 40; // degrees between neighbouring cards: 9 per turn
const still = matchMedia('(prefers-reduced-motion: reduce)').matches, D = Math.PI / 180;
// On launch it starts six cards back (wound away and below) and turns into place, slower than a normal step.
let cards = [], RISE = 1, pos = still ? 0 : -6, goal = 0, drawn = null, dir = 1, settle;
let arrowMax = 96; // longest the scroll arrow gets (at the first project)
const titleBox = $('#titles'), titleList = $('#titles ol'), countNow = $('#count-now'), arrow = $('#arrow'), w1 = $('#w1'), w2 = $('#w2');
const [first, ...more] = site.name.toUpperCase().split(/\s+/); // the name, huge and grey behind the spiral
w1.textContent = first;
w2.textContent = more.join(' ');
$('#pitch p').textContent = site.role; // the dashboard's "Headline": the one-line pitch above the name
$('#count-all').textContent = P.length;
const clampGoal = g => Math.max(0, Math.min(P.length - 1, g));
function build() { // cards are placed once; each frame only moves the wrapper
  const w = stage.clientWidth, h = stage.clientHeight;
  const H = Math.min(h * .3, w * .34), R = Math.max(H * 1.9, Math.min(w * .32, h * .6));
  RISE = H * 1.3 / (360 / STEP); // a full turn drops a little more than a card's height, so turns never overlap
  arrowMax = Math.round(Math.min(96, Math.max(56, h * .11)));
  stage.style.perspective = `${R * 3.4}px`;
  spiral.style.cssText = `--w:${2 * Math.PI * R / (360 / STEP) * .985}px;--h:${H}px`; // card width = arc per step: one ribbon
  spiral.innerHTML = '';
  cards = P.map((p, i) => {
    const el = document.createElement('button');
    el.className = 'tile';
    el.dataset.p = i;
    el.innerHTML = p.images?.length ? media(p.images[0]) : `<span class="ph"><b>${esc(p.title)}</b><small>${meta(p)}</small></span>`;
    el.setAttribute('aria-label', p.title);
    el.style.transform = `rotateY(${i * STEP}deg) translateZ(${R}px) translateY(${i * RISE}px)`;
    spiral.append(el);
    return { el, video: el.querySelector('video'), live: false, back: null };
  });
  measureTitles();
}
function draw() {
  drawn = pos;
  spiral.style.transform = `rotateX(-8deg) rotateZ(-5deg) translateY(${-pos * RISE}px) rotateY(${-pos * STEP}deg)`;
  cards.forEach((c, i) => {
    const d = i - pos, facing = Math.cos(d * STEP * D), fade = Math.min(1, Math.max(0, (Math.abs(d) - 4.5) / 4));
    c.el.style.opacity = ((1 - fade) * (.22 + .78 * Math.sqrt(Math.max(0, facing)))).toFixed(3); // dimmer with depth
    const back = facing < .05 || fade >= 1; // side-on, behind, or faded out: not clickable
    if (c.back !== back) c.el.style.pointerEvents = (c.back = back) ? 'none' : '';
    const live = !still && Math.abs(d) < .6; // only the front card's video plays (and downloads)
    if (c.video && c.live !== live) (c.live = live) ? c.video.play().catch(() => {}) : c.video.pause();
  });
  const t = Math.max(0, pos) / Math.max(1, P.length - 1);
  w1.style.transform = `translateX(${-t * 14}vw)`; // the name drifts apart as you scroll through
  w2.style.transform = `translateX(${t * 14}vw)`;
  const n = String(Math.max(0, Math.round(pos)) + 1); // the counter under the arrow
  if (countNow.textContent !== n) countNow.textContent = n;
  // The arrow shortens as you near the last project: how much further there is to go. The head stays the same size;
  // over the last stretch the line also pulls out of the head, so at the end only the head is left.
  const s = (arrowMax - 13) * (1 - t), L = Math.round(13 + s), end = L - 1 - 11.5 * (1 - Math.min(1, s / 40));
  const d = `${end > .5 ? `M12 0V${end.toFixed(1)}` : ''}M1.5 ${L - 12.5} 12 ${L - 1} 22.5 ${L - 12.5}`;
  if (arrow.firstChild.getAttribute('d') !== d) {
    arrow.setAttribute('height', L);
    arrow.setAttribute('viewBox', `0 0 24 ${L}`);
    arrow.firstChild.setAttribute('d', d);
  }
  placeTitles();
}
// Project names, A24-style: the one in front large in the middle, the ones before and after it above and below,
// smaller and darker, all sliding and fading with the spiral as it turns. Click a name to open it.
titleList.innerHTML = P.map((p, i) => `<li><button data-sheet="${i}">${esc(p.title)}${p.year ? `<sup>${esc(p.year)}</sup>` : ''}</button></li>`).join('');
const titleItems = [...titleList.children];
let gap = 0, fits = [];
function measureTitles() { // row spacing, and how far each long name shrinks to fit the width (on resize / font load)
  const lh = titleItems[0]?.offsetHeight || 0;
  gap = lh * .8;
  titleBox.style.height = `${lh * 2.3}px`;
  fits = titleItems.map(li => Math.min(1, titleBox.clientWidth / li.firstChild.offsetWidth));
  drawn = null; // re-place everything on the next frame
}
function placeTitles() {
  titleItems.forEach((li, j) => {
    const r = j - pos, a = Math.abs(r), show = a < 2; // r: rows from the middle
    li.style.visibility = show ? '' : 'hidden';
    if (!show) return;
    li.style.transform = `translateY(${(r * gap).toFixed(1)}px) scale(${((1 - .45 * Math.min(a, 1)) * fits[j]).toFixed(3)})`;
    li.style.opacity = (a <= 1 ? 1 - .65 * a : .35 * (2 - a)).toFixed(3);
  });
}
titleList.addEventListener('pointerover', e => { const b = e.target.closest('[data-sheet]'); if (b) rest(+b.dataset.sheet); });
titleList.addEventListener('focusin', e => { const b = e.target.closest('[data-sheet]'); if (b) aim(+b.dataset.sheet); });
document.fonts?.ready.then(measureTitles); // the web font changes the sizes
let last = performance.now();
function tick(now) {
  const dt = Math.min(now - last, 50) / 16.7;
  last = now;
  if (!isDev() && cards.length) { // hidden in Developer mode: skip the work
    pos += (goal - pos) * (still ? 1 : Math.min(1, (pos < 0 ? .035 : .1) * dt)); // pos < 0: still entering
    if (Math.abs(goal - pos) < 1e-3) pos = goal;
    if (pos !== drawn) draw();
  }
  requestAnimationFrame(tick);
}
// The wheel or a vertical swipe turns it continuously; when it stops it settles on a card (the next one once you're
// a third of the way there, so one wheel notch = one project).
function nudge(dg) {
  dir = Math.sign(dg) || dir;
  goal = clampGoal(goal + dg);
  clearTimeout(settle);
  settle = setTimeout(() => { goal = clampGoal(dir > 0 ? Math.ceil(goal - .3) : Math.floor(goal + .3)); }, 140);
}
function aim(p) { // turn the spiral so this project is in front
  if (p == null) return;
  clearTimeout(settle);
  goal = clampGoal(p);
}
const stageBox = stage.parentElement; // the stage plus the title list beside it: scrolling either turns the spiral
stageBox.addEventListener('wheel', e => {
  e.preventDefault();
  closeSheet();
  nudge((e.deltaY || e.deltaX) / (e.deltaMode ? 3 : 280));
}, { passive: false });
// Swipes count along the up-right diagonal: up or right (or both, diagonally) is "up", down or left is "down".
let touch = null;
stageBox.addEventListener('touchstart', e => { touch = e.touches[0]; }, { passive: true });
stageBox.addEventListener('touchmove', e => {
  const t = e.touches[0];
  if (touch) nudge((touch.clientY - t.clientY + t.clientX - touch.clientX) / 120);
  touch = t;
}, { passive: true });
stage.addEventListener('click', e => { const t = e.target.closest('.tile'); if (t) launch(+t.dataset.p); });
spiral.addEventListener('pointerover', e => { const t = e.target.closest('.tile'); if (t) rest(+t.dataset.p); });
spiral.addEventListener('pointerleave', () => clearTimeout(closing));
spiral.addEventListener('focusin', e => { const t = e.target.closest('.tile'); if (t) aim(+t.dataset.p); }); // tabbing through the cards
// Two modes: the Spiral view (the landing page), or Developer mode = the terminal with About me beside it (#dev links
// straight to it). In the Spiral view, About me opens as a drawer from the right.
const isDev = () => document.body.classList.contains('dev');
const setAbout = on => document.body.classList.toggle('about-open', on);
// The visitor's view and each view's light/dark choice are remembered in this browser (localStorage).
const store = (k, v) => { try { localStorage[k] = v; } catch {} };
const stored = k => { try { return localStorage[k]; } catch {} };
function setDev(on) {
  document.body.classList.toggle('dev', on);
  setAbout(false);
  closeSheet();
  history.replaceState(null, '', on ? '#dev' : location.pathname + location.search);
  const view = on ? 'dev' : 'spiral';
  store('view', view);
  setTheme(stored(`theme-${view}`) || (on ? 'dark' : 'light'), false); // the Spiral view starts light, Developer mode dark
}
// Every few seconds the Developer mode button glitches: its letters scramble and it flickers into a sliced, shifted,
// monospace version of itself for a moment (not for visitors who prefer reduced motion).
const devBtn = $('#dev-btn'), devLabel = devBtn.textContent, junk = '!<>-_/[]{}=+*^?#01$%&@';
const rnd = (a, b) => a + Math.random() * (b - a);
function glitch() {
  if (!isDev() && !document.hidden) {
    devBtn.style.width = `${devBtn.offsetWidth}px`; // hold its size so the header doesn't jump
    let n = 0;
    const burst = setInterval(() => {
      const on = ++n < 9;
      devBtn.textContent = on ? [...devLabel].map(c => c !== ' ' && Math.random() < .35 ? junk[Math.random() * junk.length | 0] : c).join('') : devLabel;
      devBtn.classList.toggle('glitch', on && Math.random() < .75);
      const top = rnd(0, 45);
      for (const [k, v] of [['--gx', `${rnd(-4, 4)}px`], ['--gs', `${rnd(-14, 14)}deg`], ['--gt', `${top}%`], ['--gb', `${rnd(0, 55 - top)}%`]]) devBtn.style.setProperty(k, v);
      if (!on) { clearInterval(burst); devBtn.style.width = ''; }
    }, 55);
  }
  setTimeout(glitch, rnd(1800, 5000));
}
if (!still) setTimeout(glitch, 1200);
new ResizeObserver(() => { // also does the first build
  if (stage.clientWidth) build(); // hidden in Developer mode: rebuilt when it's shown again
}).observe(stage);
requestAnimationFrame(tick);

// ---- Contact me: the email address (opens the visitor's mail app) and GitHub / LinkedIn icons.
const contact = (() => { const l = links(site.links); return { mail: l.find(x => x.url.startsWith('mailto:')), github: l.find(x => /github\.com/i.test(x.url)), linkedin: l.find(x => /linkedin\./i.test(x.url)) }; })();
// Phosphor icons (MIT), light weight like the lightbulb
const ICONS = { github: 'M206.13,75.92A57.79,57.79,0,0,0,201.2,29a6,6,0,0,0-5.2-3,57.77,57.77,0,0,0-47,24H123A57.77,57.77,0,0,0,76,26a6,6,0,0,0-5.2,3,57.79,57.79,0,0,0-4.93,46.92A55.88,55.88,0,0,0,58,104v8a54.06,54.06,0,0,0,50.45,53.87A37.85,37.85,0,0,0,98,192v10H72a26,26,0,0,1-26-26A38,38,0,0,0,8,138a6,6,0,0,0,0,12,26,26,0,0,1,26,26,38,38,0,0,0,38,38H98v18a6,6,0,0,0,12,0V192a26,26,0,0,1,52,0v40a6,6,0,0,0,12,0V192a37.85,37.85,0,0,0-10.45-26.13A54.06,54.06,0,0,0,214,112v-8A55.88,55.88,0,0,0,206.13,75.92ZM202,112a42,42,0,0,1-42,42H112a42,42,0,0,1-42-42v-8a43.86,43.86,0,0,1,7.3-23.69,6,6,0,0,0,.81-5.76,45.85,45.85,0,0,1,1.43-36.42,45.85,45.85,0,0,1,35.23,21.1A6,6,0,0,0,119.83,62h32.34a6,6,0,0,0,5.06-2.76,45.83,45.83,0,0,1,35.23-21.11,45.85,45.85,0,0,1,1.43,36.42,6,6,0,0,0,.79,5.74A43.78,43.78,0,0,1,202,104Z', linkedin: 'M216,26H40A14,14,0,0,0,26,40V216a14,14,0,0,0,14,14H216a14,14,0,0,0,14-14V40A14,14,0,0,0,216,26Zm2,190a2,2,0,0,1-2,2H40a2,2,0,0,1-2-2V40a2,2,0,0,1,2-2H216a2,2,0,0,1,2,2ZM94,112v64a6,6,0,0,1-12,0V112a6,6,0,0,1,12,0Zm88,28v36a6,6,0,0,1-12,0V140a22,22,0,0,0-44,0v36a6,6,0,0,1-12,0V112a6,6,0,0,1,12,0v2.11A34,34,0,0,1,182,140ZM98,84A10,10,0,1,1,88,74,10,10,0,0,1,98,84Z' };
const icon = (k, l) => l ? `<a class="contact-icon" href="${esc(l.url)}" target="_blank" rel="noopener" aria-label="${esc(l.label)}"><svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="${ICONS[k]}"/></svg></a>` : '';
// "Have a problem?" (the hiring pitch under the header) opens the same window, framed for someone with work to offer.
function openContact(problem) {
  const addr = contact.mail?.url.slice(7) || '', title = problem ? 'Have a problem?' : 'Contact me';
  const mailto = esc(`mailto:${addr}?subject=${encodeURIComponent(problem ? 'I have a problem' : 'Hello from liewjiaen.com')}`);
  openWin('win-contact', title, `<a class="contact-mail" href="${mailto}"><svg viewBox="0 0 96 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M0 12H95M83.5 1.5 95 12 83.5 22.5"/></svg>${esc(addr)}</a>
    <div class="contact-icons">${icon('github', contact.github)}${icon('linkedin', contact.linkedin)}</div>`);
  document.body.classList.add('contact-open'); // dims the spiral cards too (CSS)
}
const closeContact = () => { $('#win-contact')?.remove(); document.body.classList.remove('contact-open'); };

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
    w.innerHTML = '<header><b></b><button class="x btn" aria-label="Close"></button></header><div class="body"></div>';
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
  spiral.querySelectorAll('.launched').forEach(el => el.classList.remove('launched')); // the card returns to the spiral
}
// Opening a project: turn its card to the front, then grow the popup out of that card toward the viewer (the card
// leaves the spiral while its popup is open).
let launches = 0;
async function launch(i) {
  aim(i);
  if (still) return openProject(i);
  const token = ++launches;
  const t0 = performance.now();
  await new Promise(done => {
    const wait = () => {
      Math.abs(pos - i) < .02 || performance.now() - t0 > 900 ? done() : requestAnimationFrame(wait);
    };
    requestAnimationFrame(wait);
    setTimeout(done, 1000); // backstop: frames can stall (background tab), the popup must still open
  });
  if (token !== launches) return; // another project was clicked meanwhile
  const card = cards[i]?.el, from = card?.getBoundingClientRect();
  openProject(i);
  const w = $('#win-project'), to = w.getBoundingClientRect();
  if (!from?.width) return;
  card.classList.add('launched');
  w.animate([
    { transform: `translate(${from.left + from.width / 2 - (to.left + to.width / 2)}px, ${from.top + from.height / 2 - (to.top + to.height / 2)}px) scale(${from.width / to.width}, ${from.height / to.height})`, opacity: .5 },
    { transform: 'none', opacity: 1 },
  ], { duration: 480, easing: 'cubic-bezier(.2, .9, .25, 1)' });
}
function rest(p) {
  clearTimeout(closing);
  if (openP != null && p !== openP) closing = setTimeout(closeSheet, 350);
}
function openProject(i) {
  openP = i;
  const p = P[i], im = p.images || [], n = im.length;
  const head = `<div class="sheet-head"><h2>${esc(p.title)}</h2>${p.tagline ? `<p class="tagline">${esc(p.tagline)}</p>` : ''}<p class="meta">${meta(p)}</p></div>`;
  // Media on top: all visible at once and large (~half the screen), no scrolling; click any item to open it full size
  // in the viewer (‹ › to flip). one = single item; pair = side by side; feat = cover large left, the rest stacked beside it.
  const big = j => n <= 2 || j === 0; // full-res where the tile is large; 480px thumbs for the stacked ones
  const tile = (f, j) => `<button class="mthumb" data-v="${j}" aria-label="View ${isVid(f) ? 'video' : 'image'} ${j + 1}">`
    + `<img src="${big(j) && !isVid(f) ? src(f) : thumb(f)}" alt="">${isVid(f) ? '<i class="badge">▶</i>' : ''}</button>`;
  const grid = n === 1 ? '<div class="mgrid one">' : n === 2 ? '<div class="mgrid pair">'
    : `<div class="mgrid feat" style="--cols:${Math.ceil((n - 1) / 2)}">`;
  openWin('win-project', p.title, `
    ${n ? `${grid}${im.map(tile).join('')}</div>` : ''}${head}
    ${chips(p.tools)}${bullets(p.text)}${writeup(p)}${linkBtns(p.links)}
    <div class="viewer" hidden><button class="vx btn" aria-label="Back to project"></button><button class="vnav" data-step="-1" aria-label="Previous">‹</button><div class="vmedia"></div><button class="vnav" data-step="1" aria-label="Next">›</button></div>`);
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
// Output types itself in, one block after another, and never drags the view along: the reader scrolls when they like.
// Each block keeps its finished height while it types, so nothing below it jumps.
let fresh = [], outQueue = Promise.resolve();
const print = (html, cls = '') => {
  out.insertAdjacentHTML('beforeend', `<div class="${cls}">${html || ' '}</div>`);
  if (still) return;
  if (!fresh.length) queueMicrotask(typeFresh); // after the command has printed everything
  fresh.push(out.lastElementChild);
};
function typeFresh() {
  const els = fresh, heights = els.map(el => el.offsetHeight);
  fresh = [];
  els.forEach((el, i) => {
    el.style.minHeight = `${heights[i]}px`;
    const type = typer(el);
    outQueue = outQueue.then(type).then(() => { el.style.minHeight = ''; });
  });
}
function typer(el, alive = () => true) { // empties el now; the function it returns types it back in (text in order,
  const parts = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT); // images as reached)
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    if (n.nodeType === 3 && n.data) { parts.push([n, n.data]); n.data = ''; }
    else if (n.tagName === 'IMG' || n.classList?.contains('tthumb')) { n.style.visibility = 'hidden'; parts.push([n, null]); }
  }
  const step = Math.max(3, Math.ceil(parts.reduce((s, [, t]) => s + (t?.length || 0), 0) / 60)); // a second at most
  return () => new Promise(done => {
    let i = 0, k = 0;
    (function tick() {
      if (!alive()) return done(); // e.g. its section was closed meanwhile
      for (let n = step; n > 0 && i < parts.length;) {
        const [node, text] = parts[i];
        if (text == null) { node.style.visibility = ''; i++; continue; }
        const take = Math.min(n, text.length - k);
        node.data += text.slice(k, k + take);
        k += take; n -= take;
        if (k === text.length) { i++; k = 0; }
      }
      i < parts.length ? setTimeout(tick, 16) : done();
    })();
  });
}
const cmd = (c, label = c) => `<a data-cmd="${esc(c)}">${esc(label)}</a>`;
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
  print(`<span class="tthumb blank"></span><span class="dim">${pad('PROJECT', tw)}${pad('TYPE', yw)}YEAR</span>\n`
    + ids.map(i => `<span class="trow"${P[i].images?.length ? ` data-img="${thumb(P[i].images[0])}"` : ''}>${tthumb(i)}${pad(P[i].title, tw, `<a data-open="${i}">${esc(P[i].title)}</a>`)}${pad(P[i].type, yw)}${esc(P[i].year)}</span>`).join('\n')
    + `\n<span class="dim">  ${note} · cat &lt;file&gt; (or click a name) to open one</span>`, 'pre');
}
// Projects by name: case, spaces and punctuation don't matter. An exact name wins, then one that starts with what was
// typed, then one containing it.
const norm = t => String(t).toLowerCase().replace(/[^a-z0-9]/g, '');
function findProject(q) {
  const k = norm(q);
  if (!k) return -1;
  for (const hit of [t => t === k, t => t.startsWith(k), t => t.includes(k)]) {
    const i = P.findIndex(p => hit(norm(p.title)));
    if (i >= 0) return i;
  }
  return -1;
}
function showProject(i) {
  const p = P[i], im = p.images || [];
  print(`<b class="hl">── ${esc(p.title)} ${'─'.repeat(Math.max(3, 44 - p.title.length))}</b>
${esc(p.tagline)}
<span class="dim">year</span> ${esc(p.year)}   <span class="dim">type</span> ${esc(p.type)}
<span class="dim">tools</span> ${esc(p.tools)}
${lines(p.text).map(l => ` • ${esc(l)}`).join('\n')}
${p.writeup ? `\n<span class="dim">── write-up ──</span>\n${esc(p.writeup.trim())}\n` : ''}
${links(p.links).map(ext).join(' ')}${im.length ? '\n' + im.map(f => `<img src="${thumb(f)}" alt="">`).join('') : ''}`);
}
const printSection = r => print(`<b class="hl">── ${esc(r.name)} ──</b>` + r.items.map(it =>
  `\n\n<b>${esc(it.title)}</b>${it.org ? ` · ${esc(it.org)}` : ''}${it.when ? `  <span class="dim">${esc(it.when)}</span>` : ''}\n${lines(it.text).map(l => ` • ${esc(l)}`).join('\n')}`).join(''));

// ---- A small Linux-style file system: ~ (/home/visitor) holds projects/ and a text file per About me section.
const HOME = '/home/visitor', slug = p => `${p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.md`;
const files = { 'about.txt': () => cmds.whoami(), 'contact.txt': () => cmds.mail(),
  ...Object.fromEntries(resume.map(r => [`${key(r.name)}.txt`, () => printSection(r)])) };
let cwd = '~';
const promptLabel = $('#term-form label');
function resolve(arg = '') { // a path (relative, ~/…, /home/visitor/…, with . and ..) → { dir } | { file, name } | null
  const raw = arg.replace(/^\/home\/visitor(?=\/|$)/, '~'), parts = raw.startsWith('~') || cwd === '~' ? [] : ['projects'];
  for (const seg of raw.replace(/^~\/?/, '').split('/')) {
    if (seg === '..') parts.pop();
    else if (seg && seg !== '.') parts.push(seg);
  }
  const path = parts.join('/');
  if (!path) return { dir: '~' };
  if (path === 'projects') return { dir: '~/projects' };
  if (files[path]) return { file: files[path], name: path };
  const i = P.findIndex(p => `projects/${slug(p)}` === path);
  return i >= 0 ? { file: () => showProject(i), name: path } : null;
}
function findFile(arg) { // a path, a file name without its extension, or (anywhere) part of a project's name
  const r = resolve(arg) ?? resolve(`${arg}.txt`);
  if (r) return r;
  const i = norm(arg).length >= 3 ? findProject(arg.replace(/\.md$/i, '')) : -1;
  return i >= 0 ? { file: () => showProject(i), name: `projects/${slug(P[i])}` } : null;
}
const words = a => a.split(/\s+/).filter(x => x && !x.startsWith('-')); // arguments without flags (ls -la, grep -i)
const manual = [['ls [dir]', 'list files'], ['cd <dir>', 'change directory (projects, .., ~)'], ['pwd', 'print the working directory'],
  ['cat <file>', 'show a file (also less, more, nano, vim)'], ['tree', 'every file at once'], ['grep <term>', 'projects by skill or keyword'],
  ['whoami', 'about me'], ['mail', 'email and profiles'], ['history', 'commands so far'], ['echo <text>', 'print text'],
  ['date', 'the date'], ['uname', 'the system'], ['man <command>', 'what a command does'], ['clear', 'clear the screen (Ctrl+L)'],
  ['exit', 'back to the Spiral view']];
const cmds = {
  help: () => print(manual.map(([c, d]) => '  ' + pad(c, 16, cmd(c.split(' ')[0], c)) + `<span class="dim">${esc(d)}</span>`).join('\n')
    + `\n\n<span class="dim">  chain with &amp;&amp; · Tab completes · or just type a file or project name</span>`, 'pre'),
  man: (a = '') => {
    if (!a) return cmds.help();
    const m = manual.find(([c]) => c.split(' ')[0] === a.trim());
    print(m ? `${esc(m[0])}\n    ${esc(m[1])}` : `No manual entry for ${esc(a)}`);
  },
  ls: (a = '') => {
    const target = words(a)[0], r = target ? resolve(target) : { dir: cwd };
    if (!r) return print(`ls: cannot access '${esc(target)}': No such file or directory`);
    if (r.file) return print(esc(r.name.split('/').pop()));
    if (r.dir === '~/projects') return table(P.map((_, i) => i), `${P.length} files`);
    print([cmd('cd projects && ls', 'projects/'), ...Object.keys(files).map(f => cmd(`cat ${f}`, f))].join('   '));
  },
  cd: (a = '') => {
    const r = resolve(words(a)[0] || '~');
    if (!r) return print(`cd: no such file or directory: ${esc(a)}`);
    if (r.file) return print(`cd: not a directory: ${esc(a)}`);
    cwd = r.dir;
    promptLabel.textContent = `visitor@portfolio:${cwd}$`;
  },
  pwd: () => print(cwd.replace('~', HOME)),
  cat: (a = '') => {
    const arg = words(a).join(' ');
    if (!arg) return print(`usage: cat &lt;file&gt; · see ${cmd('ls')}`);
    const r = findFile(arg);
    if (!r) return print(`cat: ${esc(arg)}: No such file or directory`);
    r.dir ? print(`cat: ${esc(arg)}: Is a directory`) : r.file();
  },
  tree: () => {
    const top = Object.keys(files), pl = P.map(slug);
    print(`~\n${top.map(f => `├── ${cmd(`cat ${f}`, f)}`).join('\n')}\n└── ${cmd('cd projects && ls', 'projects/')}\n`
      + pl.map((f, i) => `    ${i === pl.length - 1 ? '└' : '├'}── ${cmd(`cat projects/${f}`, f)}`).join('\n')
      + `\n\n<span class="dim">1 directory, ${top.length + pl.length} files</span>`, 'pre');
  },
  grep: (a = '') => {
    const q = words(a).join(' ').replace(/^["']|["']$/g, '');
    if (!q) return print(`usage: grep &lt;term&gt; · skills used across projects:\n` + stacks.map(([t, ids]) => `${cmd(`grep ${t}`, t)}<span class="dim">×${ids.length}</span>`).join('   '));
    const s = q.toLowerCase(), hit = stacks.find(([t]) => t.toLowerCase() === s);
    const ids = hit ? hit[1] : P.map((_, i) => i).filter(i => `${P[i].title} ${P[i].tagline} ${P[i].type} ${P[i].tools} ${P[i].text}`.toLowerCase().includes(s));
    if (!ids.length) return print(`grep: no project matches "${esc(q)}"`);
    table(ids, `${ids.length} match${ids.length > 1 ? 'es' : ''} for "${esc(q)}"`);
  },
  whoami: () => print(`${banner() || `<b class="hl">${esc(site.name)}</b>\n`}${esc(site.location)}\n${links(site.links).map(ext).join(' ')}\n`
    + aboutSecs.map((s, i) => `<div><a class="tdrop" data-drop="${i}"><span>[+]</span> ${esc(s.name)}${s.count ? ` <span class="dim">${s.count}</span>` : ''}</a>`
      + `<div class="tdrop-body" hidden></div><div class="dim">${'-'.repeat(40)}</div></div>`).join('')),
  mail: () => print(`${contact.mail ? `email    <a href="${esc(contact.mail.url)}">${esc(contact.mail.url.slice(7))}</a>` : ''}`
    + `${contact.github ? `\ngithub   ${ext(contact.github)}` : ''}${contact.linkedin ? `\nlinkedin ${ext(contact.linkedin)}` : ''}`),
  history: () => print(hist.map((h, i) => `${String(i + 1).padStart(4)}  ${esc(h)}`).join('\n'), 'pre'),
  echo: (a = '') => print(esc(a)),
  date: () => print(esc(new Date().toString())),
  uname: (a = '') => print(/-a/.test(a) ? 'PortfolioOS portfolio 1.0.3 web' : 'PortfolioOS'),
  sudo: () => print('visitor is not in the sudoers file. This incident will be reported.'),
  exit: () => setDev(false),
  clear: () => { out.innerHTML = ''; },
};
Object.assign(cmds, { less: cmds.cat, more: cmds.cat, nano: cmds.cat, vim: cmds.cat, vi: cmds.cat, ll: cmds.ls, logout: cmds.exit });

// Suggestions under the prompt: shown on focus/click/typing, filtered by what's typed, click (or Tab) to use.
const sug = $('#suggest');
function suggest() {
  const q = tin.value.trim().toLowerCase();
  const groups = [
    ['Try', [['ls', 'list files'], ['cd projects && ls', 'the projects'], ['cat about.txt', 'about me'], ['tree', 'every file'], ['grep', 'by skill'], ['help', 'every command']], 8],
    ['Files', Object.keys(files).map(f => [`cat ${f}`, '']), 0],
    ['Open', P.map(p => [`cat projects/${slug(p)}`, p.title]), 5],
    ['By skill', stacks.map(([t, ids]) => [`grep ${t}`, `×${ids.length}`]), 8],
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
function complete(v) { // Tab, as in a shell: finish the last word (a command first, then file names from here)
  const [, before, word] = v.match(/^(.*?)(\S*)$/);
  const names = !before.trim() ? Object.keys(cmds)
    : cwd === '~' ? ['projects/', ...Object.keys(files), ...P.map(p => `projects/${slug(p)}`)] : P.map(slug);
  const hits = names.filter(n => n.startsWith(word));
  if (!hits.length) return v;
  let common = hits[0];
  for (const h of hits) while (!h.startsWith(common)) common = common.slice(0, -1);
  return before + common + (hits.length === 1 && !common.endsWith('/') ? ' ' : '');
}

const hist = [];
let hp = 0;
function run(line) {
  sug.hidden = true;
  print(`<span class="hl">visitor@portfolio</span>:${cwd}$ ${esc(line)}`);
  const echo = out.lastElementChild;
  line = line.trim();
  if (!line) return;
  hist.push(line);
  hp = hist.length;
  for (const part of line.split('&&')) exec(part.trim());
  // One scroll, now, just far enough to show the new output (never past the command line); none while it types.
  const view = tbody.getBoundingClientRect(), over = out.getBoundingClientRect().bottom + 60 - view.bottom;
  if (over > 0) tbody.scrollTop += Math.min(over, echo.getBoundingClientRect().top - view.top - 8);
}
function exec(line) {
  if (!line) return;
  const [c, ...a] = line.split(/\s+/), name = c.toLowerCase();
  if (Object.hasOwn(cmds, name)) return cmds[name](a.join(' '));
  const r = norm(line).length >= 3 && findFile(line); // just a file or project name opens it; a folder name goes there
  if (r?.file) r.file();
  else if (r?.dir) cmds.cd(line);
  else print(`${esc(c)}: command not found · type ${cmd('help')}`);
}
// Boot: the ASCII name (or the plain name) and the hints.
const bootLines = [`<span class="dim">PORTFOLIO OS v1.0.3 · link established · latency 1ms · ${P.length} projects · ${resume.length} dossiers</span>`,
  banner() || `<b class="hl">${esc(site.name)}</b>`,
  `type ${cmd('help')} or try ${cmd('ls')} ${cmd('cd projects && ls', 'cd projects')} ${cmd('cat about.txt')} ${cmd('tree')} · click the prompt for suggestions`, ''];
bootLines.forEach((l, i) => setTimeout(() => print(l), i * 110));
// About me sections for whoami / about. Opening one types it in and grows downward; the view stays where it is.
const entryText = it => `<b>${esc(it.title)}</b>${it.org ? ` · ${esc(it.org)}` : ''}${it.when ? `  <span class="dim">${esc(it.when)}</span>` : ''}`
  + lines(it.text).map(l => `\n • ${esc(l)}`).join('');
const aboutSecs = [{ name: 'Summary', html: esc(site.summary) },
  ...resume.map(r => ({ name: r.name, count: r.items.length, html: r.items.map(entryText).join('\n\n') }))];
function toggleDrop(head) { // the whole [+] line is the button
  const body = head.nextElementSibling, open = head.firstChild.textContent === '[+]', token = (+body.dataset.t || 0) + 1;
  const alive = () => +body.dataset.t === token; // a newer open / close takes over
  body.dataset.t = token;
  head.firstChild.textContent = open ? '[-]' : '[+]';
  if (open) {
    body.hidden = false;
    body.innerHTML = aboutSecs[head.dataset.drop].html;
    if (!still) typer(body, alive)();
  } else if (still) body.hidden = true;
  else backspace(body, alive).then(() => { if (alive()) body.hidden = true; });
}
function backspace(el, alive) { // closing a section erases its text from the end, like holding backspace
  const nodes = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) if (n.data) nodes.push(n);
  const step = Math.max(3, Math.ceil(nodes.reduce((s, n) => s + n.data.length, 0) / 30)); // half a second
  return new Promise(done => (function tick() {
    if (!alive()) return done();
    for (let n = step; n > 0 && nodes.length;) {
      const last = nodes.at(-1), take = Math.min(n, last.data.length);
      last.data = last.data.slice(0, -take);
      n -= take;
      if (!last.data) nodes.pop();
    }
    nodes.length ? setTimeout(tick, 16) : done();
  })());
}
$('#term-form').onsubmit = e => { e.preventDefault(); run(tin.value); tin.value = ''; };
tin.onkeydown = e => {
  const first = !sug.hidden && sug.querySelector('[data-cmd]');
  if (e.key === 'Tab') { // complete the word like a shell; failing that, take the first suggestion
    e.preventDefault();
    const done = complete(tin.value);
    if (done !== tin.value) tin.value = done;
    else if (first) tin.value = first.dataset.cmd;
    return suggest();
  }
  if (e.ctrlKey && e.key.toLowerCase() === 'l') { e.preventDefault(); return cmds.clear(); }
  if (e.key === 'Escape') sug.hidden = true;
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
  e.preventDefault();
  hp = Math.max(0, Math.min(hist.length, hp + (e.key === 'ArrowUp' ? -1 : 1)));
  tin.value = hist[hp] ?? '';
};
tbody.onclick = e => { if (!getSelection().toString() && !e.target.closest('a')) tin.focus({ preventScroll: true }); };

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

// Hovering a project row in ls/grep pops a large preview of its cover beside the row (fixed, so nothing gets clipped).
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
  if (e.target.matches('#win-contact, #win-contact > .body, .contact-icons')) return closeContact(); // the dark area
  const t = e.target.closest('[data-open],[data-sheet],[data-cmd],[data-v],[data-step],[data-drop],#dev-btn,#spiral-btn,#about-btn,#contact-btn,#problem-btn,#about-close,#theme-icon,.vx,.x');
  if (!t) return;
  const d = t.dataset;
  if (t.id === 'dev-btn' || t.id === 'spiral-btn') setDev(t.id === 'dev-btn');
  else if (t.id === 'contact-btn') $('#win-contact') ? closeContact() : openContact();
  else if (t.id === 'problem-btn') openContact(true);
  else if (t.closest('#win-contact')) closeContact(); // its ✕
  else if (t.id === 'about-btn') setAbout(!document.body.classList.contains('about-open'));
  else if (t.id === 'about-close') setAbout(false);
  else if (t.id === 'theme-icon') setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
  else if (d.sheet) launch(+d.sheet);
  else if (d.open) typeRun(`cat ${cwd === '~/projects' ? '' : 'projects/'}${slug(P[d.open])}`);
  else if (d.drop) toggleDrop(t);
  else if (d.cmd) typeRun(d.cmd);
  else if (d.v) view(+d.v);
  else if (d.step) view(+$('#win-project .viewer').dataset.i + +d.step);
  else if (t.matches('.vx')) closeViewer();
  else closeSheet();
});

// Light / dark, chosen per view (index.html sets it before first paint).
function setTheme(t, save = true) {
  document.documentElement.dataset.theme = t;
  if (save) store(`theme-${isDev() ? 'dev' : 'spiral'}`, t);
}
setTheme(document.documentElement.dataset.theme || 'light', false);
// Where the browser exposes a light sensor (few do: Chrome with its Generic Sensor flag), the room's brightness picks
// the theme and the toggles hide. The gap between the two thresholds stops it flickering at dusk.
if ('AmbientLightSensor' in window) try {
  const sensor = new AmbientLightSensor({ frequency: 1 });
  sensor.addEventListener('reading', () => {
    document.body.classList.add('light-sensor');
    const t = document.documentElement.dataset.theme, lux = sensor.illuminance;
    if (t !== 'light' && lux > 80) setTheme('light', false);
    else if (t !== 'dark' && lux < 25) setTheme('dark', false);
  });
  sensor.addEventListener('error', () => document.body.classList.remove('light-sensor')); // e.g. permission denied
  sensor.start();
} catch {}

// Project details and the About drawer never block the view: interacting (click, tap, drag, focus) anywhere outside
// them closes them. Capture phase, so the spiral handlers that run next can turn it.
for (const ev of ['pointerdown', 'focusin'])
  document.addEventListener(ev, e => {
    if (!e.target.closest?.('.win')) closeSheet();
    if (!e.target.closest?.('#about, #about-btn')) setAbout(false);
    if (!e.target.closest?.('#win-contact, #contact-btn, #problem-btn')) closeContact();
  }, true);

addEventListener('keydown', e => {
  if (e.key === 'Escape') return closeViewer() || (openP != null ? closeSheet() : $('#win-contact') ? closeContact() : setAbout(false)); // viewer, details, contact, About
  const v = $('#win-project .viewer');
  if (v && !v.hidden && /^Arrow(Left|Right)$/.test(e.key)) return view(+v.dataset.i + (e.key === 'ArrowRight' ? 1 : -1));
  // Spiral view: arrow / page keys step through the projects.
  if (!isDev() && openP == null && /^(Arrow(Up|Down|Left|Right)|Page(Up|Down))$/.test(e.key) && !e.target.closest?.('input, textarea, #about')) {
    e.preventDefault();
    return aim(Math.round(goal) + (/Down|Right/.test(e.key) ? 1 : -1));
  }
  // In Developer mode, typing anywhere goes to the terminal.
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && isDev() && !e.target.closest('input, textarea, button, a')) tin.focus();
});

if (isDev() || location.hash === '#dev') setDev(true); // index.html already opened the remembered view
addEventListener('hashchange', () => setDev(location.hash === '#dev'));
