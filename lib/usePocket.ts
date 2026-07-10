'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export function usePocket() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string|null>(null);
  const [loaded, setLoaded] = useState(false);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [orgId, setOrgId] = useState<string|null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [shows, setShows] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);
  const [receivables, setReceivables] = useState<any[]>([]);
  const [payables, setPayables] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);

  // Bootstrap: user + orgs
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoaded(true); return; }
      setUserId(user.id);

      const { data: memberRows } = await supabase
        .from('org_members').select('org_id, role, orgs(id,name,legal_name,entity_type)')
        .eq('user_id', user.id);

      const orgList = (memberRows||[]).map((m:any)=>m.orgs).filter(Boolean);
      setOrgs(orgList);
      if (orgList.length > 0) setOrgId(orgList[0].id);
      setLoaded(true);
    })();
  }, []);

  // Load everything for the selected org
  const refresh = useCallback(async () => {
    if (!orgId) return;
    const [
      { data: acc }, { data: sh }, { data: rt },
      { data: rec }, { data: pay }, { data: je }, { data: rl },
    ] = await Promise.all([
      supabase.from('chart_of_accounts').select('*').eq('org_id', orgId).eq('is_active', true).order('code'),
      supabase.from('shows').select('*').eq('org_id', orgId).order('date', { ascending: false }),
      supabase.from('raw_transactions').select('*').eq('org_id', orgId).order('date', { ascending: false }).limit(200),
      supabase.from('receivables').select('*').eq('org_id', orgId).order('due_date'),
      supabase.from('payables').select('*').eq('org_id', orgId).order('due_date'),
      supabase.from('journal_entries').select('id, date, description, journal_lines(account_id, debit, credit)').eq('org_id', orgId).order('date', { ascending: false }).limit(500),
      supabase.from('categorization_rules').select('*').eq('org_id', orgId),
    ]);

    setAccounts(acc||[]);
    setShows(sh||[]);
    setTxns(rt||[]);
    setReceivables(rec||[]);
    setPayables(pay||[]);
    setRules(rl||[]);

    const showIds = (sh||[]).map((s:any)=>s.id);
    if (showIds.length) {
      const { data: st } = await supabase.from('show_settlements').select('*').in('show_id', showIds);
      setSettlements(st||[]);
    } else setSettlements([]);

    // Flatten journal lines for P&L
    const flat: any[] = [];
    (je||[]).forEach((e:any) => (e.journal_lines||[]).forEach((l:any) => flat.push({ ...l, date: e.date })));
    setLines(flat);
  }, [orgId]);

  useEffect(() => { refresh(); }, [orgId, refresh]);

  // ---- Derived: P&L ----
  function accountsByType(type: string) {
    return accounts.filter(a => a.type === type);
  }
  function balanceOf(accountId: string) {
    const ls = lines.filter(l => l.account_id === accountId);
    const d = ls.reduce((s,l)=>s+Number(l.debit||0),0);
    const c = ls.reduce((s,l)=>s+Number(l.credit||0),0);
    const acc = accounts.find(a=>a.id===accountId);
    if (!acc) return 0;
    return acc.normal_balance === 'debit' ? d - c : c - d;
  }
  function totalFor(type: string) {
    return accountsByType(type).reduce((s,a)=>s+balanceOf(a.id),0);
  }

  const income  = totalFor('income');
  const cogs    = totalFor('cogs');
  const expense = totalFor('expense');
  const netProfit = income - cogs - expense;

  const cashAccounts = accounts.filter(a => a.type==='asset' && /cash/i.test(a.name));
  const cashOnHand = cashAccounts.reduce((s,a)=>s+balanceOf(a.id),0);

  const arOpen = receivables.filter(r=>r.status!=='paid')
    .reduce((s,r)=>s+(Number(r.amount_expected)-Number(r.amount_received)),0);
  const apOpen = payables.filter(p=>p.status!=='paid')
    .reduce((s,p)=>s+(Number(p.amount_expected||p.amount||0)-Number(p.amount_paid||0)),0);

  const unreviewed = txns.filter(t=>t.status==='unreviewed');
  const categorized = txns.filter(t=>t.status==='categorized');
  const posted = txns.filter(t=>t.status==='posted');

  // ---- Mutations ----
  const addShow = useCallback(async (show: any) => {
    if (!orgId) return;
    await supabase.from('shows').insert({ ...show, org_id: orgId });
    refresh();
  }, [orgId, refresh]);

  const settleShow = useCallback(async (showId: string, s: any) => {
    await supabase.from('show_settlements').insert({ show_id: showId, ...s });
    await supabase.from('shows').update({ status: 'completed' }).eq('id', showId);
    refresh();
  }, [refresh]);

  // Categorize: store the chosen account in category_account_id (NOT account_id,
  // which is the bank account and forms the other half of the double entry).
  const categorizeTxn = useCallback(async (txnId: string, accountId: string, learn = true) => {
    if (!orgId) return;
    await supabase.from('raw_transactions')
      .update({ category_account_id: accountId, status: 'categorized' })
      .eq('id', txnId);

    if (learn) {
      const txn = txns.find((t:any)=>t.id===txnId);
      const pattern = txn?.normalized_vendor;
      if (pattern) await supabase.rpc('learn_rule', { p_org: orgId, p_pattern: pattern, p_account: accountId });
    }
    refresh();
  }, [orgId, txns, refresh]);

  // Post a single categorized txn to the ledger as a balanced journal entry.
  const postTxn = useCallback(async (txnId: string) => {
    const { error } = await supabase.rpc('post_transaction', { p_txn: txnId });
    refresh();
    return error?.message ?? null;
  }, [refresh]);

  // Post every categorized txn in an import.
  const postImport = useCallback(async (importId: string) => {
    const { data, error } = await supabase.rpc('post_import', { p_import: importId });
    refresh();
    return { count: data as number|null, error: error?.message ?? null };
  }, [refresh]);

  // Categorize + post in one move.
  const categorizeAndPost = useCallback(async (txnId: string, accountId: string) => {
    await categorizeTxn(txnId, accountId);
    const { error } = await supabase.rpc('post_transaction', { p_txn: txnId });
    refresh();
    return error?.message ?? null;
  }, [categorizeTxn, refresh]);

  const unpostTxn = useCallback(async (txnId: string) => {
    await supabase.rpc('unpost_transaction', { p_txn: txnId });
    refresh();
  }, [refresh]);

  // Suggest an account for a txn from learned rules.
  const suggestFor = useCallback((txn: any) => {
    if (txn.category_account_id) return txn.category_account_id;
    const v = txn.normalized_vendor;
    if (!v) return null;
    const exact = rules.find((r:any)=>r.match_pattern === v);
    if (exact) return exact.account_id;
    const partial = rules.find((r:any)=>v.includes(r.match_pattern) || r.match_pattern.includes(v));
    return partial ? partial.account_id : (txn.suggested_account_id ?? null);
  }, [rules]);

  const ignoreTxn = useCallback(async (txnId: string) => {
    await supabase.from('raw_transactions').update({ status: 'ignored' }).eq('id', txnId);
    refresh();
  }, [refresh]);

  const addReceivable = useCallback(async (r: any) => {
    if (!orgId) return;
    await supabase.from('receivables').insert({ ...r, org_id: orgId });
    refresh();
  }, [orgId, refresh]);

  const markReceived = useCallback(async (id: string, amount: number) => {
    await supabase.from('receivables').update({ amount_received: amount, status: 'paid' }).eq('id', id);
    refresh();
  }, [refresh]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return {
    userId, loaded, orgs, orgId, setOrgId, refresh, signOut,
    accounts, shows, settlements, txns, receivables, payables,
    income, cogs, expense, netProfit, cashOnHand, arOpen, apOpen,
    unreviewed, categorized, posted, rules,
    balanceOf, accountsByType, suggestFor,
    addShow, settleShow, addReceivable, markReceived,
    categorizeTxn, categorizeAndPost, postTxn, postImport, unpostTxn, ignoreTxn,
  };
}
