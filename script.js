  const companySelect = document.getElementById("company-select");

fieldFlowCompanies.forEach(company => {
  const option = document.createElement("option");
  option.value = company.customer_id;
  option.textContent = company.business_name;
  companySelect.appendChild(option);
});

companySelect.addEventListener("change", async () => {
  const selectedCustomerId = companySelect.value;
  const selectedCompany = fieldFlowCompanies.find(
  company => company.customer_id === selectedCustomerId
);

document.getElementById("company-data-note").textContent =
  selectedCompany ?
  `Showing work order activity and operational metrics for ${selectedCompany.business_name}.` :
  "Select a company to view work order activity and operational metrics.";
  const fullFieldFlowJobs = await loadFieldFlowJobsFromWorkbook();
const companyJobs = selectedCustomerId ?
  fullFieldFlowJobs.filter(job => job.customer_id === selectedCustomerId) :
  fullFieldFlowJobs;
  const workOrderDetailsBody = document.getElementById("work-order-details-body");

workOrderDetailsBody.innerHTML = "";

if (companyJobs.length > 0) {
  companyJobs.forEach(job => {
    const row = document.createElement("tr");
    
    const values = [
      job.work_order_number || job.job_id || "N/A",
      job.technician_name || "N/A",
      job.invoice_status === "not_invoiced" ?
  "Not Invoiced" :
  job.invoice_status || "N/A",
      Number(job.customer_rating) >= 1 && Number(job.customer_rating) <= 5 ?
  job.customer_rating :
  "Not rated",
      job.follow_up_date || "N/A",
      job.follow_up_notes || "N/A"
    ];
    
    values.forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });
    
    workOrderDetailsBody.appendChild(row);
  });
} else {
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  
  cell.colSpan = 6;
  cell.textContent = "No work order details available for this company.";
  
  row.appendChild(cell);
  workOrderDetailsBody.appendChild(row);
}
  const datedCompanyJobs = companyJobs
  .filter(job => job.job_date)
  .map(job => ({
    ...job,
    parsedJobDate: new Date(job.job_date + "T00:00:00")
  }));

const latestJobDate =
  datedCompanyJobs.length > 0 ?
  new Date(
    Math.max(
      ...datedCompanyJobs.map(job => job.parsedJobDate.getTime())
    )
  ) :
  null;
  
  const weekSelect = document.getElementById("week-select");
const selectedWeek = weekSelect.value;
weekSelect.innerHTML = '<option value="">Latest week</option>';

const availableWeeks = [
  ...new Set(
    datedCompanyJobs.map(job => {
      const d = new Date(job.parsedJobDate);
      const day = d.getDay();
      const daysToMonday = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + daysToMonday);
      return d.toISOString().slice(0, 10);
    })
  )
].sort().reverse();

availableWeeks.forEach(week => {
  const option = document.createElement("option");
  option.value = week;
  option.textContent = `Week of ${new Date(
    week + "T00:00:00"
  ).toLocaleDateString()}`;
  weekSelect.appendChild(option);
});

weekSelect.value = selectedWeek;
const weekStart = selectedWeek ?
  new Date(selectedWeek + "T00:00:00") :
  latestJobDate ?
  new Date(latestJobDate) :
  null;

if (weekStart) {
  const day = weekStart.getDay();
  const daysToMonday = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + daysToMonday);
}

const weekEnd = weekStart ? new Date(weekStart) : null;

if (weekEnd) {
  weekEnd.setDate(weekStart.getDate() + 6);
}
const weeklyJobs =
  weekStart && weekEnd ?
  datedCompanyJobs.filter(
    job =>
    job.parsedJobDate >= weekStart &&
    job.parsedJobDate <= weekEnd
  ) :
  [];

document.getElementById("week-range").textContent =
  weekStart && weekEnd ?
  `Week of ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}` :
  "No dated work orders available for this company.";
const matchingJobs = selectedWeek ?
  weeklyJobs :
  selectedCustomerId ?
  fullFieldFlowJobs.filter(job => job.customer_id === selectedCustomerId) :
  fullFieldFlowJobs;
  
  const priorityFilter = document.getElementById("priority-filter");
const jobTypeFilter = document.getElementById("job-type-filter");
const technicianFilter = document.getElementById("technician-filter");
const invoiceStatusFilter = document.getElementById("invoice-status-filter");
const ratingFilter = document.getElementById("rating-filter");
const followUpFilter = document.getElementById("follow-up-filter");

