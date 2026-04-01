# CRM Hub

Multi-bisnis CRM untuk mengelola customer dari Temantiket, SYMP, AIGYPT, dan Darcia.

## Architecture

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express.js (TypeScript) REST API on port 3001 (dev), port 5000 (prod)
- **Database**: PostgreSQL (Neon) via Drizzle ORM
- **Auth**: Session-based — express-session + connect-pg-simple + bcryptjs
- **AI**: OpenRouter (google/gemini-2.0-flash-001) or OpenAI fallback
- **Dev**: Frontend + backend start together via `concurrently`

## Key Features

- Customer CRUD with status pipeline (new → warm → hot → negotiation → closed/lost)
- Multi-business tagging (one customer can belong to multiple businesses)
- Interaction timeline: notes, transactions, follow-ups, quick captures — with delete
- Dashboard with stats, Daily Focus AI, due follow-ups, recent notes
- Quick Capture (Ctrl+K) — freeform note with AI parsing
- Pipeline board — drag status with lost-reason modal
- Follow-ups page — grouped by overdue/today/upcoming
- CSV Import with column auto-mapping + business assignment
- CSV Export
- Weekly & Monthly reports with AI insights
- AI features: customer summary, reply generator, next-action suggestion, parse capture
- Collapsed sidebar (localStorage persistent) + mobile drawer
- Full Indonesian UI (bahasa Indonesia throughout)
- Navy color scheme (--primary: 222 63% 27%)

## Project Structure

```
src/               # React frontend
  pages/           # Dashboard, CustomerList, CustomerDetail, Pipeline,
                   # FollowUps, Weekly, Monthly, NewCustomer, Login
  components/      # AppSidebar, QuickCapture, StatusBadge, BusinessBadge, PageGuide, NavLink
  hooks/           # useAuth.tsx (session-based)
  lib/             # api.ts — all API calls; queryClient.ts
server/            # Express backend
  index.ts         # Entry point — serves static in prod, CORS in dev
  app.ts           # Express app setup (session, helmet, rate limit, routes)
  db.ts            # Drizzle + pg pool
  routes/          # auth, businesses, customers, interactions, ai, stats, import
  middleware/      # requireAuth.ts
shared/
  schema.ts        # Drizzle schema: users, businesses, customers, customerBusinesses, interactions
api/
  index.ts         # Vercel serverless function entry (lazy-loads server/app.ts)
```

## Running

```bash
npm run dev        # Starts Express (port 3001) + Vite (port 5000)
npm run db:push    # Push schema to database
```

## Deployment

### Replit Deployment
Build: `npm run build && npx esbuild server/index.ts --bundle --platform=node --outfile=dist/index.cjs --format=cjs --packages=external`
Run: `node ./dist/index.cjs`

### Vercel Deployment
- `vercel.json` configured with serverless function at `api/index.ts`
- Build: `npm run build` (Vite → dist/)
- Rewrites: `/api/*` → serverless function, everything else → `index.html`
- Push to GitHub (`git push origin main`) to trigger Vercel auto-deploy

## Environment Variables

- `DATABASE_URL` — PostgreSQL (Neon) connection string
- `SESSION_SECRET` — Session signing secret
- `OPENROUTER_API_KEY` — For AI features via OpenRouter
- `OPENROUTER_MODEL` — AI model (default: google/gemini-2.0-flash-001)

## Key Design Decisions

- **businessId filtering**: Done server-side via JOIN query (not client-side) for performance
- **Search**: Searches name + email + phone simultaneously
- **Timestamps**: All dates use `date-fns` with `id` (Indonesian) locale
- **Status values**: Stored as English slugs (new/warm/hot/negotiation/closed/lost), displayed in Indonesian
- **Interaction delete**: Soft confirmation via browser confirm(), DELETE /api/interactions/:id
