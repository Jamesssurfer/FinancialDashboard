/**
 * Renders: headline cards -> grouped quick-glance cards (label + current + trend arrow)
 * -> metric selector -> 4 windowed charts (1Y/3Y/5Y/10Y) for the selected metric.
 *
 * Each page defines a PAGE_GROUPS array before calling renderDashboard():
 *   PAGE_GROUPS = [
 *     { title: 'CPI & PPI', keys: ['cpi_yoy','cpi_mom', ...] },
 *     ...
 *   ]
 * Arrow polarity per metric comes from ARROW_MODE (default 'up-good' if unset):
 *   'up-good'   - rising is favorable (green), falling is red
 *   'down-good' - falling is favorable (green), rising is red   (e.g. inflation, unemployment)
 *   'none'      - no arrow, just display the reading            (e.g. diagnostic/flag columns)
 */

function fmtMetric(v, unit) {
  if (v == null) return '—';
  switch (unit) {
    case 'index': return (+v).toFixed(1);
    case 'ratio': return (+v).toFixed(2);
    case 'level': return Math.round(v).toLocaleString();
    case 'count': return Math.round(v).toLocaleString();
    case 'text':  return v;
    case 'pct':
    default:      return (v * 100).toFixed(2) + '%';
  }
}

function toleranceFor(unit, avg) {
  switch (unit) {
    case 'pct':   return 0.0005;
    case 'index': return 0.3;
    case 'ratio': return 0.02;
    case 'level': return Math.abs(avg) * 0.002;
    case 'count': return Math.max(Math.abs(avg) * 0.01, 1000);
    default:      return 0;
  }
}

// latest vs. average of the 3 prior months, tolerance band -> flat.
function trendInfo(m, mode) {
  if (mode === 'none' || m.unit === 'text') return null;
  if (!m.series || m.series.length < 4) return { arrow: '—', cls: 'flat' };
  const pts = m.series.slice(-4);
  const latest = pts[3].value;
  const avg = (pts[0].value + pts[1].value + pts[2].value) / 3;
  const tol = toleranceFor(m.unit, avg);
  const diff = latest - avg;
  if (Math.abs(diff) <= tol) return { arrow: '—', cls: 'flat' };
  const rising = diff > 0;
  const good = (mode === 'down-good') ? !rising : rising;
  return { arrow: rising ? '▲' : '▼', cls: good ? 'good' : 'bad' };
}

function seriesInWindow(m, years) {
  if (!m.series || !m.series.length) return [];
  const cutoff = new Date(m.currentDate);
  cutoff.setFullYear(cutoff.getFullYear() - years);
  return m.series.filter(function (p) { return new Date(p.date) >= cutoff; });
}

// Sharper canvas rendering: device-pixel-ratio scaling + refined line/grid styling.
function setupHiDPI(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || canvas.width;
  const cssH = canvas.clientHeight || canvas.height;
  canvas.width = cssW * ratio;
  canvas.height = cssH * ratio;
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  return { ctx: ctx, w: cssW, h: cssH };
}

function drawLineChart(canvas, points, unit) {
  const cssW = parseInt(canvas.getAttribute('width'), 10);
  const cssH = parseInt(canvas.getAttribute('height'), 10);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  const ratio = window.devicePixelRatio || 1;
  canvas.width = cssW * ratio;
  canvas.height = cssH * ratio;
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, cssW, cssH);

  if (points.length < 2) {
    ctx.fillStyle = '#8a8f98';
    ctx.font = '12px -apple-system, sans-serif';
    ctx.fillText('Not enough history for this window.', 14, 28);
    return;
  }

  const values = points.map(function (p) { return p.value; });
  const min = Math.min.apply(null, values), max = Math.max.apply(null, values);
  const pad = (max - min) * 0.15 || Math.abs(max) * 0.1 || 1;
  const yMin = min - pad, yMax = max + pad;
  const left = 48, right = cssW - 14, top = 16, bottom = cssH - 28;
  const x = function (i) { return left + (right - left) * (i / (points.length - 1)); };
  const y = function (v) { return bottom - (bottom - top) * ((v - yMin) / (yMax - yMin)); };

  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const gy = top + (bottom - top) * (i / 3);
    ctx.beginPath(); ctx.moveTo(left, gy); ctx.lineTo(right, gy); ctx.stroke();
  }

  // subtle area fill under the line
  const grad = ctx.createLinearGradient(0, top, 0, bottom);
  grad.addColorStop(0, 'rgba(88,132,255,0.22)');
  grad.addColorStop(1, 'rgba(88,132,255,0)');
  ctx.beginPath();
  points.forEach(function (p, i) {
    const px = x(i), py = y(p.value);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  });
  ctx.lineTo(x(points.length - 1), bottom);
  ctx.lineTo(x(0), bottom);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = '#5884ff';
  ctx.lineWidth = 1.75;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  points.forEach(function (p, i) {
    const px = x(i), py = y(p.value);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  });
  ctx.stroke();

  const lastX = x(points.length - 1), lastY = y(points[points.length - 1].value);
  ctx.fillStyle = '#5884ff';
  ctx.beginPath(); ctx.arc(lastX, lastY, 2.5, 0, Math.PI * 2); ctx.fill();

  ctx.font = '600 11px -apple-system, sans-serif';
  ctx.fillStyle = '#e8e9ec';
  ctx.textAlign = 'left';
  ctx.fillText(fmtMetric(points[0].value, unit), x(0), y(points[0].value) - 8);
  ctx.textAlign = 'right';
  ctx.fillText(fmtMetric(points[points.length - 1].value, unit), lastX, lastY - 10);

  ctx.font = '10px -apple-system, sans-serif';
  ctx.fillStyle = '#7d828c';
  ctx.textAlign = 'left';
  ctx.fillText(points[0].date, left, cssH - 8);
  ctx.textAlign = 'right';
  ctx.fillText(points[points.length - 1].date, right, cssH - 8);
}

