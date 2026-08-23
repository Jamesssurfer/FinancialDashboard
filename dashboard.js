/**
 * Quick-glance table (all metrics, Current/1Y/3Y/5Y/10Y) stays on top — confirmed working.
 * Below it: a metric selector + 4 simultaneous windowed charts (1Y/3Y/5Y/10Y), matching
 * the original Excel dashboard layout (headline boxes -> grid -> selector -> 4 trend charts).
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

function dirClass(m) { return m.direction || 'flat'; }
function arrow(dir) { return dir === 'up' ? '▲' : dir === 'down' ? '▼' : '—'; }
function cellHtml(point, unit) {
  if (!point) return '<span class="dim">—</span>';
  return fmtMetric(point.value, unit) + '<div class="cell-date">' + point.date + '</div>';
}

function seriesInWindow(m, years) {
  if (!m.series || !m.series.length) return [];
  const cutoff = new Date(m.currentDate);
  cutoff.setFullYear(cutoff.getFullYear() - years);
  return m.series.filter(function (p) { return new Date(p.date) >= cutoff; });
}

function drawLineChart(canvas, points, unit) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (points.length < 2) {
    ctx.fillStyle = '#9aa0a6';
    ctx.font = '12px -apple-system, sans-serif';
    ctx.fillText('Not enough history for this window.', 14, 28);
    return;
  }
  const values = points.map(function (p) { return p.value; });
  const min = Math.min.apply(null, values), max = Math.max.apply(null, values);
  const pad = (max - min) * 0.15 || Math.abs(max) * 0.1 || 1;
  const yMin = min - pad, yMax = max + pad;
  const left = 46, right = canvas.width - 12, top = 14, bottom = canvas.height - 26;
  const x = function (i) { return left + (right - left) * (i / (points.length - 1)); };
  const y = function (v) { return bottom - (bottom - top) * ((v - yMin) / (yMax - yMin)); };

  ctx.strokeStyle = '#2a2e37';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const gy = top + (bottom - top) * (i / 3);
    ctx.beginPath(); ctx.moveTo(left, gy); ctx.lineTo(right, gy); ctx.stroke();
  }

  ctx.strokeStyle = '#2d6cdf';
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach(function (p, i) {
    const px = x(i), py = y(p.value);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  });
  ctx.stroke();

  ctx.font = '10px -apple-system, sans-serif';
  ctx.fillStyle = '#e6e6e6';
  ctx.textAlign = 'left';
  ctx.fillText(fmtMetric(points[0].value, unit), x(0), y(points[0].value) - 8);
  ctx.textAlign = 'right';
  ctx.fillText(fmtMetric(points[points.length - 1].value, unit), x(points.length - 1), y(points[points.length - 1].value) - 8);

  ctx.fillStyle = '#9aa0a6';
  ctx.textAlign = 'left';
  ctx.fillText(points[0].date, left, bottom + 16);
  ctx.textAlign = 'right';
  ctx.fillText(points[points.length - 1].date, right, bottom + 16);
}

function drawAllWindows(m) {
  if (m.unit === 'text') {
    ['1y', '3y', '5y', '10y'].forEach(function (w) {
      const el = document.getElementById('win-' + w);
      const ctx = el.getContext('2d');
      ctx.clearRect(0, 0, el.width, el.height);
      ctx.fillStyle = '#9aa0a6';
      ctx.font = '12px -apple-system, sans-serif';
      ctx.fillText('Text metric — no chart.', 14, 28);
    });
    return;
  }
  const years = { '1y': 1, '3y': 3, '5y': 5, '10y': 10 };
  Object.keys(years).forEach(function (w) {
    drawLineChart(document.getElementById('win-' + w), seriesInWindow(m, years[w]), m.unit);
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

      const summaryEl = document.getElementById('summary');
      data.groups.headline.forEach(function (key) {
        const m = data.metrics[key];
        if (!m) return;
        const valueHtml = m.unit === 'text' ? (m.current || '—') : fmtMetric(m.current, m.unit) + ' ' + arrow(m.direction);
        summaryEl.innerHTML += '<div class="summary-card"><div class="label">' + m.label + '</div>' +
          '<div class="value ' + (m.unit === 'text' ? '' : dirClass(m)) + '">' + valueHtml + '</div></div>';
      });

      const allKeys = data.groups.headline.concat(data.groups.other).filter(function (k) { return data.metrics[k]; });

      // Quick-glance table
      const tbody = document.getElementById('metric-rows');
      allKeys.forEach(function (key) {
        const m = data.metrics[key];
        const tr = document.createElement('tr');
        tr.dataset.key = key;
        tr.style.cursor = 'pointer';
        if (m.unit === 'text') {
          tr.innerHTML = '<td>' + m.label + '</td><td colspan="5">' + (m.current || '—') +
            (m.currentDate ? '<div class="cell-date">' + m.currentDate + '</div>' : '') + '</td>';
        } else {
          tr.innerHTML =
            '<td>' + m.label + '</td>' +
            '<td class="' + dirClass(m) + '">' + fmtMetric(m.current, m.unit) + '<div class="cell-date">' + m.currentDate + '</div></td>' +
            '<td>' + cellHtml(m.y1, m.unit) + '</td>' +
            '<td>' + cellHtml(m.y3, m.unit) + '</td>' +
            '<td>' + cellHtml(m.y5, m.unit) + '</td>' +
            '<td>' + cellHtml(m.y10, m.unit) + '</td>';
        }
        tr.onclick = function () { selectMetric(data, key); };
        tbody.appendChild(tr);
      });

      // Selector dropdown
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
  document.querySelectorAll('#metric-rows tr').forEach(function (tr) {
    tr.style.background = tr.dataset.key === key ? '#1f2530' : '';
  });
  const m = data.metrics[key];
  document.getElementById('selected-label').textContent = m.label;
  drawAllWindows(m);
}
