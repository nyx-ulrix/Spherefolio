// GM dashboard: edits docs/data.json and uploads images through the local server (server.js). Never deployed.
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const api = (url, o = {}) => fetch(url, { ...o, headers: { 'X-GM': '1' } });
const thumb = file => `/uploads/${file.replace(/(\.\w+)$/, '-t$1')}`;
const MAX = 50;

const data = await fetch('/data.json', { cache: 'no-store' }).then(r => r.json());
let view = ['site'], timer = null; // view: ['project', index] | ['site'] | ['resume']

const get = path => path.split('.').reduce((o, k) => o?.[k], data);
const set = (path, v) => { const k = path.split('.'), last = k.pop(); k.reduce((o, x) => o[x], data)[last] = v; };
const log = (s, raw) => { const l = $('#log'); l.textContent += raw ? s : `${s}\n`; l.scrollTop = l.scrollHeight; };
const field = (label, path, type = 'text', attrs = '') => `<label><span>${label}</span>${type === 'area'
  ? `<textarea data-path="${path}" rows="${Math.max(3, Math.min(14, String(get(path) ?? '').split('\n').length + 1))}">${esc(get(path))}</textarea>`
  : `<input type="${type}" data-path="${path}" value="${esc(get(path))}" ${attrs}>`}</label>`;
const blank = () => ({ title: 'New project', tagline: '', year: String(new Date().getFullYear()), type: '', tools: '', links: '', text: '', images: [] });
const swap = (a, x, y) => { if (a[x] && a[y]) [a[x], a[y]] = [a[y], a[x]]; };
const rmFiles = file => [file, file.replace(/(\.\w+)$/, '-t$1')].forEach(f => api(`/api/upload?name=${f}`, { method: 'DELETE' }));

// ---- Saving: debounced full-file PUT; the server swaps data.json atomically.
function save() { $('#saved').textContent = 'unsaved…'; clearTimeout(timer); timer = setTimeout(flush, 400); }
async function flush() {
  clearTimeout(timer);
  timer = null;
  try {
    const r = await api('/api/data', { method: 'PUT', body: JSON.stringify(data) });
    if (!r.ok) throw new Error(await r.text());
    $('#saved').textContent = 'saved ✓';
  } catch (e) { $('#saved').textContent = `✖ NOT SAVED: ${e.message}`; log(`✖ Save failed: ${e.message} (is the GM server window still open?)`); }
}
addEventListener('beforeunload', e => { if (timer) e.preventDefault(); });

// ---- Rendering
function renderList() {
  const q = $('#q').value.toLowerCase(), P = data.projects;
  $('#count').textContent = `${P.length} / ${MAX} projects`;
  $('#new').disabled = P.length >= MAX;
  $('#plist').innerHTML = P.map((p, i) => !p.title.toLowerCase().includes(q) ? '' :
    `<li><button data-pick="${i}"${view[0] === 'project' && view[1] === i ? ' class="on"' : ''}><span class="mini">${p.images[0] ? `<img src="${thumb(p.images[0])}" alt="">` : `<span class="art" style="--hue:${(i * 47 + 15) % 360};--sx:${20 + (i * 29) % 60}%"></span>`}</span><b>${String(i + 1).padStart(2, '0')} · ${esc(p.title)}</b><small>${esc(p.type)}</small></button></li>`).join('');
}

function render() {
  renderList();
  const [kind, i] = view, ed = $('#editor');
  if (kind === 'project') {
    const p = data.projects[i], b = `projects.${i}.`;
    ed.innerHTML = `
      <div class="ed-head"><h2>${esc(p.title) || 'Untitled'}</h2>
        <button class="btn" data-act="up"${i ? '' : ' disabled'}>↑ Move up</button>
        <button class="btn" data-act="down"${i < data.projects.length - 1 ? '' : ' disabled'}>↓ Move down</button>
        <button class="btn danger" data-act="del">Delete</button></div>
      <p class="muted">Slot #${i + 1}. Order here is the order on the site.</p>
      <div class="grid">${field('Title', `${b}title`)}${field('Tagline', `${b}tagline`)}${field('Year', `${b}year`)}${field('Type', `${b}type`)}</div>
      ${field('Tools (comma separated)', `${b}tools`)}
      ${field('Details (one bullet per line)', `${b}text`, 'area')}
      ${field('Links (one per line: Label | https://…)', `${b}links`, 'area')}
      <h3>Images · first is the cover</h3>
      <label class="drop">Drop images anywhere on this page, or click to choose<input type="file" accept="image/*" multiple hidden></label>
      <div class="imgs">${p.images.map((f, j) => `<figure><img src="${thumb(f)}" alt=""><figcaption>${j ? `<button class="btn" data-act="cover" data-j="${j}">★ Make cover</button>` : '<span class="hl">★ Cover</span>'}<button class="btn danger" data-act="rmimg" data-j="${j}" aria-label="Remove image">✕</button></figcaption></figure>`).join('')}</div>`;
  } else if (kind === 'site') {
    ed.innerHTML = `<h2>Site &amp; UI</h2>
      <h3>Identity</h3>
      <div class="grid">${field('Name', 'site.name')}${field('Headline', 'site.role')}${field('Location', 'site.location')}${field('Accent colour', 'site.accent', 'color')}</div>
      ${field('Summary', 'site.summary', 'area')}
      ${field('Contact links (one per line: Label | https://… or mailto:…)', 'site.links', 'area')}
      <h3>Sphere</h3>
      <div class="grid">${field('Size', 'sphere.size', 'range', 'min="0.2" max="0.5" step="0.01"')}${field('Tile fill', 'sphere.fill', 'range', 'min="0.4" max="1" step="0.05"')}${field('Spin speed', 'sphere.spin', 'range', 'min="0" max="0.4" step="0.01"')}${field('Minimum tiles (repeats covers)', 'sphere.minTiles', 'number', 'min="0" max="120"')}</div>
      <p class="muted">Open “Preview site” and refresh it to see changes.</p>`;
  } else {
    ed.innerHTML = `<div class="ed-head"><h2>Resume &amp; jobs</h2><button class="btn" data-act="addsec">+ Add section</button></div>
      <p class="muted">Each section is a tab on the profile sheet and a terminal command (its first word). New entries go on top.</p>`
      + data.resume.map((s, si) => `<div class="section">
        <div class="ed-head">${field('Section', `resume.${si}.name`)}<button class="btn" data-act="additem" data-si="${si}">+ Add entry</button><button class="btn danger" data-act="rmsec" data-si="${si}">Delete section</button></div>
        ${s.items.map((it, ii) => { const b = `resume.${si}.items.${ii}.`; return `<div class="item">
          <div class="grid">${field('Title / role', `${b}title`)}${field('Organisation · place', `${b}org`)}${field('When', `${b}when`)}</div>
          ${field('Details (one bullet per line)', `${b}text`, 'area')}
          <div class="row"><button class="btn" data-act="upitem" data-si="${si}" data-ii="${ii}"${ii ? '' : ' disabled'}>↑ Move up</button><button class="btn danger" data-act="rmitem" data-si="${si}" data-ii="${ii}">Remove entry</button></div></div>`; }).join('')}
      </div>`).join('');
  }
}

