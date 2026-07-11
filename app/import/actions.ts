"use server";

import { createClient } from "@/lib/supabase/server";
import { parseStatementCsv } from "@/lib/parse-csv";
import { revalidatePath } from "next/cache";

// Create a statement_import row + parse the CSV text into raw_transactions.
export async function importCsv(formData: FormData) {
  const orgId = String(formData.get("org_id") || "");
  const accountId = String(formData.get("account_id") || "");
  const fileName = String(formData.get("file_name") || "statement.csv");
  const csvText = String(formData.get("csv_text") || "");

  if (!orgId || !accountId || !csvText) {
    return { error: "Missing org, account, or file contents." };
  }

  const supabase = await createClient();

  const { rows, skipped } = parseStatementCsv(csvText);
  if (rows.length === 0) {
    return { error: `No transactions could be read from this file (skipped ${skipped} lines). Check the format.` };
  }

  const dates = rows.map((r) => r.date).sort();
  const periodStart = dates[0];
  const periodEnd = dates[dates.length - 1];

  // 1. create the import record
  const { data: imp, error: impErr } = await supabase
    .from("statement_imports")
    .insert({
      org_id: orgId,
      account_id: accountId,
      file_name: fileName,
      source_format: "csv",
      period_start: periodStart,
      period_end: periodEnd,
      status: "processing",
    })
    .select("id")
    .single();

  if (impErr || !imp) {
    return { error: `Could not create import: ${impErr?.message ?? "unknown"}` };
  }

  // 2. pull learned rules so we can auto-categorize known vendors on the way in
  const { data: rules } = await supabase
    .from("categorization_rules")
    .select("match_pattern, account_id")
    .eq("org_id", orgId);

  function matchRule(vendor: string): string | null {
    if (!vendor || !rules) return null;
    const exact = rules.find((r) => r.match_pattern === vendor);
    if (exact) return exact.account_id;
    const partial = rules.find(
      (r) => vendor.includes(r.match_pattern) || r.match_pattern.includes(vendor)
    );
    return partial ? partial.account_id : null;
  }

  let autoCount = 0;
  const txnRows = rows.map((r) => {
    const vendor = normalizeVendor(r.description);
    const ruleAccount = matchRule(vendor);
    if (ruleAccount) autoCount++;
    return {
      statement_import_id: imp.id,
      org_id: orgId,
      account_id: accountId,
      date: r.date,
      description: r.description,
      normalized_vendor: vendor,
      amount: r.amount,
      // Known vendor → stage it as categorized; unknown → leave for manual review.
      category_account_id: ruleAccount,
      status: ruleAccount ? ("categorized" as const) : ("unreviewed" as const),
    };
  });

  const { error: txnErr } = await supabase.from("raw_transactions").insert(txnRows);
  if (txnErr) {
    return { error: `Could not save transactions: ${txnErr.message}` };
  }

  // 3. mark import ready for review
  await supabase.from("statement_imports").update({ status: "needs_review" }).eq("id", imp.id);

  revalidatePath("/import");
  return { importId: imp.id, count: rows.length, skipped, autoCategorized: autoCount };
}

// crude vendor normalization: strip trailing store numbers, dates, ref codes
function normalizeVendor(desc: string): string {
  return desc
    .toUpperCase()
    .replace(/#?\d{3,}/g, "")
    .replace(/\b\d{2}\/\d{2}\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}
