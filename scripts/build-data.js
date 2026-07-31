// Reads Numesta/Coin_Image_Input.xlsx and produces coins/data/coins.json
// grouped by nation/historical entity, with aggregate stats.
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const { NATIONS, HISTORICAL, REGIONS } = require('./entities');

const XLSX_PATH = path.join(__dirname, '..', '..', '..', 'Numesta', 'Coin_Image_Input.xlsx');
const OUT_PATH = path.join(__dirname, '..', 'data', 'coins.json');
const SPECIALITY_PATH = path.join(__dirname, '..', 'data', 'speciality.json');
const speciality = fs.existsSync(SPECIALITY_PATH) ? JSON.parse(fs.readFileSync(SPECIALITY_PATH, 'utf8')) : {};

const wb = xlsx.readFile(XLSX_PATH);
const ws = wb.Sheets['Coins I Have'];
const rows = xlsx.utils.sheet_to_json(ws, { defval: '' });

function parseName(raw) {
  const name = String(raw).trim();
  const parens = [];
  const noParens = name.replace(/\(([^)]+)\)/g, (_, g) => { parens.push(g.trim()); return ''; }).trim();
  const dashIdx = noParens.indexOf(' - ');
  let denomination, dashExtra;
  if (dashIdx !== -1) {
    denomination = noParens.slice(0, dashIdx).trim();
    dashExtra = noParens.slice(dashIdx + 3).trim();
  } else {
    denomination = noParens.trim();
    dashExtra = '';
  }
  const noteParts = [dashExtra, ...parens].filter(Boolean);
  return { denomination, note: noteParts.join(' — ') };
}

function yearNum(y) {
  // Some Year fields are ranges like "985-1014" or have circa markers; take the min 3-4 digit number.
  const nums = String(y).match(/\d{3,4}/g);
  if (!nums) return null;
  return Math.min(...nums.map(Number));
}

const groups = {}; // key -> { type, slug, label, iso2?, era?, note?, coins: [] }

let unmapped = new Set();

for (const r of rows) {
  const country = String(r['Country']).trim();
  let key, entry;
  if (NATIONS[country]) {
    key = country;
    if (!groups[key]) {
      groups[key] = { type: 'nation', slug: NATIONS[country], iso2: NATIONS[country], region: REGIONS[country] || 'Other', label: country === 'Gambia, The' ? 'The Gambia' : country, coins: [] };
    }
  } else if (HISTORICAL[country]) {
    const h = HISTORICAL[country];
    key = country;
    if (!groups[key]) {
      groups[key] = { type: 'historical', slug: h.slug, region: 'Historical & Regional', label: h.label, era: h.era, note: h.note, coins: [] };
    }
  } else {
    unmapped.add(country);
    continue;
  }

  const { denomination, note } = parseName(r['Coin Name']);
  groups[key].coins.push({
    nNumber: String(r['N#']).trim(),
    name: String(r['Coin Name']).trim(),
    denomination,
    note,
    year: String(r['Year']).trim(),
    yearNum: yearNum(r['Year']),
    faceValue: String(r['Face Value']).trim(),
    numistaUrl: String(r['Numista URL']).trim(),
    front: `assets/coins/${String(r['N#']).trim()}_front.webp`,
    back: `assets/coins/${String(r['N#']).trim()}_back.webp`,
  });
}

if (unmapped.size) {
  console.error('UNMAPPED COUNTRIES:', [...unmapped]);
  process.exit(1);
}

const entities = Object.values(groups).map(g => {
  const years = g.coins.map(c => c.yearNum).filter(Boolean);
  g.coins.sort((a, b) => (a.yearNum || 9999) - (b.yearNum || 9999));
  return {
    ...g,
    count: g.coins.length,
    yearMin: years.length ? Math.min(...years) : null,
    yearMax: years.length ? Math.max(...years) : null,
    speciality: speciality[g.slug] || null,
  };
}).sort((a, b) => a.label.localeCompare(b.label));

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, JSON.stringify({ generatedFrom: 'Numesta/Coin_Image_Input.xlsx', totalCoins: rows.length, entities }, null, 2));

console.log('Entities:', entities.length, ' Total coins:', rows.length);
console.log('Nations:', entities.filter(e => e.type === 'nation').length, ' Historical:', entities.filter(e => e.type === 'historical').length);
