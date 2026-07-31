// Cross-checks the hand-written prose in data/speciality.json against the
// generated data, so a claim in a write-up cannot quietly contradict the coins
// it describes.
//
// Written after a blurb described a Chola massa as gold when the export records
// it as copper. Prose is the one part of this repo not derived from the data,
// so it is the one part that can be wrong on its own.
//
//   node scripts/check-prose.js      exits non-zero if anything fails
const path = require('path');
const fs = require('fs');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'collection.json'), 'utf8'));
const prose = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'speciality.json'), 'utf8'));

// Material words that make a checkable claim. "Gold Coast" and similar place
// names are excluded so they don't read as composition claims.
const MATERIALS = {
  gold: /gold/i, silver: /silver/i, copper: /copper/i, bronze: /bronze/i,
  brass: /brass/i, nickel: /nickel/i, steel: /steel/i,
  aluminium: /alumini?um/i, platinum: /platinum/i,
};
const PLACE_EXCEPTIONS = [/gold coast/i, /silver jubilee/i, /golden jubilee/i, /silverware/i];

// Mints name their alloys, and the prose often decodes those names for the
// reader. Expand the trade names so explaining one doesn't look like a
// contradiction: Italy's "bronzital" really is an aluminium bronze.
const ALLOY_SYNONYMS = {
  bronzital: 'aluminium bronze',
  acmonital: 'stainless steel',
  cupronickel: 'copper nickel',
  'nickel silver': 'nickel silver copper zinc',
  bimetallic: 'bimetallic',
};

const failures = [];
const warnings = [];

for (const [slug, paras] of Object.entries(prose)) {
  const country = data.countries.find(c => c.slug === slug);
  if (!country) { failures.push(`${slug}: prose exists but no such country in collection.json`); continue; }

  const coins = country.issuers.flatMap(i => i.authorities.flatMap(a => a.coins));
  let compositions = coins.map(c => c.composition).filter(Boolean).join(' ; ').toLowerCase();
  for (const [trade, plain] of Object.entries(ALLOY_SYNONYMS)) {
    if (compositions.includes(trade)) compositions += ' ' + plain;
  }
  const years = new Set(coins.map(c => c.yearNum).filter(Boolean));
  let text = paras.join(' ');
  for (const ex of PLACE_EXCEPTIONS) text = text.replace(ex, '');

  // A material named in prose should appear somewhere in this country's compositions.
  for (const [name, re] of Object.entries(MATERIALS)) {
    if (re.test(text) && !re.test(compositions)) {
      failures.push(`${slug} (${country.label}): prose says "${name}" but no coin here is recorded as ${name}.\n    compositions: ${[...new Set(coins.map(c => c.composition).filter(Boolean))].join('; ').slice(0, 200)}`);
    }
  }

  // A four-digit year cited next to a denomination should be a year actually held.
  const cited = [...text.matchAll(/\b(1[5-9]\d{2}|20[0-2]\d)\b(?=\s+[¼-¾\d£€]|\s+[a-z]*\s*(?:cent|penn|pence|rupee|anna|pice|franc|mark|yen|dollar|kron|lire|lira|peso|dinar|riyal|rial|taka|kwacha|zloty|forint|leone|butut|dram|afghani|rappen|escudo|drachm))/gi)]
    .map(m => Number(m[1]));
  const missing = [...new Set(cited)].filter(y => !years.has(y));
  if (missing.length) {
    warnings.push(`${slug} (${country.label}): prose cites coin-year ${missing.join(', ')}, not held. Years held: ${[...years].sort((a, b) => a - b).join(', ').slice(0, 160)}`);
  }

  // A hardcoded count goes stale the moment the collection grows. Skip
  // year-shaped numbers — "the 1999 and 2020 coins here" is a date, not a total.
  const count = text.match(/\b(\d{2,4})\s+coins\b/);
  const looksLikeYear = count && /^(1[5-9]\d{2}|20[0-2]\d)$/.test(count[1]);
  if (count && !looksLikeYear && Number(count[1]) !== country.count) {
    failures.push(`${slug} (${country.label}): prose says ${count[1]} coins, collection has ${country.count}. Prefer not to hardcode counts — the stat block shows them.`);
  }
}

// Every country should eventually have a write-up; report the gap, don't fail on it.
const noProse = data.countries.filter(c => !prose[c.slug]);
if (noProse.length) warnings.push(`${noProse.length} countries have no write-up: ${noProse.map(c => c.slug).join(', ')}`);

if (warnings.length) {
  console.log('WARNINGS');
  warnings.forEach(w => console.log('  ! ' + w));
  console.log('');
}
if (failures.length) {
  console.error('FAILURES');
  failures.forEach(f => console.error('  x ' + f));
  console.error(`\n${failures.length} prose claim(s) contradict the data.`);
  process.exit(1);
}
console.log(`Prose check passed: ${Object.keys(prose).length} write-ups agree with the data.`);
