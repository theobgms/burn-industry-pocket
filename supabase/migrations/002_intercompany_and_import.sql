-- =========================================================
-- Burn Industry Pocket — Migration 002
-- Intercompany transfers, statement import, learning categorization
-- =========================================================

-- =========================================================
-- INTERCOMPANY TRANSFERS
-- =========================================================
create type intercompany_treatment as enum (
  'shareholder_loan', 'intercompany_loan', 'rent_invoice', 'capital_contribution', 'undetermined'
);

create table intercompany_transfers (
  id uuid primary key default gen_random_uuid(),
  from_org_id uuid not null references orgs(id),
  to_org_id uuid not null references orgs(id),
  amount numeric(12,2) not null check (amount > 0),
  date date not null,
  purpose text,
  treatment intercompany_treatment not null default 'undetermined',
  terms_documented boolean not null default false,
  due_date date,
  from_journal_entry_id uuid references journal_entries(id),
  to_journal_entry_id uuid references journal_entries(id),
  created_at timestamptz not null default now(),
  constraint chk_different_orgs check (from_org_id <> to_org_id)
);

comment on table intercompany_transfers is 'Tracks money moving between Burn Industry and OBGMs (e.g. covering Densil''s van loan). treatment stays undetermined until classified — surfaced on dashboard as needing a decision, never silently resolved.';

-- =========================================================
-- STATEMENT IMPORT
-- =========================================================
create type import_status as enum ('processing', 'needs_review', 'reconciled');
create type source_format_type as enum ('csv', 'pdf');

create table statement_imports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  account_id uuid not null references chart_of_accounts(id),
  file_name text not null,
  source_format source_format_type not null default 'csv',
  period_start date,
  period_end date,
  status import_status not null default 'processing',
  created_at timestamptz not null default now()
);

-- =========================================================
-- CATEGORIZATION RULES (created before raw_transactions so we can FK to it)
-- =========================================================
create table categorization_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  match_pattern text not null,
  account_id uuid not null references chart_of_accounts(id),
  times_applied integer not null default 0,
  last_corrected_at timestamptz,
  created_at timestamptz not null default now(),
  unique (org_id, match_pattern)
);

comment on table categorization_rules is 'Learned vendor -> account mappings. times_applied and last_corrected_at let the UI show confidence and recency.';

-- =========================================================
-- RAW TRANSACTIONS (staging — nothing here touches the real ledger until approved)
-- =========================================================
create type raw_txn_status as enum ('unreviewed', 'categorized', 'posted', 'ignored', 'duplicate');

create table raw_transactions (
  id uuid primary key default gen_random_uuid(),
  statement_import_id uuid not null references statement_imports(id) on delete cascade,
  org_id uuid not null references orgs(id) on delete cascade,
  account_id uuid not null references chart_of_accounts(id),
  date date not null,
  description text not null,
  normalized_vendor text,
  amount numeric(12,2) not null,
  suggested_account_id uuid references chart_of_accounts(id),
  suggested_confidence numeric(3,2) check (suggested_confidence between 0 and 1),
  matched_rule_id uuid references categorization_rules(id),
  status raw_txn_status not null default 'unreviewed',
  journal_entry_id uuid references journal_entries(id),
  created_at timestamptz not null default now()
);

comment on table raw_transactions is 'Imported bank/CC lines land here first. Only status=posted rows have a journal_entry_id and have touched the real ledger.';
