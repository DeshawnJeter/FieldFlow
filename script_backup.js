const fieldFlowData = [
  {
    FieldFlow_Code: "PE1001",
    Company_Name: "Powerteam Electric",
    Customer_Name: "Alice Adams",
    Project_Name: "Rewire Kitchen",
  Client_Type: "New",
  Project_Stage: "contract sign",
 Completion_Percentage: 0,
  Week_Start_Date: "2026-08-17"
  },
  {
    FieldFlow_Code: "PE1001",
    Company_Name: "Powerteam Electric",
    Customer_Name: "Bob Brown",
    Project_Name: "Panel Upgrade",
  Client_Type: "Returning",
  Project_Stage: "work in progress",
  Completion_Percentage: 0.5,
  Week_Start_Date: "2026-08-17"
  },
  {
    FieldFlow_Code: "PE1001",
    Company_Name: "Powerteam Electric",
    Customer_Name: "Carol Clark",
    Project_Name: "Lighting Installation",
  Client_Type: "New",
  Project_Stage: "design stages indicated",
 Completion_Percentage: 0.1,
  Week_Start_Date: "2026-08-17"
  }
];
const confirmedFieldFlowData = [
  {
    work_order_number: "WO-2026-00001",
    job_date: "2026-04-15",
    status: "completed",
    priority: "routine",
    labor_hours: 3.05,
    estimated_cost: 92.81,
    actual_cost: 84.57,
    technician_name: "Tariq Silva",
   invoice_status: "paid",
  total_due: 91.76,
  total_paid_to_date: 91.76 
  },
  {
    work_order_number: "WO-2026-00002",
    job_date: "2026-05-27",
    status: "completed",
    priority: "routine",
    labor_hours: 4.21,
    estimated_cost: 567.35,
    actual_cost: 573.21,
    technician_name: "Tariq Silva",
  invoice_status: "paid",
  total_due: 621.93,
  total_paid_to_date: 621.93
  },
  {
    work_order_number: "WO-2026-00006",
    job_date: "2026-02-14",
    status: "canceled",
    priority: "routine",
    labor_hours: 3.66,
    estimated_cost: 467.37,
    actual_cost: 0,
    technician_name: "Tariq Silva",
  invoice_status: "not_invoiced",
  total_due: 0,
  total_paid_to_date: 0
  }
];
const totalWorkOrders = confirmedFieldFlowData.length;

const totalLaborHours = confirmedFieldFlowData.reduce(
  (total, record) => total + record.labor_hours,
  0
);
const totalEstimatedCost = confirmedFieldFlowData.reduce(
  (total, record) => total + record.estimated_cost,
  0
);
const totalActualCost = confirmedFieldFlowData.reduce(
  (total, record) => total + record.actual_cost,
  0
);
const totalDue = confirmedFieldFlowData.reduce(
  (total, record) => total + record.total_due,
  0
);

const totalCollected = confirmedFieldFlowData.reduce(
  (total, record) => total + record.total_paid_to_date,
  0
);

const outstandingBalance = totalDue - totalCollected;
const costVariance = totalEstimatedCost - totalActualCost;
const averageCostPerWorkOrder =
  totalWorkOrders > 0 ? totalActualCost / totalWorkOrders : 0;
  const averageLaborHours =
  totalWorkOrders > 0 ? totalLaborHours / totalWorkOrders : 0;
  const routinePriorityWorkOrders = confirmedFieldFlowData.filter(
  record => record.priority === "routine"
).length;
  const completedWorkOrders = confirmedFieldFlowData.filter(
  record => record.status === "completed"
).length;
const completionRate = (completedWorkOrders / totalWorkOrders) * 100;
document.getElementById("completed-work-orders").textContent =
  completedWorkOrders;




document.getElementById("total-work-orders").textContent = totalWorkOrders;
document.getElementById("total-labor-hours").textContent = totalLaborHours.toFixed(2);
document.getElementById("total-estimated-cost").textContent = "$" + totalEstimatedCost.toFixed(2);
document.getElementById("routine-priority-work-orders").textContent = routinePriorityWorkOrders;
document.getElementById("total-actual-cost").textContent = "$" + totalActualCost.toFixed(2);
document.getElementById("total-due").textContent =
  "$" + totalDue.toFixed(2);

document.getElementById("total-collected").textContent =
  "$" + totalCollected.toFixed(2);

document.getElementById("outstanding-balance").textContent =
  "$" + outstandingBalance.toFixed(2);
document.getElementById("average-cost-per-work-order").textContent =
  "$" + averageCostPerWorkOrder.toFixed(2);
  document.getElementById("average-labor-hours").textContent =
  averageLaborHours.toFixed(2);
document.getElementById("cost-variance").textContent = "$" + costVariance.toFixed(2);
document.getElementById("completion-rate").textContent = completionRate.toFixed(1) + "%";

  

document.getElementById("fieldflow-jobs").textContent =
  fieldFlowJobs
  .map(job => `${job.job_date} | ${job.job_type} | ${job.status.toUpperCase()}`)
  .join("\n");
  
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
  `Showing available job activity for ${selectedCompany.business_name}. Detailed company metrics will populate when full analytics data is available.` :
  "Detailed company metrics will populate when full analytics data is available.";
  const fullFieldFlowJobs = await loadFieldFlowJobsFromWorkbook();
const companyJobs = selectedCustomerId ?
  fullFieldFlowJobs.filter(job => job.customer_id === selectedCustomerId) :
  fullFieldFlowJobs;
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
  const weekStart = latestJobDate ? new Date(latestJobDate) : null;

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
const matchingJobs = selectedCustomerId ?
  fullFieldFlowJobs.filter(job => job.customer_id === selectedCustomerId) :
  fullFieldFlowJobs;
    const jobTypeCounts = matchingJobs.reduce((counts, job) => {
  counts[job.job_type] = (counts[job.job_type] || 0) + 1;
  return counts;
}, {});

const jobTypeBreakdown =
  matchingJobs.length > 0 ?
  Object.entries(jobTypeCounts)
  .map(([jobType, count]) => `${jobType} — ${count}`)
  .join(" • ") :
  "No job type data available for this company yet.";

document.getElementById("job-type-breakdown").textContent = jobTypeBreakdown;
  document.getElementById("total-work-orders").textContent = matchingJobs.length;
  const completedJobs = matchingJobs.filter(
  job => job.status === "completed"
).length;

document.getElementById("completed-work-orders").textContent = completedJobs;
const scheduledJobs = matchingJobs.filter(
  job => job.status === "scheduled"
).length;

document.getElementById("scheduled-jobs").textContent = scheduledJobs;
const canceledJobs = matchingJobs.filter(
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
  "$" + costVariance.toFixed(2) :
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
