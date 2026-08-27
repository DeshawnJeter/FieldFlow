export let RAW = [];
export function setRaw(rows) { RAW = rows; }

export let state = {
  business: "all", trade: "all", plan: "all",
  datePreset: "all", search: "",
  sortKey: "job_date", sortDir: "desc",
  page: 1, pageSize: 50,
};
export const PAGE_SIZE = 50;

export function uniqueSorted(key) {
  return [...new Set(RAW.map(r => r[key]).filter(Boolean))].sort();
}

// ---------- filtering ----------
export function filtered() {
  let rows = RAW;
  if (state.business !== "all") rows = rows.filter(r => r.business_name === state.business);
  if (state.trade !== "all") rows = rows.filter(r => r.trade === state.trade);
  if (state.plan !== "all") rows = rows.filter(r => r.plan_name === state.plan);
  if (state.datePreset !== "all") {
    const days = parseInt(state.datePreset, 10);
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - days);
    rows = rows.filter(r => r.dateObj >= cutoff);
  }
  if (state.search) {
    const q = state.search;
    rows = rows.filter(r =>
      (r.client_name || "").toLowerCase().includes(q) ||
      (r.technician_name || "").toLowerCase().includes(q) ||
      (r.service_address || "").toLowerCase().includes(q) ||
      (r.work_order_number || "").toLowerCase().includes(q));
  }
  return rows;
}

export function initFilters(render) {
  const bSel = document.getElementById("f-business");
  const tSel = document.getElementById("f-trade");
  const pSel = document.getElementById("f-plan");
  bSel.innerHTML = `<option value="all">All businesses</option>` +
    uniqueSorted("business_name").map(v => `<option value="${v}">${v}</option>`).join("");
  tSel.innerHTML = `<option value="all">All trades</option>` +
    uniqueSorted("trade").map(v => `<option value="${v}">${v}</option>`).join("");
  pSel.innerHTML = `<option value="all">All plans</option>` +
    uniqueSorted("plan_name").map(v => `<option value="${v}">${v}</option>`).join("");

  bSel.addEventListener("change", () => { state.business = bSel.value; state.page = 1; render(); });
  tSel.addEventListener("change", () => { state.trade = tSel.value; state.page = 1; render(); });
  pSel.addEventListener("change", () => { state.plan = pSel.value; state.page = 1; render(); });

  document.getElementById("date-presets").addEventListener("click", e => {
    const btn = e.target.closest(".preset-btn");
    if (!btn) return;
    document.querySelectorAll(".preset-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.datePreset = btn.dataset.preset;
    state.page = 1;
    render();
  });

  document.getElementById("f-search").addEventListener("input", e => {
    state.search = e.target.value.trim().toLowerCase();
    state.page = 1;
    render();
  });

  document.getElementById("reset-filters").addEventListener("click", () => {
    state = { ...state, business: "all", trade: "all", plan: "all", datePreset: "all", search: "", page: 1, sortKey: "job_date", sortDir: "desc" };
    bSel.value = "all"; tSel.value = "all"; pSel.value = "all";
    document.getElementById("f-search").value = "";
    document.querySelectorAll(".preset-btn").forEach(b => b.classList.toggle("active", b.dataset.preset === "all"));
    render();
  });

  document.querySelectorAll("#data-table th").forEach(th => {
    th.addEventListener("click", () => {
      const key = th.dataset.key;
      if (state.sortKey === key) state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      else { state.sortKey = key; state.sortDir = "asc"; }
      render();
    });
  });

  document.getElementById("pg-prev").addEventListener("click", () => { state.page = Math.max(1, state.page - 1); render(); });
  document.getElementById("pg-next").addEventListener("click", () => { state.page = state.page + 1; render(); });
}
