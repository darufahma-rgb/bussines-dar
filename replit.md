# CRM Hub

A lightweight CRM web application for managing customers across multiple businesses.

## Architecture

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express.js (TypeScript) serving a REST API on port 3001
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: Session-based authentication using express-session + connect-pg-simple + bcryptjs
- **Dev**: Both frontend and backend start together via `concurrently`

## Key Features

- Customer management (CRUD) with status tracking (new, warm, hot, closed)
- Business tagging (Temantiket, SYMP Studio, Darcia, AIGYPT)
- Interaction timeline (notes, transactions, follow-ups, quick captures)
- Dashboard with stats and due follow-ups
- Quick Capture for fast customer/note creation

## Project Structure

```
src/               # React frontend
  pages/           # Route pages (Dashboard, CustomerList, CustomerDetail, etc.)
  components/      # Shared components (AppSidebar, QuickCapture, etc.)
  hooks/           # useAuth hook (session-based)
  lib/             # api.ts — all API calls to backend
server/            # Express backend
  index.ts         # App entry point
  db.ts            # Drizzle + pg connection
  routes/          # auth, businesses, customers, interactions
  middleware/      # requireAuth middleware
shared/
  schema.ts        # Drizzle schema (users, businesses, customers, interactions)
scripts/
  seed.ts          # Seeds default businesses
```

## Running

```bash
npm run dev        # Starts Express (port 3001) + Vite (port 5000) concurrently
npm run db:push    # Push schema to database
```

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (set automatically by Replit)
- `SESSION_SECRET` — Session signing secret (optional, defaults to dev value)
