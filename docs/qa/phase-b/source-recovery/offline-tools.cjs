/* eslint-disable @typescript-eslint/no-require-imports -- Local Node-only source QA. */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');

const ROOT = fs.realpathSync(path.resolve(__dirname, '../../../..'));
const QA_ROOT = path.join(ROOT, 'docs/qa/phase-b/source-recovery');
const ORIGINAL_SHA256 = '96b6c9f390d50bfafaee4b6fa8c5875251945c64f879d38accaab66e81850c49';
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

function contained(base, target) {
  if (typeof target !== 'string' || !target || target.includes('\0')) throw Error('Invalid local path');
  const resolved = path.resolve(base, target);
  const relative = path.relative(base, resolved);
  if (path.isAbsolute(relative) || relative === '..' || relative.startsWith(`..${path.sep}`)) {
    throw Error(`Path escapes allowed directory: ${target}`);
  }
  // Reject links/junctions before reading or creating anything, including a missing leaf.
  let current = base;
  for (const segment of ['', ...relative.split(path.sep).filter(Boolean)]) {
    if (segment) current = path.join(current, segment);
    try {
      if (fs.lstatSync(current).isSymbolicLink()) throw Error(`Linked path is not allowed: ${current}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return resolved;
}

function inputFile(relative) {
  const filename = contained(ROOT, relative);
  if (!fs.statSync(filename).isFile()) throw Error(`Expected a regular input file: ${relative}`);
  return filename;
}

function qaPath(relative) {
  // Walk from the repository root as well, so a linked ancestor of QA_ROOT is rejected.
  contained(ROOT, QA_ROOT);
  return contained(QA_ROOT, relative);
}

function writeFile(base, relative, contents) {
  const destination = contained(base, relative);
  contained(ROOT, destination);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  contained(base, destination);
  if (fs.existsSync(destination) && !fs.statSync(destination).isFile()) throw Error('Output must be a regular file');
  const temporary = `${destination}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  try {
    fs.writeFileSync(temporary, contents, { flag: 'wx' });
    fs.renameSync(temporary, destination);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function writeQA(relative, contents) {
  qaPath(relative);
  writeFile(QA_ROOT, relative, contents);
}

function replaceOnce(source, before, after) {
  const start = source.indexOf(before);
  if (start < 0 || source.indexOf(before, start + before.length) >= 0) {
    throw Error(`Recovered source marker must occur exactly once: ${before.slice(0, 90)}`);
  }
  return source.slice(0, start) + after + source.slice(start + before.length);
}

function recoveredSource() {
  const raw = fs.readFileSync(inputFile('docs/qa/phase-b/source-recovery/particle-continuation-original.html'));
  const text = raw.toString('utf8').replace(/\r\n/g, '\n');
  if (sha256(text) !== ORIGINAL_SHA256) throw Error('Recovered HTML fingerprint changed; review provenance before rebuilding');
  return { text, rawSHA256: sha256(raw), normalizedSHA256: sha256(text) };
}

function threeFiles() {
  const packageFile = inputFile('node_modules/three/package.json');
  const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
  if (pkg.version !== '0.182.0') throw Error(`Source QA requires installed Three.js 0.182.0; found ${pkg.version}`);
  return ['three.module.js', 'three.core.js'].map(name => {
    const route = `/node_modules/three/build/${name}`;
    const body = fs.readFileSync(inputFile(route.slice(1)));
    return { route, body, sha256: sha256(body) };
  });
}

function loadPlaywright() {
  const override = process.env.PLAYWRIGHT_MODULE;
  let modulePath;
  let pkg;
  if (override) {
    if (!path.isAbsolute(override) || /^(?:\\\\|\/\/)/.test(override) || override.includes('\0')) {
      throw Error('PLAYWRIGHT_MODULE must be an absolute local installed package directory');
    }
    const directory = fs.realpathSync(override);
    if (/^(?:\\\\|\/\/)/.test(directory) || !fs.statSync(directory).isDirectory()) throw Error('Invalid local Playwright directory');
    pkg = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
    if (!['playwright', 'playwright-core'].includes(pkg.name)) throw Error('PLAYWRIGHT_MODULE must identify Playwright');
    modulePath = require.resolve(directory);
  } else {
    try {
      modulePath = require.resolve('playwright', { paths: [ROOT] });
      pkg = JSON.parse(fs.readFileSync(require.resolve('playwright/package.json', { paths: [ROOT] }), 'utf8'));
    } catch {
      throw Error('Local Playwright is missing. Set PLAYWRIGHT_MODULE to an existing absolute package directory; no download is attempted.');
    }
  }
  const { chromium, webkit } = require(modulePath);
  if (!chromium) throw Error('Installed Playwright package does not expose Chromium');
  let executablePath = process.env.PLAYWRIGHT_BROWSER_EXECUTABLE || chromium.executablePath();
  if (!path.isAbsolute(executablePath) || /^(?:\\\\|\/\/)/.test(executablePath) || executablePath.includes('\0')) {
    throw Error('PLAYWRIGHT_BROWSER_EXECUTABLE must be an absolute local browser executable');
  }
  if (!fs.existsSync(executablePath) || !fs.statSync(executablePath).isFile()) {
    throw Error('Browser executable is missing. Set PLAYWRIGHT_BROWSER_EXECUTABLE to an installed local browser; no download is attempted.');
  }
  executablePath = fs.realpathSync(executablePath);
  if (/^(?:\\\\|\/\/)/.test(executablePath)) throw Error('Network browser executables are not allowed');
  return { chromium, webkit, version: pkg.version, executablePath };
}

async function serveScene(html, candidate = false) {
  const modules = threeFiles();
  if (candidate) {
    const body = fs.readFileSync(inputFile('src/lib/continuation-scene.js'));
    modules.push({ route: '/src/lib/continuation-scene.js', body, sha256: sha256(body) });
  }
  const routes = new Map(modules.map(file => [file.route, { body: file.body, type: 'text/javascript; charset=utf-8' }]));
  routes.set('/', { body: Buffer.from(html), type: 'text/html; charset=utf-8' });
  const server = http.createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'");
    const host = `127.0.0.1:${server.address().port}`;
    if (req.headers.host !== host || (req.headers.origin && req.headers.origin !== `http://${host}`)) {
      res.writeHead(403).end(); return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD'); res.writeHead(405).end(); return;
    }
    // Never decode, normalize, or join a requested URL into a filesystem path.
    const route = req.url;
    if (!route || !/^\/[A-Za-z0-9_./-]*$/.test(route) || route.includes('..') || route.startsWith('//')) {
      res.writeHead(400).end(); return;
    }
    if (route === '/favicon.ico') { res.writeHead(204).end(); return; }
    const resource = routes.get(route);
    if (!resource) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', resource.type);
    res.setHeader('Content-Length', resource.body.length);
    res.writeHead(200).end(req.method === 'HEAD' ? undefined : resource.body);
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 1000;
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => { server.off('error', reject); resolve(); });
  });
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    moduleSHA256: Object.fromEntries(modules.map(file => [file.route, file.sha256])),
    close: () => new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
      server.closeAllConnections();
    }),
  };
}

