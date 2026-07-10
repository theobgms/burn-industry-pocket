"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const C = { card:'#111', border:'#1e1e1e', gold:'#FFD60A', orange:'#ff6b35', red:'#D91F26', green:'#3ddc84', text:'#F2F2F2', muted:'#666', dim:'#2a2a2a' };
const mono = { fontFamily:"'Space Mono',monospace" };

export default function PostPanel({ importId, orgId, categorized, unreviewed }:{
  importId:string; orgId:string; categorized:number; unreviewed:number;
}) {
  const router = useRouter();
  const [busy,setBusy] = useState(false);
  const [msg,setMsg]   = useState("");
  const [err,setErr]   = useState("");

  async function postAll() {
    setBusy(true); setErr(""); setMsg("");
    const supabase = createClient();
    const { data, error } = await supabase.rpc("post_import", { p_import: importId });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setMsg(`${data ?? 0} transactions posted to the ledger.`);
    router.refresh();
  }

  if (categorized === 0 && unreviewed === 0) {
    return (
      <div style={{ background:'#0a1005', border:`1px solid ${C.green}`, borderRadius:4, padding:"16px", textAlign:'center' }}>
        <div style={{ ...mono, fontSize:11, color:C.green, fontWeight:700, letterSpacing:'0.2em' }}>RECONCILED</div>
        <div style={{ ...mono, fontSize:11, color:C.muted, marginTop:6 }}>Every row is on the ledger.</div>
      </div>
    );
  }

  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderLeft:`3px solid ${C.gold}`, borderRadius:4, padding:"16px" }}>
      <div style={{ ...mono, fontSize:9, letterSpacing:'0.35em', color:C.gold, marginBottom:6 }}>POST TO THE LEDGER</div>
      <div style={{ ...mono, fontSize:11, color:C.muted, lineHeight:1.6, marginBottom:14 }}>
        {unreviewed > 0
          ? `${unreviewed} row${unreviewed===1?'':'s'} still need a category. Categorize them in REVIEW, then come back.`
          : `${categorized} categorized row${categorized===1?'':'s'} ready. Posting writes balanced double-entries and moves your P&L.`}
      </div>

      <div style={{ display:'flex', gap:8 }}>
        <Link href="/" style={{ ...mono, flex:1, textAlign:'center', background:'transparent', border:`1px solid ${C.orange}`, borderRadius:3, color:C.orange, fontSize:10, letterSpacing:'0.2em', fontWeight:700, padding:'12px', textDecoration:'none' }}>
          GO TO REVIEW
        </Link>
        <button onClick={postAll} disabled={busy || categorized===0}
          style={{ ...mono, flex:1, background: busy||categorized===0 ? C.dim : C.gold, border:'none', borderRadius:3,
            color: busy||categorized===0 ? C.muted : '#0D0D0D', fontSize:10, letterSpacing:'0.2em', fontWeight:700,
            padding:'12px', cursor: busy||categorized===0 ? 'not-allowed' : 'pointer' }}>
          {busy ? 'POSTING…' : `✓ POST ${categorized}`}
        </button>
      </div>

      {msg && <div style={{ ...mono, fontSize:11, color:C.green, marginTop:12 }}>{msg}</div>}
      {err && <div style={{ ...mono, fontSize:11, color:C.red, marginTop:12, lineHeight:1.6 }}>{err}</div>}
    </div>
  );
}
