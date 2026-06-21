# Burn Industry Pocket

Standalone double-entry bookkeeping app for Burn Industry and The OBGMs.
Next.js + Supabase (separate project from Social Cult) + Vercel.

## What's in this scaffold

- `supabase/migrations/001-005` — full double-entry schema, validated against a real Postgres instance:
  - Chart of accounts, journal entries/lines (balance enforced by a database trigger, not just app code)
  - Intercompany transfers (van loan / OBGMs↔Burn Industry tracking)
  - Statement import + learning categorization rules (CSV/PDF staging)
  - Show settlements, tours, tour budgets
  - Receivables/payables, recurring income estimates (forecasting)
  - Gamification (XP events, badges — personal, not leaderboard)
  - Row Level Security on every table
- `supabase/seed.sql` — creates the two orgs (Burn Industry, The OBGMs) with a full starter chart of accounts (41 accounts each)
- `app/`, `lib/supabase/` — minimal Next.js App Router shell with Supabase client helpers (browser + server)

This was built and tested end-to-end against a real Postgres instance before being handed off — the migrations are known to run clean in order, the balance-enforcement trigger is confirmed to reject unbalanced entries, and `npm run build` completes with zero errors.

## Setup — first time only

### 1. Create the GitHub repo

```bash
# On github.com, create theobgms/burn-industry-pocket (empty, no README/license)
```

### 2. Get these files onto your machine

Download the project files from this chat, extract them into:

```bash
mkdir -p ~/Downloads/burn-industry-pocket
# extract the downloaded files into this folder
cd ~/Downloads/burn-industry-pocket
```

### 3. Create a NEW Supabase project (separate from Social Cult)

- Go to supabase.com → New Project → name it `burn-industry-pocket`
- Once created: Settings → API → copy the **Project URL** and **anon public key**

### 4. Set up environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and paste in your Supabase URL and anon key.

### 5. Run the migrations on your new Supabase project

Easiest path — Supabase Dashboard → SQL Editor → run each file in order:

```
supabase/migrations/001_core_schema.sql
supabase/migrations/002_intercompany_and_import.sql
supabase/migrations/003_shows_and_forecasting.sql
supabase/migrations/004_gamification.sql
supabase/migrations/005_row_level_security.sql
supabase/seed.sql
```

(Or use the Supabase CLI if you prefer: `supabase db push`.)

### 6. Install dependencies and run locally

```bash
npm install
npm run dev
```

Visit http://localhost:3000 — you should see the scaffold placeholder page.

### 7. Push to GitHub

```bash
git init
git add .
git commit -m "Initial scaffold: double-entry schema, Next.js shell"
git branch -M main
git remote add origin https://github.com/theobgms/burn-industry-pocket.git
git push -u origin main
```

### 8. Deploy to Vercel

- vercel.com → New Project → import `theobgms/burn-industry-pocket`
- Add the same env vars from `.env.local` in Vercel's project settings
- Deploy

## What's next (not yet built)

- Auth + org switcher UI (Burn Industry / OBGMs)
- Transaction logging UI
- Statement import (CSV/PDF) upload + review screen
- Show/settlement entry forms
- Reports: P&L, Balance Sheet, GST/HST summary
- Gamification UI (XP display, badge unlocks)

## Notes

- `journal_lines` balance is enforced by a real database constraint trigger — the app cannot accidentally write unbalanced books, even with a bug in the UI code.
- Every org-scoped table has Row Level Security — Burn Industry data is invisible to anyone not a member of that org, even though both orgs share one Supabase project's auth.
- `intercompany_transfers.treatment` defaults to `undetermined` — the UI should surface anything in this state on a dashboard, since it represents an open accounting/tax classification decision (see conversation history for the van loan example).
