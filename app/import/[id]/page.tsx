import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import PostPanel from "./post-panel";

export const dynamic = "force-dynamic";

const C = { bg:'#0D0D0D', card:'#111', border:'#1e1e1e', gold:'#FFD60A', orange:'#ff6b35', red:'#D91F26', green:'#3ddc84', text:'#F2F2F2', muted:'#666', dim:'#2a2a2a', purple:'#c084fc' };
const display = { fontFamily:"'Anton',sans-serif", letterSpacing:'0.02em', textTransform:'uppercase' as const };
const mono = { fontFamily:"'Space Mono',monospace" };

const money = (n:number)=>`$${Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const money0 = (n:number)=>`$${Math.round(Number(n||0)).toLocaleString('en-US')}`;

export default async function ImportReviewPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ org?: string }> }) {
  const { id } = await params;
  const { org: orgId } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!orgId) redirect("/");

  const { data: imp } = await supabase
    .from("statement_imports")
    .select("id, file_name, period_start, period_end, status")
    .eq("id", id).single();
  if (!imp) redirect(`/import?org=${orgId}`);

  const { data: txns } = await supabase
    .from("raw_transactions")
    .select("id, date, description, normalized_vendor, amount, status, category_account_id")
    .eq("statement_import_id", id).order("date");

  const rows = txns ?? [];
  const moneyIn  = rows.filter(t => Number(t.amount) > 0).reduce((s,t)=>s+Number(t.amount),0);
  const moneyOut = rows.filter(t => Number(t.amount) < 0).reduce((s,t)=>s+Number(t.amount),0);

  const unreviewed  = rows.filter(t=>t.status==='unreviewed').length;
  const categorized = rows.filter(t=>t.status==='categorized').length;
  const posted      = rows.filter(t=>t.status==='posted').length;

  return (
    <main style={{ minHeight:"100vh", background:C.bg, color:C.text, ...mono }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 18px', borderBottom:`1px solid ${C.border}` }}>
        <Link href={`/import?org=${orgId}`} style={{ ...mono, color:C.muted, fontSize:18, textDecoration:"none" }}>←</Link>
        <div style={{ ...display, fontSize:20, color:C.orange, lineHeight:1 }}>{imp.file_name}</div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 20px 60px" }}>
        <div style={{ ...mono, color:C.muted, fontSize:11, marginBottom:14, letterSpacing:'0.1em' }}>
          {imp.period_start} → {imp.period_end} · {rows.length} TRANSACTIONS · {String(imp.status).replace('_',' ').toUpperCase()}
        </div>

        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          <Stat label="MONEY IN"  value={money0(moneyIn)}            color={C.green} />
          <Stat label="MONEY OUT" value={money0(Math.abs(moneyOut))} color={C.red} />
        </div>

        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          <Stat label="TO REVIEW" value={String(unreviewed)}  color={unreviewed?C.orange:C.muted} />
          <Stat label="STAGED"    value={String(categorized)} color={categorized?C.gold:C.muted} />
          <Stat label="POSTED"    value={String(posted)}      color={posted?C.green:C.muted} />
        </div>

        <PostPanel importId={id} orgId={orgId} categorized={categorized} unreviewed={unreviewed} />

        <div style={{ ...mono, fontSize:9, letterSpacing:"0.35em", color:C.muted, margin:"28px 0 12px" }}>PARSED ROWS</div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:4, overflow:"hidden" }}>
          {rows.map((t, i) => (
            <div key={t.id} style={{
              display:"grid", gridTemplateColumns:"78px 1fr 100px 70px", gap:10,
              padding:"11px 14px", borderTop: i===0 ? "none" : `1px solid ${C.border}`,
              fontSize:12, alignItems:"center",
            }}>
              <span style={{ ...mono, color:C.dim, fontSize:11 }}>{t.date}</span>
              <span style={{ ...mono, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {t.normalized_vendor || t.description}
              </span>
              <span style={{ ...mono, color: Number(t.amount)<0 ? C.red : C.green, textAlign:"right" }}>
                {money(Number(t.amount))}
              </span>
              <span style={{ ...mono, fontSize:8, letterSpacing:'0.1em', textAlign:'right', color: statusColor(t.status), fontWeight:700 }}>
                {String(t.status).toUpperCase()}
              </span>
            </div>
          ))}
          {rows.length === 0 && <div style={{ padding:"20px", ...mono, color:C.dim, fontSize:12 }}>No transactions in this import.</div>}
        </div>
      </div>
    </main>
  );
}

function Stat({label,value,color}:{label:string;value:string;color:string}) {
  return (
    <div style={{ flex:1, background:C.card, border:`1px solid ${C.border}`, borderRadius:3, padding:"10px 12px" }}>
      <div style={{ ...mono, fontSize:9, letterSpacing:'0.3em', color:C.muted, marginBottom:4 }}>{label}</div>
      <div style={{ ...display, fontSize:20, color }}>{value}</div>
    </div>
  );
}

function statusColor(s: string): string {
  if (s === 'posted') return C.green;
  if (s === 'categorized') return C.gold;
  if (s === 'ignored') return C.dim;
  return C.orange;
}
