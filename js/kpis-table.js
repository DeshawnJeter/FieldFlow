import { fmtInt, fmtPct, fmtMoneyCompact, fmtMoneyFull, STATUS_COLOR, STATUS_LABEL, capitalize } from "./utils.js";
import { state, PAGE_SIZE } from "./state.js";

// ---------- KPIs ----------
export function renderKPIs(rows) {
  const total = rows.length;
  const completed = rows.filter(r => r.status === "completed").length;
  const canceled = rows.filter(r => r.status === "canceled").length;
  const revenue = rows.reduce((s, r) => s + r.total_paid_to_date, 0);
  const outstanding = rows.filter(r => ["overdue", "unpaid", "partial"].includes(r.invoice_status))
    .reduce((s, r) => s + r.total_due, 0);
  const overdueAmt = rows.filter(r => r.invoice_status === "overdue").reduce((s, r) => s + r.total_due, 0);
  const rated = rows.filter(r => r.customer_rating > 0);
  const avgRating = rated.length ? rated.reduce((s, r) => s + r.customer_rating, 0) / rated.length : 0;

  document.getElementById("k-total").textContent = fmtInt(total);
  document.getElementById("k-total-sub").textContent = total ? `${fmtInt(canceled)} canceled` : "";

  document.getElementById("k-completed").textContent = total ? fmtPct(100 * completed / total) : "–";
  document.getElementById("k-completed-sub").textContent = total ? `${fmtInt(completed)} of ${fmtInt(total)} jobs` : "";

  document.getElementById("k-revenue").textContent = revenue ? fmtMoneyCompact(revenue) : "$0";
  document.getElementById("k-revenue-sub").textContent = "total paid to date";

  document.getElementById("k-outstanding").textContent = outstanding ? fmtMoneyCompact(outstanding) : "$0";
  const outSub = document.getElementById("k-outstanding-sub");
  outSub.textContent = overdueAmt ? `${fmtMoneyCompact(overdueAmt)} overdue` : "none overdue";
  outSub.className = "sub " + (overdueAmt > 0 ? "critical" : "good");

  document.getElementById("k-rating").textContent = rated.length ? avgRating.toFixed(2) : "–";
  document.getElementById("k-rating-sub").textContent = rated.length ? `${fmtInt(rated.length)} rated jobs` : "no ratings yet";

  const jobsPerClient = new Map();
  rows.forEach(r => jobsPerClient.set(r.client_name, (jobsPerClient.get(r.client_name) || 0) + 1));
  const totalClients = jobsPerClient.size;
  const repeatClients = [...jobsPerClient.values()].filter(n => n > 1).length;
  document.getElementById("k-repeat").textContent = totalClients ? fmtPct(100 * repeatClients / totalClients) : "–";
  document.getElementById("k-repeat-sub").textContent = totalClients
    ? `${fmtInt(repeatClients)} of ${fmtInt(totalClients)} clients repeat`
    : "no clients in range";
}

// ---------- table ----------
export function renderTable(rows) {
  const sorted = [...rows].sort((a, b) => {
    let av = a[state.sortKey], bv = b[state.sortKey];
    if (state.sortKey === "job_date") { av = a.dateObj; bv = b.dateObj; }
    if (state.sortKey === "total_due") { av = a.total_due; bv = b.total_due; }
    if (av < bv) return state.sortDir === "asc" ? -1 : 1;
    if (av > bv) return state.sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  state.page = Math.min(state.page, totalPages);
  const start = (state.page - 1) * PAGE_SIZE;
  const pageRows = sorted.slice(start, start + PAGE_SIZE);

  const tbody = document.getElementById("table-body");
  tbody.innerHTML = "";
  if (!pageRows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 10;
    td.innerHTML = `<div class="empty-note">No work orders match the current filters.</div>`;
    tr.appendChild(td);
    tbody.appendChild(tr);
  } else {
    const plainCols = ["work_order_number", "job_date", "business_name", "trade", "job_type", "technician_name", "client_name"];
    pageRows.forEach(r => {
      const tr = document.createElement("tr");
      plainCols.forEach(key => {
        const td = document.createElement("td");
        td.textContent = r[key];
        tr.appendChild(td);
      });
      tr.appendChild(pillCell(r.status, {
        completed: "var(--status-good)", canceled: "var(--status-critical)", scheduled: "var(--status-neutral)",
      }[r.status] || "var(--text-muted)", capitalize(r.status)));
      tr.appendChild(pillCell(r.invoice_status, STATUS_COLOR[r.invoice_status] || "var(--text-muted)", STATUS_LABEL[r.invoice_status] || capitalize(r.invoice_status)));
      const tdDue = document.createElement("td");
      tdDue.className = "num";
      tdDue.textContent = r.total_due ? fmtMoneyFull(r.total_due) : "–";
      tr.appendChild(tdDue);
      tbody.appendChild(tr);
    });
  }

  document.getElementById("table-count").textContent = `${fmtInt(sorted.length)} work order${sorted.length === 1 ? "" : "s"}`;
  document.getElementById("pg-label").textContent = `Page ${state.page} of ${totalPages}`;
  document.getElementById("pg-prev").disabled = state.page <= 1;
  document.getElementById("pg-next").disabled = state.page >= totalPages;

  document.querySelectorAll("#data-table th").forEach(th => {
    th.textContent = th.textContent.replace(" ▲", "").replace(" ▼", "");
    if (th.dataset.key === state.sortKey) th.textContent += state.sortDir === "asc" ? " ▲" : " ▼";
  });
}

function pillCell(key, color, label) {
  const td = document.createElement("td");
  const span = document.createElement("span");
  span.className = "status-pill";
  const dot = document.createElement("span");
  dot.className = "dot";
  dot.style.background = color;
  span.appendChild(dot);
  span.appendChild(document.createTextNode(label));
  td.appendChild(span);
  return td;
}
