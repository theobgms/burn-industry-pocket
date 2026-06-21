-- =========================================================
-- Burn Industry Pocket — Migration 005
-- Row Level Security: users can only see/edit data for orgs they're a member of
-- =========================================================

-- Helper: is the current user a member of a given org?
create or replace function is_org_member(check_org_id uuid) returns boolean as $$
  select exists (
    select 1 from org_members
    where org_id = check_org_id and user_id = auth.uid()
  );
$$ language sql security definer stable;

-- =========================================================
-- Tables with a direct org_id column: one policy pattern covers all
-- =========================================================
do $$
declare
  t text;
  direct_org_tables text[] := array[
    'orgs', 'chart_of_accounts', 'tours', 'shows', 'journal_entries',
    'statement_imports', 'raw_transactions',
    'categorization_rules', 'receivables', 'payables',
    'recurring_income_estimates', 'org_members'
  ];
begin
  foreach t in array direct_org_tables loop
    execute format('alter table %I enable row level security;', t);

    -- orgs itself uses id, not org_id
    if t = 'orgs' then
      execute format(
        'create policy "members_select" on %I for select using (is_org_member(id));', t);
      execute format(
        'create policy "members_modify" on %I for all using (is_org_member(id)) with check (is_org_member(id));', t);
    elsif t = 'org_members' then
      -- members can see who else is in their orgs, but only owners should add/remove (enforced in app layer + this base policy)
      execute format(
        'create policy "members_select" on %I for select using (is_org_member(org_id));', t);
    else
      execute format(
        'create policy "members_select" on %I for select using (is_org_member(org_id));', t);
      execute format(
        'create policy "members_modify" on %I for all using (is_org_member(org_id)) with check (is_org_member(org_id));', t);
    end if;
  end loop;
end $$;

-- intercompany_transfers -> visible to members of EITHER the sending or receiving org
alter table intercompany_transfers enable row level security;
create policy "members_select" on intercompany_transfers for select using (
  is_org_member(from_org_id) or is_org_member(to_org_id)
);
create policy "members_modify" on intercompany_transfers for all using (
  is_org_member(from_org_id) or is_org_member(to_org_id)
) with check (
  is_org_member(from_org_id) or is_org_member(to_org_id)
);

-- =========================================================
-- Tables that reach org_id through a join (no direct column)
-- =========================================================

-- journal_lines -> journal_entries.org_id
alter table journal_lines enable row level security;
create policy "members_select" on journal_lines for select using (
  exists (select 1 from journal_entries je where je.id = journal_entry_id and is_org_member(je.org_id))
);
create policy "members_modify" on journal_lines for all using (
  exists (select 1 from journal_entries je where je.id = journal_entry_id and is_org_member(je.org_id))
) with check (
  exists (select 1 from journal_entries je where je.id = journal_entry_id and is_org_member(je.org_id))
);

-- show_settlements -> shows.org_id
alter table show_settlements enable row level security;
create policy "members_select" on show_settlements for select using (
  exists (select 1 from shows s where s.id = show_id and is_org_member(s.org_id))
);
create policy "members_modify" on show_settlements for all using (
  exists (select 1 from shows s where s.id = show_id and is_org_member(s.org_id))
) with check (
  exists (select 1 from shows s where s.id = show_id and is_org_member(s.org_id))
);

-- tour_budgets -> tours.org_id
alter table tour_budgets enable row level security;
create policy "members_select" on tour_budgets for select using (
  exists (select 1 from tours t where t.id = tour_id and is_org_member(t.org_id))
);
create policy "members_modify" on tour_budgets for all using (
  exists (select 1 from tours t where t.id = tour_id and is_org_member(t.org_id))
) with check (
  exists (select 1 from tours t where t.id = tour_id and is_org_member(t.org_id))
);

-- =========================================================
-- Gamification tables: personal to the user, optionally tied to an org
-- =========================================================
alter table xp_events enable row level security;
create policy "own_xp_select" on xp_events for select using (user_id = auth.uid());
create policy "own_xp_insert" on xp_events for insert with check (user_id = auth.uid());

alter table user_badges enable row level security;
create policy "own_badges_select" on user_badges for select using (user_id = auth.uid());
create policy "own_badges_insert" on user_badges for insert with check (user_id = auth.uid());

-- badges catalog is readable by anyone authenticated, not user-specific
alter table badges enable row level security;
create policy "badges_readable" on badges for select using (auth.role() = 'authenticated');
