import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import ImportUploader from "./uploader";

export const dynamic = "force-dynamic";

const C = { bg:'#0D0D0D', card:'#111', border:'#1e1e1e', gold:'#FFD60A', orange:'#ff6b35', red:'#D91F26', green:'#3ddc84', text:'#F2F2F2', muted:'#666', dim:'#2a2a2a' };
const display = { fontFamily:"'Anton',sans-serif", letterSpacing:'0.02em', textTransform:'uppercase' as const };
const mono = { fontFamily:"'Space Mono',monospace" };

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const { org: orgId } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!orgId) redirect("/");

  const { data: org } = await supabase.from("orgs").select("id, name").eq("id", orgId).single();
  if (!org) redirect("/");

  const { data: accounts } = await supabase
    .from("chart_of_accounts").select("id, code, name")
    .eq("org_id", orgId).eq("is_active", true)
    .in("type", ["asset", "liability"]).order("code");

  const { data: imports } = await supabase
    .from("statement_imports")
    .select("id, file_name, source_format, period_start, period_end, status, created_at")
    .eq("org_id", orgId).order("created_at", { ascending: false });

  return (
    <main style={{ minHeight:"100vh", background:C.bg, color:C.text, ...mono }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 18px', borderBottom:`1px solid ${C.border}` }}>
        <Link href="/" style={{ ...mono, color:C.muted, fontSize:18, textDecoration:"none" }}>←</Link>
        <div style={{ ...display, fontSize:20, color:C.orange, lineHeight:1 }}>IMPORT</div>
        <div style={{ ...mono, fontSize:9, color:C.dim, letterSpacing:'0.2em' }}>{org.name.toUpperCase()}</div>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "20px 20px 60px" }}>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderLeft:`3px solid ${C.orange}`, borderRadius:4, padding:16, marginBottom:10 }}>
          <div style={{ ...mono, fontSize:9, letterSpacing:'0.35em', color:C.orange, marginBottom:6 }}>DROP THE STATEMENT</div>
          <div style={{ ...mono, fontSize:11, color:C.muted, lineHeight:1.6 }}>
            Export a CSV from your bank. Pick which account it came from. Every row lands in REVIEW to be categorized.
          </div>
        </div>

        <ImportUploader orgId={orgId} accounts={accounts ?? []} />

        <div style={{ ...mono, fontSize:9, letterSpacing:"0.35em", color:C.muted, margin:"32px 0 12px" }}>PAST IMPORTS</div>

        {(!imports || imports.length === 0) && (
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:4, padding:16 }}>
            <div style={{ ...mono, color:C.dim, fontSize:12, fontStyle:'italic' }}>Nothing imported yet.</div>
          </div>
        )}

        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {(imports ?? []).map((imp) => (
            <Link key={imp.id} href={`/import/${imp.id}?org=${orgId}`}
              style={{ display:"block", background:C.card, border:`1px solid ${C.border}`, borderLeft:`3px solid ${statusColor(imp.status)}`, borderRadius:4, padding:"14px 16px", textDecoration:"none" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:10 }}>
                <span style={{ ...mono, color:C.text, fontSize:13 }}>{imp.file_name}</span>
                <span style={{ ...mono, color:statusColor(imp.status), fontSize:9, letterSpacing:"0.15em", fontWeight:700, whiteSpace:'nowrap' }}>
                  {imp.status.replace("_", " ").toUpperCase()}
                </span>
              </div>
              <div style={{ ...mono, color:C.muted, fontSize:10, marginTop:5, letterSpacing:'0.1em' }}>
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
  if (status === "reconciled") return C.green;
  if (status === "needs_review") return C.orange;
  return C.muted;
}
