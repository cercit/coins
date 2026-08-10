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
    if (parts[0] === 'x') return { view: 'exhibition', series: parts[1] || null, page: parts[2] || '1' };
    if (parts[0] === 'countries') return { view: 'countries' };
    return { view: 'home' };
  }

  function findCountry(slug) {
    return DATA.countries.filter(function (c) { return c.slug === slug; })[0];
  }

  function render() {
    if (!DATA) return;
    var r = route();
    if (r.view === 'exhibition') {
      renderExhibition(r);
      window.scrollTo(0, 0);
      return;
    }
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
    } else if (r.view === 'countries') {
      renderCountries();
    } else {
      renderHome();
    }
    window.scrollTo(0, 0);
  }

  function notFound() {
    app.innerHTML = '<div class="empty">That page isn’t in the cabinet. <a href="#/">Back to all countries</a>.</div>';
  }

  /* ---------------- home ---------------- */

  // World first, then the site's five geographic regions (matching the map's
  // baked-in continent viewBoxes). "Historical & Regional" has no place on a
  // geographic map, so it stays a filter chip only, not a map view.
  var MAP_VIEWS = ['World', 'Africa', 'Americas', 'Asia', 'Europe', 'Oceania'];

  function renderHome() {
    app.innerHTML =
      '<section class="hero">' + guilloche() +
        '<h1>A cabinet of <em>' + DATA.totalCoins + '</em> coins</h1>' +
        '<p>Collected by hand and catalogued one at a time, from ' + DATA.countryCount +
        ' countries and ' + DATA.issuerCount + ' separate issuing authorities. Open a drawer to begin.</p>' +
      '</section>' +
      mapSectionMarkup() +
      '<div class="section-title"><h2>Exhibition</h2><span class="count">now on show</span></div>' +
      '<div class="gallery-cards" id="home-exhibits"><div class="empty">Loading the gallery…</div></div>';

    renderCollectionMap(DATA.countries);
    loadExhibition(function (ex) {
      var box = document.getElementById('home-exhibits');
      if (!box) return;
      box.innerHTML = (ex && ex.series && ex.series.length)
        ? ex.series.map(function (s) { return exhibitCard(ex, s); }).join('')
        : '<div class="empty">No exhibitions yet.</div>';
    });
  }

  function renderCountries() {
    app.innerHTML = crumbs([{ label: 'Home', href: '#/' }, { label: 'Countries' }]) +
      '<header class="gallery-head">' +
        '<h1 class="gallery-title">Coins from ' + DATA.countryCount + ' countries</h1>' +
        '<div class="gallery-intro"><p>The full catalogue, sorted by where each coin was struck. Flags link through to issuers, rulers and individual pieces.</p></div>' +
      '</header>' +
      countriesSectionMarkup();
    wireHomeControls();
    updateGrid();
  }

  function updateGrid() {
    var q = state.query.trim().toLowerCase();
    var list = DATA.countries.filter(function (c) {
      if (state.region !== 'All' && c.region !== state.region) return false;
      if (!q) return true;
      if (c.label.toLowerCase().indexOf(q) !== -1) return true;
      return c.issuers.some(function (i) { return i.label.toLowerCase().indexOf(q) !== -1; });
    });
    var count = document.getElementById('grid-count');
    var grid = document.getElementById('flag-grid');
    if (count) count.textContent = list.length + ' shown';
    if (!grid) return;
    if (list.length) {
      grid.className = 'flag-grid';
      grid.innerHTML = list.map(countryTile).join('');
    } else {
      grid.className = '';
      grid.innerHTML = '<div class="empty">Nothing matches “' + esc(state.query) + '”.</div>';
    }
  }

  function wireHomeControls() {
    var input = document.getElementById('search-input');
    // The input is no longer rebuilt on each keystroke, so focus/caret survive
    // naturally — updateGrid only rewrites the grid.
    if (input) input.addEventListener('input', function (e) { state.query = e.target.value; updateGrid(); });
    each('.chip', function (btn) {
      btn.addEventListener('click', function () {
        state.region = btn.getAttribute('data-region');
        each('.chip', function (b) { b.classList.toggle('active', b === btn); });
        updateGrid();
      });
    });
  }

  /* ---------------- collection world map ---------------- */

  var mapSvgCache = null;
  var prefersReduce = matchMedia('(prefers-reduced-motion: reduce)');

  function mapSectionMarkup() {
    var views = MAP_VIEWS.map(function (v, i) {
      return '<button type="button" class="map-view' + (i === 0 ? ' active' : '') +
        '" data-view="' + v + '" aria-pressed="' + (i === 0 ? 'true' : 'false') + '">' + v + '</button>';
    }).join('');
    var legend = '<div class="map-legend" aria-hidden="true">' +
      '<span class="map-legend-label">Fewer</span>' +
      '<span class="map-swatch" data-map-bucket="1"></span>' +
      '<span class="map-swatch" data-map-bucket="2"></span>' +
      '<span class="map-swatch" data-map-bucket="3"></span>' +
      '<span class="map-swatch" data-map-bucket="4"></span>' +
      '<span class="map-legend-label">More coins</span></div>';
    return '<section class="collection-map-section" aria-labelledby="map-title">' +
      '<div class="map-heading">' +
        '<div><p class="eyebrow">Geographic cabinet</p><h2 id="map-title">Explore the collection by map</h2></div>' +
        '<p>Brighter countries hold more coins. Select a country to open its issuing authorities.</p>' +
      '</div>' +
      '<div class="map-views" role="group" aria-label="Zoom the map to a region">' + views + '</div>' +
      '<div class="map-frame" id="collection-map" aria-busy="true"><p class="map-loading">Loading collection map…</p></div>' +
      legend +
      '<div class="map-region-list" id="map-region-list" hidden>' +
        '<p class="map-region-list-title" id="map-region-list-title"></p>' +
        '<div class="map-region-list-items" id="map-region-list-items"></div>' +
      '</div>' +
      '<p class="map-note">Historical issues — British India, the princely states — appear once you open their modern country. India is shown with its official borders. Pick a region to list its countries — handy for small islands that are hard to click.</p>' +
      '<div class="map-tip" id="map-tip" aria-hidden="true"></div>' +
    '</section>';
  }

  function renderCollectionMap(countries) {
    var frame = document.getElementById('collection-map');
    if (!frame) return;
    var apply = function (svgText) {
      frame.innerHTML = svgText;
      frame.removeAttribute('aria-busy');
      var svg = frame.querySelector('svg');
      if (!svg) return mapUnavailable(frame);
      decorateCollectionMap(frame, svg, countries);
      wireMapViews(frame, svg);
    };
    if (mapSvgCache) return apply(mapSvgCache);
    fetch('assets/world-map.svg').then(function (r) {
      if (!r.ok) throw new Error('map ' + r.status);
      return r.text();
    }).then(function (t) { mapSvgCache = t; apply(t); }).catch(function () { mapUnavailable(frame); });
  }

  function mapUnavailable(frame) {
    frame.removeAttribute('aria-busy');
    frame.innerHTML = '<p class="map-loading">Map unavailable right now — browse by search or the flags below.</p>';
  }

  function decorateCollectionMap(frame, svg, countries) {
    var index = CoinMapUtils.buildCountryIndex(countries);
    var maxCount = 0;
    Object.keys(index).forEach(function (k) { if (index[k].count > maxCount) maxCount = index[k].count; });
    var tip = document.getElementById('map-tip');

    eachNode(svg.querySelectorAll('[data-iso]'), function (path) {
      var c = index[path.getAttribute('data-iso')];
      if (!c) return; // uncollected country: decorative geometry, not interactive
      path.setAttribute('data-map-state', 'collected');
      path.setAttribute('data-map-bucket', String(CoinMapUtils.colourBucket(c.count, maxCount)));
      path.setAttribute('role', 'link');
      path.setAttribute('tabindex', '0');
      path.setAttribute('aria-label', CoinMapUtils.countryAriaLabel(c));

      var go = function () { location.hash = '#/c/' + c.slug; };
      path.addEventListener('click', go);
      path.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); go(); }
      });
      path.addEventListener('pointerenter', function (e) { showTip(frame, tip, c, e); });
      path.addEventListener('pointermove', function (e) { showTip(frame, tip, c, e); });
      path.addEventListener('pointerleave', function () { hideTip(tip); });
      path.addEventListener('focus', function () { focusTip(frame, tip, c, path); });
      path.addEventListener('blur', function () { hideTip(tip); });
    });
  }

  // On keyboard focus there's no cursor to anchor the tooltip, so centre it on
  // the focused country's shape instead.
  function focusTip(frame, tip, c, path) {
    if (!tip) return;
    var pr = path.getBoundingClientRect();
    var fr = frame.getBoundingClientRect();
    tip.textContent = c.label + ' · ' + c.count + ' coin' + (c.count === 1 ? '' : 's');
    tip.style.left = (pr.left + pr.width / 2 - fr.left) + 'px';
    tip.style.top = (pr.top + pr.height / 2 - fr.top) + 'px';
    tip.setAttribute('data-show', '1');
  }

  function showTip(frame, tip, c, e) {
    if (!tip) return;
    tip.textContent = c.label + ' · ' + c.count + ' coin' + (c.count === 1 ? '' : 's');
    var r = frame.getBoundingClientRect();
    tip.style.left = (e.clientX - r.left) + 'px';
    tip.style.top = (e.clientY - r.top) + 'px';
    tip.setAttribute('data-show', '1');
  }
  function hideTip(tip) { if (tip) tip.removeAttribute('data-show'); }

  function wireMapViews(frame, svg) {
    var regions;
    try { regions = JSON.parse(svg.getAttribute('data-regions') || '{}'); } catch (e) { regions = {}; }
    var section = frame.closest('.collection-map-section');
    eachNode(section.querySelectorAll('.map-view'), function (btn) {
      btn.addEventListener('click', function () {
        var vb = regions[btn.getAttribute('data-view')];
        if (!vb) return;
        eachNode(section.querySelectorAll('.map-view'), function (b) {
          var on = b === btn;
          b.classList.toggle('active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        tweenViewBox(svg, vb);
        renderRegionList(btn.getAttribute('data-view'));
      });
    });
    renderRegionList('World'); // start collapsed
  }

  // A clickable list of the collected countries in the chosen region. It works
  // straight from the collection data, so it reaches every country in a region —
  // including small islands and microstates too tiny to click on the map itself.
  function renderRegionList(view) {
    var box = document.getElementById('map-region-list');
    if (!box) return;
    if (view === 'World') { box.hidden = true; return; }
    var list = DATA.countries
      .filter(function (c) { return c.region === view && c.count > 0; })
      .sort(function (a, b) { return a.label.localeCompare(b.label); });
    if (!list.length) { box.hidden = true; return; }
    document.getElementById('map-region-list-title').textContent = list.length + ' collected in ' + view;
    document.getElementById('map-region-list-items').innerHTML = list.map(function (c) {
      return '<a class="map-region-chip" href="#/c/' + c.slug + '">' + esc(c.label) +
        ' <span>' + c.count + '</span></a>';
    }).join('');
    box.hidden = false;
  }

  function tweenViewBox(svg, targetStr) {
    var to = targetStr.split(/[\s,]+/).map(Number);
    var token = (svg.__vb = (svg.__vb || 0) + 1);
    if (prefersReduce.matches) return void svg.setAttribute('viewBox', to.join(' '));
    var from = (svg.getAttribute('viewBox') || '0 0 2000 856').split(/[\s,]+/).map(Number);
    var start = performance.now(), dur = 480;
    (function step(now) {
      if (svg.__vb !== token) return; // a newer view took over
      var t = Math.min(1, (now - start) / dur);
      var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      svg.setAttribute('viewBox', from.map(function (f, i) { return +(f + (to[i] - f) * e).toFixed(1); }).join(' '));
      if (t < 1) requestAnimationFrame(step);
    })(start);
  }

  function eachNode(nodeList, fn) { Array.prototype.forEach.call(nodeList, fn); }

  function flagSrc(iso2, localFlag) {
    if (iso2) return 'https://flagcdn.com/w320/' + iso2 + '.png';
    if (localFlag) return localFlag;
    return null;
  }

  function flagMark(iso2, badge, alt, cls, localFlag) {
    var src = flagSrc(iso2, localFlag);
    return src
      ? '<span class="' + cls + '-flag"><img loading="lazy" src="' + src + '" alt="Flag of ' + esc(alt) + '"></span>'
      : '<span class="' + cls + '-badge">' + esc(badge) + '</span>';
  }

  function countryTile(c) {
    var sub = c.multiIssuer
      ? c.issuerCount + ' issuers · ' + c.count + ' coins'
      : c.count + ' coin' + (c.count === 1 ? '' : 's');
    var src = flagSrc(c.iso2, c.localFlag);
    return '<a class="flag-tile" href="#/c/' + c.slug + '">' +
      '<div class="flag-img-wrap">' +
      (src
        ? '<img loading="lazy" src="' + src + '" alt="Flag of ' + esc(c.label) + '">'
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
      flagMark(c.iso2, c.badge, c.label, 'detail', c.localFlag) +
      '<div class="detail-titles"><h1>' + esc(c.label) + '</h1>' +
      '<div class="era">' + c.issuerCount + ' issuing authorities in this collection</div></div></div>';

    html += statBlock([
      { value: c.count, label: 'Coins in collection' },
      { value: yearSpan(c), label: 'Year range' },
      { value: c.issuerCount, label: 'Issuers' },
    ]);

    if (c.speciality) html += '<div class="speciality">' + c.speciality.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>';

    // India is the collection's deepest country-to-issuer bridge: the map opens
    // modern India, and from here a visitor picks the authority that struck the
    // coin. Spell that out so princely states never read as separate countries.
    if (c.slug === 'in') {
      html += '<aside class="historical-callout" aria-labelledby="india-history-title">' +
        '<p class="eyebrow">From map to mint</p>' +
        '<h2 id="india-history-title">India’s many issuers</h2>' +
        '<p>You entered modern India from the map. Now choose the authority that actually struck the coin — the Chola dynasty, British India, a princely state, or the Republic. These are historical issuers within India, not separate countries on the map.</p>' +
        '</aside>';
    }

    html += '<div class="section-title"><h2>Issuers</h2><span class="count">' + c.issuerCount + '</span></div>' +
      '<p class="section-lede">' + esc(c.label) + ' has struck coinage under more than one authority. Each issued its own currency — pick one to open its tray.</p>';

    html += '<div class="issuer-grid">' + c.issuers.map(function (i) { return issuerTile(c, i); }).join('') + '</div>';

    app.innerHTML = html;
  }

  function issuerTile(c, i) {
    var meta = [i.era, i.count + ' coin' + (i.count === 1 ? '' : 's')].filter(Boolean).join(' · ');
    return '<a class="issuer-tile" href="#/c/' + c.slug + '/' + i.slug + '">' +
      flagMark(i.iso2, i.badge, i.label, 'issuer', i.localFlag) +
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
      (isOnlyIssuer ? flagMark(c.iso2, c.badge, c.label, 'detail', c.localFlag) : flagMark(issuer.iso2, issuer.badge, issuer.label, 'detail', issuer.localFlag)) +
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
    return '<article class="' + cls + '" data-reveal>' + stage +
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

  /* ---------------- exhibition ----------------
     A curated, catalogue-style view: one series at a time, laid out as plates.
     Each plate holds two coins; each coin pairs its obverse/reverse images with
     an information panel, so a plate reads as a 2x2 block. Design, designer and
     edge facts come from data/exhibition.json and are joined to the collection
     by the design name carried in each coin's variant. */

  var EX = null;
  var PER_PAGE = 2;

  function loadExhibition(cb) {
    if (EX) return cb(EX);
    fetch('data/exhibition.json').then(function (r) {
      if (!r.ok) throw new Error('exhibition ' + r.status);
      return r.json();
    }).then(function (d) { EX = d; cb(EX); }).catch(function () { cb(null); });
  }

  function renderExhibition(r) {
    app.innerHTML = '<div class="empty">Opening the exhibition…</div>';
    loadExhibition(function (ex) {
      if (!ex) return void (app.innerHTML = '<div class="empty">The exhibition could not be loaded. <a href="#/">Back to the cabinet</a>.</div>');
      var series = r.series && ex.series.filter(function (s) { return s.slug === r.series; })[0];
      if (!series) return renderExhibitionIndex(ex);
      renderSeries(ex, series, r.page);
    });
  }

  // The foyer: what is currently on show. Each series is announced by one of
  // its own coins rather than a flag, lit the way it will be inside.
  function renderExhibitionIndex(ex) {
    app.innerHTML = crumbs([{ label: 'Home', href: '#/' }, { label: 'Exhibition' }]) +
      '<header class="gallery-head">' +
        '<p class="gallery-eyebrow">Now on show</p>' +
        '<h1 class="gallery-title">The Exhibition</h1>' +
        '<p class="gallery-dates">Curated series, walked room by room</p>' +
        '<div class="gallery-intro"><p>A series laid out the way it would sit in a gallery: each coin lit in turn, with a label giving the design, the artist who cut it, and what it was struck to stand for.</p></div>' +
      '</header>' +
      '<div class="gallery-cards">' + ex.series.map(function (s) { return exhibitCard(ex, s); }).join('') + '</div>';
  }

  // One featured-exhibition card. Its face shows the reverse design (what the
  // exhibition is about), not the monarch.
  function exhibitCard(ex, s) {
    var coins = seriesCoins(s);
    var hero = coins.filter(function (c) { return c.hasImage; })[0];
    var img = hero ? (hero.back || hero.front) : null;
    return '<a class="gallery-card" data-series-theme="' + esc(s.theme || 'default') + '" href="#/x/' + s.slug + '">' +
      '<div class="gallery-card-coin">' + (img ? '<img loading="lazy" src="' + img + '" alt="A ' + esc(s.name) + ' coin">' : '') + '</div>' +
      '<div class="gallery-card-body">' +
        '<p class="gallery-card-country">' + esc(seriesCountryLabel(s)) + '</p>' +
        '<h2 class="gallery-card-title">' + esc(s.name) + '</h2>' +
        '<p class="gallery-card-dates">' + esc(s.years || s.subtitle) + '</p>' +
        (s.lede ? '<p class="gallery-card-lede">' + esc(s.lede) + '</p>' : '') +
        '<p class="gallery-card-meta"><b>' + coins.length + '</b> objects · <b>' + countDesigns(ex, coins) + '</b> designs</p>' +
        '<span class="gallery-card-cta">Enter the gallery →</span>' +
      '</div></a>';
  }

  // The "Countries" catalogue block: search, region chips and the flag grid of
  // every country in the collection. Shared markup so home and the exhibition
  // page render it identically.
  function countriesSectionMarkup() {
    return '<div class="controls">' +
      '<div class="search-box">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>' +
      '<input type="text" id="search-input" placeholder="Search countries or issuers…" value="' + esc(state.query) + '" autocomplete="off">' +
      '</div>' +
      '<div class="chips">' + REGION_ORDER.map(function (reg) {
        return '<button class="chip' + (state.region === reg ? ' active' : '') + '" data-region="' + esc(reg) + '">' + esc(reg) + '</button>';
      }).join('') + '</div>' +
      '</div>' +
      '<div class="section-title"><h2>Countries</h2><span class="count" id="grid-count"></span></div>' +
      '<div class="flag-grid" id="flag-grid"></div>';
  }

  // Pull the coins of a series out of the collection using its match rules.
  function seriesCoins(series) {
    var m = series.match || {};
    var country = DATA.countries.filter(function (c) { return c.slug === m.countrySlug; })[0];
    if (!country) return [];
    var out = [];
    country.issuers.forEach(function (i) {
      if (m.issuerSlug && i.slug !== m.issuerSlug) return;
      i.authorities.forEach(function (a) {
        a.coins.forEach(function (c) {
          if (m.denomination && c.denomination !== m.denomination) return;
          if (m.shape && c.shape !== m.shape) return;
          if (m.yearMax && !(c.yearNum <= m.yearMax)) return;
          if (m.yearMin && !(c.yearNum >= m.yearMin)) return;
          out.push(c);
        });
      });
    });
    return out.sort(function (a, b) { return (a.yearNum || 0) - (b.yearNum || 0) || String(a.variant).localeCompare(String(b.variant)); });
  }

  // "Elizabeth II (4th portrait; Welsh Dragon)" -> portrait + design
  function splitVariant(variant) {
    var m = /\(([^;()]+);\s*([^)]+)\)/.exec(variant || '');
    return m ? { portrait: m[1].trim(), design: m[2].trim() } : { portrait: '', design: '' };
  }

  // A design re-cut by a later artist gets a "Design|Year" override.
  function designInfo(ex, design, year) {
    return ex.designs[design + '|' + year] || ex.designs[design] || null;
  }

  // A walk-through gallery: scrolling pans you horizontally down a lit hall,
  // past a foyer, room title-cards, and walls of framed coins, to an exit.
  function renderSeries(ex, series) {
    var coins = seriesCoins(series);
    var eras = groupPortraits(ex, coins);

    var html = crumbs([{ label: 'All countries', href: '#/' }, { label: 'Exhibition', href: '#/x' }, { label: series.name }]);
    html += '<div class="exhibit gallery" data-series-theme="' + esc(series.theme || 'default') + '">' +
      '<div class="gallery-scroll" id="gscroll"><div class="gallery-pin"><div class="gallery-floor"></div>' +
      '<div class="gallery-track" id="gtrack">';

    // foyer — the entrance
    html += '<section class="panel foyer" aria-label="Entrance">' +
      '<p class="foyer-eyebrow">Exhibition · ' + esc(seriesCountryLabel(series)) + '</p>' +
      '<h1 class="foyer-title">' + esc(series.name) + '</h1>' +
      '<p class="foyer-dates">' + esc(series.years || series.subtitle) + '</p>' +
      (series.intro ? '<div class="foyer-intro">' + series.intro.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>' : '') +
      '<ul class="foyer-facts">' +
        '<li><b>' + coins.length + '</b><span>objects</span></li>' +
        '<li><b>' + countDesigns(ex, coins) + '</b><span>designs</span></li>' +
        '<li><b>' + countDesigners(ex, coins) + '</b><span>designers</span></li>' +
      '</ul>' +
      '<p class="foyer-hint">Scroll to walk the gallery <span>→</span></p></section>';

    // Each portrait era opens with the monarch's obverse of that period, then
    // the coins struck under it — chronological, the way the series actually ran.
    var wallNo = 0, eraNo = 0;
    eras.forEach(function (era) {
      eraNo++;
      var p = era.portrait;
      html += '<section class="panel portrait-card" aria-label="Portrait era ' + eraNo + '">' +
        '<p class="room-num">Portrait ' + roman(eraNo) + '</p>' +
        '<div class="frame no-flip portrait-frame"><div class="mat">' +
          (era.obverse ? '<img class="face front" loading="lazy" src="' + era.obverse + '" alt="' + esc((p ? p.label : era.key) + ' portrait') + '">' : '') +
        '</div></div>' +
        '<h2 class="room-name">' + esc(p ? p.label : era.key) + '</h2>' +
        (p ? '<p class="room-sub">' + esc(p.designer + ' · ' + p.years) + '</p>' : '') +
        (p && p.note ? '<p class="portrait-note">' + esc(p.note) + '</p>' : '') +
        '</section>';
      chunk(era.coins, 2).forEach(function (pair) {
        wallNo++;
        html += '<section class="panel wall" aria-label="Wall ' + wallNo + '">' +
          pair.map(function (c) { return framedCoin(ex, series, c); }).join('') + '</section>';
      });
    });

    // exit
    html += '<section class="panel exit" aria-label="Exit">' +
      '<p class="exit-eyebrow">End of the exhibition</p>' +
      (series.closing ? '<p class="exit-text">' + esc(series.closing) + '</p>' : '') +
      '<a class="exit-link" href="#/x">← Back to the exhibition hall</a></section>';

    html += '</div>'; // track
    html += '<div class="gallery-progress" aria-hidden="true"><span id="gbar"></span></div>' +
      '<p class="gallery-hint" id="ghint">Scroll to explore <span>→</span></p>';
    html += '</div></div>'; // pin, scroll
    html += '<div class="gallery-foot"><a class="exhibit-btn" href="#/x">← All exhibitions</a>' +
      '<button class="exhibit-btn" type="button" onclick="window.print()">Print</button></div>';
    html += '</div>'; // exhibit

    app.innerHTML = html;
    wireFrames();
    setupGalleryScroll();
  }

  // Group coins by their obverse portrait, in chronological order. Each era
  // remembers the earliest coin's obverse so the divider can show that portrait.
  function groupPortraits(ex, coins) {
    var map = {}, order = [];
    coins.forEach(function (c) {
      var key = splitVariant(c.variant).portrait || 'Portrait';
      if (!map[key]) { map[key] = { key: key, portrait: ex.portraits[key] || null, coins: [], obverse: c.front, minYear: c.yearNum || 9999 }; order.push(key); }
      map[key].coins.push(c);
      if ((c.yearNum || 9999) < map[key].minYear) { map[key].minYear = c.yearNum; map[key].obverse = c.front; }
    });
    return order.map(function (k) { return map[k]; }).sort(function (a, b) { return a.minYear - b.minYear; });
  }

  function roman(n) { return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] || String(n); }

  function wireFrames() {
    each('.frame:not(.no-flip)', function (f) {
      var flip = function () { f.classList.toggle('flipped'); };
      f.addEventListener('click', flip);
      f.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); flip(); }
      });
    });
  }

  // Turn vertical scroll into a horizontal walk. On narrow screens or with
  // reduced motion we skip the pinning entirely and let the panels stack and
  // scroll normally — the content is identical either way, never gated.
  function setupGalleryScroll() {
    var scroll = document.getElementById('gscroll');
    var track = document.getElementById('gtrack');
    var bar = document.getElementById('gbar');
    var hint = document.getElementById('ghint');
    if (!scroll || !track) return;
    if (window.innerWidth < 760 || prefersReduce.matches) { scroll.classList.add('is-vertical'); return; }
    scroll.classList.add('is-immersive');

    var pending = false;
    function frame() {
      pending = false;
      var extra = Math.max(0, track.scrollWidth - window.innerWidth);
      var span = scroll.offsetHeight - window.innerHeight;
      var progress = span > 0 ? Math.min(1, Math.max(0, -scroll.getBoundingClientRect().top / span)) : 0;
      track.style.transform = 'translate3d(' + (-progress * extra).toFixed(1) + 'px,0,0)';
      if (bar) bar.style.width = (progress * 100).toFixed(2) + '%';
      if (hint) hint.style.opacity = progress > 0.015 ? '0' : '';
    }
    function onScroll() { if (!pending) { pending = true; requestAnimationFrame(frame); } }
    function layout() {
      var extra = Math.max(0, track.scrollWidth - window.innerWidth);
      // vertical scroll length = one screen to read the first panel, plus the
      // horizontal distance to walk the rest.
      scroll.style.height = (window.innerHeight + extra) + 'px';
      frame();
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', layout);
    // fonts/images can change track width after first paint
    setTimeout(layout, 60);
    layout();
    scroll.__galleryLayout = layout; // exposed for tests
  }

  function chunk(arr, n) {
    var out = [];
    for (var i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
    return out;
  }

  function countDesigns(ex, coins) {
    var s = {};
    coins.forEach(function (c) { var d = splitVariant(c.variant).design; if (d) s[d] = 1; });
    return Object.keys(s).length;
  }
  function countDesigners(ex, coins) {
    var s = {};
    coins.forEach(function (c) {
      var v = splitVariant(c.variant);
      var d = designInfo(ex, v.design, c.yearNum);
      if (d && d.designer) s[d.designer] = 1;
    });
    return Object.keys(s).length;
  }

  // A single coin hung in the hall: spotlit in a gold frame, a printed plaque
  // below it. Clicking the frame turns the coin to its reverse. The plaque is
  // brief, the way a museum label is — the fuller catalogue stays a click away.
  function framedCoin(ex, series, c) {
    var v = splitVariant(c.variant);
    var d = designInfo(ex, v.design, c.yearNum) || {};
    var label = (v.design || c.denomination) + ', ' + c.year;

    // This is an exhibition of the reverse DESIGNS, and the plaque names them, so
    // the design faces out by default; the monarch's obverse is the side you turn to.
    var mat = c.hasImage
      ? '<div class="mat"><img class="face front" loading="lazy" src="' + c.back + '" alt="' + esc(label) + ', reverse design">' +
        '<img class="face back" loading="lazy" src="' + c.front + '" alt="' + esc(label) + ', obverse portrait"></div>'
      : '<div class="mat is-empty"><svg class="coin-ghost" viewBox="0 0 100 100" aria-hidden="true">' + SHAPE_ICON[shapeKey(c.shape)] + '</svg></div>';

    var frame = c.hasImage
      ? '<div class="frame" tabindex="0" role="button" aria-label="Turn ' + esc(label) + ' to see the portrait">' + mat + '<span class="turn-hint">turn ↻</span></div>'
      : '<div class="frame no-flip">' + mat + '</div>';

    return '<figure class="framed">' + frame +
      '<figcaption class="plaque">' +
        '<h3>' + esc(v.design || c.denomination) + '</h3>' +
        '<span class="yr">' + esc(c.year) + ' · ' + esc(c.denomination) + '</span>' +
        (d.designer ? '<span class="by">Designed by ' + esc(d.designer) + '</span>' : '') +
        '<span class="meta">' + esc([c.composition, d.edge].filter(Boolean).join(' · ') || '') + '</span>' +
        (c.numistaUrl ? '<a class="plaque-link" href="' + esc(c.numistaUrl) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">Full record ↗</a>' : '') +
      '</figcaption></figure>';
  }

  function seriesCountryLabel(series) {
    var c = DATA.countries.filter(function (x) { return x.slug === series.countrySlug; })[0];
    return c ? c.label : series.name;
  }

  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }
})();