async function withScenePage(html, candidate, operation) {
  const { chromium, version, executablePath } = loadPlaywright();
  const server = await serveScene(html, candidate);
  let browser;
  let context;
  let page;
  let scratch;
  const oldTemp = process.env.TEMP;
  const oldTmp = process.env.TMP;
  try {
    scratch = fs.mkdtempSync(qaPath('.browser-'));
    // Playwright's temporary profiles, browser caches and downloads stay in QA too.
    process.env.TEMP = process.env.TMP = scratch;
    browser = await chromium.launch({ headless: true, timeout: 30000, executablePath,
      downloadsPath: scratch, tracesDir: scratch,
      args: ['--enable-webgl', '--ignore-gpu-blocklist', '--force-color-profile=srgb'] });
    context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1,
      serviceWorkers: 'block', reducedMotion: 'reduce' });
    const errors = [];
    await context.route('**/*', async route => {
      if (new URL(route.request().url()).origin === server.origin) await route.continue();
      else { errors.push(`Blocked external request: ${route.request().url()}`); await route.abort(); }
    });
    page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    const assertHealthy = () => { if (errors.length) throw Error(errors.slice(0, 5).join('\n')); };
    const response = await page.goto(server.origin, { waitUntil: 'load', timeout: 30000 });
    if (!response?.ok()) throw Error('Local source page did not load');
    assertHealthy();
    await page.waitForFunction(() => window.RENDER_READY === true);
    assertHealthy();
    const result = await operation({ page, assertHealthy, browserVersion: browser.version(), browserExecutable: executablePath, playwrightVersion: version,
      moduleSHA256: server.moduleSHA256 });
    assertHealthy();
    return result;
  } finally {
    if (oldTemp === undefined) delete process.env.TEMP; else process.env.TEMP = oldTemp;
    if (oldTmp === undefined) delete process.env.TMP; else process.env.TMP = oldTmp;
    try {
      if (page && !page.isClosed()) await page.evaluate(() => window.disposeSourceScene?.()).catch(() => {});
    } finally {
      try { if (context) await context.close(); }
      finally {
        try { if (browser) await browser.close(); }
        finally {
          await server.close();
          if (scratch) fs.rmSync(qaPath(scratch), { recursive: true, force: true, maxRetries: 2 });
        }
      }
    }
  }
}

module.exports = { ROOT, QA_ROOT, ORIGINAL_SHA256, contained, inputFile, qaPath, writeFile, writeQA,
  sha256, replaceOnce, recoveredSource, threeFiles, loadPlaywright, serveScene, withScenePage };