// ---- Editing
$('#editor').addEventListener('input', e => {
  const el = e.target, path = el.dataset.path;
  if (!path) return;
  set(path, ['range', 'number'].includes(el.type) ? +el.value : el.value);
  if (/^projects\.\d+\.title$/.test(path)) $('#editor h2').textContent = el.value || 'Untitled';
  if (path.startsWith('projects.')) renderList();
  save();
});
$('#editor').addEventListener('change', e => { if (e.target.type === 'file') upload(e.target.files); });
$('#q').addEventListener('input', renderList);
addEventListener('dragover', e => e.preventDefault());
addEventListener('drop', e => { e.preventDefault(); if (view[0] === 'project') upload(e.dataTransfer.files); else log('Open a project first, then drop images on it.'); });

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act],[data-pick],[data-go]');
  if (!b) return;
  const d = b.dataset, P = data.projects, i = view[1], j = +d.j, si = +d.si, ii = +d.ii;
  if (d.pick) { view = ['project', +d.pick]; return render(); }
  if (d.go) { view = [d.go]; return render(); }
  switch (d.act) {
    case 'publish': return publish(b);
    case 'new': if (P.length >= MAX) return; P.push(blank()); view = ['project', P.length - 1]; break;
    case 'up': swap(P, i, i - 1); view[1] = i - 1; break;
    case 'down': swap(P, i, i + 1); view[1] = i + 1; break;
    case 'del':
      if (!confirm(`Delete "${P[i].title}" and its images?`)) return;
      P[i].images.forEach(rmFiles);
      P.splice(i, 1);
      view = P.length ? ['project', Math.min(i, P.length - 1)] : ['site'];
      break;
    case 'cover': P[i].images.unshift(...P[i].images.splice(j, 1)); break;
    case 'rmimg': rmFiles(P[i].images.splice(j, 1)[0]); break;
    case 'addsec': data.resume.push({ name: 'New section', items: [] }); break;
    case 'rmsec': if (!confirm(`Delete the "${data.resume[si].name}" section?`)) return; data.resume.splice(si, 1); break;
    case 'additem': data.resume[si].items.unshift({ title: '', org: '', when: '', text: '' }); break;
    case 'upitem': swap(data.resume[si].items, ii, ii - 1); break;
    case 'rmitem': data.resume[si].items.splice(ii, 1); break;
    default: return;
  }
  render();
  save();
});

// ---- Images: resized + converted to WebP in the browser (full 1600px, thumb 480px) to stay light on Pages bandwidth.
async function upload(files) {
  const p = data.projects[view[1]];
  for (const f of files) {
    if (!f.type.startsWith('image/')) continue;
    log(`› Uploading ${f.name}…`);
    try {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7), bmp = await createImageBitmap(f);
      for (const [suffix, max, q] of [['', 1600, 0.82], ['-t', 480, 0.75]]) {
        const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
        const c = new OffscreenCanvas(Math.round(bmp.width * s), Math.round(bmp.height * s));
        c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
        const r = await api(`/api/upload?name=${id}${suffix}.webp`, { method: 'POST', body: await c.convertToBlob({ type: 'image/webp', quality: q }) });
        if (!r.ok) throw new Error(await r.text());
      }
      p.images.push(`${id}.webp`);
      render();
      save();
      log(`✔ ${f.name} added to "${p.title}"`);
    } catch (err) { log(`✖ ${f.name}: ${err.message}`); }
  }
}

// ---- Publish: server commits docs/ and pushes; output streams into the console.
async function publish(btn) {
  btn.disabled = true;
  if (timer) await flush();
  log('› Publishing to GitHub Pages…');
  try {
    const r = await api('/api/publish', { method: 'POST' }), reader = r.body.getReader(), dec = new TextDecoder();
    for (let c; !(c = await reader.read()).done;) log(dec.decode(c.value, { stream: true }), true);
  } catch (e) { log(`✖ ${e.message}`); }
  btn.disabled = false;
}

render();
