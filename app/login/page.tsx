"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function sendLink() {
    if (!email.trim()) return;
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <div style={styles.wordmark}>Burn Industry Pocket</div>
        <div style={styles.rule} />
        <p style={styles.sub}>Double-entry books for Burn Industry Inc. &amp; The OBGMs Inc.</p>

        {status === "sent" ? (
          <div style={styles.sentBox}>
            <div style={styles.sentTitle}>Check your email</div>
            <div style={styles.sentBody}>
              A sign-in link is on its way to <strong>{email}</strong>. Open it on this device.
            </div>
          </div>
        ) : (
          <>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendLink()}
              placeholder="denz@burnindustry.com"
              style={styles.input}
              autoFocus
            />
            <button
              onClick={sendLink}
              disabled={status === "sending"}
              style={{ ...styles.button, opacity: status === "sending" ? 0.6 : 1 }}
            >
              {status === "sending" ? "Sending…" : "Send sign-in link"}
            </button>
            {status === "error" && <div style={styles.error}>{message}</div>}
          </>
        )}
      </div>
    </main>
  );
}

const ink = "#14110c";
const brass = "#b08422";
const cream = "#f4efe4";

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: ink,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1.5rem",
    fontFamily: "ui-serif, Georgia, 'Times New Roman', serif",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    background: cream,
    border: `1px solid ${brass}`,
    borderRadius: 4,
    padding: "2.5rem",
  },
  wordmark: {
    fontSize: 26,
    fontWeight: 600,
    color: ink,
    letterSpacing: "-0.01em",
  },
  rule: {
    height: 1,
    background: brass,
    margin: "1rem 0 1.25rem",
    opacity: 0.5,
  },
  sub: {
    fontSize: 14,
    color: "#5b5344",
    margin: "0 0 1.75rem",
    lineHeight: 1.5,
  },
  label: {
    display: "block",
    fontSize: 11,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#7a6f59",
    marginBottom: 6,
    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    fontSize: 15,
    border: `1px solid #cdbf9e`,
    borderRadius: 3,
    background: "#fdfbf6",
    color: ink,
    outline: "none",
    marginBottom: 16,
    fontFamily: "ui-serif, Georgia, serif",
  },
  button: {
    width: "100%",
    padding: "12px",
    fontSize: 14,
    fontWeight: 600,
    color: cream,
    background: ink,
    border: `1px solid ${ink}`,
    borderRadius: 3,
    cursor: "pointer",
    letterSpacing: "0.02em",
  },
  error: {
    marginTop: 12,
    fontSize: 13,
    color: "#8a2a2a",
  },
  sentBox: {
    padding: "1rem",
    background: "#fdfbf6",
    border: `1px solid #cdbf9e`,
    borderRadius: 3,
  },
  sentTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: ink,
    marginBottom: 6,
  },
  sentBody: {
    fontSize: 14,
    color: "#5b5344",
    lineHeight: 1.5,
  },
};