function drawAllWindows(m) {
  const years = { '1y': 1, '3y': 3, '5y': 5, '10y': 10 };
  Object.keys(years).forEach(function (w) {
    const el = document.getElementById('win-' + w);
    if (m.unit === 'text') {
      const ctx = el.getContext('2d');
      ctx.clearRect(0, 0, el.width, el.height);
      ctx.fillStyle = '#8a8f98';
      ctx.font = '12px -apple-system, sans-serif';
      ctx.fillText('Text metric — no chart.', 14, 28);
      return;
    }
    drawLineChart(el, seriesInWindow(m, years[w]), m.unit);
  });
}

function renderDashboard(dataUrl) {
  fetch(dataUrl)
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (data) {
      document.getElementById('updated').textContent = 'Updated ' + new Date(data.updated).toLocaleString();

      // Headline summary cards (unchanged behavior)
      const summaryEl = document.getElementById('summary');
      data.groups.headline.forEach(function (key) {
        const m = data.metrics[key];
        if (!m) return;
        const t = trendInfo(m, (window.ARROW_MODE && window.ARROW_MODE[key]) || 'up-good');
        const valueHtml = m.unit === 'text' ? (m.current || '—') :
          fmtMetric(m.current, m.unit) + (t ? ' ' + t.arrow : '');
        summaryEl.innerHTML += '<div class="summary-card"><div class="label">' + m.label + '</div>' +
          '<div class="value ' + (t ? t.cls : '') + '">' + valueHtml + '</div></div>';
      });

      // Grouped quick-glance cards, using PAGE_GROUPS defined by the page
      const groupsEl = document.getElementById('metric-groups');
      const groups = window.PAGE_GROUPS || [];
      groups.forEach(function (group) {
        const section = document.createElement('div');
        section.className = 'group-section';
        let cardsHtml = '';
        group.keys.forEach(function (key) {
          const m = data.metrics[key];
          if (!m) return;
          const mode = (window.ARROW_MODE && window.ARROW_MODE[key]) || 'up-good';
          const t = trendInfo(m, mode);
          const valueHtml = m.unit === 'text' ? (m.current || '—') : fmtMetric(m.current, m.unit) + (t ? ' ' + t.arrow : '');
          cardsHtml += '<div class="mini-card"><div class="mini-label">' + m.label + '</div>' +
            '<div class="mini-value ' + (t ? t.cls : '') + '">' + valueHtml + '</div>' +
            (m.currentDate ? '<div class="mini-date">' + m.currentDate + '</div>' : '') + '</div>';
        });
        section.innerHTML = '<div class="group-title">' + group.title + '</div><div class="mini-grid">' + cardsHtml + '</div>';
        groupsEl.appendChild(section);
      });

      // Selector + 4-window detail charts
      const allKeys = data.groups.headline.concat(data.groups.other).filter(function (k) { return data.metrics[k]; });
      const select = document.getElementById('metric-select');
      allKeys.forEach(function (key) {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = data.metrics[key].label;
        select.appendChild(opt);
      });
      select.onchange = function () { selectMetric(data, select.value); };

      window._dashData = data;
      if (allKeys.length) selectMetric(data, allKeys[0]);
    })
    .catch(function (err) {
      document.getElementById('updated').textContent = 'Could not load ' + dataUrl + ' — ' + err;
    });
}

function selectMetric(data, key) {
  document.getElementById('metric-select').value = key;
  const m = data.metrics[key];
  document.getElementById('selected-label').textContent = m.label;
  drawAllWindows(m);
}
