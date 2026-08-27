# FieldFlow Support Chatbot — Product Docs
**Product C | FieldFlow L1 Cycle 4**

---

## Overview

The FieldFlow Support Chatbot is a fullstack web application that gives contractor customers an instant way to get onboarding help and look up their own account data — without emailing support and waiting.

It handles two categories of requests:
1. **FAQ / how-to** — Predetermined step-by-step answers about using FieldFlow
2. **Account lookups** — Live data pulled from the contractor's job history (plan, jobs, clients, revenue)

---

## How to Run

```bash
cd fieldflow-chatbot-main
npm install       # first time only
node server.js
```

Open **http://localhost:3001** in your browser.

---

## User Flow

1. **Login screen** — Contractor selects their business name from the dropdown and clicks **Start Chat**.
2. **Chat screen** — The bot greets them by business name. They type questions or click suggestion chips.
3. **Sign out** — Returns to the login screen and clears the chat.

---

## Supported Intents

### FAQ Intents (predetermined answers)

| Intent | What triggers it | What the bot answers |
|---|---|---|
| **Greeting** | "hi", "hello", "hey", "help" | Welcome message with quick-start suggestions |
| **Schedule a job** | "schedule", "book", "new job", "add job", "appointment" | 5-step guide to creating a job |
| **Edit a job** | "edit job", "update job", "reschedule" | How to open and edit a scheduled job |
| **Cancel a job** | "cancel job", "delete job", "remove job" | Steps to cancel + note about history retention |
| **Add a client** | "add client", "new client", "create client" | 4-step guide to adding a client |
| **View clients** | "view client", "client list", "find client" | How to navigate the Clients tab and search |
| **Invoicing** | "invoice", "billing", "payment", "bill", "charge" | How to create, send, and track invoice status |
| **Calendar** | "calendar", "view schedule", "upcoming jobs" | How to use the weekly calendar view |
| **Plans info** | "plans info", "pricing", "upgrade", "tier", "compare plans" | Details on Starter, Pro, and Growth plans |
| **Settings** | "settings", "profile", "change password" | How to access and update account settings |
| **Team members** | "team member", "invite", "technician", "crew" | How to invite team members (Pro/Growth only) |
| **Contact support** | "support", "contact", "help desk" | Email, in-app chat, and Help Center links |
| **Getting started** | "get started", "setup", "onboard", "first time" | 3-step onboarding loop (client → job → invoice) |
| **Fallback** | Anything unrecognized | Friendly fallback listing what the bot can help with |

---

### Account Intents (live data from dataset)

These intents query the contractor's actual job records and require the user to be logged in.

| Intent | What triggers it | Data returned |
|---|---|---|
| **My plan** | "my plan", "what plan", "current plan", "my subscription" | Plan name + description + link to billing settings |
| **Recent jobs** | "my jobs", "recent jobs", "job history", "show my jobs" | 5 most recent jobs by date (type, date, status) |
| **Account summary** | "my account", "account summary", "my business" | Trade, plan, total jobs, completed count, unique clients, total revenue |
| **My clients** | "my clients", "how many clients", "client count" | Total unique clients + repeat customer count |
| **My revenue** | "my revenue", "my earnings", "how much have I made" | Total collected + outstanding unpaid invoices |

---

## Architecture

```
fieldflow-chatbot-main/
├── server.js          Node.js + Express backend
├── package.json
├── chatbot/
│   └── intents.js     All intent definitions (FAQ + account)
├── data/
│   └── businesses_dataset.csv   7,534 work order records, 25 businesses
└── public/            Static frontend (served by Express)
    ├── index.html
    ├── style.css
    └── script.js
```

**Backend endpoints:**
- `GET /api/businesses` — returns sorted list of 25 business names for the login dropdown
- `POST /api/chat` — accepts `{ message, businessName }`, returns `{ text, suggestions }`

**Intent routing order:**
1. Check account intents (keyword match → live data lookup)
2. Check FAQ intents (keyword match → predetermined text)
3. Return fallback

---

## Design System

Matches the FieldFlow design system used across all four products:
- Same CSS variables (`--series-1`, `--surface-1`, `--page`, etc.)
- Full light and dark mode support
- No external dependencies — inline CSS only

---

## Plans Reference

| Plan | Team Size | Features |
|---|---|---|
| **Starter** | Up to 3 | Scheduling, client list, invoicing |
| **Pro** | Up to 10 | Starter + analytics, recurring templates, priority support |
| **Growth** | Unlimited | Pro + advanced reporting, API access, dedicated account manager |

---

## Data Source

`businesses_dataset.csv` — shared with Product B (Internal Ops Dashboard).

Key fields used by the chatbot:
- `business_name` — identifies the logged-in contractor
- `plan_name` — Starter / Pro / Growth
- `trade` — Electrician, Plumber, Cleaner, etc.
- `job_date`, `job_type`, `status` — for recent jobs lookup
- `client_name` — for client count
- `total_paid_to_date`, `total_due`, `invoice_status` — for revenue lookup
