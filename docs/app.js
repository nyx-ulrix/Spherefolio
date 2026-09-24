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
    : `<span class="card" style="--hue:${(i * 47 + 15) % 360}">${text}</span>`;
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
document.documentElement.style.setProperty('--accent', site.accent || '#ff6400');
document.documentElement.style.setProperty('--accent2', site.accent2 || '#b79cff');

// ---- About me: everything in one scrolling column.
$('#about-body').innerHTML = `
  <h2>${esc(site.name)}</h2><p class="muted">${esc(site.role)} · ${esc(site.location)}</p>
  ${linkBtns(site.links)}
  <h3>Summary</h3><p>${esc(site.summary)}</p>
  ${resume.map(r => `<h3>${esc(r.name)}</h3>${r.items.map(entry).join('')}`).join('')}`;

// ---- Sphere: frames sit on a Fibonacci lattice facing outward; each frame only the wrapper rotates.
let tiles = [], R = 1, rx = -12, ry = 0, vx = 0, vy = 0, drag = null, moved = 0;
function build() {
  const N = P.length && Math.max(P.length, S.minTiles | 0);
  R = Math.min(stage.clientWidth, stage.clientHeight) * S.size;
  const w = R * Math.sqrt(4 * Math.PI / Math.max(N, 1)) * S.fill; // tile side that fills its share of the surface
  stage.style.perspective = `${R * 4}px`;
  sphere.style.cssText = `--w:${w}px;--h:${w * .75}px`;
  sphere.innerHTML = '';
  tiles = Array.from({ length: N }, (_, i) => {
    const phi = Math.acos(1 - 2 * (i + .5) / N), theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const x = R * Math.cos(theta) * Math.sin(phi), y = R * Math.sin(theta) * Math.sin(phi), z = R * Math.cos(phi);
    const p = i % P.length, el = document.createElement('button');
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
  else { ry += (vy + (still ? 0 : S.spin)) * dt; rx += vx * dt; vx *= .95 ** dt; vy *= .95 ** dt; }
  rx = Math.max(-70, Math.min(70, rx));
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

stage.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY]; moved = 0; });
addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag[0], dy = e.clientY - drag[1];
  drag = [e.clientX, e.clientY];
  moved += Math.abs(dx) + Math.abs(dy);
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
  if (t && (isFull() || !e.detail)) openProject(+t.dataset.p);
  else if (!isFull()) setFull(true);
});
sphere.addEventListener('pointerover', e => {
  const t = e.target.closest('.tile'), p = t && P[t.dataset.p];
  if (p) caption.textContent = `▸ ${[p.title, p.type, p.year].filter(Boolean).join(' · ')}`;
});
sphere.addEventListener('pointerleave', () => { caption.textContent = hint(); });
new ResizeObserver(build).observe(stage); // also does the first build
requestAnimationFrame(tick);

// ---- Project sheets: draggable Foundry-style windows, Esc closes the top one.
let zTop = 20;
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
    w.style.left = `${Math.max(8, (innerWidth - w.offsetWidth) / 2)}px`;
    w.style.top = `${Math.max(8, innerHeight * .08)}px`;
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
}

function openProject(i) {
  const p = P[i], im = p.images || [];
  openWin('win-project', p.title, `
    <div class="sheet-top">
      <div class="portrait">${im.length ? media(im[0], true) : card(p, i)}</div>
      <div><h2>${esc(p.title)}</h2><p class="muted">${esc(p.tagline)}</p>
        <dl class="stats">${stat('Year', p.year)}${stat('Type', p.type)}${stat('Slot', `#${String(i + 1).padStart(2, '0')}`)}</dl></div>
    </div>
    ${chips(p.tools)}${bullets(p.text)}
    ${im.length > 1 ? `<div class="gallery">${im.map((f, j) => `<button data-f="${esc(f)}" aria-label="Show ${isVid(f) ? 'video' : 'image'} ${j + 1}"><img src="${thumb(f)}" alt="">${isVid(f) ? '<i class="badge">▶</i>' : ''}</button>`).join('')}</div>` : ''}
    ${linkBtns(p.links)}`);
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
function table(ids, note) {
  const tw = Math.max(8, ...P.map(p => p.title.length)) + 2, yw = Math.max(5, ...P.map(p => String(p.type).length)) + 2;
  print(`<span class="dim">  #   ${pad('PROJECT', tw)}${pad('TYPE', yw)}YEAR</span>\n`
    + ids.map(i => `  ${String(i + 1).padStart(2, '0')}  ${pad(P[i].title, tw, `<a data-open="${i}">${esc(P[i].title)}</a>`)}${pad(P[i].type, yw)}${esc(P[i].year)}`).join('\n')
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
  whoami: () => print(`<b class="hl">${esc(site.name)}</b> · ${esc(site.role)} · ${esc(site.location)}\n\n${esc(site.summary)}\n\n${links(site.links).map(ext).join(' ')}`),
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
[`<span class="dim">SPHEREFOLIO OS v1.0.3 · link established · latency 1ms · ${P.length} projects · ${resume.length} dossiers</span>`,
  `<b class="hl">${esc(site.name)}</b> · ${esc(site.role)}`,
  `type ${cmd('help')} or try ${cmd('ls')} ${cmd('stack')} ${cmd('whoami')} ${resume.slice(0, 2).map(r => cmd(key(r.name))).join(' ')} · click the prompt for suggestions`, '',
].forEach((l, i) => setTimeout(() => print(l), i * 110));
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

// ---- Global input
document.addEventListener('click', e => {
  const t = e.target.closest('[data-open],[data-cmd],[data-f],#full,.x');
  if (!t) return;
  const d = t.dataset;
  if (t.id === 'full') setFull(!isFull());
  else if (d.open) run(`open ${+d.open + 1}`);
  else if (d.cmd) run(d.cmd);
  else if (d.f) t.closest('.win').querySelector('.portrait').innerHTML = media(d.f, true);
  else t.closest('.win').remove();
});

addEventListener('keydown', e => {
  if (e.key === 'Escape') { // close the top project window, else leave fullscreen
    const w = [...document.querySelectorAll('.win')].sort((a, b) => b.style.zIndex - a.style.zIndex)[0];
    return w ? w.remove() : setFull(false);
  }
  // Typing anywhere goes to the terminal (unless the sphere is covering it).
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !isFull() && !e.target.closest('input, textarea, button, a')) tin.focus();
});
