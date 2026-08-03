'use strict';
/*
  Build assets/world-map.svg — the collection's interactive world map.

  Why this exists: every off-the-shelf world SVG we found draws India on the
  UN/de-facto line, leaving out territory India officially claims. So we
  generate our own map from public-domain Natural Earth geometry whose India
  polygon has been completed (Aksai Chin, Pakistan-occupied Kashmir and
  Arunachal Pradesh are part of India). Source data: scripts/world-india-complete.geo.json
  (Natural Earth, public domain, via the World-Map-India-Complete dataset).

  The output is pure geometry — no text, no labels, no script. Each mappable
  country is one <path> carrying:
    data-iso        lowercase ISO 3166-1 alpha-2 (matches data/collection.json)
    data-name       plain English name
    data-continent  site region: Africa | Americas | Asia | Europe | Oceania
  The root <svg> also carries data-regions: a JSON map of viewBoxes the home
  page uses for the World / continent zoom selector, so the map and its zoom
  frames can never drift out of sync.

  Projection: Robinson, implemented here with its standard coefficient table so
  the map keeps a familiar, balanced shape without pulling in any dependency.

  Run: npm run build-world-map
*/

const fs = require('fs');
const path = require('path');

const SRC = process.argv[2] || path.join(__dirname, 'world-india-complete.geo.json');
const OUT = process.argv[3] || path.join(__dirname, '..', 'assets', 'world-map.svg');
const W = 2000;      // target width in SVG units
const MARGIN = 8;    // padding around the landmass
const PRECISION = 1; // decimal places for coordinates

// Standard Robinson projection table: latitude 0..90 step 5 -> (X length, Y dist)
const ROBINSON = [
  [1.0000, 0.0000], [0.9986, 0.0620], [0.9954, 0.1240], [0.9900, 0.1860],
  [0.9822, 0.2480], [0.9730, 0.3100], [0.9600, 0.3720], [0.9427, 0.4340],
  [0.9216, 0.4958], [0.8962, 0.5571], [0.8679, 0.6176], [0.8350, 0.6769],
  [0.7986, 0.7346], [0.7597, 0.7903], [0.7186, 0.8435], [0.6732, 0.8936],
  [0.6213, 0.9394], [0.5722, 0.9761], [0.5322, 1.0000]
];

function robinson(lon, lat) {
  const alat = Math.abs(lat);
  const i = Math.min(Math.floor(alat / 5), 17);
  const t = (alat - i * 5) / 5;
  const lo = ROBINSON[i];
  const hi = ROBINSON[i + 1] || lo;
  const X = lo[0] + (hi[0] - lo[0]) * t;
  const Y = lo[1] + (hi[1] - lo[1]) * t;
  return [0.8487 * X * (lon * Math.PI / 180), 1.3523 * Y * (lat < 0 ? -1 : 1)];
}

// Natural Earth marks a few countries ISO_A2 = "-99"; name the ones that matter.
const NAME_TO_ISO = { France: 'fr', Norway: 'no', Kosovo: 'xk' };
const DROP = new Set(['AQ', 'TF']); // Antarctica & sub-antarctic islands

function siteRegion(continent) {
  if (continent === 'North America' || continent === 'South America') return 'Americas';
  if (['Africa', 'Asia', 'Europe', 'Oceania'].indexOf(continent) !== -1) return continent;
  return '';
}
function isoOf(pr) {
  let iso = (pr.ISO_A2 || '').trim();
  if (!iso || iso === '-99') iso = NAME_TO_ISO[pr.NAME] || NAME_TO_ISO[pr.NAME_LONG] || '';
  return iso.toLowerCase();
}

const gj = JSON.parse(fs.readFileSync(SRC, 'utf8'));

// First pass: project every point and track overall bounds.
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
const projected = [];
gj.features.forEach(function (f) {
  const pr = f.properties || {};
  if (DROP.has((pr.ISO_A2 || '').trim())) return;
  if (!f.geometry) return;
  const rings3 = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates
    : f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : [];
  const polys = rings3.map(function (rings) {
    return rings.map(function (ring) {
      return ring.map(function (pt) {
        const p = robinson(pt[0], pt[1]);
        if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
        if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
        return p;
      });
    });
  });
  projected.push({ iso: isoOf(pr), name: pr.NAME || '', continent: siteRegion(pr.CONTINENT), polys: polys });
});

