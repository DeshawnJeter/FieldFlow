import { parseCSV, toNum } from "./js/utils.js";
import { RAW, setRaw, initFilters, filtered } from "./js/state.js";
import { renderKPIs, renderTable } from "./js/kpis-table.js";
import {
  renderRevenueByBusiness, renderJobsByTrade, renderInvoiceStatus, renderPriority, renderTechs,
  renderRevenueByPlan,
} from "./js/charts/bar-chart.js";
import { renderTrend, renderRevenueTrend } from "./js/charts/line-chart.js";
import { renderUsageAlerts } from "./js/alerts.js";

// ---------- load ----------
fetch("businesses_dataset.csv")
  .then(r => r.text())
  .then(text => {
    setRaw(parseCSV(text).map(r => ({
      ...r,
      labor_hours: toNum(r.labor_hours),
      estimated_cost: toNum(r.estimated_cost),
      actual_cost: toNum(r.actual_cost),
      total_due: toNum(r.total_due),
      total_paid_to_date: toNum(r.total_paid_to_date),
      customer_rating: toNum(r.customer_rating),
      dateObj: new Date(r.job_date + "T00:00:00"),
    })));
    initFilters(render);
    document.getElementById("asof").textContent =
      "As of " + new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    render();
  })
  .catch(err => {
    document.querySelector(".wrap").insertAdjacentHTML("afterbegin",
      `<div class="empty-note">Could not load businesses_dataset.csv — ${err.message}. Serve this folder over HTTP (not file://).</div>`);
  });

// ---------- render orchestration ----------
function render() {
  const rows = filtered();
  renderUsageAlerts(rows);
  renderKPIs(rows);
  renderCharts(rows);
  renderTable(rows);
}

function renderCharts(rows) {
  renderRevenueByBusiness(rows);
  renderJobsByTrade(rows);
  renderTrend(rows);
  renderRevenueTrend(rows);
  renderInvoiceStatus(rows);
  renderPriority(rows);
  renderTechs(rows);
  renderRevenueByPlan(rows);
}

// Chart containers can measure 0 / a stale width on the very first paint
// frame (before the tab's viewport settles), which throws off the SVG
// viewBox scale. Re-measure once after paint, and again on resize.
let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (RAW.length) renderCharts(filtered()); }, 120);
});
requestAnimationFrame(() => requestAnimationFrame(() => { if (RAW.length) renderCharts(filtered()); }));