const currentFilters = {
  priority: priorityFilter.value,
  jobType: jobTypeFilter.value,
  technician: technicianFilter.value,
  invoiceStatus: invoiceStatusFilter.value,
  rating: ratingFilter.value,
  followUp: followUpFilter.value
};

function populateFilter(select, values, defaultLabel, selectedValue) {
  select.innerHTML = `<option value="">${defaultLabel}</option>`;
  
  [...new Set(values.filter(value => value !== null && value !== undefined && value !== ""))]
  .sort((a, b) => String(a).localeCompare(String(b)))
    .forEach(value => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
  
  if ([...select.options].some(option => option.value === String(selectedValue))) {
    select.value = selectedValue;
  }
}

populateFilter(
  priorityFilter,
  matchingJobs.map(job => job.priority),
  "All priorities",
  currentFilters.priority
);

populateFilter(
  jobTypeFilter,
  matchingJobs.map(job => job.job_type),
  "All job types",
  currentFilters.jobType
);

populateFilter(
  technicianFilter,
  matchingJobs.map(job => job.technician_name),
  "All technicians",
  currentFilters.technician
);

populateFilter(
  invoiceStatusFilter,
  matchingJobs.map(job => job.invoice_status),
  "All invoice statuses",
  currentFilters.invoiceStatus
);

populateFilter(
  ratingFilter,
  matchingJobs.map(job => job.customer_rating),
  "All ratings",
  currentFilters.rating
);

const filteredInsightJobs = matchingJobs.filter(job => {
  const hasFollowUp =
    Boolean(job.follow_up_date) ||
    Boolean(job.follow_up_notes);
  
  return (
    (!priorityFilter.value || String(job.priority) === priorityFilter.value) &&
    (!jobTypeFilter.value || String(job.job_type) === jobTypeFilter.value) &&
    (!technicianFilter.value || String(job.technician_name) === technicianFilter.value) &&
    (!invoiceStatusFilter.value || String(job.invoice_status) === invoiceStatusFilter.value) &&
    (!ratingFilter.value || String(job.customer_rating) === ratingFilter.value) &&
    (
      !followUpFilter.value ||
      (followUpFilter.value === "needed" && hasFollowUp) ||
      (followUpFilter.value === "none" && !hasFollowUp)
    )
  );
});
workOrderDetailsBody.innerHTML = "";

if (filteredInsightJobs.length > 0) {
  filteredInsightJobs.forEach(job => {
    const row = document.createElement("tr");
    
    const values = [
      job.work_order_number || job.job_id || "N/A",
      job.technician_name || "N/A",
      job.invoice_status || "N/A",
      Number(job.customer_rating) >= 1 && Number(job.customer_rating) <= 5 ?
  job.customer_rating :
  "Not rated",
      job.follow_up_date || "N/A",
      job.follow_up_notes || "N/A"
    ];
    
    values.forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });
    
    workOrderDetailsBody.appendChild(row);
  });
} else {
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  
  cell.colSpan = 6;
  cell.textContent = "No work order details available for the current filters.";
  
  row.appendChild(cell);
  workOrderDetailsBody.appendChild(row);
}
const invoiceCounts = filteredInsightJobs.reduce((counts, job) => {
  const status = job.invoice_status || "Unknown";
  counts[status] = (counts[status] || 0) + 1;
  return counts;
}, {});

const ratingCounts = filteredInsightJobs.reduce((counts, job) => {
  const rating = Number(job.customer_rating);
  
  if (rating >= 1 && rating <= 5) {
    const label = `${rating}`;
    counts[label] = (counts[label] || 0) + 1;
  }
  
  return counts;
}, {});

const validRatings = filteredInsightJobs
  .map(job => Number(job.customer_rating))
  .filter(rating => rating >= 1 && rating <= 5);

const averageRating =
  validRatings.length > 0 ?
  (validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length).toFixed(1) :
  "N/A";

document.getElementById("average-rating").textContent =
  averageRating === "N/A" ? "N/A" : `${averageRating} / 5`;

document.getElementById("rated-work-orders").textContent =
  `${validRatings.length} of ${filteredInsightJobs.length}`;

const invoiceChart = document.getElementById("invoice-status-chart");

