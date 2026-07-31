// Removes the white photo background around each coin.
//
// Primary method: geometric circular mask. sharp's trim() crops tightly to
// the coin's silhouette, and the overwhelming majority of world coins are
// round — so the trimmed bounding box IS the coin's diameter. A centered
// circle mask sidesteps the real problem with color-based cutout entirely:
// bright silver/nickel coins have almost no contrast against white paper in
// places, so any brightness/flood-fill classifier inevitably eats into the
// coin's own flat fields. Geometry doesn't care how bright the metal is.
//
// Fallback: for coins whose trimmed bounding box isn't square-ish (diamond,
// scalloped, square-cut issues — a minority of this collection), fall back
// to a tolerance-chained flood fill from the border with a central-leak
// safety check that retries with stricter tolerances rather than risk
// eating into the coin face.
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const xlsx = require('xlsx');

const SRC_DIR = path.join(__dirname, '..', '..', '..', 'Numesta', 'images');
const OUT_DIR = path.join(__dirname, '..', 'assets', 'coins');
const XLSX_PATH = path.join(__dirname, '..', '..', '..', 'Numesta', 'Coin_Image_Input.xlsx');
const SIZE = 420;
const PAD = 8;
const CIRCLE_ASPECT_TOL = 0.07; // trimmed w/h within +-7% of 1:1 is treated as round

const ATTEMPTS = [
  { stepTol: 14, absTol: 34, edgeThresh: 20 },
  { stepTol: 9, absTol: 22, edgeThresh: 14 },
  { stepTol: 5, absTol: 12, edgeThresh: 10 },
];
const CENTER_SAFE_RADIUS_FRAC = 0.32;

fs.mkdirSync(OUT_DIR, { recursive: true });

function sobelMagnitude(data, width, height, channels) {
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const o = i * channels;
    gray[i] = 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2];
  }
  const mag = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const tl = gray[i - width - 1], t = gray[i - width], tr = gray[i - width + 1];
      const l = gray[i - 1], r = gray[i + 1];
      const bl = gray[i + width - 1], b = gray[i + width], br = gray[i + width + 1];
      const gx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const gy = (bl + 2 * b + br) - (tl + 2 * t + tr);
      mag[i] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return mag;
}

function floodFillBackground(data, width, height, channels, edge, opts) {
  const { stepTol, absTol } = opts;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let qHead = 0, qTail = 0;

  function idx(x, y) { return y * width + x; }
  function px(i) { const o = i * channels; return [data[o], data[o + 1], data[o + 2]]; }
  function maxDelta(a, b) { return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2])); }

  const white = [255, 255, 255];
  for (let x = 0; x < width; x++) { seed(x, 0); seed(x, height - 1); }
  for (let y = 0; y < height; y++) { seed(0, y); seed(width - 1, y); }

  function seed(x, y) {
    const i = idx(x, y);
    if (visited[i]) return;
    const c = px(i);
    if (maxDelta(c, white) <= absTol) {
      visited[i] = 1;
      queue[qTail++] = i;
    }
  }

  while (qHead < qTail) {
    const i = queue[qHead++];
    const x = i % width, y = (i / width) | 0;
    const c = px(i);
    const neighbors = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const ni = idx(nx, ny);
      if (visited[ni]) continue;
      if (edge[ni] > opts.edgeThresh) continue;
      const nc = px(ni);
      if (maxDelta(nc, c) <= stepTol && maxDelta(nc, white) <= absTol) {
        visited[ni] = 1;
        queue[qTail++] = ni;
      }
    }
  }
  return visited; // 1 = background
}

function leaksIntoCenter(visited, width, height) {
  const cx = width / 2, cy = height / 2;
  const r = CENTER_SAFE_RADIUS_FRAC * Math.min(width, height) / 2;
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y += 2) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x += 2) {
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy > r2) continue;
      if (visited[y * width + x]) return true;
    }
  }
  return false;
}

