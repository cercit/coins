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
  var state = { query: '', region: 'All' };

  var REGION_ORDER = ['All', 'Africa', 'Americas', 'Asia', 'Europe', 'Oceania', 'Historical & Regional'];

  fetch('data/coins.json').then(function (r) { return r.json(); }).then(function (d) {
    DATA = d;
    headerStats.innerHTML =
      '<span><b>' + d.totalCoins + '</b> coins</span>' +
      '<span><b>' + d.entities.filter(e => e.type === 'nation').length + '</b> countries</span>' +
      '<span><b>' + d.entities.filter(e => e.type === 'historical').length + '</b> historical issues</span>';
    render();
  }).catch(function (e) {
    app.innerHTML = '<div class="empty">Could not load collection data.<br>' + e + '</div>';
  });

  window.addEventListener('hashchange', render);

  function route() {
    var h = location.hash.replace(/^#\/?/, '');
    if (h.startsWith('e/')) return { view: 'detail', slug: h.slice(2) };
    return { view: 'home' };
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function render() {
    if (!DATA) return;
    var r = route();
    if (r.view === 'detail') {
      var entity = DATA.entities.find(function (e) { return e.slug === r.slug; });
      if (!entity) { app.innerHTML = '<div class="empty">Not found.</div>'; return; }
      renderDetail(entity);
    } else {
      renderHome();
    }
    window.scrollTo(0, 0);
  }

  function renderHome() {
    var nations = DATA.entities.filter(function (e) { return e.type === 'nation'; });
    var historical = DATA.entities.filter(function (e) { return e.type === 'historical'; });

    var q = state.query.trim().toLowerCase();
    var filteredNations = nations.filter(function (e) {
      if (state.region !== 'All' && state.region !== 'Historical & Regional' && e.region !== state.region) return false;
      if (state.region === 'Historical & Regional') return false;
      if (q && e.label.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    var showHistorical = state.region === 'All' || state.region === 'Historical & Regional';
    var filteredHistorical = showHistorical ? historical.filter(function (e) {
      if (q && e.label.toLowerCase().indexOf(q) === -1) return false;
      return true;
    }) : [];

    var html = '';
    html += '<section class="hero">' +
      '<h1>A cabinet of <em>' + DATA.totalCoins + '</em> coins</h1>' +
      '<p>Every coin here was collected by hand, catalogued, and photographed. Pick a flag to open the drawer.</p>' +
      '</section>';

    html += '<div class="controls">' +
      '<div class="search-box">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>' +
      '<input type="text" id="search-input" placeholder="Search countries…" value="' + esc(state.query) + '" autocomplete="off">' +
      '</div>' +
      '<div class="chips">' + REGION_ORDER.map(function (reg) {
        return '<button class="chip' + (state.region === reg ? ' active' : '') + '" data-region="' + esc(reg) + '">' + esc(reg) + '</button>';
      }).join('') + '</div>' +
      '</div>';

    if (state.region !== 'Historical & Regional') {
      html += '<div class="section-title"><h2>Countries</h2><span class="count">' + filteredNations.length + ' shown</span></div>';
      html += filteredNations.length
        ? '<div class="flag-grid">' + filteredNations.map(flagTile).join('') + '</div>'
        : '<div class="empty">No countries match “' + esc(state.query) + '”.</div>';
    }

    if (showHistorical && filteredHistorical.length) {
      html += '<div class="section-title"><h2>Historical &amp; Regional Issues</h2><span class="count">' + filteredHistorical.length + ' shown</span></div>' +
        '<p class="section-lede">Currencies issued by colonial administrations, currency unions or now-dissolved states — grouped here rather than mapped to a single national flag.</p>';
      html += '<div class="badge-grid">' + filteredHistorical.map(badgeTile).join('') + '</div>';
    }

    app.innerHTML = html;

    document.getElementById('search-input').addEventListener('input', function (e) {
      state.query = e.target.value;
      renderHome();
      var el = document.getElementById('search-input');
      el.focus();
      el.selectionStart = el.selectionEnd = el.value.length;
    });
    Array.prototype.forEach.call(document.querySelectorAll('.chip'), function (btn) {
      btn.addEventListener('click', function () {
        state.region = btn.getAttribute('data-region');
        renderHome();
      });
    });
  }

  function flagTile(e) {
    return '<a class="flag-tile" href="#/e/' + e.slug + '">' +
      '<div class="flag-img-wrap"><img loading="lazy" src="https://flagcdn.com/w320/' + e.iso2 + '.png" alt="Flag of ' + esc(e.label) + '"></div>' +
      '<div class="flag-meta"><span class="flag-name">' + esc(e.label) + '</span>' +
      '<span class="flag-count">' + e.count + ' coin' + (e.count === 1 ? '' : 's') + '</span></div>' +
      '</a>';
  }

  function initials(label) {
    var words = label.replace(/\(.*?\)/g, '').split(/\s+/).filter(Boolean);
    var letters = words.slice(0, 2).map(function (w) { return w[0]; }).join('');
    return letters.toUpperCase();
  }

  function badgeTile(e) {
    return '<a class="badge-tile" href="#/e/' + e.slug + '">' +
      '<span class="badge-emblem">' + esc(initials(e.label)) + '</span>' +
      '<span><span class="badge-name">' + esc(e.label) + '</span>' +
      '<span class="badge-era">' + esc(e.era) + ' · ' + e.count + ' coin' + (e.count === 1 ? '' : 's') + '</span></span>' +
      '</a>';
  }

  function renderDetail(e) {
    var years = (e.yearMin && e.yearMax) ? (e.yearMin === e.yearMax ? e.yearMin : e.yearMin + '–' + e.yearMax) : '—';
    var html = '<button class="detail-back" onclick="location.hash=\'#/\'">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg> All countries</button>';

    html += '<div class="detail-header">';
    html += e.type === 'nation'
      ? '<div class="detail-flag"><img src="https://flagcdn.com/w320/' + e.iso2 + '.png" alt="Flag of ' + esc(e.label) + '"></div>'
      : '<div class="detail-emblem">' + esc(initials(e.label)) + '</div>';
    html += '<div class="detail-titles"><h1>' + esc(e.label) + '</h1>';
    if (e.type === 'historical') html += '<div class="era">' + esc(e.era) + '</div>';
    html += '</div></div>';

    html += '<div class="detail-stats">' +
      '<div class="detail-stat"><b>' + e.count + '</b><span>Coins in collection</span></div>' +
      '<div class="detail-stat"><b>' + years + '</b><span>Year range</span></div>' +
      '</div>';

    var specialityHtml = e.speciality
      ? e.speciality.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('')
      : (e.type === 'historical' ? '<p>' + esc(e.note) + '</p>' : '<p>A detailed write-up for ' + esc(e.label) + '’s coinage is on its way.</p>');
    html += '<div class="speciality">' + specialityHtml + '</div>';

    html += '<div class="section-title"><h2>The coins</h2><span class="count">' + e.count + '</span></div>';
    html += '<div class="coin-grid">' + e.coins.map(coinCard).join('') + '</div>';

    app.innerHTML = html;

    Array.prototype.forEach.call(document.querySelectorAll('.coin-stage'), function (stage) {
      stage.addEventListener('click', function () {
        stage.closest('.coin-card').classList.toggle('flipped');
      });
    });
  }

  function coinCard(c) {
    return '<div class="coin-card">' +
      '<div class="coin-stage" title="Click to flip">' +
      '<div class="coin-flip">' +
      '<div class="coin-face front"><img loading="lazy" src="' + c.front + '" alt="' + esc(c.denomination) + ' obverse"></div>' +
      '<div class="coin-face back"><img loading="lazy" src="' + c.back + '" alt="' + esc(c.denomination) + ' reverse"></div>' +
      '</div>' +
      '<span class="coin-flip-hint">↻ flip</span>' +
      '</div>' +
      '<div class="coin-info">' +
      '<span class="coin-denom">' + esc(c.denomination) + '</span><span class="coin-year">' + esc(c.year) + '</span>' +
      '<div class="coin-note">' + esc(c.note) + '</div>' +
      '<a class="coin-source" href="' + esc(c.numistaUrl) + '" target="_blank" rel="noopener">Catalogued via Numista ↗</a>' +
      '</div></div>';
  }
})();
