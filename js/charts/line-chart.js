import { MONTHS, escapeXML, emptyNote, showTooltip, hideTooltip, fmtMoneyCompact, fmtMoneyFull } from "../utils.js";

// ---------- Trend line chart ----------
export function renderTrend(rows) {
  const map = new Map();
  rows.forEach(r => {
    const key = r.dateObj.getFullYear() + "-" + String(r.dateObj.getMonth() + 1).padStart(2, "0");
    map.set(key, (map.get(key) || 0) + 1);
  });
  const keys = [...map.keys()].sort();
  const el = document.getElementById("chart-trend");
  if (!keys.length) { el.innerHTML = emptyNote(); return; }
  const points = keys.map(k => {
    const [y, m] = k.split("-");
    return { label: MONTHS[+m - 1] + " " + y.slice(2), value: map.get(k) };
  });
  lineChart(el, points);
}

// ---------- Revenue collected over time ----------
export function renderRevenueTrend(rows) {
  const map = new Map();
  rows.forEach(r => {
    const key = r.dateObj.getFullYear() + "-" + String(r.dateObj.getMonth() + 1).padStart(2, "0");
    map.set(key, (map.get(key) || 0) + r.total_paid_to_date);
  });
  const keys = [...map.keys()].sort();
  const el = document.getElementById("chart-revenue-trend");
  if (!keys.length) { el.innerHTML = emptyNote(); return; }
  const points = keys.map(k => {
    const [y, m] = k.split("-");
    return { label: MONTHS[+m - 1] + " " + y.slice(2), value: map.get(k) };
  });
  lineChart(el, points, { money: true });
}

export function lineChart(container, points, opts = {}) {
  const W = container.clientWidth || 460;
  const H = 190;
  const padL = 34, padR = 16, padT = 16, padB = 26;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const maxVal = Math.max(1, ...points.map(p => p.value));
  const niceMax = niceCeil(maxVal);
  const n = points.length;
  const x = i => padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = v => padT + plotH - (v / niceMax) * plotH;

  let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
  // gridlines (0, mid, max)
  [0, 0.5, 1].forEach(f => {
    const gy = padT + plotH - f * plotH;
    svg += `<line x1="${padL}" y1="${gy}" x2="${W - padR}" y2="${gy}" stroke="var(--gridline)" stroke-width="1"/>`;
    const gLabel = opts.money ? fmtMoneyCompact(f * niceMax) : Math.round(f * niceMax);
    svg += `<text x="${padL - 8}" y="${gy + 4}" text-anchor="end" font-size="10.5">${gLabel}</text>`;
  });
  // area
  let areaPath = `M ${x(0)} ${y(points[0].value)} `;
  points.forEach((p, i) => { if (i > 0) areaPath += `L ${x(i)} ${y(p.value)} `; });
  areaPath += `L ${x(n - 1)} ${padT + plotH} L ${x(0)} ${padT + plotH} Z`;
  svg += `<path d="${areaPath}" fill="var(--series-1-wash)"/>`;
  // line
  let linePath = `M ${x(0)} ${y(points[0].value)} `;
  points.forEach((p, i) => { if (i > 0) linePath += `L ${x(i)} ${y(p.value)} `; });
  svg += `<path d="${linePath}" fill="none" stroke="var(--series-1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  // dots
  points.forEach((p, i) => {
    svg += `<circle cx="${x(i)}" cy="${y(p.value)}" r="4" fill="var(--series-1)" stroke="var(--surface-1)" stroke-width="2"/>`;
  });
  // end label
  const last = points[n - 1];
  const lastLabel = opts.money ? fmtMoneyCompact(last.value) : last.value;
  svg += `<text class="val-label" x="${x(n - 1)}" y="${y(last.value) - 10}" text-anchor="end" font-size="11.5" font-weight="600">${lastLabel}</text>`;
  // x labels (skip to avoid crowding)
  const step = Math.ceil(n / 7);
  points.forEach((p, i) => {
    if (i % step === 0 || i === n - 1) {
      svg += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" font-size="10">${escapeXML(p.label)}</text>`;
    }
  });
  // hit areas
  points.forEach((p, i) => {
    svg += `<circle class="hit-${i}" cx="${x(i)}" cy="${y(p.value)}" r="14" fill="transparent" data-i="${i}"/>`;
  });
  svg += `</svg>`;
  container.innerHTML = svg;

  points.forEach((p, i) => {
    const hit = container.querySelector(`.hit-${i}`);
    hit.addEventListener("pointermove", e => {
      const valText = opts.money ? fmtMoneyFull(p.value) : `${p.value} jobs`;
      showTooltip(e.clientX, e.clientY,
        `<div class="t-row"><span class="t-key" style="background:var(--series-1)"></span><strong class="t-val">${valText}</strong></div><div>${escapeXML(p.label)}</div>`);
    });
    hit.addEventListener("pointerleave", hideTooltip);
  });
}

export function niceCeil(v) {
  if (v <= 10) return Math.ceil(v / 2) * 2 || 2;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / mag;
  let nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return nice * mag;
}
