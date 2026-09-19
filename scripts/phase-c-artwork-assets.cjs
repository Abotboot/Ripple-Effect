/* eslint-disable @typescript-eslint/no-require-imports -- Local Node asset verification utility. */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const sharp = require('sharp');
const { ROOT, contained, sha256, writeFile } = require('../docs/qa/phase-b/source-recovery/offline-tools.cjs');

const LIVE = path.join(ROOT, 'public/media/ripple/live');
const QA = path.join(ROOT, 'docs/qa/phase-c/renderer');
const EXPECTED_BYTES = 1653270;
const EXPECTED_SHA256 = '122d925177afe1267ca1a038dccd352385ebddefe409b65bcdf0d1388e0de9d3';

function run(executable, args, maxBuffer = 2 ** 24) {
  const result = spawnSync(executable, args, { shell: false, encoding: null, maxBuffer, timeout: 45000, windowsHide: true });
  if (result.error) throw new Error(`${path.basename(executable)}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${path.basename(executable)} failed: ${result.stderr.toString('utf8').slice(-1200)}`);
  return result.stdout;
}

function input(source) {
  // Place a recovered original inside this approved workspace before invoking the tool.
  const filename = contained(ROOT, source);
  if (!fs.statSync(filename).isFile()) throw new Error('The source must be a regular local file');
  if (path.extname(filename).toLowerCase() !== '.mp4') throw new Error('Expected the original MP4');
  if (fs.statSync(filename).size !== EXPECTED_BYTES) throw new Error(`Expected the approved ${EXPECTED_BYTES}-byte microscope original`);
  if (sha256(fs.readFileSync(filename)) !== EXPECTED_SHA256) throw new Error('The source does not match the recovered Library original SHA256');
  return filename;
}

function keepOrWrite(base, name, bytes, checkOnly) {
  contained(ROOT, base);
  const output = contained(base, name);
  if (fs.existsSync(output)) {
    if (!fs.readFileSync(output).equals(bytes)) throw new Error(`Existing output differs; preserved without overwriting: ${name}`);
  } else if (checkOnly) {
    throw new Error(`Missing output: ${name}`);
  } else {
    writeFile(base, name, bytes);
  }
  return { file: path.relative(ROOT, output).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha256(bytes) };
}

async function main(args = process.argv.slice(2)) {
  let source = 'public/media/ripple/live/microscope-original.mp4';
  let checkOnly = false;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--source' && args[index + 1]) source = args[++index];
    else if (args[index] === '--check') checkOnly = true;
    else if (args[index] === '--help') {
      console.log('node scripts/phase-c-artwork-assets.cjs [--source workspace/original.mp4] [--check]\nPreserves the approved 1653270-byte original, verifies 150 frames at 30fps, and extracts lossless endpoint posters. Source must be inside the workspace.');
      return;
    } else throw new Error('Unknown argument. Use --help.');
  }
  const filename = input(source);
  const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
  const ffprobe = process.env.FFPROBE_PATH || (path.isAbsolute(ffmpeg)
    ? path.join(path.dirname(ffmpeg), process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe') : 'ffprobe');
  const original = fs.readFileSync(filename);
  const probe = JSON.parse(run(ffprobe, ['-v', 'error', '-select_streams', 'v:0', '-count_frames',
    '-show_entries', 'stream=codec_name,width,height,avg_frame_rate,nb_read_frames,pix_fmt,color_range,color_space,color_transfer,color_primaries,duration:format=duration,size',
    '-of', 'json', filename]).toString('utf8'));
  const stream = probe.streams?.[0];
  const fps = stream?.avg_frame_rate?.split('/').map(Number);
  if (!stream || stream.width !== 1920 || stream.height !== 1080 || Number(stream.nb_read_frames) !== 150 ||
    !fps || fps[0] / fps[1] !== 30 || Math.abs(Number(probe.format?.duration) - 5) > 0.0001) {
    throw new Error('The source does not match the approved 1920x1080 / 150-frame / 30fps / 5-second clip');
  }
  const posters = [];
  for (const [name, frame] of [['microscope-opening.webp', 0], ['microscope-terminal.webp', 149]]) {
    // Decode one exact frame to RGB once, then encode that raster losslessly.
    const rgb = run(ffmpeg, ['-v', 'error', '-noautorotate', '-i', filename, '-vf', `select=eq(n\\,${frame})`,
      '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1']);
    if (rgb.length !== 1920 * 1080 * 3) throw new Error(`Unexpected RGB raster length at frame ${frame}`);
    const bytes = await sharp(rgb, { raw: { width: 1920, height: 1080, channels: 3 } }).webp({ lossless: true, effort: 6 }).toBuffer();
    const decoded = await sharp(bytes).removeAlpha().raw().toBuffer();
    if (!decoded.equals(rgb)) throw new Error(`Poster did not preserve decoded RGB at frame ${frame}`);
    let min = 255; let max = 0; let sum = 0;
    for (const value of rgb) { min = Math.min(min, value); max = Math.max(max, value); sum += value; }
    posters.push({ name, bytes, frame, ptsSeconds: frame / 30, rgbSHA256: sha256(rgb),
      stats: { minChannel: min, maxChannel: max, meanChannel: sum / rgb.length } });
  }
  // Validate every existing destination before any new output write.
  const outputs = [{ name: 'microscope-original.mp4', bytes: original }, ...posters];
  for (const output of outputs) {
    const destination = contained(LIVE, output.name);
    contained(ROOT, destination);
    if (fs.existsSync(destination) && !fs.readFileSync(destination).equals(output.bytes)) {
      throw new Error(`Existing output differs; nothing written: ${output.name}`);
    }
  }
  const video = keepOrWrite(LIVE, outputs[0].name, original, checkOnly);
  const stills = posters.map(({ name, bytes, ...metadata }) => ({ ...keepOrWrite(LIVE, name, bytes, checkOnly), ...metadata }));
  const provenance = { status: 'original preserved; exact decoded RGB endpoint posters',
    source: path.relative(ROOT, filename).replaceAll('\\', '/'), sourceSHA256: sha256(original), expectedBytes: EXPECTED_BYTES,
    video, videoStream: stream, durationSeconds: Number(probe.format.duration), frameCount: 150, fps: 30,
    posters: stills, ffmpeg: run(ffmpeg, ['-version']).toString('utf8').split(/\r?\n/)[0],
    master: { file: 'public/media/ripple/particle-world-master.webp', sha256: sha256(fs.readFileSync(contained(ROOT, 'public/media/ripple/particle-world-master.webp'))) },
    colorNote: 'FFmpeg default decode to RGB24; WebP encodes that RGB losslessly. No MP4 retiming, re-encoding, tag changes or audio changes.',
    limitation: 'FFmpeg-decoder poster equality is separate from browser video-decoder/color-management equality.' };
  if (!checkOnly) writeFile(QA, 'assets.json', JSON.stringify(provenance, null, 2) + '\n');
  console.log(JSON.stringify({ mode: checkOnly ? 'check' : 'recover', video, frameCount: 150, fps: 30,
    durationSeconds: 5, posters: stills.map(poster => ({ file: poster.file, frame: poster.frame, rgbSHA256: poster.rgbSHA256, stats: poster.stats })) }));
}

module.exports = { input, main };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