async function alphaFromCircle(width, height) {
  const cx = width / 2, cy = height / 2;
  const r = Math.min(width, height) / 2 - 1.5; // small safety margin against clipping the rim
  const buf = Buffer.alloc(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx + 0.5, dy = y - cy + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let a;
      if (dist <= r - 1) a = 255;
      else if (dist >= r + 1) a = 0;
      else a = Math.round(255 * (1 - (dist - (r - 1)) / 2));
      buf[y * width + x] = a;
    }
  }
  return buf;
}

async function alphaFromFloodFill(data, width, height, channels) {
  const edge = sobelMagnitude(data, width, height, channels);
  let bg = null, usedAttempt = ATTEMPTS.length;
  for (let a = 0; a < ATTEMPTS.length; a++) {
    const candidate = floodFillBackground(data, width, height, channels, edge, ATTEMPTS[a]);
    if (!leaksIntoCenter(candidate, width, height)) { bg = candidate; usedAttempt = a; break; }
  }
  if (!bg) bg = new Uint8Array(width * height);
  const maskBuf = Buffer.alloc(width * height);
  for (let i = 0; i < width * height; i++) maskBuf[i] = bg[i] ? 0 : 255;
  const feathered = await sharp(maskBuf, { raw: { width, height, channels: 1 } }).blur(1.1).raw().toBuffer();
  return { alpha: feathered, usedAttempt };
}

async function processOne(nNumber, side) {
  const src = path.join(SRC_DIR, `${nNumber}_${side}.jpg`);
  const dst = path.join(OUT_DIR, `${nNumber}_${side}.webp`);
  if (!fs.existsSync(src)) return { nNumber, side, ok: false, reason: 'missing-src' };

  const trimmed = sharp(src, { failOn: 'none' }).trim({ background: '#ffffff', threshold: 12 });
  const trimmedMeta = await trimmed.clone().metadata();
  const tw = trimmedMeta.width, th = trimmedMeta.height;
  const aspect = tw / th;
  const isRound = Math.abs(1 - aspect) <= CIRCLE_ASPECT_TOL;

  const resized = trimmed.clone().resize({ width: SIZE, height: SIZE, fit: 'inside', withoutEnlargement: true });
  const { data, info } = await resized.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  let method;
  if (isRound) {
    const alpha = await alphaFromCircle(width, height);
    for (let i = 0; i < width * height; i++) data[i * channels + 3] = alpha[i];
    method = 'circle';
  } else {
    const { alpha, usedAttempt } = await alphaFromFloodFill(data, width, height, channels);
    for (let i = 0; i < width * height; i++) data[i * channels + 3] = alpha[i];
    method = 'flood:' + usedAttempt;
  }

  await sharp(data, { raw: { width, height, channels } })
    .webp({ quality: 88, alphaQuality: 92 })
    .toFile(dst);

  return { nNumber, side, ok: true, method };
}

async function main() {
  const only = process.argv.slice(2);
  const wb = xlsx.readFile(XLSX_PATH);
  const ws = wb.Sheets['Coins I Have'];
  const rows = xlsx.utils.sheet_to_json(ws, { defval: '' });

  const jobs = [];
  const seen = new Set();
  for (const r of rows) {
    const n = String(r['N#']).trim();
    if (only.length && !only.includes(n)) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    jobs.push(['front', n], ['back', n]);
  }

  let done = 0, failed = [];
  const methodCounts = {};
  const CONCURRENCY = 4;
  let idx = 0;
  async function worker() {
    while (idx < jobs.length) {
      const my = idx++;
      const [side, n] = jobs[my];
      let res;
      try {
        res = await processOne(n, side);
      } catch (e) {
        res = { nNumber: n, side, ok: false, reason: String(e.message || e) };
      }
      if (!res.ok) failed.push(res);
      else methodCounts[res.method] = (methodCounts[res.method] || 0) + 1;
      done++;
      if (done % 200 === 0) console.log(`${done}/${jobs.length}`);
    }
  }
  const workers = Array.from({ length: CONCURRENCY }, worker);
  await Promise.all(workers);

  console.log(`Done: ${done}/${jobs.length}. Failed: ${failed.length}`);
  console.log('Method breakdown:', methodCounts);
  if (failed.length) console.log(JSON.stringify(failed.slice(0, 20), null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
