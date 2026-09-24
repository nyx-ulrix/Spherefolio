// Spherefolio GM server (local only). Serves the site (docs/) and the dashboard (admin/), saves edits into docs/,
// and publishes by committing docs/ and pushing to GitHub, where Pages serves the /docs folder.
const http = require('http'), fs = require('fs'), path = require('path'), { spawn, exec, execSync } = require('child_process');

const PORT = +process.env.PORT || 7420, SITE = path.join(__dirname, 'docs'), ADMIN = path.join(__dirname, 'admin'), UPLOADS = path.join(SITE, 'uploads');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm' };

const readBody = (req, max) => new Promise((resolve, reject) => {
  const chunks = [];
  let size = 0;
  req.on('data', c => { if ((size += c.length) > max) { reject(new Error('Too large')); req.destroy(); } else chunks.push(c); });
  req.on('end', () => resolve(Buffer.concat(chunks)));
  req.on('error', reject);
});

function liveUrl() {
  try {
    if (fs.existsSync(path.join(SITE, 'CNAME'))) return `https://${fs.readFileSync(path.join(SITE, 'CNAME'), 'utf8').trim()}/`; // custom domain
    const [, owner, repo] = execSync('git remote get-url origin', { cwd: __dirname }).toString().trim().match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/);
    return repo.toLowerCase() === `${owner.toLowerCase()}.github.io` ? `https://${repo}/` : `https://${owner.toLowerCase()}.github.io/${repo}/`;
  } catch { return 'https://github.com'; }
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const send = (code, text) => { res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(text); };
  // Local-only guards: the Host check stops DNS-rebinding sites; the custom header forces a CORS preflight other sites can't pass.
  if (!/^(localhost|127\.0\.0\.1):\d+$/.test(req.headers.host || '')) return send(403, 'Forbidden host');
  if (url.pathname.startsWith('/api/')) {
    if (req.headers['x-gm'] !== '1') return send(403, 'Forbidden');
    if (url.pathname === '/api/data' && req.method === 'PUT') {
      const data = JSON.parse(await readBody(req, 5e6));
      if (!Array.isArray(data.projects) || data.projects.length > 50) return send(400, 'At most 50 projects');
      const file = path.join(SITE, 'data.json');
      fs.writeFileSync(`${file}.tmp`, JSON.stringify(data, null, 2));
      fs.renameSync(`${file}.tmp`, file); // atomic swap: a crash mid-save never leaves a half-written data.json
      return send(200, 'saved');
    }
    const name = url.searchParams.get('name') || '';
    if (url.pathname === '/api/upload' && /^[\w-]+\.(webp|jpg|mp4|webm)$/.test(name)) {
      const file = path.join(UPLOADS, name);
      // 50 MB cap: GitHub warns above 50 MB and rejects files over 100 MB.
      if (req.method === 'POST') { fs.mkdirSync(UPLOADS, { recursive: true }); fs.writeFileSync(file, await readBody(req, 50e6)); return send(200, 'uploaded'); }
      if (req.method === 'DELETE') { fs.rmSync(file, { force: true }); return send(200, 'deleted'); }
    }
    if (url.pathname === '/api/publish' && req.method === 'POST') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      const git = spawn('git add docs && (git diff --cached --quiet || git commit -m "Update portfolio") && git push', { cwd: __dirname, shell: true });
      git.stdout.pipe(res, { end: false });
      git.stderr.pipe(res, { end: false });
      git.on('close', code => res.end(code ? `\n✖ Publish failed (exit ${code})\n` : `\n✔ Pushed. GitHub Pages updates in about a minute: ${liveUrl()}\n`));
      return;
    }
    return send(404, 'Unknown API call');
  }
  if (url.pathname === '/live') { res.writeHead(302, { Location: liveUrl() }); return res.end(); }
  if (url.pathname === '/admin') { res.writeHead(302, { Location: '/admin/' }); return res.end(); }
  const [root, rel] = url.pathname.startsWith('/admin/') ? [ADMIN, url.pathname.slice(7)] : [SITE, url.pathname.slice(1)];
  const file = path.join(root, decodeURIComponent(rel) || 'index.html');
  if (!file.startsWith(root + path.sep)) return send(403, 'Forbidden');
  fs.readFile(file, (err, buf) => {
    if (err) return send(404, 'Not found');
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(buf);
  });
}

const server = http.createServer((req, res) => handle(req, res).catch(err => {
  if (!res.headersSent) res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(err.message);
}));
const base = () => `http://127.0.0.1:${server.address()?.port ?? PORT}`;
const openBrowser = () => process.argv.includes('--no-open') || exec(`${{ win32: 'start ""', darwin: 'open' }[process.platform] || 'xdg-open'} ${base()}/admin/`);
let fellBack = false;
server.on('error', err => {
  // Windows (Hyper-V/WSL) reserves shifting port ranges; if ours is taken that way, use any free port instead.
  if (err.code === 'EACCES' && !fellBack) { fellBack = true; console.log(`Port ${PORT} is reserved by Windows, using a free port instead.`); return server.listen(0, '127.0.0.1'); }
  if (err.code !== 'EADDRINUSE') throw err;
  console.log(`Already running: ${base()}/admin/`); // a second double-click just reopens the dashboard
  openBrowser();
});
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Spherefolio GM dashboard: ${base()}/admin/\nSite preview: ${base()}/\nClose this window to stop.`);
  openBrowser();
});
