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
  ${banner()}<h2 class="about-name">${esc(site.name)}</h2><p class="muted">${esc(site.role)} · ${esc(site.location)}</p>
  ${linkBtns(site.links)}
  ${drop('Summary', 0, `<p>${esc(site.summary)}</p>`, true)}
  ${resume.map(r => drop(r.name, r.items.length, r.items.map(entry).join(''))).join('')}`;

// ---- Spiral view: project cards on a helix ribbon that winds past the viewer. Scrolling turns it (wheel, swipe, arrow
// keys, or tabbing through the cards) and it settles with one card in front: the focused project.
const STEP = 40; // degrees between neighbouring cards: 9 per turn
const still = matchMedia('(prefers-reduced-motion: reduce)').matches, D = Math.PI / 180;
let cards = [], RISE = 1, pos = 0, goal = 0, drawn = null, focused = -1, dir = 1, settle;
const titleBox = $('#titles'), titleList = $('#titles ol'), intro = $('#intro'), w1 = $('#w1'), w2 = $('#w2');
const [first, ...more] = site.name.toUpperCase().split(/\s+/); // the name, huge and grey behind the spiral
w1.textContent = first;
w2.textContent = more.join(' ');
$('#mini').textContent = site.role;
const clampGoal = g => Math.max(0, Math.min(P.length - 1, g));
function build() { // cards are placed once; each frame only moves the wrapper
  const w = stage.clientWidth, h = stage.clientHeight;
  const H = Math.min(h * .3, w * .34), R = Math.max(H * 1.9, Math.min(w * .32, h * .6));
  RISE = H * 1.3 / (360 / STEP); // a full turn drops a little more than a card's height, so turns never overlap
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
  drawn = null;
  focused = -1;
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
  const t = pos / Math.max(1, P.length - 1);
  w1.style.transform = `translateX(${-t * 14}vw)`; // the name drifts apart as you scroll through
  w2.style.transform = `translateX(${t * 14}vw)`;
  intro.style.opacity = Math.max(0, 1 - pos * 2).toFixed(2);
  setFocus(Math.round(pos));
}
function setFocus(i) { // the card in front: its name is greyed in the title list
  if (i === focused || !P[i]) return;
  focused = i;
  showTitles(i);
}
// Project names, A24-style: huge stacked titles bottom left with the year beside each, five at a time (the five that
// include the project in front). Hover a name to turn the spiral to it; click to open it.
titleList.innerHTML = P.map((p, i) => `<li><button data-sheet="${i}">${esc(p.title)}${p.year ? `<sup>${esc(p.year)}</sup>` : ''}</button></li>`).join('');
const titleItems = [...titleList.children];
function showTitles(i) {
  const start = i - i % 5, top = titleItems[start].offsetTop, last = titleItems[Math.min(start + 5, P.length) - 1];
  titleItems.forEach((li, j) => li.classList.toggle('on', j === i));
  titleList.style.transform = `translateY(${-top}px)`;
  titleBox.style.height = `${last.offsetTop + last.offsetHeight - top}px`;
}
titleList.addEventListener('pointerover', e => { const b = e.target.closest('[data-sheet]'); if (b) { aim(+b.dataset.sheet); rest(+b.dataset.sheet); } });
titleList.addEventListener('focusin', e => { const b = e.target.closest('[data-sheet]'); if (b) aim(+b.dataset.sheet); });
document.fonts?.ready.then(() => { if (focused >= 0) showTitles(focused); }); // the web font changes the line heights
let last = performance.now();
function tick(now) {
  const dt = Math.min(now - last, 50) / 16.7;
  last = now;
  if (!isDev() && cards.length) { // hidden in Developer mode: skip the work
    pos += (goal - pos) * (still ? 1 : Math.min(1, .1 * dt));
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
stage.addEventListener('wheel', e => {
  e.preventDefault();
  closeSheet();
  nudge((e.deltaY || e.deltaX) / (e.deltaMode ? 3 : 280));
}, { passive: false });
let touchY = null;
stage.addEventListener('touchstart', e => { touchY = e.touches[0].clientY; }, { passive: true });
stage.addEventListener('touchmove', e => {
  const y = e.touches[0].clientY;
  if (touchY != null) nudge((touchY - y) / 120);
  touchY = y;
}, { passive: true });
stage.addEventListener('click', e => { const t = e.target.closest('.tile'); if (t) launch(+t.dataset.p); });
spiral.addEventListener('pointerover', e => { const t = e.target.closest('.tile'); if (t) rest(+t.dataset.p); });
spiral.addEventListener('pointerleave', () => clearTimeout(closing));
spiral.addEventListener('focusin', e => { const t = e.target.closest('.tile'); if (t) aim(+t.dataset.p); }); // tabbing through the cards
// Two modes: the Spiral view (the landing page), or Developer mode = the terminal with About me beside it (#dev links
// straight to it). In the Spiral view, About me opens as a drawer from the right.
const isDev = () => document.body.classList.contains('dev');
const setAbout = on => document.body.classList.toggle('about-open', on);
function setDev(on) {
  document.body.classList.toggle('dev', on);
  setAbout(false);
  closeSheet();
  history.replaceState(null, '', on ? '#dev' : location.pathname + location.search);
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
    w.innerHTML = '<header><b></b><button class="x btn">Close</button></header><div class="body"></div>';
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
    <div class="viewer" hidden><button class="vx btn" aria-label="Back to project">Close</button><button class="vnav" data-step="-1" aria-label="Previous">‹</button><div class="vmedia"></div><button class="vnav" data-step="1" aria-label="Next">›</button></div>`);
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
    + `\n<span class="dim">  ${note} · </span>${cmd('open')}<span class="dim"> &lt;n&gt; for details, or click a card on the spiral</span>`, 'pre');
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
${p.writeup ? `\n<span class="dim">── write-up ──</span>\n${esc(p.writeup.trim())}\n` : ''}
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
  print(`<span class="hl">visitor@portfolio</span>:~$ ${esc(line)}`);
  line = line.trim();
  if (!line) return;
  hist.push(line);
  hp = hist.length;
  const [c, ...a] = line.split(/\s+/), name = c.toLowerCase();
  Object.hasOwn(cmds, name) ? cmds[name](a.join(' ')) : print(`command not found: ${esc(c)} · type ${cmd('help')}`);
}
// Boot: the ASCII name (or the plain name) and the hints.
const bootLines = [`<span class="dim">PORTFOLIO OS v1.0.3 · link established · latency 1ms · ${P.length} projects · ${resume.length} dossiers</span>`,
  banner() || `<b class="hl">${esc(site.name)}</b>`,
  esc(site.role),
  `type ${cmd('help')} or try ${cmd('ls')} ${cmd('stack')} ${cmd('whoami')} ${resume.slice(0, 2).map(r => cmd(key(r.name))).join(' ')} · click the prompt for suggestions`, ''];
