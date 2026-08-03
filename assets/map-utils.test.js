'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const utils = require('./map-utils.js');

test('buildCountryIndex keys collected ISO countries by lowercase ISO code', () => {
  const index = utils.buildCountryIndex([
    { slug: 'in', label: 'India', iso2: 'IN', count: 111, issuerCount: 8, yearMin: 985, yearMax: 2026 },
    { slug: 'historical', label: 'British India', iso2: null, count: 14 }
  ]);
  assert.equal(index.in.slug, 'in');
  assert.equal(index.historical, undefined);
});

test('buildCountryIndex drops ISO countries with no collected coins', () => {
  const index = utils.buildCountryIndex([
    { slug: 'xx', label: 'Empty', iso2: 'XX', count: 0 }
  ]);
  assert.equal(index.xx, undefined);
});

test('colourBucket gives zero and maximum counts distinct values', () => {
  assert.equal(utils.colourBucket(0, 111), 0);
  assert.equal(utils.colourBucket(111, 111), 4);
});

test('colourBucket spreads collected counts across buckets one to four', () => {
  // With a skewed collection (one big country, many small), a plain linear
  // scale would flatten almost everything into bucket 1. These assertions
  // lock in a spread so the map stays visually varied.
  assert.equal(utils.colourBucket(1, 111), 1);
  assert.equal(utils.colourBucket(6, 111), 2);
  assert.equal(utils.colourBucket(20, 111), 3);
  assert.equal(utils.colourBucket(60, 111), 4);
});

test('colourBucket never returns a positive bucket for uncollected countries', () => {
  assert.equal(utils.colourBucket(0, 0), 0);
  assert.equal(utils.colourBucket(3, 0), 0);
});

test('countryAriaLabel includes name, count, issuer count and year span', () => {
  assert.equal(
    utils.countryAriaLabel({ label: 'India', count: 111, issuerCount: 8, yearMin: 985, yearMax: 2026 }),
    'India, 111 coins, 8 issuing authorities, years 985 to 2026'
  );
});

test('countryAriaLabel reads naturally for a single-coin, single-issuer, single-year country', () => {
  assert.equal(
    utils.countryAriaLabel({ label: 'Tonga', count: 1, issuerCount: 1, yearMin: 1975, yearMax: 1975 }),
    'Tonga, 1 coin, 1 issuing authority, year 1975'
  );
});

test('normaliseIso trims and lowercases', () => {
  assert.equal(utils.normaliseIso('  IN '), 'in');
  assert.equal(utils.normaliseIso(null), '');
});
