/* eslint-disable @typescript-eslint/no-require-imports -- Offline media verification only. */
'use strict'

const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const sharp = require('sharp')

const root = path.resolve(__dirname, '../..')
const qa = path.join(root, 'docs/qa/phase-f/microscope')
const approach = path.join(qa, 'deterministic-left-eyepiece-approach-v3.mp4')
const firstInput = path.join(qa, 'left-eyepiece-entry-input-v3.png')
const terminalInput = path.join(qa, 'input/lens-interior-last.png')
const delivery = path.join(root, 'public/media/ripple/microscope/microscope-journey-v4.mp4')
const openingPoster = path.join(root, 'public/media/ripple/microscope/opening-v4.png')
const terminalPoster = path.join(root, 'public/media/ripple/microscope/terminal-v4.png')
const reportFile = path.join(qa, 'approved-delivery.json')

const rejectedWanHash = 'B6946427A84D29C48E38A31AB4299A3E6BA4D45B611116013DA6F56A75BC13EF'
const approvedSourceHash = '1874274321D1A9B9A596AF65563166468B769A2420C2D8E79CEC1B99934ED47C'
const trimmedDeliveryHash = '28031DA7910E070684F0423B9794E6E50CB31D5CB0465A66BE880F6913A32AF8'
const browserTerminalPosterHash = '1618771967958B7464FE7D04A6E8A352810C3A6C863A670122C89F191F696302'
const expected = {
  approach: '7B335CDEBF89AEAA65A2EA96EC3CA13ED15A47255E8CCDC21A1E8F1F7D4D6092',
  firstInput: 'C6FB36F820528DDA0C1C8E38B5F3A779272042770653B913B9F4E47654388C37',
  terminalInput: '00C51AA16E81897A974A7AB3EE9E43E53E11FB552E3249E80C93035E3C1ADAA2',
  approachTerminalRgb: 'C9FB57E9F6255A22EB9873D5E3699F4AFF05D189FC21F53DD9E895B28DD7CE7C',
}

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase()
const slash = file => path.relative(root, file).replaceAll('\\', '/')
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg'
const ffprobe = process.env.FFPROBE_PATH || 'ffprobe'

function run(command, args, timeout = 120000) {
  const result = spawnSync(command, args, {
    cwd: root,
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
    timeout,
  })
  if (result.error) throw result.error
  assert.equal(result.status, 0, result.stderr?.toString() || `${command} failed`)
  return result.stdout
}

function probe(file, countFrames = false) {
  const args = ['-v', 'error', '-select_streams', 'v:0']
  if (countFrames) args.push('-count_frames')
  args.push(
    '-show_entries',
    `stream=codec_name,profile,width,height,pix_fmt,avg_frame_rate,r_frame_rate,nb_frames${countFrames ? ',nb_read_frames' : ''}:format=duration,size,format_name`,
    '-of',
    'json',
    file,
  )
  const value = JSON.parse(run(ffprobe, args).toString())
  assert(value.streams?.length === 1, `Expected exactly one video stream: ${file}`)
  return { stream: value.streams[0], format: value.format }
}

function assertHash(file, wanted, label) {
  assert(fs.existsSync(file), `Missing ${label}: ${file}`)
  const actual = sha256(fs.readFileSync(file))
  assert.equal(actual, wanted, `${label} hash changed`)
  return actual
}

function decodeFrame(file, frame) {
  const rgb = run(ffmpeg, [
    '-v', 'error', '-i', file, '-vf', `select=eq(n\\,${frame})`,
    '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1',
  ])
  assert.equal(rgb.length, 1280 * 720 * 3, `Could not decode frame ${frame}`)
  return rgb
}

async function verifyFixedEvidence() {
  const hashes = {
    approach: assertHash(approach, expected.approach, 'deterministic approach v3'),
    firstInput: assertHash(firstInput, expected.firstInput, 'left-eyepiece first input v3'),
    terminalInput: assertHash(terminalInput, expected.terminalInput, 'lens-interior terminal input'),
  }
  const approachProbe = probe(approach, true)
  assert.equal(approachProbe.stream.width, 1920)
  assert.equal(approachProbe.stream.height, 1080)
  assert.equal(approachProbe.stream.avg_frame_rate, '30/1')
  assert.equal(approachProbe.stream.nb_read_frames, '60')
  assert.equal(Number(approachProbe.format.duration), 2)
  const approachTerminal = run(ffmpeg, [
    '-v', 'error', '-i', approach, '-vf', 'select=eq(n\\,59)',
    '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1',
  ])
  assert.equal(approachTerminal.length, 1920 * 1080 * 3)
  assert.equal(sha256(approachTerminal), expected.approachTerminalRgb)
  const firstPixels = await sharp(firstInput).removeAlpha().raw().toBuffer()
  assert(firstPixels.equals(approachTerminal), 'first-input v3 must equal decoded approach terminal pixels')
  return {
    deterministicCandidateStatus: 'unused-preserved-evidence',
    hashes,
    decodedApproachTerminalRgbSHA256: expected.approachTerminalRgb,
  }
}

