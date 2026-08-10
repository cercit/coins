/* Pure helpers that join the collection data to the world-map SVG.
   No DOM, no fetch — so they can be unit-tested under Node and reused in the
   browser. Loaded as a plain <script> before app.js (exposes window.CoinMapUtils)
   and required directly by map-utils.test.js. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CoinMapUtils = api;
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  // Two-letter ISO codes as they appear on flagcdn and in the SVG: lowercase.
  function normaliseIso(value) {
    return String(value == null ? '' : value).trim().toLowerCase();
  }

  // Keyed lookup of countries that belong on the geographic layer.
  // Modern countries with an ISO code map directly. Historical / regional
  // entities (Yugoslavia, East Africa, currency unions) carry a mapIso array
  // instead — their coins light up the successor countries' polygons.
  function buildCountryIndex(countries) {
    var index = {};
    (countries || []).forEach(function (c) {
      if (!c) return;
      if (!(Number(c.count) > 0)) return;
      var key = normaliseIso(c.iso2);
      if (key) {
        index[key] = c;
        return;
      }
      // Historical entity with mapIso aliases — overlay onto modern polygons.
      var aliases = c.mapIso;
      if (!aliases || !aliases.length) return;
      aliases.forEach(function (iso) {
        var k = normaliseIso(iso);
        if (!k) return;
        if (index[k]) return; // modern country already owns this polygon
        index[k] = c;
      });
    });
    return index;
  }

  // Map a coin count to one of five intensity buckets: 0 = uncollected, 1-4 =
  // collected (dim to bright). The scale is logarithmic on purpose. Coin
  // collections are lopsided — one country can hold a hundred coins while most
  // hold one or two — so a linear scale would leave nearly every country in the
  // dimmest band. The log spread keeps the map readable: roughly 1-2 coins land
  // in bucket 1, 3-9 in bucket 2, 10-33 in bucket 3, and the deepest holdings in
  // bucket 4. The single largest count always reaches 4.
  function colourBucket(count, maxCount) {
    var n = Number(count) || 0;
    var max = Number(maxCount) || 0;
    if (n <= 0 || max <= 0) return 0;
    if (n >= max) return 4;
    var fraction = Math.log(n + 1) / Math.log(max + 1);
    var bucket = Math.ceil(fraction * 4);
    if (bucket < 1) return 1;
    if (bucket > 4) return 4;
    return bucket;
  }

  // Spoken label for a country path, e.g.
  // "India, 111 coins, 8 issuing authorities, years 985 to 2026".
  function countryAriaLabel(country) {
    var c = country || {};
    var coins = Number(c.count) === 1 ? '1 coin' : (c.count + ' coins');
    var issuers = Number(c.issuerCount) === 1
      ? '1 issuing authority'
      : (c.issuerCount + ' issuing authorities');
    var years = c.yearMin === c.yearMax
      ? 'year ' + c.yearMin
      : 'years ' + c.yearMin + ' to ' + c.yearMax;
    return c.label + ', ' + coins + ', ' + issuers + ', ' + years;
  }

  return {
    normaliseIso: normaliseIso,
    buildCountryIndex: buildCountryIndex,
    colourBucket: colourBucket,
    countryAriaLabel: countryAriaLabel
  };
}));
