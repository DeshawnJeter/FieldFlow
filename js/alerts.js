import { fmtInt } from "./utils.js";

const MIN_PRIOR_JOBS = 10;
// Mirrors the prod usage-drop query's @drop_threshold (currently 0.7,
// marked "pending team decision" as of 2026-08-24) — update this if
// that value changes so the two stay in sync.
const WARNING_THRESHOLD = -15;
const CRITICAL_THRESHOLD = -30;
const WINDOW_DAYS = 30;

// Flags subscribing businesses whose job volume is trending down —
// an early churn signal so the team can reach out before the account leaves.
export function computeUsageAlerts(rows) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const recentStart = new Date(today); recentStart.setDate(today.getDate() - (WINDOW_DAYS - 1));
  const priorEnd = new Date(recentStart); priorEnd.setDate(recentStart.getDate() - 1);
  const priorStart = new Date(priorEnd); priorStart.setDate(priorEnd.getDate() - (WINDOW_DAYS - 1));

  const recent = new Map();
  const prior = new Map();
  const lastActive = new Map();
  rows.forEach(r => {
    const d = r.dateObj;
    if (d >= recentStart && d <= today) recent.set(r.business_name, (recent.get(r.business_name) || 0) + 1);
    else if (d >= priorStart && d <= priorEnd) prior.set(r.business_name, (prior.get(r.business_name) || 0) + 1);
    // last actual activity, not future-scheduled work
    if (d <= today) {
      const cur = lastActive.get(r.business_name);
      if (!cur || d > cur) lastActive.set(r.business_name, d);
    }
  });

  const businesses = new Set([...recent.keys(), ...prior.keys()]);
  const alerts = [];
  businesses.forEach(name => {
    const p = prior.get(name) || 0;
    const c = recent.get(name) || 0;
    if (p < MIN_PRIOR_JOBS) return;
    const pct = ((c - p) / p) * 100;
    if (pct <= WARNING_THRESHOLD) {
      alerts.push({
        business: name, priorCount: p, recentCount: c, pct,
        lastActiveDate: lastActive.get(name) || null,
        severity: pct <= CRITICAL_THRESHOLD ? "critical" : "warning",
      });
    }
  });
  alerts.sort((a, b) => a.pct - b.pct);
  return alerts;
}

export function renderUsageAlerts(rows) {
  const el = document.getElementById("usage-alerts");
  const countEl = document.getElementById("usage-alerts-count");
  const alerts = computeUsageAlerts(rows);

  if (countEl) {
    countEl.textContent = alerts.length ? `(${alerts.length} at risk)` : "";
    countEl.className = "alert-count" + (alerts.some(a => a.severity === "critical") ? " critical" : " warning");
  }

  if (!alerts.length) {
    el.innerHTML = `
      <div class="alert-row alert-good">
        <span class="alert-dot" style="background:var(--status-good)"></span>
        <div class="alert-text">
          <strong>All accounts stable</strong>
          <span>No business's job volume dropped 15%+ over the last 30 days vs. the previous 30.</span>
        </div>
      </div>`;
    return;
  }

  el.innerHTML = alerts.map(a => {
    const color = a.severity === "critical" ? "var(--status-critical)" : "var(--status-warning)";
    const lastActiveText = a.lastActiveDate ? fmtDate(a.lastActiveDate) : "no activity on record";
    return `
      <div class="alert-row alert-${a.severity}">
        <span class="alert-dot" style="background:${color}"></span>
        <div class="alert-text">
          <strong>${escapeHTML(a.business)}</strong>
          <span>${Math.round(a.pct)}% fewer jobs — ${fmtInt(a.recentCount)} in the last 30 days vs. ${fmtInt(a.priorCount)} the 30 days before &middot; last active ${lastActiveText}</span>
        </div>
      </div>`;
  }).join("");
}

function fmtDate(d) {
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
