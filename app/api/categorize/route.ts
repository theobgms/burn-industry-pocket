import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { org_id, question, amount } = await req.json();
    if (!org_id || !question?.trim()) {
      return NextResponse.json({ error: "Missing org or question" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "API key not configured" }, { status: 500 });

    // Auth + the org's real chart of accounts (so Claude answers with YOUR accounts).
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const { data: accounts } = await supabase
      .from("chart_of_accounts")
      .select("id, code, name, type")
      .eq("org_id", org_id).eq("is_active", true).order("code");

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ error: "No chart of accounts found for this org" }, { status: 404 });
    }

    const list = accounts.map((a) => `${a.code} | ${a.name} | ${a.type}`).join("\n");

    const prompt = `You are a bookkeeping assistant for an independent record label and touring band (Burn Industry / The OBGMs). Classify the transaction into exactly ONE account from this chart of accounts:

${list}

Rules:
- Choose the single best account by its code.
- If the user gives you "Additional context", TRUST IT over the raw bank description. The bank text is often generic (e.g. "e-transfer sent") and the user's context tells you what the money was actually for.
- Think about direction: money RECEIVED is usually income; money SPENT is an expense or cost of goods.
- Example: rent RECEIVED from a sub-tenant on a studio the user leases is rental INCOME (a specific rent/rental income account if one exists), NOT a generic "other income".
- Avoid vague catch-all accounts like "Other Income" or "Miscellaneous" unless nothing else fits at all. Prefer the most specific matching account.
- If genuinely ambiguous even with context, pick the closest specific account and explain the assumption.

Respond ONLY with JSON, no markdown, no backticks:
{"code":"<account code>","name":"<account name>","reason":"<one sentence, plain English>"}

Transaction${amount ? ` (amount ${amount})` : ""}: ${question.trim()}`;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 400, messages: [{ role: "user", content: prompt }] }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      return NextResponse.json({ error: "Claude API error", detail: t }, { status: 502 });
    }

    const data = await resp.json();
    const raw = (data.content || []).map((i: any) => i.text || "").join("");
    const clean = raw.replace(/```json|```/g, "").trim();

    let parsed;
    try { parsed = JSON.parse(clean); }
    catch { return NextResponse.json({ error: "Could not parse answer", raw: clean }, { status: 502 }); }

    // Resolve the code back to a real account id from THIS org.
    const match = accounts.find((a) => String(a.code) === String(parsed.code));
    return NextResponse.json({
      account_id: match?.id ?? null,
      code: parsed.code,
      name: match?.name ?? parsed.name,
      type: match?.type ?? null,
      reason: parsed.reason,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error", detail: String(e) }, { status: 500 });
  }
}
