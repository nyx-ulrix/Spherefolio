// Spherefolio: a CSS-3D image sphere (Fibonacci lattice) and a terminal view, both rendered from data.json.
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const lines = s => String(s ?? '').split('\n').map(l => l.trim()).filter(Boolean);
const links = s => lines(s).map(l => { const [a, b] = l.split('|').map(x => x.trim()); return { label: b ? a : a.replace(/^\w+:(\/\/)?/, ''), url: b || a }; })
  .filter(l => /^(https?:|mailto:)/i.test(l.url));
const img = (file, thumb) => `uploads/${thumb ? file.replace(/(\.\w+)$/, '-t$1') : file}`;
const cover = (p, i, mini) => p.images?.length
  ? `<img src="${img(p.images[0], true)}" alt="" draggable="false">`
  : `<span class="card" style="--hue:${(i * 47 + 15) % 360}">${mini ? `<b>${esc(p.title.split(/\s+/).map(w => w[0]).join('').slice(0, 2))}</b>` : `<small>${esc(p.type)} · ${esc(p.year)}</small><b>${esc(p.title)}</b>`}</span>`;
const bullets = s => { const l = lines(s); return l.length > 1 ? `<ul>${l.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : l.length ? `<p>${esc(l[0])}</p>` : ''; };
const chips = s => lines(s).length ? `<div class="chips">${s.split(',').map(t => `<span>${esc(t.trim())}</span>`).join('')}</div>` : '';
const linkBtns = s => `<div class="links">${links(s).map(l => `<a class="btn" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join('')}</div>`;
const stat = (k, v) => v ? `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>` : '';

const data = await fetch('data.json', { cache: 'no-cache' }).then(r => r.json());
const { site, projects: P, resume } = data;
const S = { size: .36, fill: .8, spin: .06, minTiles: 36, ...data.sphere };
const body = document.body, stage = $('#stage'), sphere = $('#sphere');
document.title = `${site.name} · Portfolio`;
document.documentElement.style.setProperty('--accent', site.accent || '#ff6400');
$('#start-name').textContent = site.name;
$('#start-role').textContent = site.role;
$('#scene-nav').innerHTML = `<span class="on">${esc(site.name)}</span><span>${esc(site.role)}</span>`;
$('#gm').hidden = !/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
$('#slots').innerHTML = Array.from({ length: 10 }, (_, i) => P[i]
  ? `<button class="slot" data-open="${i}" title="${esc(P[i].title)}" aria-label="${esc(P[i].title)}"><span class="mini">${cover(P[i], i, true)}</span><i>${(i + 1) % 10}</i></button>`
  : `<span class="slot"><i>${(i + 1) % 10}</i></span>`).join('');

// ---- Sphere: tiles sit on a Fibonacci lattice facing outward; each frame only the wrapper rotates.
let tiles = [], R = 1, rx = -12, ry = 0, vx = 0, vy = 0, drag = null, moved = 0;
function build() {
  const N = P.length && Math.max(P.length, S.minTiles | 0);
  R = Math.min(innerWidth, innerHeight) * S.size;
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
    el.innerHTML = cover(P[p], p);
    el.setAttribute('aria-label', P[p].title);
    if (i >= P.length) el.tabIndex = -1; // repeated covers: one tab stop per project
    el.style.transform = `translate3d(${x}px,${y}px,${z}px) rotateY(${Math.atan2(x, z)}rad) rotateX(${Math.asin(-y / R)}rad)`;
    sphere.append(el);
    return { el, x, y, z, back: null };
  });
}

const still = matchMedia('(prefers-reduced-motion: reduce)').matches, D = Math.PI / 180;
let last = performance.now(), frames = 0, fpsAt = last;
function tick(now) {
  const dt = Math.min(now - last, 50) / 16.7;
  last = now;
  if (body.dataset.mode !== 'term') {
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
    }
  }
  frames++;
  if (now - fpsAt > 1000) {
    $('#status').textContent = `● VISITOR · ${Math.round(frames * 1000 / (now - fpsAt))} FPS · ${P.length} PROJECTS`;
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
sphere.addEventListener('click', e => {
  const t = e.target.closest('.tile');
  if (t && !(e.detail && moved > 6)) openProject(+t.dataset.p); // e.detail 0 = keyboard click
});
addEventListener('resize', build);
build();
requestAnimationFrame(tick);

// ---- Windows (Foundry-style sheets): draggable, stackable, Esc closes the top one.
let zTop = 20;
function openWin(id, title, html) {
  let w = document.getElementById(id);
  if (!w) {
    w = document.createElement('section');
    w.className = 'win';
    w.id = id;
    w.setAttribute('role', 'dialog');
    w.innerHTML = '<header><b></b><button class="x" aria-label="Close">✕</button></header><div class="body"></div>';
    body.append(w);
    const n = document.querySelectorAll('.win').length - 1, h = $('header', w);
    w.style.left = `${Math.max(8, (innerWidth - w.offsetWidth) / 2 + n * 28)}px`;
    w.style.top = `${Math.max(58, innerHeight * .08 + n * 28)}px`;
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
  return w;
}

function openProject(i) {
  const p = P[i], im = p.images || [];
  openWin('win-project', p.title, `
    <div class="sheet-top">
      <div class="portrait">${im.length ? `<img src="${img(im[0])}" alt="${esc(p.title)}">` : cover(p, i)}</div>
      <div><h2>${esc(p.title)}</h2><p class="muted">${esc(p.tagline)}</p>
        <dl class="stats">${stat('Year', p.year)}${stat('Type', p.type)}${stat('Slot', `#${String(i + 1).padStart(2, '0')}`)}</dl></div>
    </div>
    ${chips(p.tools)}${bullets(p.text)}
    ${im.length > 1 ? `<div class="gallery">${im.map((f, j) => `<img src="${img(f, true)}" data-full="${img(f)}" alt="${esc(p.title)} image ${j + 1}">`).join('')}</div>` : ''}
    ${linkBtns(p.links)}`);
}

function openProfile() {
  const tabs = [{ name: 'Summary', html: `<p>${esc(site.summary)}</p>${linkBtns(site.links)}` },
    ...resume.map(r => ({ name: r.name, html: r.items.map(it => `<div class="entry"><div class="entry-head"><b>${esc(it.title)}</b><span class="muted">${esc(it.when)}</span></div>${it.org ? `<div class="muted">${esc(it.org)}</div>` : ''}${bullets(it.text)}</div>`).join('') }))];
  openWin('win-profile', site.name, `
    <h2>${esc(site.name)}</h2><p class="muted">${esc(site.role)} · ${esc(site.location)}</p>
    <dl class="stats">${stat('Projects', P.length)}${resume.map(r => stat(r.name, r.items.length)).join('')}</dl>
    <nav class="tabs">${tabs.map((t, j) => `<button data-tab="${j}"${j ? '' : ' class="on"'}>${esc(t.name)}</button>`).join('')}</nav>
    ${tabs.map((t, j) => `<div class="tab"${j ? ' hidden' : ''}>${t.html}</div>`).join('')}`);
}

function openCompendium() {
  const w = openWin('win-projects', 'Compendium · Projects', `<input type="search" placeholder="Search ${P.length} projects…" aria-label="Search projects"><ol class="comp"></ol>`);
  const q = $('input', w), list = $('.comp', w);
  const render = () => {
    list.innerHTML = P.map((p, i) => [p, i])
      .filter(([p]) => `${p.title} ${p.tagline} ${p.type} ${p.tools} ${p.year}`.toLowerCase().includes(q.value.toLowerCase()))
      .sort(([a], [b]) => a.title.localeCompare(b.title))
      .map(([p, i]) => `<li><button data-open="${i}"><span class="mini">${cover(p, i, true)}</span><b>${esc(p.title)}</b><small>${esc(p.type)} · ${esc(p.year)}</small></button></li>`).join('');
  };
  q.oninput = render;
  render();
}

// ---- Terminal view
const term = $('#term'), out = $('#term-out'), tin = $('#term-in');
const print = (html, cls = '') => { out.insertAdjacentHTML('beforeend', `<div class="${cls}">${html || ' '}</div>`); term.scrollTop = term.scrollHeight; };
const cmd = c => `<a data-cmd="${c}">${c}</a>`;
const pad = (text, n, html = esc(text)) => html + ' '.repeat(Math.max(1, n - String(text).length));
const ext = l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">[${esc(l.label)}]</a>`;
const key = name => name.toLowerCase().match(/[a-z0-9]+/)?.[0] ?? '';
const cmds = {
  help: () => print([['ls [filter]', 'list projects'], ['open <n|name>', 'show one project'], ['whoami', 'summary + contact'],
    ...resume.map(r => [key(r.name), r.name]), ['sphere', 'switch to the 3D sphere'], ['clear', 'clear the screen']]
    .map(([c, d]) => '  ' + pad(c, 18, `<a data-cmd="${c.split(' ')[0]}">${esc(c)}</a>`) + `<span class="dim">${esc(d)}</span>`).join('\n'), 'pre'),
  ls: (q = '') => {
    const rows = P.map((p, i) => [p, i]).filter(([p]) => `${p.title} ${p.type} ${p.tools} ${p.year}`.toLowerCase().includes(q.toLowerCase()));
    const tw = Math.max(8, ...P.map(p => p.title.length)) + 2, yw = Math.max(5, ...P.map(p => String(p.type).length)) + 2;
    print(`<span class="dim">  #   ${pad('PROJECT', tw)}${pad('TYPE', yw)}YEAR</span>\n`
      + rows.map(([p, i]) => `  ${String(i + 1).padStart(2, '0')}  ${pad(p.title, tw, `<a data-open="${i}">${esc(p.title)}</a>`)}${pad(p.type, yw)}${esc(p.year)}`).join('\n')
      + `\n<span class="dim">  ${rows.length}/${P.length} shown · </span>${cmd('open')}<span class="dim"> &lt;n&gt; for details</span>`, 'pre');
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
${links(p.links).map(ext).join(' ')}${im.length ? '\n' + im.map(f => `<img src="${img(f, true)}" alt="">`).join('') : ''}`);
  },
  whoami: () => print(`<b class="hl">${esc(site.name)}</b> · ${esc(site.role)} · ${esc(site.location)}\n\n${esc(site.summary)}\n\n${links(site.links).map(ext).join(' ')}`),
  sphere: () => setMode('sphere'),
  clear: () => { out.innerHTML = ''; },
};
for (const r of resume) cmds[key(r.name)] = () => print(`<b class="hl">── ${esc(r.name)} ──</b>` + r.items.map(it =>
  `\n\n<b>${esc(it.title)}</b>${it.org ? ` · ${esc(it.org)}` : ''}${it.when ? `  <span class="dim">${esc(it.when)}</span>` : ''}\n${lines(it.text).map(l => ` • ${esc(l)}`).join('\n')}`).join(''));
Object.assign(cmds, { projects: cmds.ls, about: cmds.whoami, exit: cmds.sphere, cls: cmds.clear });

const hist = [];
let hp = 0, booted = false;
function run(line) {
  print(`<span class="hl">visitor@sphere</span>:~$ ${esc(line)}`);
  line = line.trim();
  if (!line) return;
  hist.push(line);
  hp = hist.length;
  const [c, ...a] = line.split(/\s+/), name = c.toLowerCase();
  Object.hasOwn(cmds, name) ? cmds[name](a.join(' ')) : print(`command not found: ${esc(c)} · type ${cmd('help')}`);
}
function boot() {
  booted = true;
  [`<span class="dim">SPHEREFOLIO OS v1.0.3 · link established · latency 1ms</span>`,
    `<span class="dim">${P.length} projects · ${resume.length} dossiers loaded</span>`, '',
    `<b class="hl">${esc(site.name)}</b> · ${esc(site.role)}`,
    `type ${cmd('help')} or try ${cmd('ls')} ${cmd('whoami')} ${resume.slice(0, 3).map(r => cmd(key(r.name))).join(' ')} ${cmd('sphere')}`, '',
  ].forEach((l, i) => setTimeout(() => print(l), i * 110));
}
$('#term-form').onsubmit = e => { e.preventDefault(); run(tin.value); tin.value = ''; };
tin.onkeydown = e => {
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
  e.preventDefault();
  hp = Math.max(0, Math.min(hist.length, hp + (e.key === 'ArrowUp' ? -1 : 1)));
  tin.value = hist[hp] ?? '';
};
term.onclick = e => { if (!getSelection().toString() && !e.target.closest('a')) tin.focus(); };

// ---- Modes + global input
function setMode(m) {
  body.dataset.mode = m;
  document.querySelectorAll('.ctl[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === m));
  if (m === 'term') { if (!booted) boot(); tin.focus(); }
}

document.addEventListener('click', e => {
  const t = e.target.closest('[data-view],[data-win],[data-open],[data-cmd],[data-tab],.x,.gallery img');
  if (!t) return;
  const d = t.dataset;
  if (d.view) setMode(d.view);
  else if (d.win) (d.win === 'projects' ? openCompendium : openProfile)();
  else if (d.open) body.dataset.mode === 'term' ? run(`open ${+d.open + 1}`) : openProject(+d.open);
  else if (d.cmd) run(d.cmd);
  else if (d.tab) {
    const w = t.closest('.win');
    w.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b === t));
    w.querySelectorAll('.tab').forEach((x, j) => { x.hidden = j !== +d.tab; });
  }
  else if (t.matches('.x')) t.closest('.win').remove();
  else t.closest('.win').querySelector('.portrait img').src = d.full;
});

addEventListener('keydown', e => {
  const m = body.dataset.mode;
  if (e.key === 'Escape') return [...document.querySelectorAll('.win')].sort((a, b) => b.style.zIndex - a.style.zIndex)[0]?.remove();
  if (e.target.closest('input, textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
  if (m === 'start' && /^[st]$/i.test(e.key)) { e.preventDefault(); setMode(e.key.toLowerCase() === 's' ? 'sphere' : 'term'); }
  else if (m === 'term') tin.focus();
  else if (m === 'sphere' && /^\d$/.test(e.key) && P[(+e.key + 9) % 10]) openProject((+e.key + 9) % 10);
});
