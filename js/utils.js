// ---------- CSV parsing ----------
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ""; }
      else if (c === '\r') { /* skip */ }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ""; }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift();
  return rows.filter(r => r.length === header.length).map(r => {
    const o = {};
    header.forEach((h, idx) => o[h] = r[idx]);
    return o;
  });
}

export function toNum(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }

// ---------- formatting ----------
export function fmtMoneyFull(n) {
  return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}
export function fmtMoneyCompact(n) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(2) + "M";
  if (abs >= 1e3) return sign + "$" + (abs / 1e3).toFixed(1) + "K";
  return sign + "$" + abs.toFixed(0);
}
export function fmtInt(n) { return n.toLocaleString(); }
export function fmtPct(n) { return n.toFixed(0) + "%"; }
export function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : ""; }
export const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ---------- status / palette ----------
export const STATUS_COLOR = {
  paid: "var(--status-good)",
  partial: "var(--status-warning)",
  overdue: "var(--status-critical)",
  unpaid: "var(--status-serious)",
  not_invoiced: "var(--status-neutral)",
};
export const STATUS_LABEL = {
  paid: "Paid", partial: "Partial", overdue: "Overdue",
  unpaid: "Unpaid", not_invoiced: "Not invoiced",
};
export const PRIORITY_LABEL = { emergency: "Emergency", routine: "Routine", scheduled_maintenance: "Scheduled maintenance" };

// ---------- SVG helpers ----------
const LIGHT_FILLS = new Set(["var(--status-warning)", "var(--status-serious)"]);
export function isLightFill(color) { return LIGHT_FILLS.has(color); }
export function truncateLabel(s, n) { return s && s.length > n ? s.slice(0, n - 1) + "…" : (s || ""); }
export function escapeXML(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
export function emptyNote() { return `<div class="empty-note">No jobs match the current filters.</div>`; }

// ---------- tooltip ----------
const tooltip = document.getElementById("tooltip");
export function showTooltip(x, y, html) {
  tooltip.innerHTML = html;
  tooltip.style.left = x + "px";
  tooltip.style.top = (y - 10) + "px";
  tooltip.classList.add("show");
}
export function hideTooltip() { tooltip.classList.remove("show"); }
