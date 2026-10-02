# HelpDeskPro - IT Support & Service Management System

A production-grade, enterprise IT helpdesk ticketing and service management system built with React, TypeScript, Tailwind CSS, Express, and PostgreSQL / Supabase integration.

## 🚀 Key Features

- **Role-Based Access Control (RBAC):**
  - **Super Admin (`admin`):** Full system oversight, SLA management, user administration, category configuration, analytics, and audit logging.
  - **IT Support Specialist (`agent`):** Ticket triage, assigning, status lifecycle transitions, internal notes, resolution timers, and diagnostic tools.
  - **Employee / Requester (`user`):** Clean self-service portal, ticket submission strictly locked to **Employee ID (Emp ID)**, real-time ticket tracking, and direct chat.
- **Requester Account Lock:**
  - Automated detection and enforcement of the active user's **Employee ID** and profile on ticket creation.
- **SLA Countdown & Real-Time Timers:**
  - Dynamic SLA calculation with visual indicators: *On Track*, *At Risk (<1hr)*, and *Breached*.
- **PostgreSQL / Supabase Integration:**
  - Automated table bootstrapping, migration scripts (`database.sql`), connection status badges, and database reset/export tools.
- **AI-Powered Ticket Triage:**
  - Automated sentiment analysis, category suggestion, and concise issue summarization via Google Gemini.

## 🛠️ Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, Lucide Icons
- **Backend:** Node.js, Express, tsx
- **Database:** PostgreSQL / Supabase / Cloud SQL (`pg` client)
- **AI Integration:** Google GenAI SDK (`@google/genai`)

## 📦 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```