if (Object.keys(invoiceCounts).length > 0) {
  const maxInvoiceCount = Math.max(...Object.values(invoiceCounts));
  
  invoiceChart.innerHTML = Object.entries(invoiceCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => {
      const width = maxInvoiceCount > 0 ?
        Math.round((count / maxInvoiceCount) * 100) :
        0;
      
      const label = status
        .replaceAll("_", " ")
        .replace(/\b\w/g, letter => letter.toUpperCase());
      
      return `
        <div class="insight-bar-row">
          <div class="insight-bar-label">
            <span>${label}</span>
            <strong>${count}</strong>
          </div>
          <div class="insight-bar-track">
            <div class="insight-bar-fill" style="width: ${width}%"></div>
          </div>
        </div>
      `;
    })
    .join("");
} else {
  invoiceChart.innerHTML =
    '<p class="no-insight-data">No invoice-status data for the current filters.</p>';
}


const ratingChart = document.getElementById("customer-rating-chart");

if (Object.keys(ratingCounts).length > 0) {
  const maxRatingCount = Math.max(...Object.values(ratingCounts));
  
  ratingChart.innerHTML = Object.entries(ratingCounts)
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([rating, count]) => {
      const width = maxRatingCount > 0 ?
        Math.round((count / maxRatingCount) * 100) :
        0;
      
      return `
        <div class="insight-bar-row">
          <div class="insight-bar-label">
            <span>${rating} star</span>
            <strong>${count}</strong>
          </div>
          <div class="insight-bar-track">
            <div class="insight-bar-fill" style="width: ${width}%"></div>
          </div>
        </div>
      `;
    })
    .join("");
} else {
  ratingChart.innerHTML =
    '<p class="no-insight-data">No customer-rating data for the current filters.</p>';
}
    const jobTypeCounts = matchingJobs.reduce((counts, job) => {
  counts[job.job_type] = (counts[job.job_type] || 0) + 1;
  return counts;
}, {});

const jobTypeEntries = Object.entries(jobTypeCounts);

const jobTypeBreakdown = document.getElementById("job-type-breakdown");

if (jobTypeEntries.length > 0) {
  const maxJobTypeCount = Math.max(...jobTypeEntries.map(([, count]) => count));
  
  jobTypeBreakdown.innerHTML = jobTypeEntries
    .sort((a, b) => b[1] - a[1])
    .map(([jobType, count]) => {
      const width = Math.round((count / maxJobTypeCount) * 100);
      
      return `
        <div class="insight-bar-row">
          <div class="insight-bar-label">
            <span>${jobType}</span>
            <strong>${count}</strong>
          </div>
          <div class="insight-bar-track">
            <div class="insight-bar-fill" style="width: ${width}%"></div>
          </div>
        </div>
      `;
    })
    .join("");
} else {
  jobTypeBreakdown.innerHTML =
    '<p class="no-insight-data">No job type data available for the current filters.</p>';
}
  document.getElementById("total-work-orders").textContent = filteredInsightJobs.length;
  const completedJobs = filteredInsightJobs.filter(
  job => job.status === "completed"
).length;

document.getElementById("completed-work-orders").textContent = completedJobs;
const scheduledJobs = filteredInsightJobs.filter(
  job => job.status === "scheduled"
).length;

document.getElementById("scheduled-jobs").textContent = scheduledJobs;
const canceledJobs = filteredInsightJobs.filter(
  job => job.status === "canceled"
).length;

document.getElementById("canceled-jobs").textContent = canceledJobs;
  document.getElementById("fieldflow-jobs").textContent =
    matchingJobs.length > 0 ?
    matchingJobs
    .map(job => `${job.job_date} | ${job.job_type} | ${job.status.toUpperCase()}`)
    .join("\n") :
    "No job activity available for this company yet.";
const jobCompletionRate =
  matchingJobs.length > 0 ?
  (completedJobs / matchingJobs.length) * 100 :
  0;

document.getElementById("completion-rate").textContent =
  jobCompletionRate.toFixed(1) + "%";
const canceledRate =
  matchingJobs.length > 0 ?
  (canceledJobs / matchingJobs.length) * 100 :
  0;
  document.getElementById("canceled-rate").textContent = canceledRate.toFixed(1) + "%";
  const totalLaborHours = matchingJobs.reduce(
  (sum, job) => sum + (Number(job.labor_hours) || 0),
  0
);

document.getElementById("total-labor-hours").textContent =
  matchingJobs.some(job => job.labor_hours !== undefined) ?
  totalLaborHours.toFixed(2) :
  "N/A";
