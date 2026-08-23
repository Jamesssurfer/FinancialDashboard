/**
 * Shared renderer: one dense table per page (Metric | Current | 1Y/3Y/5Y/10Y ago),
 * all metrics always visible. Chart is optional, collapsed by default, full history
 * in a single canvas — not separate windowed charts per timeframe.
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

function cellHtml(point, unit) {
  if (!point) return '<span class="dim">—</span>';
  return fmtMetric(point.value, unit) + '<div class="cell-date">' + point.date + '</div>';
}

function drawFullChart(canvas, series, unit) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!series || series.length < 2) {
    ctx.fillStyle = '#9aa0a6';
    ctx.font = '11px -apple-system, sans-serif';
    ctx.fillText('Not enough history.', 10, 24);
    return;
  }
  const values = series.map(function (p) { return p.value; });
  const min = Math.min.apply(null, values), max = Math.max.apply(null, values);
  const pad = (max - min) * 0.1 || Math.abs(max) * 0.1 || 1;
  const yMin = min - pad, yMax = max + pad;

  const left = 8, right = canvas.width - 8, top = 10, bottom = canvas.height - 18;
  const x = function (i) { return left + (right - left) * (i / (series.length - 1)); };
  const y = function (v) { return bottom - (bottom - top) * ((v - yMin) / (yMax - yMin)); };

  ctx.strokeStyle = '#2d6cdf';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  series.forEach(function (p, i) {
    const px = x(i), py = y(p.value);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  });
  ctx.stroke();

  ctx.fillStyle = '#9aa0a6';
  ctx.font = '9px -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(series[0].date, left, canvas.height - 4);
  ctx.textAlign = 'right';
  ctx.fillText(series[series.length - 1].date, right, canvas.height - 4);
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
      const tbody = document.getElementById('metric-rows');

      allKeys.forEach(function (key) {
        const m = data.metrics[key];
        const tr = document.createElement('tr');

        if (m.unit === 'text') {
          tr.innerHTML =
            '<td>' + m.label + '</td>' +
            '<td colspan="5">' + (m.current || '—') + (m.currentDate ? '<div class="cell-date">' + m.currentDate + '</div>' : '') + '</td>' +
            '<td class="dim">—</td>';
          tbody.appendChild(tr);
          return;
        }

        const chartId = 'chart_' + key;
        tr.innerHTML =
          '<td>' + m.label + '</td>' +
          '<td class="' + dirClass(m) + '">' + fmtMetric(m.current, m.unit) + '<div class="cell-date">' + m.currentDate + '</div></td>' +
          '<td>' + cellHtml(m.y1, m.unit) + '</td>' +
          '<td>' + cellHtml(m.y3, m.unit) + '</td>' +
          '<td>' + cellHtml(m.y5, m.unit) + '</td>' +
          '<td>' + cellHtml(m.y10, m.unit) + '</td>' +
          '<td><details><summary>chart</summary><canvas id="' + chartId + '" width="480" height="140"></canvas></details></td>';
        tbody.appendChild(tr);

        drawFullChart(document.getElementById(chartId), m.series, m.unit);
      });
    })
    .catch(function (err) {
      document.getElementById('updated').textContent = 'Could not load ' + dataUrl + ' — ' + err;
    });
}
