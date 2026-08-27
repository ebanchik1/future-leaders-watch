(function () {
  'use strict';

  /* ---------------- Theme toggle ---------------- */
  (function themeInit() {
    var toggle = document.querySelector('[data-theme-toggle]');
    var root = document.documentElement;
    var mode = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
    root.setAttribute('data-theme', mode);
    updateIcon(mode);

    function updateIcon(m) {
      toggle.setAttribute('aria-label', 'Switch to ' + (m === 'dark' ? 'light' : 'dark') + ' mode');
      toggle.innerHTML = m === 'dark'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    }

    toggle.addEventListener('click', function () {
      mode = mode === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', mode);
      updateIcon(mode);
    });
  })();

  /* ---------------- Helpers ---------------- */
  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmtPrice(p) {
    if (p == null) return '—';
    return '$' + Number(p).toFixed(2);
  }

  function fmtPct(p) {
    if (p == null) return '—';
    var n = Number(p);
    return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
  }

  // Strip inline (https://...) citations and trailing bare URLs from display copy —
  // sources are already rendered as clickable chips in the Thesis Library.
  function stripUrls(s) {
    if (!s) return s;
    return s
      .replace(/\(\s*(?:https?:\/\/|\[)[^)]*\)/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([.,;])/g, '$1')
      .trim();
  }

  function statusBadgeClass(status) {
    if (!status) return 'badge--monitor';
    var s = status.toUpperCase();
    if (s.indexOf('HIGH-CONVICTION') > -1) return 'badge--high';
    if (s.indexOf('EARLY') > -1) return 'badge--early';
    if (s.indexOf('CORE') > -1) return 'badge--core';
    if (s.indexOf('ACCUMULATION') > -1) return 'badge--early';
    if (s.indexOf('WATCH') > -1) return 'badge--watch';
    return 'badge--monitor';
  }

  function scorePillClass(score) {
    if (score == null) return 'score-pill--low';
    if (score >= 7.5) return 'score-pill--high';
    if (score >= 5) return 'score-pill--mid';
    return 'score-pill--low';
  }

  function trendLabel(t) {
    var map = {
      breaking_out: 'Breaking Out',
      pulling_back: 'Pulling Back',
      basing: 'Basing',
      extended: 'Extended'
    };
    return map[t] || (t || '—');
  }

  function timeAgo(iso) {
    if (!iso) return '';
    var diffMs = Date.now() - new Date(iso).getTime();
    var mins = Math.round(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    var hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    var days = Math.round(hrs / 24);
    return days + 'd ago';
  }

  /* ---------------- Render functions ---------------- */
  function renderKPIs(data) {
    var k = data.kpis;
    var grid = document.getElementById('kpi-grid');
    var cards = [
      { label: 'Watchlist', value: k.watchlist_count, meta: 'tickers tracked', cls: '' },
      { label: 'New Alerts', value: k.new_alerts_count, meta: 'since last refresh', cls: 'accent' },
      { label: 'High-Conviction', value: k.high_conviction_count, meta: 'scoring 8+/10', cls: 'hot' },
      { label: 'Sectors', value: k.sectors_covered, meta: 'covered', cls: '' },
      { label: 'Next Refresh', value: data.refresh_cadence.split(',')[1] ? data.refresh_cadence.split(',')[1].trim() : data.refresh_cadence, meta: data.refresh_cadence.split(',')[0], cls: '', small: true }
    ];
    grid.innerHTML = cards.map(function (c) {
      return '<div class="kpi-card"><div class="kpi-card__label">' + esc(c.label) + '</div>' +
        '<div class="kpi-card__value ' + c.cls + '"' + (c.small ? ' style="font-size: var(--text-lg);"' : '') + '>' + esc(c.value) + '</div>' +
        '<div class="kpi-card__meta">' + esc(c.meta) + '</div></div>';
    }).join('');
  }

  function renderAlerts(data) {
    var grid = document.getElementById('alerts-grid');
    var alerts = data.new_alerts || [];
    document.getElementById('alerts-count').textContent = alerts.length + (alerts.length === 1 ? ' alert' : ' alerts');

    if (!alerts.length) {
      grid.innerHTML = '<div class="empty-note" style="grid-column: 1 / -1;">No new alerts since the last refresh. Check the watchlist below for existing coverage.</div>';
      return;
    }

    grid.innerHTML = alerts.map(function (a) {
      var conviction = a.score >= 7.5 ? 'high' : a.score >= 5 ? 'mid' : 'low';
      return '<div class="alert-card" data-conviction="' + conviction + '">' +
        '<div class="alert-card__top">' +
          '<div><div class="alert-card__ticker">' + esc(a.ticker) + '</div><div class="alert-card__name">' + esc(a.name) + '</div></div>' +
          '<span class="score-pill ' + scorePillClass(a.score) + '">' + (a.score != null ? a.score.toFixed(1) : '—') + '</span>' +
        '</div>' +
        '<div><span class="badge ' + statusBadgeClass(a.status) + '">' + esc(a.status) + '</span> ' +
          (a.is_new_discovery ? '<span class="badge badge--early" style="margin-left:4px;">NEW NAME</span>' : '') +
        '</div>' +
        '<div class="alert-card__thesis">' + esc(stripUrls(a.thesis)) + '</div>' +
        '<div class="alert-card__footer">' +
          '<span class="sector-tag">' + esc(a.sector) + '</span>' +
          '<a class="alert-card__link" href="#thesis-' + esc(a.ticker) + '" data-jump="' + esc(a.ticker) + '">Full thesis →</a>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  var currentSort = { key: 'score', dir: -1 };
  var currentFilter = 'ALL';

  function renderSectorFilters(data) {
    var el = document.getElementById('sector-filters');
    var sectors = data.sector_summary || [];
    var tabs = [{ sector: 'ALL', count: data.watchlist.length }].concat(sectors);
    el.innerHTML = tabs.map(function (s) {
      var active = (s.sector === currentFilter) ? ' active' : '';
      return '<button class="filter-tab' + active + '" data-sector="' + esc(s.sector) + '">' + esc(s.sector === 'ALL' ? 'All Sectors' : s.sector) + ' (' + s.count + ')</button>';
    }).join('');

    el.querySelectorAll('.filter-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        currentFilter = btn.getAttribute('data-sector');
        renderSectorFilters(data);
        renderWatchlist(data);
      });
    });
  }

  function renderWatchlist(data) {
    var tbody = document.getElementById('watchlist-tbody');
    var rows = data.watchlist.slice();
    if (currentFilter !== 'ALL') {
      rows = rows.filter(function (r) { return r.sector === currentFilter; });
    }

    rows.sort(function (a, b) {
      var av = a[currentSort.key], bv = b[currentSort.key];
      if (av == null) av = '';
      if (bv == null) bv = '';
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return -1 * currentSort.dir;
      if (av > bv) return 1 * currentSort.dir;
      return 0;
    });

    document.getElementById('watchlist-count').textContent = rows.length + (rows.length === 1 ? ' ticker' : ' tickers');

    tbody.innerHTML = rows.map(function (r) {
      var deltaCls = (r.change_1m_pct || 0) >= 0 ? 'up' : 'down';
      return '<tr data-jump="' + esc(r.ticker) + '">' +
        '<td><div class="tk-cell"><span class="ticker">' + esc(r.ticker) + '</span><span class="name">' + esc(r.name) + '</span></div></td>' +
        '<td><span class="sector-tag">' + esc(r.sector) + '</span></td>' +
        '<td class="mono">' + fmtPrice(r.price) + '</td>' +
        '<td class="delta ' + deltaCls + '">' + fmtPct(r.change_1m_pct) + '</td>' +
        '<td><span class="trend-pill trend-pill--' + esc(r.trend) + '">' + trendLabel(r.trend) + '</span></td>' +
        '<td><span class="badge ' + statusBadgeClass(r.status) + '">' + esc(r.status) + '</span></td>' +
        '<td><span class="score-pill ' + scorePillClass(r.score) + '">' + (r.score != null ? r.score.toFixed(1) : '—') + '</span></td>' +
        '<td class="mono" style="color: var(--color-text-faint);">' + esc(r.added_date) + '</td>' +
      '</tr>';
    }).join('');

    tbody.querySelectorAll('tr').forEach(function (tr) {
      tr.addEventListener('click', function () { jumpToThesis(tr.getAttribute('data-jump')); });
    });
  }

  function attachSortHandlers(data) {
    document.querySelectorAll('#watchlist-table th[data-sort]').forEach(function (th) {
      th.addEventListener('click', function () {
        var key = th.getAttribute('data-sort');
        if (currentSort.key === key) { currentSort.dir *= -1; }
        else { currentSort = { key: key, dir: key === 'score' || key === 'change_1m_pct' ? -1 : 1 }; }
        renderWatchlist(data);
      });
    });
  }

  function renderNews(data) {
    var list = document.getElementById('news-list');
    var news = data.news || [];
    document.getElementById('news-count').textContent = news.length + (news.length === 1 ? ' item' : ' items');
    if (!news.length) {
      list.innerHTML = '<div class="empty-note">No catalyst items available yet.</div>';
      return;
    }
    list.innerHTML = news.map(function (n) {
      return '<div class="news-item" data-jump="' + esc(n.ticker) + '">' +
        '<div class="news-item__meta">' +
          '<span class="ticker">' + esc(n.ticker) + '</span>' +
          '<span class="sector-tag">' + esc(n.sector) + '</span>' +
        '</div>' +
        '<span class="headline">' + esc(stripUrls(n.headline)) + '</span>' +
      '</div>';
    }).join('');
    list.querySelectorAll('.news-item').forEach(function (item) {
      item.addEventListener('click', function () { jumpToThesis(item.getAttribute('data-jump')); });
    });
  }

  function renderThesisLibrary(data) {
    var list = document.getElementById('thesis-list');
    var rows = data.watchlist.slice().sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
    document.getElementById('thesis-count').textContent = rows.length + ' write-ups';

    list.innerHTML = rows.map(function (r) {
      var sig = r.signals || {};
      var catalysts = sig.catalysts || [];
      var analystMoves = sig.analyst_moves || [];
      var sources = r.sources || [];
      return '<div class="thesis-card" id="thesis-' + esc(r.ticker) + '">' +
        '<div class="thesis-card__head">' +
          '<span class="thesis-card__ticker">' + esc(r.ticker) + '</span>' +
          '<div class="thesis-card__meta"><div style="font-weight:600; font-size: var(--text-sm);">' + esc(r.name) + '</div><div class="name">' + esc(r.sector) + ' · ' + fmtPrice(r.price) + ' · ' + fmtPct(r.change_1m_pct) + ' (1M)</div></div>' +
          '<span class="score-pill ' + scorePillClass(r.score) + '">' + (r.score != null ? r.score.toFixed(1) : '—') + '</span>' +
          '<span class="badge ' + statusBadgeClass(r.status) + '">' + esc(r.status) + '</span>' +
          '<svg class="thesis-card__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>' +
        '</div>' +
        '<div class="thesis-card__body">' +
          '<div class="thesis-card__section"><h4>Thesis</h4><p>' + esc(stripUrls(r.thesis)) + '</p></div>' +
          '<div class="signal-grid">' +
            '<div class="thesis-card__section"><h4>Insider Buying</h4><p>' + esc(stripUrls(sig.insider_buying) || '—') + '</p></div>' +
            '<div class="thesis-card__section"><h4>Institutional Buying</h4><p>' + esc(stripUrls(sig.institutional_buying) || '—') + '</p></div>' +
          '</div>' +
          (catalysts.length ? '<div class="thesis-card__section"><h4>Catalysts</h4><ul>' + catalysts.map(function (c) { return '<li>' + esc(stripUrls(c)) + '</li>'; }).join('') + '</ul></div>' : '') +
          (analystMoves.length ? '<div class="thesis-card__section"><h4>Analyst Moves</h4><ul>' + analystMoves.map(function (c) { return '<li>' + esc(stripUrls(c)) + '</li>'; }).join('') + '</ul></div>' : '') +
          (r.risks ? '<div class="thesis-card__section"><h4>Risks &amp; Caveats</h4><p>' + esc(stripUrls(r.risks)) + '</p></div>' : '') +
          (sources.length ? '<div class="thesis-card__section"><h4>Sources</h4><div class="sources-list">' + sources.map(function (s) {
            return '<a class="source-chip" href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer" title="' + esc(s.title) + '">' + esc(s.title) + '</a>';
          }).join('') + '</div></div>' : '') +
          '<div class="thesis-card__section" style="margin-bottom:0;"><h4>Tracking</h4><p>Added ' + esc(r.added_date) + ' · Last updated ' + esc(r.last_updated) + '</p></div>' +
        '</div>' +
      '</div>';
    }).join('');

    list.querySelectorAll('.thesis-card__head').forEach(function (head) {
      head.addEventListener('click', function () {
        head.closest('.thesis-card').classList.toggle('open');
      });
    });
  }

  function jumpToThesis(ticker) {
    var card = document.getElementById('thesis-' + ticker);
    if (!card) return;
    card.classList.add('open');
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function bindAlertJumpLinks() {
    document.querySelectorAll('[data-jump]').forEach(function (el) {
      if (el.tagName === 'A') {
        el.addEventListener('click', function (e) {
          e.preventDefault();
          jumpToThesis(el.getAttribute('data-jump'));
        });
      }
    });
  }

  function renderHeaderStatus(data) {
    document.getElementById('last-updated-badge').textContent = 'Updated ' + timeAgo(data.last_updated) + ' · ' + data.last_updated_display;
    document.getElementById('footer-refresh').textContent = 'Refreshes ' + data.refresh_cadence.toLowerCase();
  }

  /* ---------------- Boot ---------------- */
  fetch('./data/site-data.json')
    .then(function (res) { return res.json(); })
    .then(function (data) {
      renderHeaderStatus(data);
      renderKPIs(data);
      renderAlerts(data);
      renderSectorFilters(data);
      renderWatchlist(data);
      attachSortHandlers(data);
      renderNews(data);
      renderThesisLibrary(data);
      bindAlertJumpLinks();
    })
    .catch(function (err) {
      console.error('Failed to load site data', err);
      document.getElementById('last-updated-badge').textContent = 'Data unavailable';
    });
})();