const totalEstimatedCost = matchingJobs.reduce(
  (sum, job) => sum + (Number(job.estimated_cost) || 0),
  0
);

document.getElementById("total-estimated-cost").textContent =
  matchingJobs.some(job => job.estimated_cost !== undefined) ?
  "$" + totalEstimatedCost.toFixed(2) :
  "N/A";
const totalActualCost = matchingJobs.reduce(
  (sum, job) => sum + (Number(job.actual_cost) || 0),
  0
);

document.getElementById("total-actual-cost").textContent =
  matchingJobs.some(job => job.actual_cost !== undefined && job.actual_cost !== null) ?
  "$" + totalActualCost.toFixed(2) :
  "N/A";
const costVariance = totalEstimatedCost - totalActualCost;

document.getElementById("cost-variance").textContent =
  matchingJobs.some(job => job.estimated_cost !== undefined && job.actual_cost !== undefined) ?
  costVariance > 0 ?
  "$" + Math.abs(costVariance).toFixed(2) + " Under Estimate" :
  costVariance < 0 ?
  "$" + Math.abs(costVariance).toFixed(2) + " Over Estimate" :
  "$0.00 On Estimate" :
  "N/A";
const routinePriorityWorkOrders = matchingJobs.filter(
  job => job.priority === "routine"
).length;

document.getElementById("routine-priority-work-orders").textContent =
  routinePriorityWorkOrders;
const completedJobsForCost = matchingJobs.filter(
  job => job.status === "completed" && job.actual_cost !== undefined
);

const averageCostPerWorkOrder =
  completedJobsForCost.length > 0 ?
  completedJobsForCost.reduce(
    (sum, job) => sum + (Number(job.actual_cost) || 0),
    0
  ) / completedJobsForCost.length :
  null;

document.getElementById("average-cost-per-work-order").textContent =
  averageCostPerWorkOrder !== null ?
  "$" + averageCostPerWorkOrder.toFixed(2) :
  "N/A";
const completedJobsForLabor = matchingJobs.filter(
  job => job.status === "completed" && job.labor_hours !== undefined
);

const averageLaborHours =
  completedJobsForLabor.length > 0 ?
  completedJobsForLabor.reduce(
    (sum, job) => sum + (Number(job.labor_hours) || 0),
    0
  ) / completedJobsForLabor.length :
  null;

document.getElementById("average-labor-hours").textContent =
  averageLaborHours !== null ?
  averageLaborHours.toFixed(2) :
  "N/A";
const totalDue = matchingJobs.reduce(
  (sum, job) => sum + (Number(job.total_due) || 0),
  0
);

document.getElementById("total-due").textContent =
  matchingJobs.some(job => job.total_due !== undefined) ?
  "$" + totalDue.toFixed(2) :
  "N/A";
const totalCollected = matchingJobs.reduce(
  (sum, job) => sum + (Number(job.total_paid_to_date) || 0),
  0
);

document.getElementById("total-collected").textContent =
  matchingJobs.some(job => job.total_paid_to_date !== undefined) ?
  "$" + totalCollected.toFixed(2) :
  "N/A";
document.getElementById("outstanding-balance").textContent =
  matchingJobs.some(job => job.total_due !== undefined && job.total_paid_to_date !== undefined) ?
  "$" + (totalDue - totalCollected).toFixed(2) :
  "N/A";
const uniqueClients = [
  ...new Set(
    matchingJobs
    .map(job => job.client_name)
    .filter(name => name)
  )
];

document.getElementById("client-activity").textContent =
  uniqueClients.length > 0 ?
  `${uniqueClients.length} unique clients` :
  "No client activity available for this company.";
  
});
document.getElementById("week-select").addEventListener("change", () => {
  companySelect.dispatchEvent(new Event("change"));
});

[
  "priority-filter",
  "job-type-filter",
  "technician-filter",
  "invoice-status-filter",
  "rating-filter",
  "follow-up-filter"
].forEach(id => {
  document.getElementById(id).addEventListener("change", () => {
    companySelect.dispatchEvent(new Event("change"));
  });
});
document.getElementById("reset-detail-filters").addEventListener("click", () => {
  [
    "priority-filter",
    "job-type-filter",
    "technician-filter",
    "invoice-status-filter",
    "rating-filter",
    "follow-up-filter"
  ].forEach(id => {
    document.getElementById(id).value = "";
  });
  
  companySelect.dispatchEvent(new Event("change"));
});