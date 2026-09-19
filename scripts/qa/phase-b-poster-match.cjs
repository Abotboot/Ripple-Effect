/* eslint-disable @typescript-eslint/no-require-imports -- Offline decoded-pixel acceptance check. */
'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const sharp = require('sharp')

const root = path.resolve(__dirname, '../..')
const manifest = require('../../src/lib/ripple-asset-manifest.json')
const output = path.join(root, 'docs/qa/phase-b/checks')
const media = src => path.join(root, 'public', src)

async function main() {
  fs.mkdirSync(output, { recursive: true })
  const report = {
    createdAt: new Date().toISOString(),
    scope: 'Decoded media pixels only; not a browser colorspace or live-renderer handoff match.',
    video: manifest.sequence.src,
    comparisons: [],
  }
  for (const [name, frameIndex, poster] of [
    ['opening', 0, manifest.sequence.poster],
    ['terminal', manifest.sequence.terminalFrameIndex, manifest.sequence.terminalPoster],
  ]) {
    const decoded = spawnSync(process.env.FFMPEG_PATH || 'ffmpeg', [
      '-v', 'error', '-i', media(manifest.sequence.src),
      '-vf', `select=eq(n\\,${frameIndex})`, '-frames:v', '1',
      '-f', 'image2pipe', '-vcodec', 'png', 'pipe:1',
    ], { windowsHide: true, timeout: 30000, maxBuffer: 16 * 1024 * 1024 })
    if (decoded.error) throw decoded.error
    assert.equal(decoded.status, 0, decoded.stderr?.toString() || 'Frame decode failed')
    const a = await sharp(decoded.stdout).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const b = await sharp(media(poster)).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    assert.deepEqual([a.info.width, a.info.height, a.info.channels], [b.info.width, b.info.height, b.info.channels])
    let mismatchedChannels = 0
    let maximumDifference = 0
    let absoluteDifference = 0
    for (let i = 0; i < a.data.length; i++) {
      const difference = Math.abs(a.data[i] - b.data[i])
      if (difference) mismatchedChannels++
      maximumDifference = Math.max(maximumDifference, difference)
      absoluteDifference += difference
    }
    const comparison = { name, frameIndex, poster, width: a.info.width, height: a.info.height, mismatchedChannels, maximumDifference, meanAbsoluteDifference: absoluteDifference / a.data.length, exact: mismatchedChannels === 0 }
    report.comparisons.push(comparison)
    fs.writeFileSync(path.join(output, 'poster-match.json'), JSON.stringify(report, null, 2) + '\n')
    console.log(JSON.stringify(comparison))
    assert.equal(mismatchedChannels, 0, `${name} poster must preserve exact decoded pixels`)
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