const scale = (W - 2 * MARGIN) / (maxX - minX);
const H = Math.round((maxY - minY) * scale + 2 * MARGIN);
const sx = (x) => +(MARGIN + (x - minX) * scale).toFixed(PRECISION);
const sy = (y) => +(MARGIN + (maxY - y) * scale).toFixed(PRECISION); // flip: north up

function ringToPath(ring) {
  let d = '', px = null, py = null;
  for (let k = 0; k < ring.length; k++) {
    const X = sx(ring[k][0]), Y = sy(ring[k][1]);
    if (X === px && Y === py) continue;
    d += (d ? 'L' : 'M') + X + ',' + Y;
    px = X; py = Y;
  }
  return d ? d + 'Z' : '';
}

const paths = [];
let indiaLen = 0;
projected.forEach(function (c) {
  let d = '';
  c.polys.forEach(function (rings) { rings.forEach(function (ring) { d += ringToPath(ring); }); });
  if (!d) return;
  if (c.iso === 'in') indiaLen = d.length;
  const attrs = [];
  if (c.iso) attrs.push('data-iso="' + c.iso + '"');
  attrs.push('data-name="' + c.name.replace(/"/g, '&quot;') + '"');
  if (c.continent) attrs.push('data-continent="' + c.continent + '"');
  paths.push('    <path ' + attrs.join(' ') + ' d="' + d + '"/>');
});

// Curated continent windows (lon/lat), framed the way a collector expects and
// ignoring outliers like eastern Siberia, Greenland and mid-Pacific islands.
const WINDOWS = {
  Africa: { lon: [-19, 52], lat: [-35, 38] },
  Americas: { lon: [-168, -33], lat: [-55, 73] },
  Asia: { lon: [35, 150], lat: [-11, 56] },
  Europe: { lon: [-25, 46], lat: [34, 71] },
  Oceania: { lon: [112, 179], lat: [-48, 3] }
};
const regions = { World: '0 0 ' + W + ' ' + H };
Object.keys(WINDOWS).forEach(function (r) {
  const win = WINDOWS[r];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i <= 12; i++) for (let j = 0; j <= 12; j++) {
    const p = robinson(win.lon[0] + (win.lon[1] - win.lon[0]) * i / 12,
                       win.lat[0] + (win.lat[1] - win.lat[0]) * j / 12);
    const X = MARGIN + (p[0] - minX) * scale, Y = MARGIN + (maxY - p[1]) * scale;
    if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y;
  }
  regions[r] = [x0, y0, x1 - x0, y1 - y0].map(function (n) { return Math.round(n); }).join(' ');
});

const header = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<!--',
  '  World of Coins - collection world map. Generated by scripts/build-world-map.js.',
  '  Geometry: Natural Earth (public domain, https://www.naturalearthdata.com/about/terms-of-use/),',
  '  via the World-Map-India-Complete dataset. India is shown per its official borders',
  '  (Aksai Chin, Pakistan-occupied Kashmir and Arunachal Pradesh included).',
  '  Projected to Robinson and stripped of all labels. No attribution required; free to share.',
  '-->'
].join('\n');

const svg = header + '\n' +
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '"' +
  ' class="world-map" role="img" aria-label="World map of the collection" fill-rule="evenodd"' +
  " data-regions='" + JSON.stringify(regions) + "'>\n" +
  '  <g class="map-countries">\n' + paths.join('\n') + '\n  </g>\n</svg>\n';

fs.writeFileSync(OUT, svg, 'utf8');

const withIso = projected.filter(function (c) { return c.iso; }).length;
console.log('wrote', path.relative(process.cwd(), OUT));
console.log('viewBox 0 0 ' + W + ' ' + H + ' | countries ' + paths.length + ' | with data-iso ' + withIso);
console.log('India path:', indiaLen ? indiaLen + ' chars OK' : 'MISSING');
console.log('size:', (fs.statSync(OUT).size / 1024).toFixed(1), 'KB');
console.log('regions:', JSON.stringify(regions));
