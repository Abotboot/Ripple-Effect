/* eslint-disable @typescript-eslint/no-require-imports -- Source-specific Node QA. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { ROOT, QA_ROOT, contained, qaPath, writeQA, replaceOnce, serveScene, loadPlaywright } = require('./offline-tools.cjs');
const { buildCandidate } = require('../../../../scripts/phase-b-source-build.cjs');
const { normalizeUUIDs } = require('../../../../scripts/phase-b-source-export.cjs');

test('output containment rejects escapes, siblings and NULs before creating files', () => {
  for (const name of ['../outside.png', '../../../../../outside.png', '\0.png', path.join(QA_ROOT + '-sibling', 'outside.png')]) {
    assert.throws(() => qaPath(name));
  }
  assert.equal(qaPath('candidate-still/terminal.png'), path.join(QA_ROOT, 'candidate-still/terminal.png'));
  assert.throws(() => contained(ROOT, path.dirname(ROOT)));
});

test('output containment rejects directory links and refuses to write through them', () => {
  const scratch = fs.mkdtempSync(qaPath('.path-check-'));
  try {
    const target = path.join(scratch, 'target');
    const link = path.join(scratch, 'linked');
    fs.mkdirSync(target);
    fs.symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
    assert.throws(() => writeQA(path.relative(QA_ROOT, path.join(link, 'unexpected.txt')), 'must not be written'), /Linked path/);
    assert.equal(fs.existsSync(path.join(target, 'unexpected.txt')), false);
  } finally {
    // Remove the link itself before the verified temporary directory.
    const link = path.join(scratch, 'linked');
    if (fs.existsSync(link)) fs.unlinkSync(link);
    fs.rmSync(qaPath(scratch), { recursive: true, force: true });
  }
});

test('source transformations reject missing or ambiguous markers', () => {
  assert.throws(() => replaceOnce('a b a', 'a', 'c'), /exactly once/);
  assert.throws(() => replaceOnce('a b a', 'missing', 'c'), /exactly once/);
  assert.equal(replaceOnce('a b c', 'b', 'replacement'), 'a replacement c');
});

test('candidate regeneration is stable and matches checked-in generated modules', () => {
  const first = buildCandidate();
  assert.deepEqual(first, buildCandidate());
  for (const [filename, contents] of Object.entries(first)) {
    assert.equal(fs.readFileSync(contained(ROOT, filename), 'utf8').replace(/\r\n/g, '\n'), contents);
  }
});

test('export UUID normalization preserves relationships across fresh runtime IDs', () => {
  const first = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const second = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const a = normalizeUUIDs({ uuid: first, children: [{ reference: first }, { uuid: second }] });
  const b = normalizeUUIDs({ uuid: second, children: [{ reference: second }, { uuid: first }] });
  assert.deepEqual(a, b);
  assert.equal(a.uuid, a.children[0].reference);
  assert.notEqual(a.uuid, a.children[1].uuid);
});

test('Playwright override must be an absolute local installed package directory', () => {
  const previous = process.env.PLAYWRIGHT_MODULE;
  try {
    for (const value of ['../playwright', 'https://example.invalid/playwright', '\\\\server\\playwright']) {
      process.env.PLAYWRIGHT_MODULE = value;
      assert.throws(() => loadPlaywright(), /absolute local/);
    }
  } finally {
    if (previous === undefined) delete process.env.PLAYWRIGHT_MODULE; else process.env.PLAYWRIGHT_MODULE = previous;
  }
});

function request(origin, route, options = {}) {
  const url = new URL(origin);
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: url.hostname, port: url.port, path: route, method: options.method ?? 'GET',
      headers: options.headers ?? {} }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    req.setTimeout(5000, () => req.destroy(Error('Local route check timed out')));
    req.on('error', reject);
    req.end();
  });
}

test('loopback server serves exact module routes and rejects traversal, malformed URLs and unrelated files', async () => {
  const server = await serveScene('<!doctype html><title>local QA</title>', true);
  try {
    assert.equal((await request(server.origin, '/')).status, 200);
    const moduleResponse = await request(server.origin, '/src/lib/continuation-scene.js');
    assert.equal(moduleResponse.status, 200);
    assert.match(moduleResponse.headers['content-type'], /text\/javascript/);
    for (const route of ['/src/lib/continuation-scene.js-extra', '/package.json', '/node_modules/three/package.json',
      '/node_modules/three/build/not-present.js', '/docs/qa/phase-b/source-recovery/terminal-state-full.json']) {
      const response = await request(server.origin, route);
      assert.equal(response.status, 404, route);
      assert.equal(response.body.length, 0);
    }
    for (const route of ['/../package.json', '/node_modules/three/../../package.json', '/%2e%2e/package.json',
      '/node_modules/three/build/three.module.js%00', '/%zz', '/src\\lib\\continuation-scene.js',
      '//example.invalid/', 'http://example.invalid/']) {
      assert.equal((await request(server.origin, route)).status, 400, route);
    }
    assert.equal((await request(server.origin, '/node_modules/three/build/three.core.js')).status, 200);
    const head = await request(server.origin, '/', { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(head.body.length, 0);
    assert.equal((await request(server.origin, '/', { method: 'POST' })).status, 405);
    assert.equal((await request(server.origin, '/', { headers: { Host: 'example.invalid' } })).status, 403);
    assert.equal((await request(server.origin, '/', { headers: { Origin: 'https://example.invalid' } })).status, 403);
  } finally { await server.close(); }
  await assert.rejects(request(server.origin, '/'));
});
