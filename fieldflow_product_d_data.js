const fieldFlowCustomerIds = {
  "Bright Spark Electric": "cust_00001",
  "Reliable Rooter Plumbing": "cust_00002",
  "Spotless Sweep Cleaning Co.": "cust_00003",
  "Solo Circuit Electrical": "cust_00004",
  "Northside Plumbing & Drain": "cust_00005",
  "Fresh Start Home Cleaning": "cust_00006",
  "Cool Breeze HVAC": "cust_00007",
  "Green Thumb Landscaping": "cust_00008",
  "Handy Hank's Repairs": "cust_00009",
  "TrueLine Painting": "cust_00010",
  "Metro Electric Solutions": "cust_00011",
  "Pipeline Pros Plumbing": "cust_00012",
  "Sparkle & Shine Cleaners": "cust_00013",
  "All Seasons HVAC": "cust_00014",
  "Regional Comfort Systems": "cust_00015",
  "Curb Appeal Landscaping Group": "cust_00016",
  "One Call Handyman Services": "cust_00017",
  "Precision Painters LLC": "cust_00018",
  "Downtown Drain Doctors": "cust_00019",
  "Citywide Cleaning Solutions": "cust_00020",
  "Ironclad Electric": "cust_00021",
  "Neighborhood Plumbing Co.": "cust_00022",
  "Cascade Home Services": "cust_00023",
  "Meridian Home Solutions": "cust_00024",
  "Vantage Group Home Services": "cust_00025"
};

async function loadFieldFlowJobsFromWorkbook() {
  async function loadWorkbook(fileName, preferredSheetName) {
    const response = await fetch(fileName);

    if (!response.ok) {
      throw new Error(`Could not load ${fileName}`);
    }

    const buffer = await response.arrayBuffer();

    const workbook = XLSX.read(buffer, {
      type: "array",
      cellDates: true
    });

    const sheet =
      workbook.Sheets[preferredSheetName] ||
      workbook.Sheets[workbook.SheetNames[0]];

    return XLSX.utils.sheet_to_json(sheet, {
      defval: null,
      raw: true
    });
  }

  const [contractorRows, syntheticRows] = await Promise.all([
    loadWorkbook(
      "./updated contractors dataset.xlsx",
      "contractors-flat.csv"
    ),
    loadWorkbook(
      "./synthetic dataset.xlsx",
      "businesses-flat.csv"
    )
  ]);

  const allRows = [...contractorRows, ...syntheticRows];

  const jobs = allRows.map((row, index) => {
    let jobDate = row.job_date;

    if (jobDate instanceof Date) {
      jobDate = jobDate.toISOString().slice(0, 10);
    }

    return {
      ...row,
      job_id:
        row.work_order_number ||
        `job_${String(index + 1).padStart(6, "0")}`,
      customer_id:
        fieldFlowCustomerIds[row.business_name] || null,
      job_date: jobDate
    };
  });

  console.log(
    "FieldFlow jobs loaded:",
    jobs.length,
    "Contractors:",
    contractorRows.length,
    "Synthetic:",
    syntheticRows.length
  );

  return jobs;
}