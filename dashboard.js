/**
 * Shared renderer: shows every tracked metric as its own small card with a
 * 1-year chart, all visible at once — no button selector, no click-through.
 * Used by inflation.html, labor.html, economy.html, consumer.html.
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
    ctx.font = '11px -apple-system, sans-serif';
    ctx.fillText('Not enough history yet.', 10, 24);
    return;
  }

  const values = points.map(function (p) { return p.value; });
  const min = Math.min.apply(null, values), max = Math.max.apply(null, values);
  const pad = (max - min) * 0.15 || Math.abs(max) * 0.1 || 1;
  const yMin = min - pad, yMax = max + pad;

  const left = 8, right = canvas.width - 8, top = 10, bottom = canvas.height - 20;
  const x = function (i) { return left + (right - left) * (i / (points.length - 1)); };
  const y = function (v) { return bottom - (bottom - top) * ((v - yMin) / (yMax - yMin)); };

  ctx.strokeStyle = '#2d6cdf';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  points.forEach(function (p, i) {
    const px = x(i), py = y(p.value);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  });
  ctx.stroke();

  ctx.fillStyle = '#9aa0a6';
  ctx.font = '9px -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(points[0].date, left, canvas.height - 6);
  ctx.textAlign = 'right';
  ctx.fillText(points[points.length - 1].date, right, canvas.height - 6);
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
      const grid = document.getElementById('metric-grid');

      allKeys.forEach(function (key) {
        const m = data.metrics[key];
        const card = document.createElement('div');
        card.className = 'metric-card';

        if (m.unit === 'text') {
          card.innerHTML =
            '<div class="metric-title">' + m.label + '</div>' +
            '<div class="metric-text-value">' + (m.current || '—') + '</div>' +
            (m.currentDate ? '<div class="metric-date">as of ' + m.currentDate + '</div>' : '');
          grid.appendChild(card);
          return;
        }

        const canvasId = 'c_' + key;
        card.innerHTML =
          '<div class="metric-title">' + m.label + '</div>' +
          '<div class="metric-value ' + dirClass(m) + '">' + fmtMetric(m.current, m.unit) + ' ' + arrow(m.direction) + '</div>' +
          '<canvas id="' + canvasId + '" width="280" height="110"></canvas>';
        grid.appendChild(card);

        const canvas = document.getElementById(canvasId);
        drawLineChart(canvas, seriesInWindow(m, 1), m.unit);
      });
    })
    .catch(function (err) {
      document.getElementById('updated').textContent = 'Could not load ' + dataUrl + ' — ' + err;
    });
}
