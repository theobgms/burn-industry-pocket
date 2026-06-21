-- =========================================================
-- Burn Industry Pocket — Migration 004
-- Gamification: XP and badges, scoped per-user (personal, not leaderboard)
-- =========================================================

create table xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references orgs(id) on delete set null,
  action_type text not null,
  xp_awarded integer not null check (xp_awarded > 0),
  related_id uuid,
  created_at timestamptz not null default now()
);

comment on table xp_events is 'Audit log of every XP-earning action. Rewards consistency/accuracy (same-week logging, reconciliation, on-time GST filing) not raw transaction volume.';

create table badges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  criteria_description text
);

create table user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id uuid not null references badges(id),
  org_id uuid references orgs(id) on delete set null,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id, org_id)
);

-- Seed starter badges
insert into badges (code, name, description, criteria_description) values
  ('first_show_settled', 'First Show Settled', 'Settled your first show in the app', 'show_settlements count >= 1'),
  ('clean_books_3mo', 'Clean Books', 'Zero unreviewed transactions for 3 consecutive months', 'raw_transactions.status unreviewed = 0 for 3 month-ends running'),
  ('tour_budget_boss', 'Tour Budget Boss', 'Completed a tour under budget in every category', 'actuals <= budgeted_amount for all tour_budgets rows on a completed tour'),
  ('quarter_closed', 'Quarter Closed', 'Fully reconciled a quarter, on time', 'all statement_imports for the quarter have status = reconciled'),
  ('gst_ready_early', 'GST Ready Early', 'GST/HST return data ready before the deadline', 'manual flag set by user on submission workflow');
