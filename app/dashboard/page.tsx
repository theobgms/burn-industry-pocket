import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const ink = "#14110c";
const brass = "#b08422";
const cream = "#f4efe4";
const paper = "#fdfbf6";

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
  normal_balance: "debit" | "credit";
};

type Line = {
  account_id: string;
  debit: number;
  credit: number;
};

function fmt(n: number) {
  return n.toLocaleString("en-CA", { style: "currency", currency: "CAD" });
}

const TYPE_LABELS: Record<string, string> = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  income: "Income",
  cogs: "Cost of Goods Sold",
  expense: "Expenses",
};
const TYPE_ORDER = ["asset", "liability", "equity", "income", "cogs", "expense"];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const { org: orgId } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!orgId) redirect("/select-org");

  const { data: org } = await supabase
    .from("orgs")
    .select("id, name, legal_name")
    .eq("id", orgId)
    .single();
  if (!org) redirect("/select-org");

  const { data: accounts } = await supabase
    .from("chart_of_accounts")
    .select("id, code, name, type, normal_balance")
    .eq("org_id", orgId)
    .eq("is_active", true)
    .order("code");

  // pull all journal lines for this org's accounts to compute balances
  const accountIds = (accounts ?? []).map((a) => a.id);
  let lines: Line[] = [];
  if (accountIds.length) {
    const { data: lineData } = await supabase
      .from("journal_lines")
      .select("account_id, debit, credit")
      .in("account_id", accountIds);
    lines = lineData ?? [];
  }

  // sum debits/credits per account
  const byAccount = new Map<string, { debit: number; credit: number }>();
  for (const l of lines) {
    const cur = byAccount.get(l.account_id) ?? { debit: 0, credit: 0 };
    cur.debit += Number(l.debit);
    cur.credit += Number(l.credit);
    byAccount.set(l.account_id, cur);
  }

  // balance in the account's normal direction
  function balanceOf(a: Account) {
    const s = byAccount.get(a.id) ?? { debit: 0, credit: 0 };
    return a.normal_balance === "debit" ? s.debit - s.credit : s.credit - s.debit;
  }

  const accs = (accounts ?? []) as Account[];
  const grouped: Record<string, Account[]> = {};
  for (const a of accs) (grouped[a.type] ??= []).push(a);

  const totalByType: Record<string, number> = {};
  for (const t of TYPE_ORDER) {
    totalByType[t] = (grouped[t] ?? []).reduce((sum, a) => sum + balanceOf(a), 0);
  }

  const income = totalByType["income"] ?? 0;
  const cogs = totalByType["cogs"] ?? 0;
  const expenses = totalByType["expense"] ?? 0;
  const netIncome = income - cogs - expenses;
  const hasActivity = lines.length > 0;

  return (
    <main style={{ minHeight: "100vh", background: ink, fontFamily: "ui-serif, Georgia, serif" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <Link href="/select-org" style={{ color: brass, fontSize: 12, textDecoration: "none", fontFamily: "ui-monospace, monospace" }}>
              ← ledgers
            </Link>
            <div style={{ fontSize: 26, fontWeight: 600, color: cream, marginTop: 6 }}>{org.name}</div>
            <div style={{ fontSize: 13, color: "#8a7d61" }}>{org.legal_name}</div>
          </div>
          <form action="/auth/signout" method="post">
            <button style={{ background: "none", border: "none", color: brass, fontSize: 13, cursor: "pointer", fontFamily: "ui-monospace, monospace" }}>
              sign out
            </button>
          </form>
        </div>

        <div style={{ height: 1, background: brass, opacity: 0.4, margin: "1.5rem 0 2rem" }} />

        {/* P&L snapshot */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 28 }}>
          {[
            { label: "Income", val: income },
            { label: "Expenses", val: cogs + expenses },
            { label: "Net Income", val: netIncome, accent: true },
          ].map((c) => (
            <div key={c.label} style={{ background: cream, border: `1px solid ${brass}`, borderRadius: 4, padding: "1rem 1.25rem" }}>
              <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a7d61", fontFamily: "ui-monospace, monospace" }}>
                {c.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, color: c.accent ? (netIncome >= 0 ? "#2f6b3a" : "#8a2a2a") : ink, marginTop: 4 }}>
                {fmt(c.val)}
              </div>
            </div>
          ))}
        </div>

        {!hasActivity && (
          <div style={{ background: paper, border: `1px dashed ${brass}`, borderRadius: 4, padding: "1.25rem", marginBottom: 28, color: "#6b6250", fontSize: 14, lineHeight: 1.6 }}>
            No transactions posted yet. Balances will populate here as journal entries are recorded.
            The chart of accounts below is live and ready.
          </div>
        )}

        {/* chart of accounts with balances */}
        {TYPE_ORDER.filter((t) => grouped[t]?.length).map((type) => (
          <div key={type} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <div style={{ fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase", color: brass, fontFamily: "ui-monospace, monospace" }}>
                {TYPE_LABELS[type]}
              </div>
              <div style={{ fontSize: 13, color: cream, fontFamily: "ui-monospace, monospace" }}>{fmt(totalByType[type])}</div>
            </div>
            <div style={{ background: cream, border: `1px solid #cdbf9e`, borderRadius: 4, overflow: "hidden" }}>
              {grouped[type].map((a, i) => {
                const bal = balanceOf(a);
                return (
                  <div
                    key={a.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "9px 14px",
                      borderTop: i === 0 ? "none" : "1px solid #e8dfc9",
                      fontSize: 14,
                    }}
                  >
                    <span style={{ color: ink }}>
                      <span style={{ color: "#a89871", fontFamily: "ui-monospace, monospace", fontSize: 12, marginRight: 10 }}>{a.code}</span>
                      {a.name}
                    </span>
                    <span style={{ color: bal === 0 ? "#b3a887" : ink, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
                      {fmt(bal)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
