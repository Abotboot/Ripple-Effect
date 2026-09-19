/* eslint-disable @typescript-eslint/no-require-imports -- Local media preparation/verification; no API calls. */
'use strict'
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { spawnSync } = require('node:child_process')
const sharp = require('sharp')
const root = path.resolve(__dirname, '../..')
const dir = path.join(root, 'public/media/ripple/microscope')
const qa = path.join(root, 'docs/qa/phase-d/microscope')
const source = path.join(qa, 'kie-source.mp4')
const delivery = path.join(dir, 'microscope-journey.mp4')
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
function run(command, args) {
  const r = spawnSync(command, args, { cwd: root, windowsHide: true, maxBuffer: 16 * 1024 * 1024, timeout: 90000 })
  if (r.error) throw r.error
  assert.equal(r.status, 0, r.stderr?.toString())
  return r.stdout
}
async function main() {
  fs.mkdirSync(dir, { recursive: true })
  assert(fs.existsSync(source), 'Use the already generated candidate; this script never generates or spends credits')
  const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg'
  if (process.argv.includes('--prepare')) {
    assert(!fs.existsSync(delivery), 'Existing reviewed delivery is preserved')
    // Preserve the new generated camera approach; a short editorial optical dissolve
    // supplies the exact black handoff the generator did not reach. Not a 3D pass-through.
    run(ffmpeg, ['-v', 'error', '-i', source, '-an', '-vf',
      "scale=1920:1080:flags=lanczos,fps=30,trim=duration=5,setpts=PTS-STARTPTS,fade=t=out:st=4.5:d=0.4666666667,drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill:enable='gte(n,149)'",
      '-frames:v', '150', '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', delivery])
  }
  const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries',
    'stream=width,height,avg_frame_rate,nb_read_frames:format=duration,size', '-of', 'json', delivery]).toString())
  assert.equal(probe.streams[0].nb_read_frames, '150'); assert.equal(probe.streams[0].avg_frame_rate, '30/1')
  assert.equal(Number(probe.format.duration), 5)
  const posters = []
  for (const [name, frame] of [['opening.webp', 0], ['terminal.webp', 149]]) {
    const rgb = run(ffmpeg, ['-v', 'error', '-i', delivery, '-vf', `select=eq(n\\,${frame})`, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'])
    assert.equal(rgb.length, 1920 * 1080 * 3)
    const target = path.join(dir, name)
    if (process.argv.includes('--prepare')) {
      assert(!fs.existsSync(target), 'Existing poster preserved')
      fs.writeFileSync(target, await sharp(rgb, { raw: { width: 1920, height: 1080, channels: 3 } }).webp({ lossless: true }).toBuffer())
    }
    const decoded = await sharp(target).removeAlpha().raw().toBuffer()
    assert(decoded.equals(rgb), 'Poster exactly matches delivery frame')
    if (frame === 149) assert(rgb.every(v => v === 0), 'Final delivery frame is exact optical black')
    posters.push({ file: path.relative(root, target).replaceAll('\\', '/'), frame, rgbSHA256: hash(rgb) })
  }
  const report = { createdAt: new Date().toISOString(), success: true, sourceSHA256: hash(fs.readFileSync(source)),
    source: 'Kie.ai Kling v2.5 Turbo image-to-video, five-second request; earlier user-owned microscope artwork reference',
    generationCount: 1, creditsConsumed: 42, creditsPurchased: 0,
    delivery: { file: path.relative(root, delivery).replaceAll('\\', '/'), sha256: hash(fs.readFileSync(delivery)), bytes: fs.statSync(delivery).size, width: 1920, height: 1080, duration: 5, frames: 150, fps: 30 },
    editing: 'Native 1916x1080/24fps candidate normalized to 1920x1080/30fps/5s. Audio removed. Final 0.4667s editorial dissolve to exact black; no claim generator entered the lens. Original approved prior clip preserved separately.', posters }
  fs.writeFileSync(path.join(qa, 'delivery.json'), JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report))
}
main().catch(error => { console.error(error); process.exitCode = 1 })
