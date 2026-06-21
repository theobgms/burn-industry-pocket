-- =========================================================
-- Burn Industry Pocket — Migration 003
-- Show settlements, AR/AP, tour budgets, recurring income estimates
-- =========================================================

-- =========================================================
-- SHOW SETTLEMENTS
-- =========================================================
create table show_settlements (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references shows(id) on delete cascade,
  guarantee_received numeric(12,2) not null default 0,
  door_split_received numeric(12,2) not null default 0,
  merch_gross numeric(12,2) not null default 0,
  merch_venue_cut_amount numeric(12,2) not null default 0,
  other_income numeric(12,2) not null default 0,
  notes text,
  journal_entry_id uuid references journal_entries(id),
  settled_at timestamptz not null default now()
);

-- =========================================================
-- RECEIVABLES & PAYABLES (deferred payment subledgers)
-- =========================================================
create type ar_ap_status as enum ('open', 'partial', 'paid', 'overdue');

create table receivables (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  source_type text,
  source_id uuid,
  description text,
  amount_expected numeric(12,2) not null,
  amount_received numeric(12,2) not null default 0,
  due_date date,
  status ar_ap_status not null default 'open',
  journal_entry_id uuid references journal_entries(id),
  created_at timestamptz not null default now()
);

create table payables (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  vendor text,
  description text,
  amount_owed numeric(12,2) not null,
  amount_paid numeric(12,2) not null default 0,
  due_date date,
  status ar_ap_status not null default 'open',
  journal_entry_id uuid references journal_entries(id),
  created_at timestamptz not null default now()
);

-- =========================================================
-- TOUR BUDGETS
-- =========================================================
create table tour_budgets (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references tours(id) on delete cascade,
  account_id uuid not null references chart_of_accounts(id),
  budgeted_amount numeric(12,2) not null,
  unique (tour_id, account_id)
);

-- =========================================================
-- RECURRING INCOME ESTIMATES (forecasting input — never touches the real ledger)
-- =========================================================
create table recurring_income_estimates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  account_id uuid not null references chart_of_accounts(id),
  expected_amount numeric(12,2) not null,
  frequency text not null,
  next_expected_date date,
  created_at timestamptz not null default now()
);
