-- =========================================================
-- Burn Industry Pocket — Core Schema (Migration 001)
-- Double-entry bookkeeping foundation
-- =========================================================

create extension if not exists "pgcrypto";

-- =========================================================
-- ORGS
-- =========================================================
create table orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  entity_type text not null default 'corporation',
  gst_hst_number text,
  fiscal_year_end date,
  created_at timestamptz not null default now()
);

comment on table orgs is 'Top-level entities: Burn Industry, The OBGMs. Everything else is scoped to one org.';

-- =========================================================
-- ORG MEMBERSHIP (for auth / RLS)
-- =========================================================
create type org_role as enum ('owner', 'bookkeeper', 'viewer');

create table org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role org_role not null default 'owner',
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

-- =========================================================
-- CHART OF ACCOUNTS
-- =========================================================
create type account_type as enum ('asset', 'liability', 'equity', 'income', 'cogs', 'expense');
create type normal_balance_type as enum ('debit', 'credit');

create table chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  code text not null,
  name text not null,
  type account_type not null,
  subtype text,
  normal_balance normal_balance_type not null,
  gifi_code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, code)
);

comment on table chart_of_accounts is 'Per-org chart of accounts. normal_balance determines whether a positive balance is a debit or credit account.';

-- =========================================================
-- TOURS & SHOWS
-- =========================================================
create table tours (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

create type show_deal_type as enum ('flat_guarantee', 'guarantee_vs_door', 'door_split', 'other');
create type show_status as enum ('booked', 'confirmed', 'completed', 'cancelled');

create table shows (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  tour_id uuid references tours(id) on delete set null,
  date date not null,
  venue_name text not null,
  city text,
  region text,
  status show_status not null default 'booked',
  deal_type show_deal_type not null default 'flat_guarantee',
  guarantee_amount numeric(12,2),
  door_split_percentage numeric(5,2),
  door_split_threshold numeric(12,2),
  merch_venue_cut_percentage numeric(5,2),
  deal_notes text,
  created_at timestamptz not null default now()
);

-- =========================================================
-- JOURNAL ENTRIES & LINES (the double-entry core)
-- =========================================================
create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  date date not null,
  description text not null,
  reference_type text,
  reference_id uuid,
  show_id uuid references shows(id) on delete set null,
  tour_id uuid references tours(id) on delete set null,
  created_at timestamptz not null default now()
);

create table journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references journal_entries(id) on delete cascade,
  account_id uuid not null references chart_of_accounts(id),
  debit numeric(12,2) not null default 0,
  credit numeric(12,2) not null default 0,
  memo text,
  constraint chk_nonnegative check (debit >= 0 and credit >= 0),
  constraint chk_one_sided check (not (debit > 0 and credit > 0))
);

comment on table journal_lines is 'Each line is either a debit or a credit, never both. A balanced trigger enforces sum(debit)=sum(credit) per journal_entry at transaction commit.';

-- Enforce balanced entries: sum(debit) must equal sum(credit) for every journal_entry,
-- checked at COMMIT time so multi-line inserts within one transaction are allowed.
create or replace function check_journal_entry_balanced() returns trigger as $$
declare
  target_id uuid;
  total_debit numeric(12,2);
  total_credit numeric(12,2);
begin
  target_id := coalesce(new.journal_entry_id, old.journal_entry_id);

  select coalesce(sum(debit),0), coalesce(sum(credit),0)
  into total_debit, total_credit
  from journal_lines
  where journal_entry_id = target_id;

  if total_debit <> total_credit then
    raise exception 'Journal entry % is not balanced: debits=%, credits=%', target_id, total_debit, total_credit;
  end if;

  return new;
end;
$$ language plpgsql;

create constraint trigger trg_journal_balanced
after insert or update or delete on journal_lines
deferrable initially deferred
for each row execute function check_journal_entry_balanced();
