import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const ink = "#14110c";
const brass = "#b08422";
const cream = "#f4efe4";

function fmt(n: number) {
  return n.toLocaleString("en-CA", { style: "currency", currency: "CAD" });
}

export default async function ImportReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ org?: string }>;
}) {
  const { id } = await params;
  const { org: orgId } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!orgId) redirect("/select-org");

  const { data: imp } = await supabase
    .from("statement_imports")
    .select("id, file_name, period_start, period_end, status")
    .eq("id", id)
    .single();
  if (!imp) redirect(`/import?org=${orgId}`);

  const { data: txns } = await supabase
    .from("raw_transactions")
    .select("id, date, description, amount, status")
    .eq("statement_import_id", id)
    .order("date");

  const rows = txns ?? [];
  const moneyIn = rows.filter((t) => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
  const moneyOut = rows.filter((t) => Number(t.amount) < 0).reduce((s, t) => s + Number(t.amount), 0);

  return (
    <main style={{ minHeight: "100vh", background: ink, fontFamily: "ui-serif, Georgia, serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <Link href={`/import?org=${orgId}`} style={{ color: brass, fontSize: 12, textDecoration: "none", fontFamily: "ui-monospace, monospace" }}>
          ← imports
        </Link>
        <div style={{ fontSize: 24, fontWeight: 600, color: cream, marginTop: 6 }}>{imp.file_name}</div>
        <div style={{ color: "#8a7d61", fontSize: 13, fontFamily: "ui-monospace, monospace", marginTop: 2 }}>
          {imp.period_start} → {imp.period_end} · {rows.length} transactions
        </div>

        <div style={{ display: "flex", gap: 12, margin: "1.5rem 0" }}>
          <div style={statBox}>
            <div style={statLabel}>Money in</div>
            <div style={{ ...statVal, color: "#2f6b3a" }}>{fmt(moneyIn)}</div>
          </div>
          <div style={statBox}>
            <div style={statLabel}>Money out</div>
            <div style={{ ...statVal, color: "#8a2a2a" }}>{fmt(Math.abs(moneyOut))}</div>
          </div>
        </div>

        <div style={{ background: cream, border: `1px solid ${brass}`, borderRadius: 4, overflow: "hidden" }}>
          {rows.map((t, i) => (
            <div
              key={t.id}
              style={{
                display: "grid",
                gridTemplateColumns: "90px 1fr 110px",
                gap: 10,
                padding: "10px 14px",
                borderTop: i === 0 ? "none" : "1px solid #e8dfc9",
                fontSize: 13,
                alignItems: "center",
              }}
            >
              <span style={{ color: "#8a7d61", fontFamily: "ui-monospace, monospace", fontSize: 12 }}>{t.date}</span>
              <span style={{ color: ink }}>{t.description}</span>
              <span style={{ color: Number(t.amount) < 0 ? "#8a2a2a" : "#2f6b3a", textAlign: "right", fontFamily: "ui-monospace, monospace" }}>
                {fmt(Number(t.amount))}
              </span>
            </div>
          ))}
          {rows.length === 0 && <div style={{ padding: "1.5rem", color: "#8a7d61", fontSize: 14 }}>No transactions in this import.</div>}
        </div>

        <div style={{ marginTop: 20, padding: "1rem 1.25rem", background: "#1c1810", border: `1px solid ${brass}`, borderRadius: 4, color: "#c9bda0", fontSize: 13, lineHeight: 1.6 }}>
          <strong style={{ color: brass }}>Next:</strong> categorization + posting to the ledger is the next build. This screen confirms your statement parsed correctly — check the dates and amounts look right.
        </div>
      </div>
    </main>
  );
}

const statBox: React.CSSProperties = {
  flex: 1,
  background: cream,
  border: `1px solid ${brass}`,
  borderRadius: 4,
  padding: "0.9rem 1.1rem",
};
const statLabel: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#8a7d61",
  fontFamily: "ui-monospace, monospace",
};
const statVal: React.CSSProperties = { fontSize: 20, fontWeight: 600, marginTop: 4 };
