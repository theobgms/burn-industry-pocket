"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { importCsv } from "./actions";

type Account = { id: string; code: string; name: string };

const C = { bg:'#0D0D0D', card:'#111', border:'#1e1e1e', gold:'#FFD60A', orange:'#ff6b35', red:'#D91F26', green:'#3ddc84', text:'#F2F2F2', muted:'#666', dim:'#2a2a2a' };
const mono = { fontFamily:"'Space Mono',monospace" };

export default function ImportUploader({ orgId, accounts }: { orgId: string; accounts: Account[] }) {
  const router = useRouter();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [drag, setDrag] = useState(false);

  async function readFile(file: File) {
    setFileName(file.name);
    if (file.name.toLowerCase().endsWith(".pdf")) {
      setMsg("PDF isn't supported yet — export your statement as CSV.");
      setCsvText("");
      return;
    }
    const text = await file.text();
    setCsvText(text);
    setMsg("");
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await readFile(file);
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDrag(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await readFile(file);
  }

  async function submit() {
    if (!accountId) { setMsg("Pick an account first."); return; }
    if (!csvText) { setMsg("Choose a CSV file first."); return; }
    setBusy(true); setMsg("");

    const fd = new FormData();
    fd.set("org_id", orgId);
    fd.set("account_id", accountId);
    fd.set("file_name", fileName || "statement.csv");
    fd.set("csv_text", csvText);

    const res = await importCsv(fd);
    setBusy(false);

    if (res.error) { setMsg(res.error); return; }
    router.push(`/import/${res.importId}?org=${orgId}`);
  }

  const label = { ...mono, display:"block", fontSize:9, letterSpacing:"0.3em", color:C.muted, marginBottom:8, textTransform:"uppercase" as const };

  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:4, padding:"18px 16px" }}>
      <label style={label}>Bank / card account</label>
      <select value={accountId} onChange={(e) => setAccountId(e.target.value)}
        style={{ ...mono, width:"100%", padding:"11px 12px", fontSize:13, border:`1px solid ${C.border}`, borderRadius:3, background:"#0a0a0a", color:C.text, cursor:"pointer", marginBottom:18 }}>
        {accounts.length === 0 && <option value="">No accounts found</option>}
        {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
      </select>

      <label style={label}>Statement file (CSV)</label>
      <label
        onDragOver={(e)=>{e.preventDefault();setDrag(true);}}
        onDragLeave={()=>setDrag(false)}
        onDrop={onDrop}
        style={{ display:"block", border:`1px dashed ${drag?C.orange:C.border}`, background:drag?"#140a05":"#0a0a0a", borderRadius:4, padding:"28px 16px", textAlign:"center", cursor:"pointer", transition:"all .15s" }}>
        <input type="file" accept=".csv,text/csv" onChange={onFile} style={{ display:"none" }} />
        <div style={{ ...mono, fontSize:12, color:fileName?C.text:C.muted }}>
          {fileName || "Drop a CSV here, or tap to choose"}
        </div>
        {fileName && <div style={{ ...mono, fontSize:10, color:C.green, marginTop:6, letterSpacing:'0.1em' }}>READY</div>}
      </label>

      <button onClick={submit} disabled={busy || !csvText}
        style={{ ...mono, width:"100%", marginTop:16, padding:"13px", fontSize:10, letterSpacing:"0.25em", fontWeight:700,
          color: busy||!csvText ? C.muted : "#0D0D0D", background: busy||!csvText ? C.dim : C.orange,
          border:"none", borderRadius:3, cursor: busy||!csvText ? "not-allowed" : "pointer" }}>
        {busy ? "READING…" : "IMPORT & REVIEW →"}
      </button>

      {msg && <div style={{ ...mono, marginTop:12, fontSize:11, color:C.red, lineHeight:1.6 }}>{msg}</div>}
    </div>
  );
}
