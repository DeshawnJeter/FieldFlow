const express = require('express');
const fs = require('fs');
const path = require('path');
const { intents, accountIntents } = require('./chatbot/intents');

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function loadCSVFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = content.trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = parseCSVLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });
}

function loadAllDatasets() {
  const dataDir = path.join(__dirname, 'data');
  const csvFiles = fs.readdirSync(dataDir).filter(f => f.toLowerCase().endsWith('.csv'));

  const seen = new Set();
  const merged = [];

  for (const file of csvFiles) {
    try {
      const records = loadCSVFile(path.join(dataDir, file));
      let added = 0;
      for (const record of records) {
        const key = record.work_order_number || JSON.stringify(record);
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(record);
          added++;
        }
      }
      console.log(`Loaded ${file}: ${records.length} records (${added} new after dedup)`);
    } catch (e) {
      console.error(`Could not load ${file}:`, e.message);
    }
  }

  return merged;
}

let dataset = [];
try {
  dataset = loadAllDatasets();
  console.log(`Total records in memory: ${dataset.length}`);
} catch (e) {
  console.error('Could not load datasets:', e.message);
}

app.get('/api/businesses', (req, res) => {
  const names = [...new Set(dataset.map(r => r.business_name).filter(Boolean))].sort();
  res.json(names);
});

function matchIntent(message) {
  const lower = message.toLowerCase();

  for (const intent of accountIntents) {
    if (intent.patterns.some(p => lower.includes(p))) {
      return { type: 'account', name: intent.name };
    }
  }

  for (const intent of intents) {
    if (intent.name === 'fallback') continue;
    if (intent.patterns.some(p => lower.includes(p))) {
      return { type: 'faq', intent };
    }
  }

  return { type: 'faq', intent: intents.find(i => i.name === 'fallback') };
}

function buildAccountResponse(intentName, businessName) {
  const records = dataset.filter(r => r.business_name === businessName);

  if (!records.length) {
    return {
      text: `I couldn't find account data for **${businessName}**. Please make sure you're logged in with the correct business.`,
      suggestions: ['How do I contact support?']
    };
  }

  const plan = records[0].plan_name || 'Unknown';
  const trade = records[0].trade || '';

  if (intentName === 'account_plan') {
    const planDetails = {
      Starter: 'Up to 3 team members — basic scheduling, client list, and invoicing.',
      Pro: 'Up to 10 team members — scheduling, analytics, priority support, and recurring job templates.',
      Growth: 'Unlimited team members — advanced reporting, API access, and a dedicated account manager.'
    };
    return {
      text: `**${businessName}** is on the **${plan}** plan.\n\n${planDetails[plan] || ''}\n\nTo change your plan, go to **Settings → Billing**.`,
      suggestions: ['Tell me about other plans', 'Show my recent jobs', 'Show my account summary']
    };
  }

  if (intentName === 'account_recent_jobs') {
    const sorted = [...records]
      .sort((a, b) => new Date(b.job_date) - new Date(a.job_date))
      .slice(0, 5);
    const jobList = sorted
      .map(r => `• **${r.job_type}** — ${r.job_date} (${r.status})`)
      .join('\n');
    return {
      text: `Here are your 5 most recent jobs:\n\n${jobList}`,
      suggestions: ['Show my account summary', 'What plan am I on?', 'How do I schedule a job?']
    };
  }

  if (intentName === 'account_summary') {
    const totalJobs = records.length;
    const completed = records.filter(r => r.status === 'completed').length;
    const uniqueClients = [...new Set(records.map(r => r.client_name))].length;
    const totalRevenue = records.reduce((sum, r) => sum + (parseFloat(r.total_paid_to_date) || 0), 0);
    return {
      text: `**Account Summary — ${businessName}**\n\n• **Trade:** ${trade}\n• **Plan:** ${plan}\n• **Total Jobs:** ${totalJobs}\n• **Completed:** ${completed}\n• **Unique Clients:** ${uniqueClients}\n• **Total Revenue:** $${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      suggestions: ['Show my recent jobs', 'What plan am I on?', 'How do I schedule a job?']
    };
  }

  if (intentName === 'account_clients') {
    const uniqueClients = [...new Set(records.map(r => r.client_name))];
    const repeatClients = uniqueClients.filter(c => records.filter(r => r.client_name === c).length > 1);
    return {
      text: `**${businessName}** has **${uniqueClients.length} unique clients** across all jobs.\n\n**${repeatClients.length}** of them are repeat customers (more than one job recorded).`,
      suggestions: ['How do I add a client?', 'Show my recent jobs', 'Show my account summary']
    };
  }

  if (intentName === 'account_revenue') {
    const totalRevenue = records.reduce((sum, r) => sum + (parseFloat(r.total_paid_to_date) || 0), 0);
    const unpaidAmount = records
      .filter(r => r.invoice_status === 'unpaid')
      .reduce((sum, r) => sum + (parseFloat(r.total_due) || 0), 0);
    return {
      text: `**Revenue Summary — ${businessName}**\n\n• **Total Collected:** $${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n• **Outstanding (unpaid):** $${unpaidAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n• **Total Jobs:** ${records.length}`,
      suggestions: ['How do I send an invoice?', 'Show my recent jobs', 'Show my account summary']
    };
  }

  return {
    text: `I found your account but couldn't process that specific request. Try asking about your plan, recent jobs, clients, or revenue.`,
    suggestions: ['What plan am I on?', 'Show my recent jobs', 'My clients', 'My revenue']
  };
}

app.post('/api/chat', (req, res) => {
  const { message, businessName } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }

  const match = matchIntent(message);

  if (match.type === 'account') {
    if (!businessName) {
      return res.json({
        text: "To look up your account info, please sign in first by selecting your business name on the login screen.",
        suggestions: ['How do I schedule a job?', 'What plans are available?']
      });
    }
    return res.json(buildAccountResponse(match.name, businessName));
  }

  const { intent } = match;
  return res.json({
    text: intent.response,
    suggestions: intent.suggestions || []
  });
});

app.listen(PORT, () => {
  console.log(`FieldFlow Chatbot running at http://localhost:${PORT}`);
});
