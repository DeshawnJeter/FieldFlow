const sourceRows = Array.isArray(window.FIELD_FLOW_DATA) ? window.FIELD_FLOW_DATA : [];
const importedRows = sourceRows.slice();
const STORAGE_KEY = "fieldflow.phase-b.v1";
const persistedRows = (() => {
  try { const saved = localStorage.getItem(STORAGE_KEY); return saved ? JSON.parse(saved) : null; } catch { return null; }
})();
const state = {
  view: "dashboard",
  business: sourceRows[0]?.business_name || "Bright Spark Electric",
  query: "",
  jobFilter: "all",
  jobScope: "all",
  clientId: null,
  weekOffset: 0,
  dayOffset: 0,
  calendarMode: "week",
  technicianFilter: "all",
  priorityFilter: "all",
};

const scheduleSettings = { open: "07:00", close: "19:00", travelBufferHours: 0.5, defaultDurationHours: 2 };

// Demo backfill: the workbook is historical, so keep the imported records intact
// and add a small forward-looking schedule for the preview workspace.
const demoBusiness = sourceRows[0]?.business_name || "Bright Spark Electric";
const demoClients = [...new Set(sourceRows.filter((row) => row.business_name === demoBusiness).map((row) => row.client_name))];
const demoTemplates = demoClients.map((clientName) => sourceRows.find((row) => row.business_name === demoBusiness && row.client_name === clientName));
const demoDates = [46258, 46258, 46259, 46260, 46261, 46262, 46264];
const demoTimes = ["08:00", "09:30", "10:00", "13:00", "15:00", "09:00", "11:00"];
const demoJobs = [
  ["DEMO-0001", 0, "Panel upgrade", "scheduled", "routine"],
  ["DEMO-0002", 1, "Outlet installation", "scheduled", "emergency"],
  ["DEMO-0003", 2, "Wiring inspection", "scheduled", "routine"],
  ["DEMO-0004", 3, "Light fixture install", "scheduled", "scheduled_maintenance"],
  ["DEMO-0005", 4, "Circuit breaker repair", "scheduled", "routine"],
  ["DEMO-0006", 0, "Service panel check", "scheduled", "routine"],
  ["DEMO-0007", 2, "Preventive maintenance", "scheduled", "scheduled_maintenance"],
].map(([workOrderNumber, clientIndex, jobType, status, priority], index) => ({
  ...(demoTemplates[clientIndex] || demoTemplates[0] || {}),
  work_order_number: workOrderNumber,
  business_name: demoBusiness,
  client_name: demoClients[clientIndex] || "Demo client",
  job_date: demoDates[index],
  status,
  priority,
  start_time: demoTimes[index],
  job_type: jobType,
  scope_of_work: "Demo schedule item added for the FieldFlow preview.",
  labor_hours: index === 1 ? 2.5 : 2,
  total_due: 0,
  total_paid_to_date: 0,
}));
if (persistedRows?.length) {
  const persistedByWorkOrder = new Map(persistedRows.filter((row) => row.work_order_number).map((row) => [row.work_order_number, row]));
  const importedWorkOrders = new Set(importedRows.map((row) => row.work_order_number).filter(Boolean));
  const restoredRows = importedRows.map((row) => persistedByWorkOrder.get(row.work_order_number) || row);
  const persistedExtras = persistedRows.filter((row) => !row.work_order_number || !importedWorkOrders.has(row.work_order_number));
  sourceRows.splice(0, sourceRows.length, ...restoredRows, ...persistedExtras);
} else sourceRows.push(...demoJobs);

function persistRows() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sourceRows)); } catch { showToast("Saved for this session only; browser storage is unavailable."); }
}

function stableJobId(row, index = 0) { return row.job_id || row.work_order_number || `job-${row.business_name || "business"}-${row.client_name || "client"}-${index}`; }

const businessRows = () => sourceRows.filter((row) => row.business_name === state.business);
const excelDate = (serial) => {
  if (serial instanceof Date) return serial;
  if (typeof serial !== "number") return new Date(serial);
  return new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
};
const dateKey = (date) => new Date(date).toISOString().slice(0, 10);
const today = new Date("2026-08-24T00:00:00Z");
const todayKey = dateKey(today);
const fmtDate = (date, options = { month: "short", day: "numeric" }) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...options }).format(date);
const fmtTime = (date) => `${date.getUTCHours() % 12 || 12}:${String(date.getUTCMinutes()).padStart(2, "0")} ${date.getUTCHours() >= 12 ? "PM" : "AM"}`;
const initials = (name = "") => name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
const esc = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
const slug = (value = "") => String(value).toLowerCase().replace(/[^a-z]+/g, "-");
const formatStatus = (value) => String(value || "scheduled").replaceAll("_", " ");
const uniqueBy = (items, key) => [...new Map(items.map((item) => [item[key], item])).values()];

function normalizeJob(row, index) {
  const date = excelDate(row.job_date);
  const start = new Date(date);
  const [savedHours, savedMinutes] = String(row.start_time || "").split(":").map(Number);
  const hasScheduleTime = Number.isFinite(savedHours) && Number.isFinite(savedMinutes) && date instanceof Date && !Number.isNaN(date.getTime());
  if (hasScheduleTime) start.setUTCHours(savedHours, savedMinutes, 0, 0);
  const end = hasScheduleTime ? new Date(start.getTime() + Math.max(0.5, Number(row.labor_hours || scheduleSettings.defaultDurationHours)) * 3600000) : null;
  return { ...row, id: stableJobId(row, index), date, start: hasScheduleTime ? start : null, end, hasScheduleTime, status: row.status === "scheduled_maintenance" ? "scheduled" : row.status };
}

