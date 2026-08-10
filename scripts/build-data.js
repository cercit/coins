// Reads the Numista CSV export and builds data/collection.json as a
// Country > Issuer > Ruling authority tree.
//
// The CSV has duplicate header names ("Grade", "Weight", "Size" each appear
// twice — once for the coin, once for third-party grading), so it is parsed
// positionally rather than by column name.
const path = require('path');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { COUNTRY_FLAGS, COUNTRY_SLUGS, COUNTRY_LABELS, REGIONS, ISSUER_FLAGS, ISSUER_META, MAP_ALIASES } = require('./registry');

const CSV_PATH = process.env.COINS_CSV || 'C:/Users/samsm/Downloads/dhuryodhana_export (2).csv';
const OUT_PATH = path.join(__dirname, '..', 'data', 'collection.json');
const IMG_DIR = path.join(__dirname, '..', 'assets', 'coins');
const SPECIALITY_PATH = path.join(__dirname, '..', 'data', 'speciality.json');
const speciality = fs.existsSync(SPECIALITY_PATH) ? JSON.parse(fs.readFileSync(SPECIALITY_PATH, 'utf8')) : {};

// Specimen-level corrections keyed by N# — see data/annotations.json.
const ANNOTATIONS_PATH = path.join(__dirname, '..', 'data', 'annotations.json');
const annotations = fs.existsSync(ANNOTATIONS_PATH) ? JSON.parse(fs.readFileSync(ANNOTATIONS_PATH, 'utf8')) : {};
delete annotations._README;

const rows = parse(fs.readFileSync(CSV_PATH, 'utf8'), { columns: false, skip_empty_lines: true, relax_column_count: true });
const header = rows.shift();
const C = {};
header.forEach((h, i) => { if (!(h in C)) C[h] = i; }); // first occurrence wins
const GRADE_IDX = 26; // the coin's own grade, not the slab grade at 42

function slugify(s) {
  return String(s).toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'x';
}

// "5 Afghanis - Muhammed Zahir Shah" -> "5 Afghanis" + "Muhammed Zahir Shah"
// "1 Dollar (Flying Fish)"           -> "1 Dollar"  + "Flying Fish"
// Face value is shown exactly as struck (¼ Anna, 1 Pice), never normalised.
//
// Only unwrap the remainder when the whole of it is a single balanced
// parenthetical. Stripping a trailing ")" unconditionally truncated titles
// like "5 Mark - William II (Kingdom of Prussia)" into an unbalanced
// "William II (Kingdom of Prussia".
function splitTitle(title) {
  const t = String(title).trim();
  const cuts = [t.indexOf(' - '), t.indexOf(' (')].filter(i => i > 0);
  if (!cuts.length) return { denomination: t, remainder: '' };
  const cut = Math.min(...cuts);
  const denomination = t.slice(0, cut).trim() || t;
  let remainder = t.slice(cut).trim();
  if (remainder.startsWith('- ')) {
    remainder = remainder.slice(2).trim();
  } else if (remainder.startsWith('(') && remainder.endsWith(')') && !remainder.slice(1, -1).includes('(')) {
    remainder = remainder.slice(1, -1).trim();
  }
  return { denomination, remainder };
}

function yearOf(r) {
  const g = String(r[C['Gregorian year']] || '').match(/\d{3,4}/g);
  if (g) return Math.min(...g.map(Number));
  const y = String(r[C['Year range']] || '').match(/\d{3,4}/g);
  return y ? Math.min(...y.map(Number)) : null;
}

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }

const tree = {}; // country -> { issuers: { issuer -> { authorities: { auth -> coins[] } } } }
let missingImages = 0;

for (const r of rows) {
  const country = String(r[C['Country']] || '').trim();
  if (!country) continue;
  const issuer = String(r[C['Issuer']] || '').trim() || country;
  const authority = String(r[C['Ruling authority']] || '').trim();
  const nNum = String(r[C['N# number (with link)']] || '').replace(/[^0-9]/g, '');

  const { denomination, remainder } = splitTitle(r[C['Title']]);
  const front = `assets/coins/${nNum}_front.webp`;
  const back = `assets/coins/${nNum}_back.webp`;
  const hasImage = nNum && fs.existsSync(path.join(IMG_DIR, `${nNum}_front.webp`));
  if (!hasImage) missingImages++;

  const coin = {
    nNumber: nNum,
    denomination,                       // as struck: "¼ Anna", "1 Pice", "2 Annas"
    variant: remainder || '',
    title: String(r[C['Title']] || '').trim(),
    year: String(r[C['Gregorian year']] || r[C['Year range']] || '').trim(),
    yearNum: yearOf(r),
    sortValue: num(r[C['Face value']]),  // hidden sort key only — never displayed
    currency: String(r[C['Currency']] || '').trim(),
    type: String(r[C['Type']] || '').trim(),
    composition: String(r[C['Composition']] || '').trim(),
    weight: String(r[C['Weight']] || '').trim(),
    diameter: String(r[C['Diameter']] || '').trim(),
    thickness: String(r[C['Thickness']] || '').trim(),
    shape: String(r[C['Shape']] || '').trim(),
    grade: String(r[GRADE_IDX] || '').trim(),
    reference: String(r[C['Reference']] || '').trim(),
    numistaUrl: nNum ? `https://en.numista.com/${nNum}` : '',
    hasImage,
    front: hasImage ? front : null,
    back: hasImage ? back : null,
  };

  // A restrike or replica is not the coin the catalogue describes, so the
  // catalogue's own figures must stop speaking for it.
  const ann = annotations[nNum];
  if (ann) {
    if (ann.restrike) coin.restrike = true;
    if (ann.replica) coin.replica = true;
    if (ann.note) coin.specimenNote = ann.note;
    if (ann.composition) coin.composition = ann.composition;
    if (ann.compositionUnknown) { coin.composition = ''; coin.compositionUnknown = true; }
    coin.catalogueOnlySpecs = Boolean(ann.restrike || ann.replica);
  }

  const cNode = tree[country] ||= { issuers: {} };
  const iNode = cNode.issuers[issuer] ||= { authorities: {} };
  (iNode.authorities[authority] ||= []).push(coin);
}

