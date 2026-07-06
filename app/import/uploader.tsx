"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { importCsv } from "./actions";

type Account = { id: string; code: string; name: string };

const ink = "#14110c";
const brass = "#b08422";
const cream = "#f4efe4";
const paper = "#fdfbf6";

export default function ImportUploader({ orgId, accounts }: { orgId: string; accounts: Account[] }) {
  const router = useRouter();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    if (file.name.toLowerCase().endsWith(".pdf")) {
      setMsg("PDF parsing isn't wired up yet — export your statement as CSV for now.");
      setCsvText("");
      return;
    }
    const text = await file.text();
    setCsvText(text);
    setMsg("");
  }

  async function submit() {
    if (!accountId) {
      setMsg("Pick an account first.");
      return;
    }
    if (!csvText) {
      setMsg("Choose a CSV file first.");
      return;
    }
    setBusy(true);
    setMsg("");

    const fd = new FormData();
    fd.set("org_id", orgId);
    fd.set("account_id", accountId);
    fd.set("file_name", fileName || "statement.csv");
    fd.set("csv_text", csvText);

    const res = await importCsv(fd);
    setBusy(false);

    if (res.error) {
      setMsg(res.error);
      return;
    }
    router.push(`/import/${res.importId}?org=${orgId}`);
  }

  return (
    <div style={{ background: cream, border: `1px solid ${brass}`, borderRadius: 4, padding: "1.5rem" }}>
      <label style={labelStyle}>Bank / card account</label>
      <select value={accountId} onChange={(e) => setAccountId(e.target.value)} style={selectStyle}>
        {accounts.length === 0 && <option value="">No accounts found</option>}
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.code} — {a.name}
          </option>
        ))}
      </select>

      <label style={{ ...labelStyle, marginTop: 16 }}>Statement file (CSV)</label>
      <input type="file" accept=".csv,.pdf,text/csv" onChange={onFile} style={{ fontSize: 14, color: ink, marginBottom: 4 }} />
      {fileName && <div style={{ fontSize: 12, color: "#6b6250", marginTop: 4, fontFamily: "ui-monospace, monospace" }}>{fileName}</div>}

      <button onClick={submit} disabled={busy} style={{ ...buttonStyle, opacity: busy ? 0.6 : 1, marginTop: 18 }}>
        {busy ? "Reading…" : "Import & review"}
      </button>

      {msg && <div style={{ marginTop: 12, fontSize: 13, color: "#8a2a2a", lineHeight: 1.5 }}>{msg}</div>}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#7a6f59",
  marginBottom: 6,
  fontFamily: "ui-monospace, monospace",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  fontSize: 15,
  border: "1px solid #cdbf9e",
  borderRadius: 3,
  background: paper,
  color: ink,
  fontFamily: "ui-serif, Georgia, serif",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  fontSize: 14,
  fontWeight: 600,
  color: cream,
  background: ink,
  border: `1px solid ${ink}`,
  borderRadius: 3,
  cursor: "pointer",
};
