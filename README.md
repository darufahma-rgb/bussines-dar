# CRM Hub

A purpose-built multi-business CRM designed as a **Business Operating System** for founders managing multiple brands from a single interface. Built to replace spreadsheets and generic CRMs with a tool that understands multi-business context.

---

## What This Is

CRM Hub is an internal operations tool for founders running more than one business. Instead of juggling separate tools per brand, CRM Hub gives you one unified dashboard across all your businesses — with shared customer tracking, pipeline management, AI-assisted follow-ups, and structured review cadences (weekly, monthly, yearly).

Built for: **Temantiket**, **SYMP Studio**, **Darcia**, and **AIGYPT**.

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Multi-business customers** | One customer can belong to multiple businesses; per-business metrics and reporting |
| **Pipeline board** | Visual kanban from `New Lead → Closed`, with lost-reason capture on failed deals |
| **Interaction timeline** | Notes, transactions, follow-ups, and quick captures per customer |
| **Follow-up manager** | Grouped by overdue / today / upcoming, one-click completion |
| **Quick Capture** (`Ctrl+K`) | Natural language note entry with AI parsing — auto-creates leads from freeform text |
| **Review pages** | Weekly, Monthly, and Yearly reviews with metrics, business breakdowns, reflection notes, and AI insights |
| **AI features** | Customer summaries, reply generator, next-action suggestions, strategic yearly analysis |
| **CSV Import / Export** | Import from Notion or any CSV with auto column mapping; export any filtered view |
| **Dashboard command center** | Today's priorities, pipeline snapshot, business unit cards, daily focus list |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| UI Components | Tailwind CSS + shadcn/ui |
| Backend | Express.js + TypeScript |
| Database ORM | Drizzle ORM |
| Database | PostgreSQL (Neon recommended) |
| AI | OpenRouter (Gemini 2.0 Flash) or OpenAI fallback |
| Auth | Session-based — express-session + bcryptjs |
| Deployment | Replit or Vercel (serverless) |

---

## Setup

### Prerequisites

- Node.js 18+
- A PostgreSQL database — [neon.tech](https://neon.tech) offers a free tier (takes ~2 min to set up)
- An AI API key — [OpenRouter](https://openrouter.ai) is recommended and includes free credits

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values. See the [Environment Variables](#environment-variables) section.

### 3. Push the database schema

```bash
npm run db:push
```

### 4. Start the development server

```bash
npm run dev
```

- Frontend: `http://localhost:5000`
- API: `http://localhost:3001`

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SESSION_SECRET` | ✅ | Random secret for signing sessions — use `openssl rand -base64 32` |
| `OPENROUTER_API_KEY` | Recommended | Primary AI key via [openrouter.ai](https://openrouter.ai) |
| `OPENROUTER_MODEL` | Optional | Model to use (default: `google/gemini-2.0-flash-001`) |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | Fallback | OpenAI API key if not using OpenRouter |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | Fallback | OpenAI base URL (default: `https://api.openai.com/v1`) |

> AI features degrade gracefully — if no key is set, the app works normally without AI.

---

## Project Structure

```
src/                     # React frontend
  pages/                 # Route-level page components
  components/            # Reusable UI components (StatCard, SectionHeading, etc.)
  hooks/                 # Custom hooks (useAuth, use-mobile, use-toast)
  lib/                   # API client, format utilities, shared constants
server/                  # Express.js REST API
  routes/                # auth, businesses, customers, interactions, ai, stats, import
  middleware/            # requireAuth session guard
shared/
  schema.ts              # Drizzle schema — single source of truth for the database
api/
  index.ts               # Vercel serverless entrypoint
```

---

## Deployment

### Replit (recommended for simplicity)

1. Set all environment variables as Replit Secrets
2. **Build:** `npm run build && npx esbuild server/index.ts --bundle --platform=node --outfile=dist/index.cjs --format=cjs --packages=external`
3. **Run:** `node ./dist/index.cjs`

### Vercel

1. Push to a GitHub repository
2. Connect the repo to [vercel.com](https://vercel.com)
3. Set environment variables in the Vercel dashboard
4. Vercel reads `vercel.json` and auto-deploys on every push

---

## Database

The schema is managed with Drizzle ORM. After any schema changes:

```bash
npm run db:push     # Sync schema to the database (safe for development)
```

Key tables: `users`, `businesses`, `customers`, `customer_businesses`, `interactions`

---

## Roadmap

- [ ] Push notifications / email alerts for overdue follow-ups
- [ ] WhatsApp Business API integration for automated follow-up sequences
- [ ] Team access with role-based permissions (owner / viewer)
- [ ] Revenue forecasting from active pipeline value
- [ ] Customer tagging and custom label system
- [ ] Mobile app (React Native / Expo)
- [ ] Advanced cohort analytics and LTV tracking
- [ ] Customer portal for sharing proposals and collecting signatures

---

## License

Internal use — not for redistribution.