bootLines.forEach((l, i) => setTimeout(() => print(l), i * 110));
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
  const t = e.target.closest('[data-open],[data-sheet],[data-cmd],[data-v],[data-step],#dev-btn,#spiral-btn,#about-btn,#about-close,#theme,.vx,.x');
  if (!t) return;
  const d = t.dataset;
  if (t.id === 'dev-btn' || t.id === 'spiral-btn') setDev(t.id === 'dev-btn');
  else if (t.id === 'about-btn') setAbout(!document.body.classList.contains('about-open'));
  else if (t.id === 'about-close') setAbout(false);
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
  $('#theme').textContent = t === 'light' ? 'Dark mode' : 'Light mode';
}
setTheme(document.documentElement.dataset.theme || 'dark', false);
matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => { // system flips (e.g. at sunset)
  let saved; try { saved = localStorage.theme; } catch {}
  if (!saved) setTheme(e.matches ? 'light' : 'dark', false);
});

// Project details and the About drawer never block the view: interacting (click, tap, drag, focus) anywhere outside
// them closes them. Capture phase, so the spiral handlers that run next can turn it.
for (const ev of ['pointerdown', 'focusin'])
  document.addEventListener(ev, e => {
    if (!e.target.closest?.('.win')) closeSheet();
    if (!e.target.closest?.('#about, #about-btn')) setAbout(false);
  }, true);

addEventListener('keydown', e => {
  if (e.key === 'Escape') return closeViewer() || (openP != null ? closeSheet() : setAbout(false)); // viewer, details, then About
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

if (location.hash === '#dev') setDev(true);
addEventListener('hashchange', () => setDev(location.hash === '#dev'));
