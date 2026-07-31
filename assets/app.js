(function () {
  'use strict';

  var app = document.getElementById('app');
  var headerStats = document.getElementById('header-stats');
  var themeBtn = document.getElementById('theme-toggle');

  themeBtn.addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme');
    var isDark = cur ? cur === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    var next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('coins-theme', next); } catch (e) {}
  });

  var DATA = null;
  var state = { query: '', region: 'All', sort: 'series' };
  var REGION_ORDER = ['All', 'Africa', 'Americas', 'Asia', 'Europe', 'Oceania', 'Historical & Regional'];

  fetch('data/collection.json').then(function (r) { return r.json(); }).then(function (d) {
    DATA = d;
    headerStats.innerHTML =
      '<span><b>' + d.totalCoins + '</b> coins</span>' +
      '<span><b>' + d.countryCount + '</b> countries</span>' +
      '<span><b>' + d.issuerCount + '</b> issuers</span>';
    render();
  }).catch(function (e) {
    app.innerHTML = '<div class="empty">Could not load the collection.<br>' + esc(e) + '</div>';
  });

  window.addEventListener('hashchange', render);

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* A guilloché rosette: the figure a rose-engine lathe cuts into a coin die.
     Each ring is a hypotrochoid — a point on a circle of radius r rolling
     inside a circle of radius R — which is literally what the lathe traces. */
  function rosette(R, r, d, cx, cy, scale) {
    var pts = [], steps = 1440;
    var k = R - r;
    for (var i = 0; i <= steps; i++) {
      var t = (i / steps) * Math.PI * 2 * (r / gcd(R, r));
      var x = k * Math.cos(t) + d * Math.cos((k / r) * t);
      var y = k * Math.sin(t) - d * Math.sin((k / r) * t);
      pts.push((cx + x * scale).toFixed(2) + ',' + (cy + y * scale).toFixed(2));
    }
    return '<path d="M' + pts.join('L') + 'Z"/>';
  }

  function gcd(a, b) { return b ? gcd(b, a % b) : a; }

  function guilloche() {
    var s = '';
    s += rosette(90, 13, 44, 200, 200, 1.05);
    s += rosette(90, 17, 34, 200, 200, 1.35);
    s += rosette(90, 11, 26, 200, 200, 0.72);
    return '<svg class="hero-guilloche" viewBox="0 0 400 400" aria-hidden="true" focusable="false">' + s + '</svg>';
  }

  function route() {
    var parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    if (parts[0] === 'c' && parts[1]) return { view: 'entity', country: parts[1], issuer: parts[2] || null };
    return { view: 'home' };
  }

  function findCountry(slug) {
    return DATA.countries.filter(function (c) { return c.slug === slug; })[0];
  }

  function render() {
    if (!DATA) return;
    var r = route();
    if (r.view === 'entity') {
      var country = findCountry(r.country);
      if (!country) return notFound();
      if (r.issuer) {
        var issuer = country.issuers.filter(function (i) { return i.slug === r.issuer; })[0];
        if (!issuer) return notFound();
        renderIssuer(country, issuer);
      } else if (country.multiIssuer) {
        renderCountryIssuers(country);
      } else {
        renderIssuer(country, country.issuers[0], true);
      }
    } else {
      renderHome();
    }
    window.scrollTo(0, 0);
  }

  function notFound() {
    app.innerHTML = '<div class="empty">That page isn’t in the cabinet. <a href="#/">Back to all countries</a>.</div>';
  }

  /* ---------------- home ---------------- */

  function renderHome() {
    var q = state.query.trim().toLowerCase();
    var list = DATA.countries.filter(function (c) {
      if (state.region !== 'All' && c.region !== state.region) return false;
      if (!q) return true;
      if (c.label.toLowerCase().indexOf(q) !== -1) return true;
      return c.issuers.some(function (i) { return i.label.toLowerCase().indexOf(q) !== -1; });
    });

    var html = '<section class="hero">' + guilloche() +
      '<h1>A cabinet of <em>' + DATA.totalCoins + '</em> coins</h1>' +
      '<p>Collected by hand and catalogued one at a time, from ' + DATA.countryCount +
      ' countries and ' + DATA.issuerCount + ' separate issuing authorities. Open a drawer to begin.</p>' +
      '</section>';

    html += '<div class="controls">' +
      '<div class="search-box">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>' +
      '<input type="text" id="search-input" placeholder="Search countries or issuers…" value="' + esc(state.query) + '" autocomplete="off">' +
      '</div>' +
      '<div class="chips">' + REGION_ORDER.map(function (reg) {
        return '<button class="chip' + (state.region === reg ? ' active' : '') + '" data-region="' + esc(reg) + '">' + esc(reg) + '</button>';
      }).join('') + '</div>' +
      '</div>';

    html += '<div class="section-title"><h2>Countries</h2><span class="count">' + list.length + ' shown</span></div>';
    html += list.length
      ? '<div class="flag-grid">' + list.map(countryTile).join('') + '</div>'
      : '<div class="empty">Nothing matches “' + esc(state.query) + '”.</div>';

    app.innerHTML = html;

    var input = document.getElementById('search-input');
    input.addEventListener('input', function (e) {
      state.query = e.target.value;
      renderHome();
      var el = document.getElementById('search-input');
      el.focus();
      el.selectionStart = el.selectionEnd = el.value.length;
    });
    each('.chip', function (btn) {
      btn.addEventListener('click', function () { state.region = btn.getAttribute('data-region'); renderHome(); });
    });
  }

  function flagMark(iso2, badge, alt, cls) {
    return iso2
      ? '<span class="' + cls + '-flag"><img loading="lazy" src="https://flagcdn.com/w320/' + iso2 + '.png" alt="Flag of ' + esc(alt) + '"></span>'
      : '<span class="' + cls + '-badge">' + esc(badge) + '</span>';
  }

  function countryTile(c) {
    var sub = c.multiIssuer
      ? c.issuerCount + ' issuers · ' + c.count + ' coins'
      : c.count + ' coin' + (c.count === 1 ? '' : 's');
    return '<a class="flag-tile" href="#/c/' + c.slug + '">' +
      '<div class="flag-img-wrap">' +
      (c.iso2
        ? '<img loading="lazy" src="https://flagcdn.com/w320/' + c.iso2 + '.png" alt="Flag of ' + esc(c.label) + '">'
        : '<span class="tile-badge">' + esc(c.badge) + '</span>') +
      '</div>' +
      '<div class="flag-meta"><span class="flag-name">' + esc(c.label) + '</span>' +
      '<span class="flag-count">' + esc(sub) + '</span></div>' +
      '</a>';
  }

  /* ------------- country -> issuer grid ------------- */

  function crumbs(items) {
    return '<nav class="crumbs" aria-label="Breadcrumb">' + items.map(function (it, i) {
      var last = i === items.length - 1;
      return (last
        ? '<span aria-current="page">' + esc(it.label) + '</span>'
        : '<a href="' + it.href + '">' + esc(it.label) + '</a>') +
        (last ? '' : '<span class="crumb-sep" aria-hidden="true">/</span>');
    }).join('') + '</nav>';
  }

  function statBlock(items) {
    return '<div class="detail-stats">' + items.map(function (s) {
      return '<div class="detail-stat"><b>' + esc(s.value) + '</b><span>' + esc(s.label) + '</span></div>';
    }).join('') + '</div>';
  }

  function yearSpan(o) {
    if (!o.yearMin || !o.yearMax) return '—';
    return o.yearMin === o.yearMax ? String(o.yearMin) : o.yearMin + '–' + o.yearMax;
  }

  function renderCountryIssuers(c) {
    var html = crumbs([{ label: 'All countries', href: '#/' }, { label: c.label }]);

    html += '<div class="detail-header">' +
      flagMark(c.iso2, c.badge, c.label, 'detail') +
      '<div class="detail-titles"><h1>' + esc(c.label) + '</h1>' +
      '<div class="era">' + c.issuerCount + ' issuing authorities in this collection</div></div></div>';

    html += statBlock([
      { value: c.count, label: 'Coins in collection' },
      { value: yearSpan(c), label: 'Year range' },
      { value: c.issuerCount, label: 'Issuers' },
    ]);

    if (c.speciality) html += '<div class="speciality">' + c.speciality.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>';

    html += '<div class="section-title"><h2>Issuers</h2><span class="count">' + c.issuerCount + '</span></div>' +
      '<p class="section-lede">' + esc(c.label) + ' has struck coinage under more than one authority. Each issued its own currency — pick one to open its tray.</p>';

    html += '<div class="issuer-grid">' + c.issuers.map(function (i) { return issuerTile(c, i); }).join('') + '</div>';

    app.innerHTML = html;
  }

  function issuerTile(c, i) {
    var meta = [i.era, i.count + ' coin' + (i.count === 1 ? '' : 's')].filter(Boolean).join(' · ');
    return '<a class="issuer-tile" href="#/c/' + c.slug + '/' + i.slug + '">' +
      flagMark(i.iso2, i.badge, i.label, 'issuer') +
      '<span class="issuer-body">' +
      '<span class="issuer-name">' + esc(i.label) + '</span>' +
      '<span class="issuer-meta">' + esc(meta) + '</span>' +
      (i.note ? '<span class="issuer-note">' + esc(i.note) + '</span>' : '') +
      '</span></a>';
  }

  /* ---------------- issuer -> coins ---------------- */

  function renderIssuer(c, issuer, isOnlyIssuer) {
    var trail = [{ label: 'All countries', href: '#/' }];
    if (isOnlyIssuer) trail.push({ label: c.label });
    else trail.push({ label: c.label, href: '#/c/' + c.slug }, { label: issuer.label });
    var html = crumbs(trail);

    var showCountryMark = isOnlyIssuer || !issuer.iso2 && !c.multiIssuer;
    html += '<div class="detail-header">' +
      (isOnlyIssuer ? flagMark(c.iso2, c.badge, c.label, 'detail') : flagMark(issuer.iso2, issuer.badge, issuer.label, 'detail')) +
      '<div class="detail-titles"><h1>' + esc(isOnlyIssuer ? c.label : issuer.label) + '</h1>' +
      (issuer.era ? '<div class="era">' + esc(issuer.era) + '</div>' : '') +
      '</div></div>';

    html += statBlock([
      { value: issuer.count, label: 'Coins in collection' },
      { value: yearSpan(issuer), label: 'Year range' },
      { value: issuer.authorities.length, label: issuer.authorities.length === 1 ? 'Ruling authority' : 'Ruling authorities' },
    ]);

    var blurb = isOnlyIssuer ? (c.speciality ? c.speciality.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') : '')
      : (issuer.note ? '<p>' + esc(issuer.note) + '</p>' : '');
    if (blurb) html += '<div class="speciality">' + blurb + '</div>';

    html += '<div class="tray-bar">' +
      '<div class="section-title tray-title"><h2>The coins</h2><span class="count">' + issuer.count + '</span></div>' +
      '<div class="sorts" role="group" aria-label="Arrange coins">' +
      sortBtn('series', 'By ruler') + sortBtn('denomination', 'By denomination') + sortBtn('year', 'By year') +
      '</div></div>';

    html += renderTrays(issuer);

    app.innerHTML = html;

    each('.sort-btn', function (b) {
      b.addEventListener('click', function () { state.sort = b.getAttribute('data-sort'); render(); });
    });
    each('.coin-stage', function (stage) {
      if (stage.getAttribute('data-flip') !== '1') return;
      stage.addEventListener('click', function () { stage.closest('.coin-card').classList.toggle('flipped'); });
    });
  }

  function sortBtn(key, label) {
    return '<button class="sort-btn' + (state.sort === key ? ' active' : '') + '" data-sort="' + key + '"' +
      (state.sort === key ? ' aria-pressed="true"' : ' aria-pressed="false"') + '>' + esc(label) + '</button>';
  }

  // "By ruler" keeps the historical grouping (a tray per authority, coins in
  // denomination order inside it). The flat sorts drop the groups entirely.
  function renderTrays(issuer) {
    if (state.sort === 'series') {
      return issuer.authorities.map(function (a) {
        var head = issuer.authorities.length > 1 || a.label !== 'Unattributed'
          ? '<div class="tray-head"><h3>' + esc(a.label) + '</h3>' +
            (a.era ? '<span class="tray-era">' + esc(a.era) + '</span>' : '') +
            (a.house ? '<span class="tray-house">' + esc(a.house) + '</span>' : '') +
            '<span class="tray-count">' + a.count + '</span></div>'
          : '';
        return '<section class="tray">' + head + '<div class="coin-grid">' + a.coins.map(coinCard).join('') + '</div></section>';
      }).join('');
    }
    var all = issuer.authorities.flatMap(function (a) { return a.coins; });
    all = all.slice().sort(state.sort === 'year'
      ? function (a, b) { return (a.yearNum ?? 9999) - (b.yearNum ?? 9999); }
      : function (a, b) { return (a.sortValue ?? 9e9) - (b.sortValue ?? 9e9) || (a.yearNum ?? 9999) - (b.yearNum ?? 9999); });
    return '<section class="tray"><div class="coin-grid">' + all.map(coinCard).join('') + '</div></section>';
  }

  var SHAPE_ICON = {
    round: '<circle cx="50" cy="50" r="38"/>',
    square: '<rect x="16" y="16" width="68" height="68" rx="8"/>',
    heptagonal: '<polygon points="50,12 83,29 91,64 68,88 32,88 9,64 17,29"/>',
    hexagonal: '<polygon points="50,12 83,31 83,69 50,88 17,69 17,31"/>',
    octagonal: '<polygon points="35,13 65,13 87,35 87,65 65,87 35,87 13,65 13,35"/>',
    hole: '<path d="M50 12a38 38 0 1 0 0 76 38 38 0 1 0 0-76zm0 26a12 12 0 1 1 0 24 12 12 0 0 1 0-24z"/>',
  };

  function shapeKey(shape) {
    var s = (shape || '').toLowerCase();
    if (s.indexOf('hole') !== -1) return 'hole';
    if (s.indexOf('square') !== -1) return 'square';
    if (s.indexOf('heptagon') !== -1) return 'heptagonal';
    if (s.indexOf('hexagon') !== -1) return 'hexagonal';
    if (s.indexOf('octagon') !== -1 || s.indexOf('dodecagon') !== -1 || s.indexOf('hendecagon') !== -1) return 'octagonal';
    return 'round';
  }

  function specs(c) {
    var out = [];
    if (c.composition) out.push(c.composition);
    if (c.weight) out.push(c.weight + ' g');
    if (c.diameter) out.push(c.diameter + ' mm');
    return out;
  }

  function coinCard(c) {
    var stage = c.hasImage
      ? '<div class="coin-stage" data-flip="1" title="Click to flip">' +
        '<div class="coin-flip">' +
        '<div class="coin-face front"><img loading="lazy" src="' + c.front + '" alt="' + esc(c.denomination) + ', obverse"></div>' +
        '<div class="coin-face back"><img loading="lazy" src="' + c.back + '" alt="' + esc(c.denomination) + ', reverse"></div>' +
        '</div><span class="coin-flip-hint">↻ flip</span></div>'
      : '<div class="coin-stage is-empty">' +
        '<svg class="coin-ghost" viewBox="0 0 100 100" aria-hidden="true">' + SHAPE_ICON[shapeKey(c.shape)] + '</svg>' +
        '<span class="coin-pending">Photo to come</span></div>';

    var sp = specs(c);
    var mark = c.restrike ? 'Restrike' : (c.replica ? 'Replica' : '');
    var cls = 'coin-card' + (c.hasImage ? '' : ' no-image') + (mark ? ' is-restrike' : '');
    return '<article class="' + cls + '">' + stage +
      '<div class="coin-info">' +
      '<div class="coin-head"><span class="coin-denom">' + esc(c.denomination) + '</span>' +
      '<span class="coin-year">' + esc(c.year) + '</span></div>' +
      (c.variant ? '<div class="coin-note">' + esc(c.variant) + '</div>' : '') +
      (mark ? '<p class="specimen-flag"><span class="specimen-mark">' + esc(mark) + '</span>' +
        (c.specimenNote ? '<span class="specimen-note">' + esc(c.specimenNote) + '</span>' : '') + '</p>' : '') +
      (sp.length ? '<dl class="coin-specs' + (c.catalogueOnlySpecs ? ' is-catalogue' : '') + '"' +
        (c.catalogueOnlySpecs ? ' title="Catalogue figures for the original type, not measured from this specimen"' : '') + '>' +
        sp.map(function (s) { return '<dd>' + esc(s) + '</dd>'; }).join('') + '</dl>' : '') +
      (c.catalogueOnlySpecs && sp.length ? '<p class="specs-caveat">Catalogue figures for the original type</p>' : '') +
      '<div class="coin-foot">' +
      (c.grade ? '<span class="coin-grade" title="Condition">' + esc(c.grade) + '</span>' : '') +
      (c.reference ? '<span class="coin-ref">' + esc(c.reference) + '</span>' : '') +
      (c.numistaUrl ? '<a class="coin-source" href="' + esc(c.numistaUrl) + '" target="_blank" rel="noopener">Numista ↗</a>' : '') +
      '</div></div></article>';
  }

  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }
})();
