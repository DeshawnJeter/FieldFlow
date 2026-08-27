# FieldFlow Support Chatbot

A simple, in-app support chatbot built for FieldFlow — a field service management platform for contractors. Instead of waiting on email support, contractors can ask the bot questions and instantly get answers about how to use the app or look up their own account data.

---

## What It Does

The chatbot handles two types of questions:

1. **How-to questions** — Step-by-step answers for common tasks like scheduling a job, adding a client, or sending an invoice.
2. **Account lookups** — Real data pulled from the contractor's account, like their current plan, recent jobs, total revenue, and client count.

---

## Getting Started

Make sure you have [Node.js](https://nodejs.org) installed, then run:

```bash
npm install
node server.js
```

Open your browser and go to **http://localhost:3001**

---

## How to Use It

1. **Login screen** — Select your business name from the dropdown and click **Start Chat**.
2. **Chat screen** — The bot greets you by name. Type a question or tap one of the quick-reply buttons.
3. **Sign out** — Click Sign Out to return to the login screen.

---

## What You Can Ask

### General Questions

| Topic | Example phrases |
|---|---|
| Greeting | "Hi", "Hello", "Hey" |
| Scheduling a job | "How do I schedule a job?", "Book a new appointment" |
| Editing a job | "How do I reschedule?", "Edit a job" |
| Canceling a job | "How do I cancel a job?", "Delete an appointment" |
| Adding a client | "How do I add a client?", "New customer" |
| Viewing clients | "Show my client list", "Find a client" |
| Invoicing | "How do I send an invoice?", "Billing", "Payment" |
| Calendar | "View my schedule", "Upcoming jobs" |
| Plan options | "What plans are available?", "Pricing", "Upgrade" |
| Settings | "How do I change my password?", "Account settings" |
| Adding team members | "How do I invite my crew?", "Add a technician" |
| Contacting support | "How do I reach support?", "Talk to someone" |
| Getting started | "I'm new, where do I start?", "Help me get set up" |

### Account-Specific Questions (requires login)

| Topic | Example phrases |
|---|---|
| Your current plan | "What plan am I on?", "My subscription" |
| Recent jobs | "Show my recent jobs", "My job history" |
| Account summary | "Show my account", "My business info" |
| Client count | "How many clients do I have?", "My customers" |
| Revenue | "How much have I made?", "My earnings" |

---

## Project Structure

```
fieldflow-chatbot-main/
├── server.js              Main server — handles all requests and business logic
├── package.json           Project info and dependencies
├── chatbot/
│   └── intents.js         All questions the bot knows how to answer
├── data/
│   └── businesses_dataset.csv   Job records used for account lookups (25 businesses)
└── public/                Front-end files served to the browser
    ├── index.html         Page structure
    ├── style.css          Styling (light and dark mode)
    └── script.js          Chat interaction logic
```

---

## Plans Overview

| Plan | Team Size | What's Included |
|---|---|---|
| **Starter** | Up to 3 members | Scheduling, client list, invoicing |
| **Pro** | Up to 10 members | Everything in Starter + analytics, recurring templates, priority support |
| **Growth** | Unlimited | Everything in Pro + advanced reporting, API access, dedicated account manager |

To change your plan, go to **Settings → Billing** inside the app.

---

## Tech Stack

- **Backend:** Node.js + Express
- **Frontend:** Plain HTML, CSS, and JavaScript (no frameworks)
- **Data:** CSV file with 7,500+ job records across 25 contractor businesses
- **No database required** — runs entirely from local files

---

## API Endpoints

| Method | Endpoint | What it does |
|---|---|---|
| `GET` | `/api/businesses` | Returns the list of businesses for the login dropdown |
| `POST` | `/api/chat` | Accepts a message and business name, returns the bot's reply |

---

## Support

For questions or issues, reach out via:

- **In-app chat:** Click the chat bubble inside FieldFlow
- **Email:** support@fieldflow.io
- **Help Center:** help.fieldflow.io
