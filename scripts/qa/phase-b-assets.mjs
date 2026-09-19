import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { test } from 'node:test'

const manifest = JSON.parse(readFileSync('src/lib/ripple-asset-manifest.json', 'utf8'))
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')

test('all five reviewed stills and every responsive variant ship unchanged', () => {
  assert.equal(manifest.assets.length, 5)
  for (const asset of manifest.assets) {
    const full = readFileSync(`public${asset.src}`)
    assert.equal(full.length, asset.bytes, asset.src)
    const largest = asset.variants.at(-1)
    assert.equal(sha(full), largest.sha256, `${asset.src} matches reviewed largest variant`)
    for (const variant of asset.variants) {
      const bytes = readFileSync(`public${variant.src}`)
      assert.equal(bytes.length, variant.bytes, variant.src)
      assert.equal(sha(bytes), variant.sha256, variant.src)
    }
  }
})

test('reviewed timing proof is unchanged and never misidentified as matched final art', () => {
  const sequence = manifest.sequence
  assert.equal(sha(readFileSync(`public${sequence.src}`)), sequence.sha256)
  assert.equal(sequence.status, 'TIMING_PROOF_NOT_FINAL_ART')
  assert.equal(sequence.terminalMatchesMaster, false)
  assert.equal(sequence.frameCount, 258)
  assert.equal(sequence.terminalFramePTS, 257 / 30)
  assert.equal(sequence.retiming, false)
  assert.notEqual(sequence.terminalPoster, sequence.targetMaster)
})