function span(coins) {
  const ys = coins.map(c => c.yearNum).filter(Boolean);
  return ys.length ? { yearMin: Math.min(...ys), yearMax: Math.max(...ys) } : { yearMin: null, yearMax: null };
}

// Ruling-authority strings look like "House of Windsor • Elizabeth II (1952-2022)".
// Split the dynasty prefix off so group headers read cleanly.
function authorityParts(a) {
  if (!a) return { name: '', house: '', era: '' };
  const [houseRaw, rulerRaw] = a.includes('•') ? a.split('•').map(s => s.trim()) : ['', a.trim()];
  const m = rulerRaw.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  return { name: (m ? m[1] : rulerRaw).trim(), house: houseRaw, era: m ? m[2].trim() : '' };
}

const countries = Object.entries(tree).map(([country, cNode]) => {
  const issuers = Object.entries(cNode.issuers).map(([issuer, iNode]) => {
    const meta = ISSUER_META[issuer] || {};
    const authorities = Object.entries(iNode.authorities).map(([auth, coins]) => {
      coins.sort((a, b) => (a.sortValue ?? 9e9) - (b.sortValue ?? 9e9) || (a.yearNum ?? 9999) - (b.yearNum ?? 9999));
      const p = authorityParts(auth);
      return { key: slugify(auth || 'unattributed'), label: p.name || 'Unattributed', house: p.house, era: p.era, count: coins.length, ...span(coins), coins };
    }).sort((a, b) => (a.yearMin ?? 9999) - (b.yearMin ?? 9999));

    const all = authorities.flatMap(a => a.coins);
    const isoFlag = ISSUER_FLAGS[issuer] || null;
    return {
      slug: slugify(issuer),
      label: meta.label || issuer,
      rawLabel: issuer,
      iso2: isoFlag,
      badge: isoFlag ? null : (meta.badge || issuer.slice(0, 2).toUpperCase()),
      era: meta.era || '',
      note: meta.note || '',
      count: all.length,
      ...span(all),
      currencies: [...new Set(all.map(c => c.currency).filter(Boolean))],
      authorities,
    };
  }).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const all = issuers.flatMap(i => i.authorities.flatMap(a => a.coins));
  const iso2 = COUNTRY_FLAGS[country] ?? null;
  const mapIso = MAP_ALIASES[country] || null;
  const slug = COUNTRY_SLUGS[country] || iso2 || slugify(country);
  return {
    slug,
    label: COUNTRY_LABELS[country] || country,
    rawLabel: country,
    iso2,
    mapIso,
    badge: iso2 ? null : (COUNTRY_LABELS[country] || country).split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase(),
    region: REGIONS[country] || 'Other',
    count: all.length,
    ...span(all),
    multiIssuer: issuers.length > 1,
    issuerCount: issuers.length,
    speciality: speciality[slug] || null,
    issuers,
  };
}).sort((a, b) => a.label.localeCompare(b.label));

const unmappedCountries = countries.filter(c => !(c.rawLabel in COUNTRY_FLAGS));
if (unmappedCountries.length) {
  console.error('UNMAPPED COUNTRIES:', unmappedCountries.map(c => c.rawLabel));
  process.exit(1);
}

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, JSON.stringify({
  generatedFrom: path.basename(CSV_PATH),
  totalCoins: countries.reduce((n, c) => n + c.count, 0),
  countryCount: countries.length,
  issuerCount: countries.reduce((n, c) => n + c.issuers.length, 0),
  missingImages,
  countries,
}, null, 2));

console.log(`Countries: ${countries.length}  Issuers: ${countries.reduce((n, c) => n + c.issuers.length, 0)}  Coins: ${countries.reduce((n, c) => n + c.count, 0)}`);
console.log(`Multi-issuer countries: ${countries.filter(c => c.multiIssuer).length}`);
console.log(`Coins without an image: ${missingImages}`);
