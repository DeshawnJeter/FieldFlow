const intents = [
  {
    name: 'greeting',
    patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'howdy'],
    response: "Hi there! I'm the FieldFlow support bot. I can help you get set up, answer how-to questions, or look up info about your account.\n\nWhat can I help you with today?",
    suggestions: ['How do I schedule a job?', 'What plan am I on?', 'How do I add a client?', 'Show my recent jobs']
  },
  {
    name: 'how_to_schedule',
    patterns: ['schedule', 'book', 'new job', 'add job', 'create job', 'appointment'],
    response: "To schedule a job in FieldFlow:\n\n1. Go to the **Schedule** tab in the main navigation.\n2. Click **+ New Job** in the top right.\n3. Select the date, time, and job type.\n4. Search for an existing client or add a new one.\n5. Add any notes, then click **Save Job**.\n\nThe job will appear on your weekly calendar right away.",
    suggestions: ['How do I edit a job?', 'How do I cancel a job?', 'How do I add a client?']
  },
  {
    name: 'how_to_edit_job',
    patterns: ['edit job', 'update job', 'change job', 'modify job', 'reschedule'],
    response: "To edit a scheduled job:\n\n1. Open the **Schedule** tab.\n2. Click on the job you want to update.\n3. Click the **Edit** (pencil) icon in the job detail panel.\n4. Change the date, time, client, or notes as needed.\n5. Click **Save Changes** when done.",
    suggestions: ['How do I cancel a job?', 'How do I schedule a job?']
  },
  {
    name: 'how_to_cancel_job',
    patterns: ['cancel job', 'delete job', 'remove job', 'cancel appointment'],
    response: "To cancel a job:\n\n1. Open the **Schedule** tab and find the job.\n2. Click the job to open its detail panel.\n3. Scroll to the bottom and click **Cancel Job**.\n4. Confirm when prompted.\n\nCancelled jobs stay in your history for record-keeping — they won't show on your active calendar.",
    suggestions: ['How do I schedule a new job?', 'How do I view my calendar?']
  },
  {
    name: 'how_to_add_client',
    patterns: ['add client', 'new client', 'create client', 'add customer', 'new customer'],
    response: "To add a new client:\n\n1. Go to the **Clients** tab.\n2. Click **+ Add Client**.\n3. Enter their name, phone number, address, and any notes.\n4. Click **Save**.\n\nOnce saved, you can select them when scheduling a new job.",
    suggestions: ['How do I schedule a job?', 'How do I view my clients?']
  },
  {
    name: 'how_to_view_clients',
    patterns: ['view client', 'see clients', 'client list', 'find client', 'search client', 'my customers'],
    response: "To view your client list:\n\n1. Click the **Clients** tab in the main navigation.\n2. All your clients are listed with their name, contact info, and last job date.\n3. Use the search bar at the top to find a specific client quickly.\n4. Click any client to see their full job history with you.",
    suggestions: ['How do I add a client?', 'Show my recent jobs']
  },
  {
    name: 'how_to_invoice',
    patterns: ['invoice', 'billing', 'charge', 'payment', 'bill ', 'pay ', 'send invoice', 'create invoice'],
    response: "To create and send an invoice:\n\n1. Open the **Schedule** tab and click on a completed job.\n2. Click **Create Invoice** in the job detail panel.\n3. Review the job details and cost — you can adjust the amount if needed.\n4. Click **Send Invoice** to email it to your client, or **Download PDF** to send it yourself.\n\nInvoice statuses (Unpaid, Paid, Overdue) update automatically as payments come in.",
    suggestions: ['How do I view payment history?', 'What plan am I on?', 'Show my recent jobs']
  },
  {
    name: 'how_to_calendar',
    patterns: ['calendar', 'view schedule', 'upcoming jobs', 'week view', 'see schedule', 'my schedule'],
    response: "Your weekly calendar is the default view when you open FieldFlow.\n\n- **Week view** shows all your jobs laid out by day and time.\n- Click any job block to see its details.\n- Use the **< >** arrows to move between weeks.\n- Tap **Today** to jump back to the current week.\n\nYou can also switch to a **List view** using the toggle in the top right.",
    suggestions: ['How do I schedule a job?', 'How do I edit a job?']
  },
  {
    name: 'plans_info',
    patterns: ['plans info', 'what plans', 'tell me about plans', 'other plans', 'compare plans', 'pricing', 'upgrade', 'downgrade', 'tier'],
    response: "FieldFlow offers three plans:\n\n**Starter** — Up to 3 team members. Basic scheduling, client list, and invoicing.\n\n**Pro** — Up to 10 team members. Everything in Starter plus analytics, recurring job templates, and priority support.\n\n**Growth** — Unlimited team members. Everything in Pro plus advanced reporting, API access, and a dedicated account manager.\n\nTo change your plan, go to **Settings → Billing**. Changes take effect at your next billing cycle.",
    suggestions: ['What plan am I on?', 'How do I contact support?']
  },
  {
    name: 'how_to_settings',
    patterns: ['settings', 'profile', 'change password', 'notifications', 'account settings', 'my profile'],
    response: "To access your settings:\n\n1. Click your **business name** or the gear icon in the bottom-left corner.\n2. From there you can update your:\n   - Business name and contact info\n   - Password and login email\n   - Notification preferences\n   - Billing and plan details\n   - Team members (Pro and Growth plans)",
    suggestions: ['What plan am I on?', 'How do I add a team member?']
  },
  {
    name: 'how_to_team',
    patterns: ['team member', 'add user', 'invite', 'technician', 'crew', 'staff', 'add employee'],
    response: "To add a team member (Pro and Growth plans only):\n\n1. Go to **Settings → Team**.\n2. Click **Invite Member**.\n3. Enter their name and email address.\n4. Choose their role: **Admin** (full access) or **Technician** (scheduling and jobs only).\n5. They'll receive an email invite to create their login.\n\nStarter plan supports 1 user. Upgrade to Pro to add your crew.",
    suggestions: ['What plan am I on?', 'How do I upgrade my plan?']
  },
  {
    name: 'contact_support',
    patterns: ['support', 'contact', 'help desk', 'reach out', 'talk to someone', 'email support', 'phone support'],
    response: "Need to reach the FieldFlow team?\n\n- **In-app chat**: Click the chat bubble in the bottom-right corner of any screen.\n- **Email**: support@fieldflow.io (response within 1 business day)\n- **Help Center**: Visit help.fieldflow.io for articles, videos, and tutorials.\n\nPro and Growth customers can call our priority support line listed in their account settings.",
    suggestions: ['What plan am I on?', 'How do I get started?']
  },
  {
    name: 'getting_started',
    patterns: ['get started', 'setup', 'onboard', 'first time', 'new user', 'how do i start', 'beginning', 'just signed up'],
    response: "Welcome to FieldFlow! Here's how to get set up in 3 steps:\n\n**Step 1:** Add your first client — go to the **Clients** tab and click **+ Add Client**.\n\n**Step 2:** Schedule your first job — go to **Schedule**, click **+ New Job**, pick a date, and select the client you just added.\n\n**Step 3:** After the job, create an invoice — open the job and click **Create Invoice** to bill your client.\n\nThat's the core loop. Want me to walk you through any of these in more detail?",
    suggestions: ['How do I add a client?', 'How do I schedule a job?', 'How do I send an invoice?']
  },
  {
    name: 'fallback',
    patterns: [],
    response: "I'm not sure I understood that. I can help you with:\n\n- Scheduling and managing jobs\n- Adding and viewing clients\n- Creating and sending invoices\n- Understanding your plan options\n- Looking up your account info\n\nTry rephrasing, or pick one of the suggestions below.",
    suggestions: ['How do I schedule a job?', 'What plan am I on?', 'Show my recent jobs', 'How do I add a client?']
  }
];

const accountIntents = [
  {
    name: 'account_plan',
    patterns: ['my plan', 'what plan', 'current plan', 'my subscription', 'my tier', 'plan am i', 'which plan']
  },
  {
    name: 'account_recent_jobs',
    patterns: ['my jobs', 'recent jobs', 'recent activity', 'last job', 'job history', 'my recent', 'show my jobs', 'latest jobs']
  },
  {
    name: 'account_summary',
    patterns: ['my account', 'account info', 'account summary', 'my info', 'my business', 'show my account']
  },
  {
    name: 'account_clients',
    patterns: ['my clients', 'my customers', 'how many clients', 'client count', 'number of clients']
  },
  {
    name: 'account_revenue',
    patterns: ['my revenue', 'my earnings', 'how much have i made', 'total revenue', 'my income', 'money i made']
  }
];

module.exports = { intents, accountIntents };
