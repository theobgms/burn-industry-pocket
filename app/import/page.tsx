import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import ImportUploader from "./uploader";

export const dynamic = "force-dynamic";

const ink = "#14110c";
const brass = "#b08422";
const cream = "#f4efe4";

export default async function ImportPage({
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

  const { data: org } = await supabase.from("orgs").select("id, name").eq("id", orgId).single();
  if (!org) redirect("/select-org");

  // cash/bank accounts to import into
  const { data: accounts } = await supabase
    .from("chart_of_accounts")
    .select("id, code, name")
    .eq("org_id", orgId)
    .eq("is_active", true)
    .in("type", ["asset", "liability"])
    .order("code");

  const { data: imports } = await supabase
    .from("statement_imports")
    .select("id, file_name, source_format, period_start, period_end, status, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  return (
    <main style={{ minHeight: "100vh", background: ink, fontFamily: "ui-serif, Georgia, serif" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <Link href={`/dashboard?org=${orgId}`} style={{ color: brass, fontSize: 12, textDecoration: "none", fontFamily: "ui-monospace, monospace" }}>
          ← {org.name}
        </Link>
        <div style={{ fontSize: 26, fontWeight: 600, color: cream, marginTop: 6 }}>Import statements</div>
        <div style={{ height: 1, background: brass, opacity: 0.4, margin: "1.25rem 0 2rem" }} />

        <ImportUploader orgId={orgId} accounts={accounts ?? []} />

        <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8a7d61", margin: "2.5rem 0 12px", fontFamily: "ui-monospace, monospace" }}>
          Past imports
        </div>

        {(!imports || imports.length === 0) && (
          <div style={{ color: "#8a7d61", fontSize: 14 }}>Nothing imported yet.</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(imports ?? []).map((imp) => (
            <Link
              key={imp.id}
              href={`/import/${imp.id}?org=${orgId}`}
              style={{ display: "block", background: cream, border: `1px solid ${brass}`, borderRadius: 4, padding: "0.9rem 1.1rem", textDecoration: "none" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ color: ink, fontSize: 15 }}>{imp.file_name}</span>
                <span style={{ color: statusColor(imp.status), fontSize: 11, fontFamily: "ui-monospace, monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {imp.status.replace("_", " ")}
                </span>
              </div>
              <div style={{ color: "#6b6250", fontSize: 12, marginTop: 3, fontFamily: "ui-monospace, monospace" }}>
                {imp.source_format.toUpperCase()} · {imp.period_start ?? "?"} → {imp.period_end ?? "?"}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

function statusColor(status: string): string {
  if (status === "reconciled") return "#2f6b3a";
  if (status === "needs_review") return "#b08422";
  return "#8a7d61";
}
