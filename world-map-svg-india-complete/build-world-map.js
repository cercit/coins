'use strict';
/*
  Build world-map.svg from public-domain Natural Earth geometry whose India
  polygon has been completed to India's official borders (Aksai Chin,
  Pakistan-occupied Kashmir and Arunachal Pradesh included).

  Source: world-india-complete.geo.json (Natural Earth, public domain).
  Projection: Robinson, implemented here with its standard coefficient table so
  the map keeps a familiar shape with no external dependency.

  Output: pure geometry, no text. Each country is one <path> with:
    data-iso        lowercase ISO 3166-1 alpha-2
    data-name       plain English name
    data-continent  Africa | Americas | Asia | Europe | Oceania
  The root <svg> carries data-regions: a JSON map of ready-made viewBoxes for a
  World / continent zoom control.

  Run:  node build-world-map.js
*/

const fs = require('fs');
const path = require('path');

const SRC = process.argv[2] || path.join(__dirname, 'world-india-complete.geo.json');
const OUT = process.argv[3] || path.join(__dirname, 'world-map.svg');
const W = 2000;
const MARGIN = 8;
const PRECISION = 1;

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
  const lo = ROBINSON[i], hi = ROBINSON[i + 1] || lo;
  const X = lo[0] + (hi[0] - lo[0]) * t;
  const Y = lo[1] + (hi[1] - lo[1]) * t;
  return [0.8487 * X * (lon * Math.PI / 180), 1.3523 * Y * (lat < 0 ? -1 : 1)];
}

const NAME_TO_ISO = { France: 'fr', Norway: 'no', Kosovo: 'xk' };
const DROP = new Set(['AQ', 'TF']);
function siteRegion(c) {
  if (c === 'North America' || c === 'South America') return 'Americas';
  if (['Africa', 'Asia', 'Europe', 'Oceania'].indexOf(c) !== -1) return c;
  return '';
}
function isoOf(pr) {
  let iso = (pr.ISO_A2 || '').trim();
  if (!iso || iso === '-99') iso = NAME_TO_ISO[pr.NAME] || NAME_TO_ISO[pr.NAME_LONG] || '';
  return iso.toLowerCase();
}

const gj = JSON.parse(fs.readFileSync(SRC, 'utf8'));
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
const projected = [];
gj.features.forEach(function (f) {
  const pr = f.properties || {};
  if (DROP.has((pr.ISO_A2 || '').trim()) || !f.geometry) return;
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
const sy = (y) => +(MARGIN + (maxY - y) * scale).toFixed(PRECISION);
function ringToPath(ring) {
  let d = '', px = null, py = null;
  for (let k = 0; k < ring.length; k++) {
    const X = sx(ring[k][0]), Y = sy(ring[k][1]);
    if (X === px && Y === py) continue;
    d += (d ? 'L' : 'M') + X + ',' + Y; px = X; py = Y;
  }
  return d ? d + 'Z' : '';
}
const paths = [];
projected.forEach(function (c) {
  let d = '';
  c.polys.forEach(function (rings) { rings.forEach(function (ring) { d += ringToPath(ring); }); });
  if (!d) return;
  const attrs = [];
  if (c.iso) attrs.push('data-iso="' + c.iso + '"');
  attrs.push('data-name="' + c.name.replace(/"/g, '&quot;') + '"');
  if (c.continent) attrs.push('data-continent="' + c.continent + '"');
  paths.push('    <path ' + attrs.join(' ') + ' d="' + d + '"/>');
});

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
  '  Free world map SVG with India\'s complete/official borders.',
  '  Geometry: Natural Earth (public domain), India completed (Aksai Chin, PoK, Arunachal Pradesh).',
  '  Robinson projection, no labels. Generated by build-world-map.js.',
  '  Maintained by Sameer Shreenivas Mittimani (GitHub: cercit). Free to use and share.',
  '-->'
].join('\n');
const svg = header + '\n' +
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '"' +
  ' class="world-map" role="img" aria-label="World map with India complete" fill-rule="evenodd"' +
  " data-regions='" + JSON.stringify(regions) + "'>\n" +
  '  <g class="map-countries">\n' + paths.join('\n') + '\n  </g>\n</svg>\n';
fs.writeFileSync(OUT, svg, 'utf8');
console.log('wrote', path.basename(OUT), '| viewBox 0 0 ' + W + ' ' + H + ' | countries ' + paths.length);