function jobs() { return businessRows().filter((row) => row.record_type !== "client").map(normalizeJob); }
function clients() { return uniqueBy(businessRows(), "client_name").map((row) => ({ ...row, id: slug(row.client_name), jobs: businessRows().filter((job) => job.client_name === row.client_name) })); }
function getDateRange(offset = 0) {
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, index) => { const date = new Date(monday); date.setUTCDate(monday.getUTCDate() + index); return date; });
}
function getCalendarDates() {
  if (state.calendarMode === "day") {
    const day = new Date(today);
    day.setUTCDate(today.getUTCDate() + state.dayOffset);
    return [day];
  }
  return getDateRange(state.weekOffset);
}
function statusBadge(status) { return `<span class="status status-${slug(status)}">${esc(formatStatus(status))}</span>`; }
function jobRow(job, clickable = true) {
  return `<div class="job-row" ${clickable ? `data-job-id="${esc(job.id)}"` : ""}>
    <div class="job-time"><strong>${job.start ? fmtTime(job.start) : "Time TBD"}</strong>${job.date && !Number.isNaN(job.date.getTime()) ? fmtDate(job.date, { month: "short", day: "numeric" }) : "Date TBD"}</div>
    <div class="job-main"><strong>${esc(job.client_name)}</strong><small>${esc(job.job_type)} · ${esc(job.service_address)}</small></div>
    <div class="job-meta">${statusBadge(job.status)}<small>${Number(job.labor_hours || 0).toFixed(1)} hr visit</small></div>
  </div>`;
}
function pageHeading(eyebrow, title, subtitle, actions = "") { return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="subheading">${subtitle}</p></div><div class="heading-actions">${actions}</div></div>`; }
function addButtons() { return `<button class="button button-secondary" data-action="add-client">＋ Add client</button><button class="button button-primary" data-action="add-job">＋ Add job</button>`; }

function appointmentDate(job) { return job.date && !Number.isNaN(job.date.getTime()); }
function activeJobs(items = jobs()) { return items.filter((job) => job.status === "scheduled" && job.hasScheduleTime); }
function currentDayJobs(items = jobs()) { return items.filter((job) => appointmentDate(job) && dateKey(job.date) === todayKey && job.status === "scheduled"); }
function upcomingJobs(items = jobs()) { return items.filter((job) => appointmentDate(job) && job.date >= today && job.status === "scheduled").sort((a, b) => a.start - b.start); }
function historyJobs(items = jobs()) { return items.filter((job) => job.status === "completed" || job.status === "canceled" || !job.hasScheduleTime).sort((a, b) => (b.date || 0) - (a.date || 0)); }

function renderDashboard() {
  const rows = jobs();
  const todayJobs = rows.filter((job) => appointmentDate(job) && dateKey(job.date) === todayKey && job.status !== "canceled" && job.hasScheduleTime);
  const upcoming = upcomingJobs(rows);
  const recentClients = clients().slice(-4).reverse();
  const conflicts = findConflicts(rows);
  return `${pageHeading("Monday, August 24, 2026", "Good morning, Tariq", "Here’s the pulse of ${esc(state.business)} for today.", addButtons())}
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-top"><span>Today’s jobs</span><span class="stat-icon">◷</span></div><div class="stat-value">${todayJobs.length}</div><div class="stat-note">${todayJobs.filter((j) => j.status === "completed").length} completed today</div></div>
      <div class="stat-card"><div class="stat-top"><span>Upcoming</span><span class="stat-icon">▦</span></div><div class="stat-value">${upcoming.length}</div><div class="stat-note">Scheduled from ${fmtDate(today)}</div></div>
      <div class="stat-card"><div class="stat-top"><span>Clients</span><span class="stat-icon">◉</span></div><div class="stat-value">${clients().length}</div><div class="stat-note">${recentClients.length} added recently</div></div>
      <div class="stat-card"><div class="stat-top"><span>Outstanding</span><span class="stat-icon">$</span></div><div class="stat-value">$${businessRows().reduce((sum, row) => sum + Number(row.total_due || 0) - Number(row.total_paid_to_date || 0), 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}</div><div class="stat-note">Across imported work orders</div></div>
    </div>
    <div class="dashboard-grid">
      <div class="card"><div class="card-header"><div><h2 class="card-title">Today’s jobs</h2><p class="card-subtitle">${fmtDate(today, { weekday: "long", month: "long", day: "numeric" })}</p></div><button class="text-link" data-view-link="calendar">Open calendar →</button></div><div class="job-list">${todayJobs.length ? todayJobs.slice(0, 5).map(jobRow).join("") : '<div class="empty-state">No active jobs today. Your schedule is clear.</div>'}</div></div>
      <div class="card alert-card"><div class="card-header"><div><h2 class="card-title">Schedule watch</h2><p class="card-subtitle">${conflicts.length ? "Resolve these before the day gets busy." : "No active overlaps detected."}</p></div><span class="status ${conflicts.length ? "status-canceled" : "status-completed"}">${conflicts.length} ${conflicts.length === 1 ? "warning" : "warnings"}</span></div>${conflicts.length ? conflicts.slice(0, 3).map((pair) => `<div class="warning-row"><div class="warning-badge">!</div><div><strong>${esc(pair.a.client_name)} and ${esc(pair.b.client_name)}</strong><small>${fmtDate(pair.a.date)} · ${fmtTime(pair.a.start)}–${fmtTime(pair.a.end)} overlap</small></div></div>`).join("") : '<div class="empty-state">You’re in the clear. New overlaps will show up here.</div>'}</div>
      <div class="card"><div class="card-header"><div><h2 class="card-title">Upcoming jobs</h2><p class="card-subtitle">Your next scheduled visits</p></div><button class="text-link" data-view-link="jobs">View all →</button></div><div class="job-list">${upcoming.slice(0, 4).map(jobRow).join("") || '<div class="empty-state">No upcoming jobs.</div>'}</div></div>
      <div class="card"><div class="card-header"><div><h2 class="card-title">Recently added clients</h2><p class="card-subtitle">Keep your client book current</p></div><button class="text-link" data-view-link="clients">All clients →</button></div><div class="client-list">${recentClients.map((client) => `<div class="client-row" data-client-id="${esc(client.id)}"><div><span class="client-initial">${initials(client.client_name)}</span><strong>${esc(client.client_name)}</strong><small>${esc(client.service_address)}</small></div><span>›</span></div>`).join("")}</div></div>
    </div>`;
}

function renderClients() {
  const query = state.query.toLowerCase();
  const filtered = clients().filter((client) => `${client.client_name} ${client.client_phone} ${client.service_address}`.toLowerCase().includes(query));
  return `${pageHeading("Client book", "Clients", `${clients().length} clients in ${esc(state.business)}.`, `<button class="button button-primary" data-action="add-client">＋ Add client</button>`)}
    <div class="card"><div class="toolbar"><div class="search"><input id="clientSearch" value="${esc(state.query)}" placeholder="Search name, phone, or address" aria-label="Search clients" /></div><span class="chip">${filtered.length} shown</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Client</th><th>Contact</th><th>Service address</th><th>Jobs</th><th>Last visit</th></tr></thead><tbody>${filtered.map((client) => { const clientJobs = client.jobs.map(normalizeJob); const latest = clientJobs.sort((a, b) => b.date - a.date)[0]; return `<tr data-client-id="${esc(client.id)}"><td><strong>${esc(client.client_name)}</strong><small>${esc(client.trade || "Residential service")}</small></td><td><a class="phone-link" href="tel:${esc(client.client_phone)}">${esc(client.client_phone)}</a></td><td>${esc(client.service_address)}</td><td>${client.jobs.length}</td><td>${latest ? fmtDate(latest.date) : "—"}</td></tr>`; }).join("") || '<tr><td colspan="5"><div class="empty-state">No clients match that search.</div></td></tr>'}</tbody></table></div></div>`;
}

function renderClientProfile(client) {
  if (!client) return renderClients();
  const clientJobs = client.jobs.map(normalizeJob).sort((a, b) => b.date - a.date);
  return `${pageHeading("Client profile", client.client_name, "A clear view of contact details and job history.", `<button class="button button-secondary" data-view-link="clients">← Back to clients</button><button class="button button-primary" data-action="add-job" data-client-name="${esc(client.client_name)}">＋ Add job</button>`)}
    <div class="detail-grid"><div class="card"><div class="profile-hero"><div class="profile-avatar">${initials(client.client_name)}</div><div><h2>${esc(client.client_name)}</h2><p>Active client · ${client.jobs.length} total jobs</p></div></div><div class="contact-grid"><div class="contact-item"><small>Phone</small><strong><a class="phone-link" href="tel:${esc(client.client_phone)}">${esc(client.client_phone)}</a></strong></div><div class="contact-item"><small>Service address</small><strong>${esc(client.service_address)}</strong></div><div class="contact-item"><small>Preferred trade</small><strong>${esc(client.trade || "General service")}</strong></div><div class="contact-item"><small>Customer rating</small><strong>${Number(client.customer_rating || 0) ? `${client.customer_rating}/5` : "Not rated yet"}</strong></div></div><div style="margin-top:20px"><h2 class="card-title">Job history</h2><div class="job-list" style="margin-top:13px">${clientJobs.map(jobRow).join("") || '<div class="empty-state">No jobs yet. Add the first job from this profile.</div>'}</div></div></div><div class="card"><div class="card-header"><div><h2 class="card-title">Notes</h2><p class="card-subtitle">Keep context close to the work.</p></div><button class="text-link" data-action="edit-client" data-client-id="${esc(client.id)}">Edit</button></div><p class="muted" style="font-size:13px;line-height:1.6">${esc(client.notes || client.scope_of_work || "No notes have been added for this client yet.")}</p></div></div>`;
}

function renderJobs() {
  const query = state.query.toLowerCase();
  const filtered = jobs().filter((job) => {
    const matchesStatus = state.jobFilter === "all" || job.status === state.jobFilter;
    const matchesScope = state.jobScope === "all" || (state.jobScope === "today" && appointmentDate(job) && dateKey(job.date) === todayKey && job.status === "scheduled") || (state.jobScope === "upcoming" && appointmentDate(job) && job.date >= today && job.status === "scheduled") || (state.jobScope === "history" && (job.status === "completed" || !job.hasScheduleTime)) || (state.jobScope === "canceled" && job.status === "canceled");
    return matchesStatus && matchesScope && `${job.client_name} ${job.job_type} ${job.work_order_number}`.toLowerCase().includes(query);
  }).sort((a, b) => (b.date || 0) - (a.date || 0));
  return `${pageHeading("Work orders", "Jobs", "Track scheduled work from first visit through completion.", `<button class="button button-primary" data-action="add-job">＋ Add job</button>`)}
    <div class="card"><div class="toolbar"><div class="search"><input id="jobSearch" value="${esc(state.query)}" placeholder="Search jobs, clients, or work orders" aria-label="Search jobs" /></div><select class="select" id="jobScope" aria-label="Filter job view"><option value="all" ${state.jobScope === "all" ? "selected" : ""}>All jobs</option><option value="today" ${state.jobScope === "today" ? "selected" : ""}>Today</option><option value="upcoming" ${state.jobScope === "upcoming" ? "selected" : ""}>Upcoming</option><option value="history" ${state.jobScope === "history" ? "selected" : ""}>Completed / history</option><option value="canceled" ${state.jobScope === "canceled" ? "selected" : ""}>Canceled</option></select><select class="select" id="jobFilter" aria-label="Filter job status"><option value="all" ${state.jobFilter === "all" ? "selected" : ""}>All statuses</option><option value="scheduled" ${state.jobFilter === "scheduled" ? "selected" : ""}>Scheduled</option><option value="completed" ${state.jobFilter === "completed" ? "selected" : ""}>Completed</option><option value="canceled" ${state.jobFilter === "canceled" ? "selected" : ""}>Canceled</option></select><span class="chip">${filtered.length} jobs</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Job</th><th>Client</th><th>Date</th><th>Priority</th><th>Status</th><th>Due</th></tr></thead><tbody>${filtered.slice(0, 100).map((job) => `<tr data-job-id="${esc(job.id)}"><td><strong>${esc(job.job_type)}</strong><small>${esc(job.work_order_number)}</small></td><td>${esc(job.client_name)}<small>${esc(job.technician_name)}</small></td><td>${job.date && !Number.isNaN(job.date.getTime()) ? fmtDate(job.date) : "History only"}<small>${job.start ? fmtTime(job.start) : "Time not set"}</small></td><td><span class="chip">${esc(job.priority)}</span></td><td>${statusBadge(job.status)}</td><td>$${Number(job.total_due || 0).toFixed(0)}</td></tr>`).join("") || '<tr><td colspan="6"><div class="empty-state">No jobs match these filters.</div></td></tr>'}</tbody></table></div></div>`;
}

function renderCalendar() {
  const range = getCalendarDates();
  const rangeJobs = jobs().filter((job) => appointmentDate(job) && range.some((day) => dateKey(day) === dateKey(job.date)) && (state.technicianFilter === "all" || job.technician_name === state.technicianFilter) && (state.priorityFilter === "all" || job.priority === state.priorityFilter)).sort((a, b) => (a.start || a.date) - (b.start || b.date));
  const conflicts = findConflicts(rangeJobs);
  const technicians = [...new Set(jobs().map((job) => job.technician_name).filter(Boolean))].sort();
  const priorities = [...new Set(jobs().map((job) => job.priority).filter(Boolean))].sort();
  return `${pageHeading("Schedule", "Calendar", "A simple week view for fast, confident dispatching.", `<button class="button button-primary" data-action="add-job">＋ Add job</button>`)}
    <div class="card"><div class="calendar-head"><div class="calendar-nav"><button class="button button-secondary button-small" data-action="calendar-today">Today</button><button class="button button-secondary button-small" data-action="calendar-prev">←</button><strong>${range.length === 1 ? fmtDate(range[0], { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : `${fmtDate(range[0], { month: "short", day: "numeric" })} – ${fmtDate(range[6], { month: "short", day: "numeric", year: "numeric" })}`}</strong><button class="button button-secondary button-small" data-action="calendar-next">→</button></div><div class="kpi-row"><button class="chip ${state.calendarMode === "week" ? "chip-active" : ""}" data-action="calendar-week">Week</button><button class="chip ${state.calendarMode === "day" ? "chip-active" : ""}" data-action="calendar-day">Day</button><select class="select" id="technicianFilter" aria-label="Filter by technician"><option value="all">All technicians</option>${technicians.map((name) => `<option value="${esc(name)}" ${name === state.technicianFilter ? "selected" : ""}>${esc(name)}</option>`).join("")}</select><select class="select" id="priorityFilter" aria-label="Filter by priority"><option value="all">All priorities</option>${priorities.map((priority) => `<option value="${esc(priority)}" ${priority === state.priorityFilter ? "selected" : ""}>${esc(priority)}</option>`).join("")}</select><span class="chip">${rangeJobs.filter((j) => j.status === "scheduled" && j.hasScheduleTime).length} scheduled</span><span class="chip" style="color:var(--amber)">${conflicts.length} conflicts</span></div></div><div class="week-grid ${range.length === 1 ? "day-mode" : ""}">${range.map((day) => { const key = dateKey(day); const dayJobs = rangeJobs.filter((job) => dateKey(job.date) === key); return `<div class="day-column ${key === todayKey ? "today" : ""}"><div class="day-header"><small>${new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(day)}</small><strong>${day.getUTCDate()}</strong></div><div class="calendar-jobs">${dayJobs.length ? dayJobs.map((job) => `<div class="calendar-job ${job.status === "canceled" ? "canceled" : ""} ${job.status === "completed" ? "completed" : ""} ${conflicts.some((pair) => pair.a.id === job.id || pair.b.id === job.id) ? "conflict" : ""}" data-job-id="${esc(job.id)}"><strong>${job.start ? fmtTime(job.start) : "Time TBD"} · ${esc(job.client_name)}</strong><small>${esc(job.job_type)} · ${formatStatus(job.status)}${job.technician_name ? ` · ${esc(job.technician_name)}` : ""}</small></div>`).join("") : '<div class="calendar-empty">No jobs</div>'}</div></div>`; }).join("")}</div></div>`;
}

function renderBusiness() {
  const rows = businessRows();
  const names = [...new Set(sourceRows.map((row) => row.business_name).filter(Boolean))];
  return `${pageHeading("Private workspace", "Business", "Your team, plan, and business-level settings.", "")}
    <div class="detail-grid"><div class="card"><div class="card-header"><div><h2 class="card-title">Business workspace</h2><p class="card-subtitle">Each business is treated as a locked room.</p></div><span class="status status-completed">Protected</span></div><div class="form-grid"><div class="field"><label>Business name</label><input value="${esc(state.business)}" disabled /></div><div class="field"><label>Trade</label><input value="${esc(rows[0]?.trade || "Contractor")}" disabled /></div><div class="field"><label>Workspace ID</label><input value="ff-${slug(state.business).slice(0, 16)}" disabled /></div><div class="field"><label>Access</label><input value="Owner · Private" disabled /></div></div></div><div class="card"><div class="card-header"><div><h2 class="card-title">Workspace switcher</h2><p class="card-subtitle">Search the businesses already in the database.</p></div></div><div class="field" style="margin-bottom:10px"><label for="businessSearch">Search businesses</label><input id="businessSearch" type="search" placeholder="Search by business name" autocomplete="off" aria-controls="businessSelect" /></div><select class="select" id="businessSelect" style="width:100%">${names.map((name) => `<option value="${esc(name)}" ${name === state.business ? "selected" : ""}>${esc(name)}</option>`).join("")}</select><p id="businessSearchMeta" class="muted" style="font-size:11px;line-height:1.5;margin-bottom:0">${names.length} businesses available. Search filters this list.</p><p class="muted" style="font-size:11px;line-height:1.5;margin-bottom:0">In production, this selector must be backed by server-side membership checks. Client-side IDs never grant access.</p></div><div class="card"><div class="card-header"><div><h2 class="card-title">Billing</h2><p class="card-subtitle">Imported plan information</p></div></div><div class="contact-grid"><div class="contact-item"><small>Plan</small><strong>${esc(rows[0]?.plan_name || "Starter")}</strong></div><div class="contact-item"><small>Work orders</small><strong>${rows.length}</strong></div></div></div></div>`;
}

function findConflicts(items) {
  const active = activeJobs(items);
  const result = [];
  for (let i = 0; i < active.length; i += 1) for (let j = i + 1; j < active.length; j += 1) {
    const sameTechnician = !active[i].technician_name || !active[j].technician_name || active[i].technician_name === active[j].technician_name;
    const buffer = scheduleSettings.travelBufferHours * 3600000;
    if (sameTechnician && dateKey(active[i].date) === dateKey(active[j].date) && active[i].start < new Date(active[j].end.getTime() + buffer) && active[j].start < new Date(active[i].end.getTime() + buffer)) result.push({ a: active[i], b: active[j], technician: active[i].technician_name || active[j].technician_name || "Unassigned" });
  }
  return result;
}

function render() {
  document.querySelector("#businessName").textContent = state.business;
  const globalBusinessSelect = document.querySelector("#globalBusinessSelect");
  if (globalBusinessSelect) {
    const names = [...new Set(sourceRows.map((row) => row.business_name).filter(Boolean))].sort();
    globalBusinessSelect.innerHTML = names.map((name) => `<option value="${esc(name)}" ${name === state.business ? "selected" : ""}>${esc(name)}</option>`).join("");
    globalBusinessSelect.value = state.business;
    globalBusinessSelect.onchange = (event) => { state.business = event.target.value; state.view = "dashboard"; state.clientId = null; state.query = ""; render(); showToast(`Switched to ${state.business}.`); };
  }
  document.querySelector("#pageTitle").textContent = state.view === "clients" && state.clientId ? "Client profile" : state.view[0].toUpperCase() + state.view.slice(1);
  document.querySelector("#pageEyebrow").textContent = state.view === "dashboard" ? "Overview" : state.view === "business" ? "Workspace" : "FieldFlow";
  const activeClient = state.clientId ? clients().find((client) => client.id === state.clientId) : null;
  document.querySelector("#app").innerHTML = state.view === "dashboard" ? renderDashboard() : state.view === "clients" && activeClient ? renderClientProfile(activeClient) : state.view === "clients" ? renderClients() : state.view === "jobs" ? renderJobs() : state.view === "calendar" ? renderCalendar() : renderBusiness();
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === state.view));
  bindEvents();
}

function showToast(message) { const root = document.querySelector("#modalRoot"); root.insertAdjacentHTML("beforeend", `<div class="toast">${esc(message)}</div>`); setTimeout(() => root.querySelector(".toast")?.remove(), 2600); }
let modalRestoreFocus = null;
function closeModal() { const backdrop = document.querySelector(".modal-backdrop"); const restore = modalRestoreFocus; backdrop?.remove(); modalRestoreFocus = null; if (restore && document.contains(restore)) restore.focus(); }
function bindModalClose() {
  const backdrop = document.querySelector(".modal-backdrop");
  if (!backdrop) return;
  modalRestoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const dialog = backdrop.querySelector("[role='dialog']");
  const focusable = [...backdrop.querySelectorAll("button, input, select, textarea, a[href]")].filter((element) => !element.disabled);
  window.setTimeout(() => focusable[0]?.focus(), 0);
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop || event.target.closest("[data-action='close-modal']")) closeModal();
  });
  backdrop.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { event.preventDefault(); closeModal(); return; }
    if (event.key !== "Tab" || !focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  dialog?.setAttribute("tabindex", "-1");
}
function showFormError(message) {
  const form = document.querySelector(".modal form");
  if (!form) return;
  let error = form.querySelector(".form-error");
  if (!error) { form.insertAdjacentHTML("afterbegin", '<div class="form-error" role="alert"></div>'); error = form.querySelector(".form-error"); }
  error.textContent = message;
  error.hidden = false;
}
function clearFormError() { document.querySelector(".modal .form-error")?.remove(); }
function dateToExcel(dateValue) { return Math.round((new Date(`${dateValue}T00:00:00Z`) - new Date("1899-12-30T00:00:00Z")) / 86400000); }
function buildJobRow(form, existing = {}) {
  const template = businessRows().find((row) => row.client_name === form.client_name) || businessRows()[0] || {};
  const workOrderNumber = existing.work_order_number || `NEW-${Date.now()}`;
  return { ...template, ...existing, ...form, business_name: state.business, job_id: existing.job_id || workOrderNumber, work_order_number: workOrderNumber, job_date: dateToExcel(form.job_date), labor_hours: Number(form.duration || scheduleSettings.defaultDurationHours), start_time: form.start_time, status: existing.status || "scheduled", scope_of_work: form.scope_of_work || "" };
}
function validateScheduleForm(form, ignoreJobId = null) {
  const duration = Number(form.duration);
  const errors = [];
  if (!form.client_name) errors.push("Choose a client.");
  if (!form.job_type?.trim()) errors.push("Add a service type.");
  if (!form.job_date || Number.isNaN(new Date(`${form.job_date}T00:00:00Z`).getTime())) errors.push("Choose a valid date.");
  if (!form.start_time) errors.push("Choose a start time.");
  if (!Number.isFinite(duration) || duration <= 0) errors.push("Duration must be greater than zero.");
  if (form.start_time && (form.start_time < scheduleSettings.open || form.start_time > scheduleSettings.close)) errors.push(`Jobs must start between ${scheduleSettings.open} and ${scheduleSettings.close}.`);
  if (form.start_time && Number.isFinite(duration)) {
    const [hour, minute] = form.start_time.split(":").map(Number);
    const endMinutes = hour * 60 + minute + duration * 60;
    const closeMinutes = Number(scheduleSettings.close.split(":")[0]) * 60 + Number(scheduleSettings.close.split(":")[1]);
    if (endMinutes > closeMinutes) errors.push(`This job ends after business hours (${scheduleSettings.close}).`);
  }
  if (errors.length) { showFormError(errors[0]); return null; }
  const row = buildJobRow(form);
  const candidate = normalizeJob(row, 0);
  const conflicts = findConflicts([...jobs().filter((job) => job.id !== ignoreJobId), candidate]).filter((pair) => pair.a.id === candidate.id || pair.b.id === candidate.id);
  if (conflicts.length && !window.confirm(`Schedule conflict: this overlaps ${conflicts[0].a.id === candidate.id ? conflicts[0].b.client_name : conflicts[0].a.client_name} at ${fmtTime(conflicts[0].a.id === candidate.id ? conflicts[0].b.start : conflicts[0].a.start)}. Schedule anyway?`)) return null;
  clearFormError();
  return row;
}
function recordStatusChange(row, nextStatus, note = "") {
  const history = Array.isArray(row.status_history) ? row.status_history : [];
  history.push({ from: row.status || "new", to: nextStatus, note, changed_at: new Date().toISOString(), changed_by: "Tariq Silva" });
  row.status_history = history;
  row.status = nextStatus;
}
function statusHistoryHtml(job) {
  const history = Array.isArray(job.status_history) ? job.status_history : [];
  return history.length ? `<div style="margin-top:18px"><h3 class="card-title">Status history</h3><div class="history-list">${history.slice().reverse().map((event) => `<div class="history-item"><strong>${esc(formatStatus(event.to))}</strong><small>${fmtDate(new Date(event.changed_at), { month: "short", day: "numeric", year: "numeric" })}${event.note ? ` · ${esc(event.note)}` : ""}</small></div>`).join("")}</div></div>` : "";
}
function openModal(type, defaults = {}) {
  const isClient = type === "client";
  const clientOptions = clients().map((client) => `<option ${defaults.client_name === client.client_name ? "selected" : ""}>${esc(client.client_name)}</option>`).join("");
  document.querySelector("#modalRoot").insertAdjacentHTML("beforeend", `<div class="modal-backdrop" data-action="close-modal"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><div class="modal-head"><div><h2 id="modalTitle">${isClient ? "Add a client" : "Schedule a job"}</h2><p>${isClient ? "Keep the form short. Add the essentials now." : "Create a clear, scannable work order."}</p></div><button class="icon-button" data-action="close-modal" aria-label="Close">×</button></div><form id="modalForm" data-form-type="${type}"><div class="form-grid">${isClient ? `<div class="field"><label for="name">Client name *</label><input id="name" name="client_name" required placeholder="e.g. Jordan Lee" /></div><div class="field"><label for="phone">Phone *</label><input id="phone" name="client_phone" required type="tel" placeholder="(555) 555-0100" /></div><div class="field"><label for="address">Service address *</label><input id="address" name="service_address" required placeholder="Street, city, state, ZIP" /></div><div class="field"><label for="email">Email</label><input id="email" name="email" type="email" placeholder="client@example.com" /></div><div class="field field-full"><label for="notes">Notes</label><textarea id="notes" name="notes" placeholder="Gate code, preferred contact, access details…"></textarea></div>` : `<div class="field"><label for="client">Client *</label><select id="client" name="client_name" required>${clientOptions}</select></div><div class="field"><label for="jobType">Service type *</label><input id="jobType" name="job_type" required placeholder="e.g. Panel upgrade" /></div><div class="field"><label for="date">Date *</label><input id="date" name="job_date" required type="date" value="${defaults.date || todayKey}" /></div><div class="field"><label for="time">Start time *</label><input id="time" name="start_time" required type="time" value="08:00" /></div><div class="field"><label for="duration">Duration (hours)</label><input id="duration" name="duration" type="number" min=".5" step=".5" value="2" /></div><div class="field"><label for="priority">Priority</label><select id="priority" name="priority"><option>routine</option><option>scheduled_maintenance</option><option>emergency</option></select></div><div class="field field-full"><label for="jobNotes">Notes</label><textarea id="jobNotes" name="scope_of_work" placeholder="What should the technician know?"></textarea></div>`}</div><div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Cancel</button><button type="submit" class="button button-primary">${isClient ? "Save client" : "Save job"}</button></div></form></div></div>`);
  bindModalClose();
  document.querySelector("#modalForm").addEventListener("submit", (event) => { event.preventDefault(); const form = Object.fromEntries(new FormData(event.target).entries()); if (isClient) { const phoneDigits = String(form.client_phone || "").replace(/\D/g, ""); if (!form.client_name?.trim() || phoneDigits.length < 7 || !form.service_address?.trim()) { showFormError("Add a client name, valid phone number, and service address."); return; } if (clients().some((client) => client.client_name.toLowerCase() === form.client_name.trim().toLowerCase())) { showFormError("A client with that name already exists in this business."); return; } sourceRows.push({ ...form, record_type: "client", business_name: state.business, trade: businessRows()[0]?.trade || "Contractor", client_name: form.client_name.trim(), client_phone: form.client_phone.trim(), service_address: form.service_address.trim(), notes: form.notes || "", customer_rating: 0, work_order_number: null, job_date: null, labor_hours: 0, total_due: 0, total_paid_to_date: 0 }); persistRows(); showToast(`${form.client_name} added to your client book.`); } else { const row = validateScheduleForm(form); if (!row) return; sourceRows.push(row); persistRows(); showToast("Job scheduled. Conflict checks will appear on the calendar."); } closeModal(); state.clientId = null; render(); });
}

function openEditClient(client) {
  document.querySelector("#modalRoot").insertAdjacentHTML("beforeend", `<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="editClientTitle"><div class="modal-head"><div><h2 id="editClientTitle">Edit client</h2><p>Update the details your team uses in the field.</p></div><button class="icon-button" data-action="close-modal" aria-label="Close">×</button></div><form id="editClientForm"><div class="form-grid"><div class="field"><label for="editClientName">Client name *</label><input id="editClientName" name="client_name" required value="${esc(client.client_name)}" /></div><div class="field"><label for="editClientPhone">Phone *</label><input id="editClientPhone" name="client_phone" required type="tel" value="${esc(client.client_phone)}" /></div><div class="field field-full"><label for="editClientAddress">Service address *</label><input id="editClientAddress" name="service_address" required value="${esc(client.service_address)}" /></div><div class="field field-full"><label for="editClientNotes">Notes</label><textarea id="editClientNotes" name="notes">${esc(client.notes || client.scope_of_work || "")}</textarea></div></div><div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Cancel</button><button type="submit" class="button button-primary">Save changes</button></div></form></div></div>`);
  bindModalClose();
  document.querySelector("#editClientForm").addEventListener("submit", (event) => { event.preventDefault(); const form = Object.fromEntries(new FormData(event.target).entries()); if (!form.client_name?.trim() || String(form.client_phone || "").replace(/\D/g, "").length < 7 || !form.service_address?.trim()) { showFormError("Add a client name, valid phone number, and service address."); return; } sourceRows.filter((row) => row.business_name === state.business && row.client_name === client.client_name).forEach((row) => { row.client_name = form.client_name.trim(); row.client_phone = form.client_phone.trim(); row.service_address = form.service_address.trim(); row.notes = form.notes || ""; }); persistRows(); closeModal(); state.clientId = slug(form.client_name); render(); showToast("Client details updated."); });
}

function openEditJob(job) {
  const clientOptions = clients().map((client) => `<option ${client.client_name === job.client_name ? "selected" : ""}>${esc(client.client_name)}</option>`).join("");
  document.querySelector("#modalRoot").insertAdjacentHTML("beforeend", `<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="editJobTitle"><div class="modal-head"><div><h2 id="editJobTitle">Edit job</h2><p>${esc(job.work_order_number)} · keep the schedule current.</p></div><button class="icon-button" data-action="close-modal" aria-label="Close">×</button></div><form id="editJobForm"><div class="form-grid"><div class="field"><label for="editJobClient">Client *</label><select id="editJobClient" name="client_name" required>${clientOptions}</select></div><div class="field"><label for="editJobType">Service type *</label><input id="editJobType" name="job_type" required value="${esc(job.job_type)}" /></div><div class="field"><label for="editJobDate">Date *</label><input id="editJobDate" name="job_date" required type="date" value="${dateKey(job.date)}" /></div><div class="field"><label for="editJobTime">Start time *</label><input id="editJobTime" name="start_time" required type="time" value="${String(job.start.getUTCHours()).padStart(2, "0")}:${String(job.start.getUTCMinutes()).padStart(2, "0")}" /></div><div class="field"><label for="editJobDuration">Duration (hours)</label><input id="editJobDuration" name="duration" type="number" min=".5" step=".5" value="${Number(job.labor_hours || 2)}" /></div><div class="field"><label for="editJobPriority">Priority</label><select id="editJobPriority" name="priority"><option ${job.priority === "routine" ? "selected" : ""}>routine</option><option ${job.priority === "scheduled_maintenance" ? "selected" : ""}>scheduled_maintenance</option><option ${job.priority === "emergency" ? "selected" : ""}>emergency</option></select></div><div class="field field-full"><label for="editJobNotes">Notes</label><textarea id="editJobNotes" name="scope_of_work">${esc(job.scope_of_work || "")}</textarea></div></div><div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Cancel</button><button type="submit" class="button button-primary">Save changes</button></div></form></div></div>`);
  bindModalClose();
  document.querySelector("#editJobForm").addEventListener("submit", (event) => { event.preventDefault(); const form = Object.fromEntries(new FormData(event.target).entries()); const source = sourceRows.find((row) => stableJobId(row) === job.id); if (!source) return; const next = validateScheduleForm(form, job.id); if (!next) return; Object.assign(source, { client_name: next.client_name, job_type: next.job_type, job_date: next.job_date, start_time: next.start_time, labor_hours: next.labor_hours, priority: next.priority, scope_of_work: next.scope_of_work }); persistRows(); closeModal(); render(); showToast("Job details updated."); });
}

function bindJobModalActions(job) {
  const modal = document.querySelector(".modal-backdrop");
  modal?.querySelector("[data-action='edit-job']")?.addEventListener("click", () => { closeModal(); openEditJob(job); });
  modal?.querySelectorAll("[data-status]").forEach((element) => element.addEventListener("click", () => { const source = sourceRows.find((row) => stableJobId(row) === element.dataset.jobId); if (!source) return; const nextStatus = element.dataset.status; if (nextStatus === "canceled") { const reason = window.prompt("Why is this job being canceled? This will be saved to its status history.", source.cancellation_reason || ""); if (reason === null) return; if (!reason.trim()) { showToast("Add a cancellation reason before canceling."); return; } source.cancellation_reason = reason.trim(); recordStatusChange(source, nextStatus, reason.trim()); } else { const note = window.prompt("Completion note (optional). Press Cancel to keep the job scheduled.", source.completion_notes || ""); if (note === null) return; source.completion_notes = note.trim(); recordStatusChange(source, nextStatus, note.trim()); } persistRows(); closeModal(); render(); showToast(`Job marked ${formatStatus(nextStatus)}.`); }));
}

function openJob(job) { const conflict = findConflicts(jobs()).find((pair) => pair.a.id === job.id || pair.b.id === job.id); document.querySelector("#modalRoot").insertAdjacentHTML("beforeend", `<div class="modal-backdrop" data-action="close-modal"><div class="modal" role="dialog" aria-modal="true"><div class="modal-head"><div><h2>${esc(job.job_type)}</h2><p>${esc(job.work_order_number)} · ${fmtDate(job.date, { weekday: "long", month: "long", day: "numeric" })}</p></div><button class="icon-button" data-action="close-modal" aria-label="Close">×</button></div>${conflict ? `<div class="warning-row" style="margin-bottom:16px"><div class="warning-badge">!</div><div><strong>Double-booking warning</strong><small>This overlaps with ${esc(conflict.a.id === job.id ? conflict.b.client_name : conflict.a.client_name)}. Review the calendar before confirming.</small></div></div>` : ""}<div class="contact-grid"><div class="contact-item"><small>Client</small><strong>${esc(job.client_name)}</strong></div><div class="contact-item"><small>Time</small><strong>${job.start ? `${fmtTime(job.start)}–${fmtTime(job.end)}` : "Time not set"}</strong></div><div class="contact-item"><small>Address</small><strong>${esc(job.service_address)}</strong></div><div class="contact-item"><small>Status</small><strong>${statusBadge(job.status)}</strong></div></div><p class="muted" style="font-size:13px;line-height:1.6;margin:18px 0">${esc(job.scope_of_work || "No job notes added.")}</p>${statusHistoryHtml(job)}<div class="modal-actions"><button class="button button-secondary" data-action="close-modal">Close</button><button class="button button-secondary" data-action="edit-job" data-job-id="${esc(job.id)}">Edit job</button>${job.status === "scheduled" ? `<button class="button button-danger" data-status="canceled" data-job-id="${esc(job.id)}">Cancel job</button><button class="button button-primary" data-status="completed" data-job-id="${esc(job.id)}">Mark completed</button>` : ""}</div></div></div>`); bindModalClose(); bindJobModalActions(job); }

function bindEvents() {
  document.querySelectorAll("[data-view]").forEach((element) => element.addEventListener("click", () => { state.view = element.dataset.view; state.clientId = null; state.query = ""; document.querySelector(".sidebar")?.classList.remove("open"); render(); }));
  document.querySelectorAll("[data-view-link]").forEach((element) => element.addEventListener("click", () => { state.view = element.dataset.viewLink; state.clientId = null; render(); }));
  document.querySelectorAll("[data-action='add-client']").forEach((element) => element.addEventListener("click", () => openModal("client")));
  document.querySelectorAll("[data-action='add-job']").forEach((element) => element.addEventListener("click", () => openModal("job", { client_name: element.dataset.clientName })));
  document.querySelectorAll("[data-action='edit-client']").forEach((element) => element.addEventListener("click", () => { const client = clients().find((item) => item.id === element.dataset.clientId); if (client) openEditClient(client); }));
  document.querySelectorAll("[data-action='close-modal']").forEach((element) => element.addEventListener("click", (event) => { if (event.target === element || element.dataset.action === "close-modal") closeModal(); }));
  document.querySelectorAll("[data-job-id]").forEach((element) => element.addEventListener("click", () => { const job = jobs().find((item) => item.id === element.dataset.jobId); if (job) openJob(job); }));
  document.querySelectorAll("[data-action='edit-job']").forEach((element) => element.addEventListener("click", () => { const job = jobs().find((item) => item.id === element.dataset.jobId); if (job) { closeModal(); openEditJob(job); } }));
  document.querySelectorAll(".client-row[data-client-id], tr[data-client-id]").forEach((element) => element.addEventListener("click", () => { state.view = "clients"; state.clientId = element.dataset.clientId; render(); }));
  const preserveSearch = (event, selector) => { const cursor = event.target.selectionStart ?? event.target.value.length; state.query = event.target.value; render(); requestAnimationFrame(() => { const nextInput = document.querySelector(selector); if (nextInput) { nextInput.focus(); nextInput.setSelectionRange(cursor, cursor); } }); };
  const clientSearch = document.querySelector("#clientSearch"); if (clientSearch) clientSearch.addEventListener("input", (event) => preserveSearch(event, "#clientSearch"));
  const jobSearch = document.querySelector("#jobSearch"); if (jobSearch) jobSearch.addEventListener("input", (event) => preserveSearch(event, "#jobSearch"));
  const jobFilter = document.querySelector("#jobFilter"); if (jobFilter) jobFilter.addEventListener("change", (event) => { state.jobFilter = event.target.value; render(); });
  const jobScope = document.querySelector("#jobScope"); if (jobScope) jobScope.addEventListener("change", (event) => { state.jobScope = event.target.value; render(); });
  const businessSelect = document.querySelector("#businessSelect"); if (businessSelect) businessSelect.addEventListener("change", (event) => { state.business = event.target.value; state.view = "dashboard"; render(); showToast(`Switched to ${state.business}.`); });
  const businessSearch = document.querySelector("#businessSearch"); if (businessSearch && businessSelect) businessSearch.addEventListener("input", (event) => { const query = event.target.value.trim().toLowerCase(); const names = [...new Set(sourceRows.map((row) => row.business_name).filter(Boolean))]; const matches = names.filter((name) => name.toLowerCase().includes(query)); businessSelect.innerHTML = matches.length ? matches.map((name) => `<option value="${esc(name)}" ${name === state.business ? "selected" : ""}>${esc(name)}</option>`).join("") : '<option value="" disabled selected>No businesses found</option>'; const meta = document.querySelector("#businessSearchMeta"); if (meta) meta.textContent = `${matches.length} ${matches.length === 1 ? "business" : "businesses"} match${matches.length === 1 ? "" : "es"}. Select one to switch.`; });
  document.querySelectorAll("[data-action='calendar-prev']").forEach((element) => element.addEventListener("click", () => { if (state.calendarMode === "day") state.dayOffset -= 1; else state.weekOffset -= 1; render(); }));
  document.querySelectorAll("[data-action='calendar-next']").forEach((element) => element.addEventListener("click", () => { if (state.calendarMode === "day") state.dayOffset += 1; else state.weekOffset += 1; render(); }));
  document.querySelectorAll("[data-action='calendar-today']").forEach((element) => element.addEventListener("click", () => { state.calendarMode = "week"; state.dayOffset = 0; state.weekOffset = 0; render(); }));
  document.querySelectorAll("[data-action='calendar-day']").forEach((element) => element.addEventListener("click", () => { state.calendarMode = "day"; state.dayOffset = 0; render(); }));
  document.querySelectorAll("[data-action='calendar-week']").forEach((element) => element.addEventListener("click", () => { state.calendarMode = "week"; render(); }));
  const technicianFilter = document.querySelector("#technicianFilter"); if (technicianFilter) technicianFilter.addEventListener("change", (event) => { state.technicianFilter = event.target.value; render(); });
  const priorityFilter = document.querySelector("#priorityFilter"); if (priorityFilter) priorityFilter.addEventListener("change", (event) => { state.priorityFilter = event.target.value; render(); });
  document.querySelectorAll("[data-status]").forEach((element) => element.addEventListener("click", () => { const source = sourceRows.find((row) => row.work_order_number === element.dataset.jobId); if (source) source.status = element.dataset.status; closeModal(); render(); showToast(`Job marked ${element.dataset.status}.`); }));
  document.querySelector(".mobile-menu")?.addEventListener("click", () => document.querySelector(".sidebar")?.classList.toggle("open"));
}

render();
