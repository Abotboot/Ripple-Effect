import assert from 'node:assert/strict'

const base = new URL(process.env.QA_URL || 'http://localhost:3012/')
async function get(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) })
  assert.equal(response.status, 200, `HTTP 200 required: ${url}`)
  return response.text()
}
const html = await get(base)
const sections = [...html.matchAll(/<section\b[^>]*class="countermeasure-stage"[^>]*>([\s\S]*?)<\/section>/g)]
assert.equal(sections.length, 1, 'Exactly one Stage 04 section must be served')
const stage = sections[0][0]
assert.match(stage, /aria-labelledby="countermeasure-title"/, 'Stage 04 needs an accessible heading')
assert.match(stage, /id="countermeasure-title"/, 'Stage 04 heading must exist')
assert.match(stage, /<a\b[^>]*class="countermeasure-action"[^>]*href="#submit"/, 'Primary CTA must target #submit')
assert.match(stage, /href="#search"/, 'Secondary CTA must target #search')
assert.match(html, /id="search"/, 'Search anchor must exist on the served homepage')
console.log('PASS: served Stage 04 markup, heading and CTA targets')

const stylesheets = [...html.matchAll(/<link\b[^>]*>/g)]
  .map(([tag]) => /rel="stylesheet"/.test(tag) ? tag.match(/href="([^"]+)"/)?.[1] : null)
  .filter(Boolean)
assert.ok(stylesheets.length, 'Built page must link to stylesheets')
const css = (await Promise.all(stylesheets.map(path => get(new URL(path.replaceAll('&amp;', '&'), base))))).join('\n')
assert.match(css, /\.countermeasure-action\s*\{[^}]*display\s*:\s*flex/, 'Served CSS must include CTA flex layout')
assert.match(css, /\.countermeasure-action:focus-visible\s*\{[^}]*outline/, 'Served CSS must include keyboard focus styling')
assert.match(css, /\.countermeasure-layout\s*\{[^}]*grid-template-columns\s*:\s*1fr\s*[;}]/, 'Served CSS must include stacked layout')
console.log(`PASS: CTA layout, focus and stacked rules in ${stylesheets.length} served stylesheets`)
console.log('Scope: HTTP markup/CSS smoke only; does not execute client-side navigation or validate rendered geometry.')