async function verifyLiveDelivery() {
  const fixed = await verifyFixedEvidence()
  const deliveryHash = assertHash(delivery, trimmedDeliveryHash, 'approved trimmed v4 delivery')
  assert.notEqual(deliveryHash, rejectedWanHash)
  const media = probe(delivery, true)
  assert.equal(media.stream.codec_name, 'h264')
  assert.equal(media.stream.width, 1280)
  assert.equal(media.stream.height, 720)
  assert.equal(media.stream.pix_fmt, 'yuv420p')
  assert.equal(media.stream.avg_frame_rate, '30/1')
  assert.equal(media.stream.nb_read_frames, '89')
  assert.equal(Number(media.format.duration), 2.966016)
  assert.equal(Number(media.format.size), 2377212)

  const firstRgb = decodeFrame(delivery, 0)
  const finalRgb = decodeFrame(delivery, 88)
  assert(finalRgb.some(value => value !== 0), 'Approved terminal frame must not be editorial black')
  const openingRgb = await sharp(openingPoster).removeAlpha().raw().toBuffer()
  const terminalRgb = await sharp(terminalPoster).removeAlpha().raw().toBuffer()
  assert(openingRgb.equals(firstRgb), 'Opening poster must exactly match decoded delivery frame 0')
  assertHash(terminalPoster, browserTerminalPosterHash, 'browser-authoritative terminal poster')
  const browserProofs = [
    path.join(qa, 'browser/normal-1440x900-video-end.png'),
    path.join(qa, 'browser/normal-390x844-video-end.png'),
  ]
  for (const proof of browserProofs) assertHash(proof, browserTerminalPosterHash, 'browser-decoded terminal proof')
  let differingBytes = 0, maxDelta = 0, sumDelta = 0
  for (let i = 0; i < terminalRgb.length; i++) {
    const delta = Math.abs(terminalRgb[i] - finalRgb[i])
    if (delta) differingBytes++
    if (delta > maxDelta) maxDelta = delta
    sumDelta += delta
  }
  const ffmpegToBrowserTerminalDelta = { differingBytes, totalBytes: terminalRgb.length, maxDelta, meanAbsoluteDelta: sumDelta / terminalRgb.length }
  assert(maxDelta <= 5 && ffmpegToBrowserTerminalDelta.meanAbsoluteDelta < 1, 'Browser terminal proof diverges unexpectedly from source frame 88')

  const report = {
    verifiedAt: new Date().toISOString(),
    worker: 'worker-5',
    userVisualApproval: 'User watched the full take and explicitly said it looks perfect before integration.',
    source: {
      originalPath: 'C:/Users/ayada/Downloads/wan-3-video-53cbd3dc-82bb-4832-9a0b-65a6c50fcc61.mp4',
      sha256: approvedSourceHash,
      bytes: 3697477,
      frames: 90,
      durationSeconds: 3.065011,
      firstBadFrame: 89,
      firstBadFrameTimeSeconds: 2.966667,
      lastKeptFrame: 88,
      lastKeptFrameTimeSeconds: 2.933333,
    },
    delivery: {
      file: slash(delivery),
      sha256: deliveryHash,
      byteIdenticalToApprovedSource: false,
      edit: 'Frame-accurate trim of source frames 0-88; required re-encode because stream-copy retained source frame 89.',
      bytes: Number(media.format.size),
      codec: media.stream.codec_name,
      profile: media.stream.profile,
      pixelFormat: media.stream.pix_fmt,
      width: media.stream.width,
      height: media.stream.height,
      fps: media.stream.avg_frame_rate,
      frames: Number(media.stream.nb_read_frames),
      durationSeconds: Number(media.format.duration),
      firstDecodedRgbSHA256: sha256(firstRgb),
      finalDecodedRgbSHA256: sha256(finalRgb),
      editorialFadeOrBlackAdded: false,
      speedChanged: false,
      deterministicApproachPrepended: false,
      framesInterpolatedOrPadded: false,
    },
    posters: {
      opening: {
        file: slash(openingPoster),
        sha256: sha256(fs.readFileSync(openingPoster)),
        decodedRgbSHA256: sha256(openingRgb),
        frame: 0,
        exactDecodedFrameMatch: true,
      },
      terminal: {
        file: slash(terminalPoster),
        sha256: sha256(fs.readFileSync(terminalPoster)),
        decodedRgbSHA256: sha256(terminalRgb),
        frame: 88,
        exactBrowserDecodedFrameMatch: true,
        browserProofFiles: browserProofs.map(slash),
        ffmpegDecodedFrame88RgbSHA256: sha256(finalRgb),
        ffmpegToBrowserTerminalDelta,
        isExactBlack: terminalRgb.every(value => value === 0),
      },
    },
    fixedEvidence: fixed,
    activeJourneyPath: '/media/ripple/microscope/microscope-journey-v4.mp4',
  }
  if (process.argv.includes('--write-report')) {
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n')
  }
  return report
}

async function main() {
  if (process.argv.includes('--verify-live')) {
    console.log(JSON.stringify(await verifyLiveDelivery(), null, 2))
    return
  }
  console.log(JSON.stringify({
    ok: true,
    mode: 'fixed-evidence-verification',
    worker: 'worker-5',
    fixed: await verifyFixedEvidence(),
    approvedSourceSHA256: approvedSourceHash,
    rejectedWanSHA256: rejectedWanHash,
    providerJobsSubmittedByThisScript: 0,
  }, null, 2))
}

main().catch(error => {
  console.error(error.stack || error.message)
  process.exitCode = 1
})
