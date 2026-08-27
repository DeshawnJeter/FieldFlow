import {
  fmtMoneyCompact, fmtMoneyFull, fmtInt, escapeXML, truncateLabel, isLightFill,
  emptyNote, showTooltip, hideTooltip, STATUS_COLOR, STATUS_LABEL, PRIORITY_LABEL,
} from "../utils.js";

// ---------- SVG bar chart (horizontal, single hue or per-bar color) ----------
export function barChart(container, items, opts = {}) {
  // items: [{label, value, color?, sub?}]
  const W = container.clientWidth || 460;
  const rowH = 30;
  const padTop = 6, padBottom = 6;
  const H = items.length * rowH + padTop + padBottom;
  const labelW = opts.labelW || 128;
  const plotX0 = labelW;
  const plotW = Math.max(40, W - labelW - 56);
  const maxVal = Math.max(1, ...items.map(d => d.value));

  let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
  items.forEach((d, i) => {
    const y = padTop + i * rowH;
    const barH = 16;
    const barY = y + (rowH - barH) / 2;
    const w = Math.max(2, (d.value / maxVal) * plotW);
    const color = d.color || "var(--series-1)";
    const valText = opts.money ? fmtMoneyCompact(d.value) : fmtInt(d.value);
    const fitsInside = w > 46;
    svg += `<g class="bar-mark" data-i="${i}">`;
    svg += `<text x="${plotX0 - 10}" y="${barY + barH / 2 + 4}" text-anchor="end" font-size="12">${escapeXML(truncateLabel(d.label, 16))}</text>`;
    svg += `<rect class="bg-hit" x="${plotX0}" y="${y}" width="${plotW + 50}" height="${rowH}" fill="transparent"/>`;
    svg += `<rect x="${plotX0}" y="${barY}" width="${plotW}" height="${barH}" rx="4" fill="var(--gridline)"/>`;
    svg += `<rect class="fill-bar" x="${plotX0}" y="${barY}" width="${w}" height="${barH}" rx="4" fill="${color}"/>`;
    if (fitsInside) {
      svg += `<text class="val-label" x="${plotX0 + w - 8}" y="${barY + barH / 2 + 4}" text-anchor="end" font-size="11.5" fill="${isLightFill(color) ? '#0b0b0b' : '#ffffff'}">${escapeXML(valText)}</text>`;
    } else {
      svg += `<text class="val-label" x="${plotX0 + w + 8}" y="${barY + barH / 2 + 4}" text-anchor="start" font-size="11.5">${escapeXML(valText)}</text>`;
    }
    svg += `</g>`;
  });
  svg += `</svg>`;
  container.innerHTML = svg;

  container.querySelectorAll(".bar-mark").forEach(g => {
    const i = +g.dataset.i;
    const d = items[i];
    g.addEventListener("pointermove", e => {
      const valText = opts.money ? fmtMoneyFull(d.value) : fmtInt(d.value);
      showTooltip(e.clientX, e.clientY,
        `<div class="t-row"><strong class="t-val">${escapeXML(valText)}</strong></div><div>${escapeXML(d.label)}${d.sub ? " · " + escapeXML(d.sub) : ""}</div>`);
    });
    g.addEventListener("pointerleave", hideTooltip);
  });
}

// ---------- Revenue by business ----------
export function renderRevenueByBusiness(rows) {
  const map = new Map();
  rows.forEach(r => map.set(r.business_name, (map.get(r.business_name) || 0) + r.total_paid_to_date));
  const items = [...map.entries()].map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  const el = document.getElementById("chart-revenue");
  if (!items.length) { el.innerHTML = emptyNote(); return; }
  barChart(el, items, { money: true, labelW: 150 });
}

// ---------- Jobs by trade ----------
export function renderJobsByTrade(rows) {
  const map = new Map();
  rows.forEach(r => map.set(r.trade, (map.get(r.trade) || 0) + 1));
  const items = [...map.entries()].map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  const el = document.getElementById("chart-trade");
  if (!items.length) { el.innerHTML = emptyNote(); return; }
  barChart(el, items, { labelW: 180 });
}

// ---------- Priority ----------
export function renderPriority(rows) {
  const map = new Map();
  rows.forEach(r => {
    const label = PRIORITY_LABEL[r.priority] || r.priority;
    map.set(label, (map.get(label) || 0) + 1);
  });
  const order = ["Emergency", "Routine", "Scheduled maintenance"];
  const items = order.filter(l => map.has(l)).map(label => ({ label, value: map.get(label) }));
  const el = document.getElementById("chart-priority");
  if (!items.length) { el.innerHTML = emptyNote(); return; }
  barChart(el, items, { labelW: 170 });
}

// ---------- Top technicians ----------
export function renderTechs(rows) {
  const map = new Map();
  rows.forEach(r => {
    if (r.status !== "completed") return;
    map.set(r.technician_name, (map.get(r.technician_name) || 0) + 1);
  });
  const items = [...map.entries()].map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value).slice(0, 8);
  const el = document.getElementById("chart-techs");
  if (!items.length) { el.innerHTML = emptyNote(); return; }
  barChart(el, items, { labelW: 130 });
}

// ---------- Revenue by plan tier ----------
export function renderRevenueByPlan(rows) {
  const order = ["Starter", "Pro", "Team", "Enterprise"];
  const map = new Map();
  const jobCount = new Map();
  rows.forEach(r => {
    map.set(r.plan_name, (map.get(r.plan_name) || 0) + r.total_paid_to_date);
    jobCount.set(r.plan_name, (jobCount.get(r.plan_name) || 0) + 1);
  });
  const items = order.filter(p => map.has(p)).map(label => ({
    label, value: map.get(label), sub: `${fmtInt(jobCount.get(label))} jobs`,
  }));
  const el = document.getElementById("chart-plan");
  if (!items.length) { el.innerHTML = emptyNote(); return; }
  barChart(el, items, { money: true, labelW: 100 });
}

// ---------- Invoice status (status-colored bars) ----------
export function renderInvoiceStatus(rows) {
  const order = ["paid", "partial", "unpaid", "overdue", "not_invoiced"];
  const map = new Map();
  const amt = new Map();
  rows.forEach(r => {
    map.set(r.invoice_status, (map.get(r.invoice_status) || 0) + 1);
    amt.set(r.invoice_status, (amt.get(r.invoice_status) || 0) + r.total_due);
  });
  const items = order.filter(k => map.has(k)).map(k => ({
    label: STATUS_LABEL[k], value: map.get(k), color: STATUS_COLOR[k],
    sub: amt.get(k) ? fmtMoneyFull(amt.get(k)) + " billed" : "not yet billed",
  }));
  const el = document.getElementById("chart-invoice");
  if (!items.length) { el.innerHTML = emptyNote(); return; }
  const legend = `<div class="legend">${order.filter(k => map.has(k)).map(k =>
    `<div class="item"><span class="swatch" style="background:${STATUS_COLOR[k]}"></span>${STATUS_LABEL[k]}</div>`).join("")}</div>`;
  const chartDiv = document.createElement("div");
  el.innerHTML = legend;
  el.appendChild(chartDiv);
  barChart(chartDiv, items, { labelW: 110 });
}
