import { escapeXML } from "./utils.js";

const STATUSES = ["Scheduled", "In progress", "Completed"];
let jobs = JSON.parse(localStorage.getItem("ff_jobs") || "[]");

function saveJobs() {
  localStorage.setItem("ff_jobs", JSON.stringify(jobs));
}

function renderJobList() {
  const el = document.getElementById("job-list");
  if (!jobs.length) {
    el.innerHTML = `<p class="card-sub">No jobs yet — create one above.</p>`;
    return;
  }
  el.innerHTML = jobs.map((job, i) => `
    <div class="alert-row" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
      <div>
        <strong>${escapeXML(job.title)}</strong> — ${escapeXML(job.client)}
        <div class="card-sub">${escapeXML(job.date)}</div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <select data-idx="${i}" class="status-select">
          ${STATUSES.map(s => `<option value="${s}" ${s === job.status ? "selected" : ""}>${s}</option>`).join("")}
        </select>
        <button data-idx="${i}" class="delete-job">✕</button>
      </div>
    </div>
  `).join("");

  el.querySelectorAll(".status-select").forEach(sel => {
    sel.addEventListener("change", e => {
      const idx = +e.target.dataset.idx;
      jobs[idx].status = e.target.value;
      saveJobs();
      renderJobList();
    });
  });

  el.querySelectorAll(".delete-job").forEach(btn => {
    btn.addEventListener("click", e => {
      const idx = +e.target.dataset.idx;
      jobs.splice(idx, 1);
      saveJobs();
      renderJobList();
    });
  });
}

document.getElementById("job-form").addEventListener("submit", e => {
  e.preventDefault();
  jobs.push({
    title: document.getElementById("job-title").value,
    client: document.getElementById("job-client").value,
    date: document.getElementById("job-date").value,
    status: "Scheduled"
  });
  saveJobs();
  renderJobList();
  e.target.reset();
});

renderJobList();
