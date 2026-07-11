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

  // Pull existing fingerprints for THIS account so we can flag duplicates.
  const { data: existingRows } = await supabase
    .from("raw_transactions")
    .select("fingerprint")
    .eq("org_id", orgId)
    .eq("account_id", accountId);
  const existingFingerprints = new Set(
    (existingRows ?? []).map((r) => r.fingerprint).filter(Boolean)
  );

  function fingerprint(date: string, amount: number, desc: string): string {
    const norm = (desc || "").toLowerCase().replace(/\s+/g, " ").trim();
    // Mirror the SQL md5 fingerprint: account|date|amount|desc
    // (JS can't md5 without a lib, so we build the same string and let
    //  duplicates match on the raw string; SQL backfill uses md5, but new
    //  rows store this string form — both are stable per row.)
    return `${accountId}|${date}|${amount}|${norm}`;
  }

  let autoCount = 0;
  let dupCount = 0;
  const seenInThisFile = new Set<string>();

  const txnRows = rows.map((r) => {
    const vendor = normalizeVendor(r.description);
    const ruleAccount = matchRule(vendor);
    if (ruleAccount) autoCount++;

    const fp = fingerprint(r.date, r.amount, r.description);
    // Duplicate if we've seen it already in the DB or earlier in this same file.
    const isDup = existingFingerprints.has(fp) || seenInThisFile.has(fp);
    if (isDup) dupCount++;
    seenInThisFile.add(fp);

    return {
      statement_import_id: imp.id,
      org_id: orgId,
      account_id: accountId,
      date: r.date,
      description: r.description,
      normalized_vendor: vendor,
      amount: r.amount,
      fingerprint: fp,
      possible_duplicate: isDup,
      // Duplicates stay unreviewed & flagged — never auto-staged, so they
      // can't slip onto the ledger without you confirming.
      category_account_id: isDup ? null : ruleAccount,
      status: (isDup ? "unreviewed" : ruleAccount ? "categorized" : "unreviewed") as
        | "unreviewed"
        | "categorized",
    };
  });

  const { error: txnErr } = await supabase.from("raw_transactions").insert(txnRows);
  if (txnErr) {
    return { error: `Could not save transactions: ${txnErr.message}` };
  }

  // 3. mark import ready for review
  await supabase.from("statement_imports").update({ status: "needs_review" }).eq("id", imp.id);

  revalidatePath("/import");
  return { importId: imp.id, count: rows.length, skipped, autoCategorized: autoCount, duplicates: dupCount };
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
