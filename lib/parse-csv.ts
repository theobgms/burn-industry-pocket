// Dependency-free statement parser. Auto-detects delimiter (comma or tab),
// skips preamble junk, and handles BMO, RBC, and generic CSV layouts.

export type ParsedTxn = {
  date: string; // ISO yyyy-mm-dd
  description: string;
  amount: number; // signed: negative = money out, positive = money in
};

function splitLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === delim && !inQuotes) {
      out.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim().replace(/^["']|["']$/g, ""));
}

function toISODate(raw: string): string | null {
  const s = (raw || "").trim().replace(/["']/g, "");
  if (!s) return null;

  // BMO: YYYYMMDD (8 digits)
  let m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  // ISO
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  // m/d/yyyy or d/m/yyyy — assume m/d for North American banks (RBC, TD, Amex)
  m = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})$/);
  if (m) {
    let [, a, b, y] = m;
    if (y.length === 2) y = "20" + y;
    return `${y}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`;
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function toAmount(raw: string): number | null {
  if (raw == null) return null;
  let s = String(raw).trim().replace(/["']/g, "");
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1); }
  if (s.startsWith("-")) { negative = true; s = s.slice(1); }
  s = s.replace(/[$,\s]/g, "");
  if (s === "") return null;
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return negative ? -n : n;
}

function cleanDescription(raw: string): string {
  return (
    (raw || "")
      .replace(/\[[A-Z]{2}\]/g, "") // strip BMO [DS] [CW] codes
      .replace(/\s+/g, " ")
      .trim() || ""
  );
}

// Join multiple description columns (RBC has "Description 1" + "Description 2").
function joinDescriptions(parts: string[]): string {
  const cleaned = parts.map(cleanDescription).filter((p) => p.length > 0);
  return cleaned.join(" — ") || "(no description)";
}

function detectDelimiter(lines: string[]): string {
  let tabs = 0, commas = 0;
  for (const l of lines.slice(0, 10)) {
    tabs += (l.match(/\t/g) || []).length;
    commas += (l.match(/,/g) || []).length;
  }
  return tabs > commas ? "\t" : ",";
}

export function parseStatementCsv(text: string): { rows: ParsedTxn[]; skipped: number } {
  const allLines = text.split(/\r?\n/);
  const nonEmpty = allLines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length === 0) return { rows: [], skipped: 0 };

  const delim = detectDelimiter(nonEmpty);

  // Find the header row.
  let headerIdx = -1;
  for (let i = 0; i < nonEmpty.length; i++) {
    const low = nonEmpty[i].toLowerCase();
    if (/date/.test(low) && /amount|debit|credit|description|cad|usd/.test(low)) {
      headerIdx = i;
      break;
    }
  }

  let dateIdx = -1;
  const descIdxs: number[] = [];   // may be several (RBC Description 1 / 2)
  let amountIdx = -1;
  let debitIdx = -1;
  let creditIdx = -1;
  const currencyIdxs: number[] = []; // CAD$ / USD$ style signed columns
  let dataLines: string[];

  if (headerIdx >= 0) {
    const header = splitLine(nonEmpty[headerIdx], delim).map((h) => h.toLowerCase());
    header.forEach((h, i) => {
      if (dateIdx < 0 && /date/.test(h)) dateIdx = i;
      if (/desc|memo|detail|narration|payee/.test(h)) descIdxs.push(i);
      if (/debit|withdrawal/.test(h)) debitIdx = i;
      if (/credit|deposit/.test(h)) creditIdx = i;
      // RBC: "CAD$", "USD$" — signed single-column amounts, one per currency
      if (/cad\$?|usd\$?|amount|value/.test(h) && !/type|number|account/.test(h)) {
        if (/amount|value/.test(h) && amountIdx < 0) amountIdx = i;
        else currencyIdxs.push(i);
      }
    });
    dataLines = nonEmpty.slice(headerIdx + 1);
  } else {
    dateIdx = 0;
    descIdxs.push(1);
    amountIdx = 2;
    dataLines = nonEmpty;
  }

  const rows: ParsedTxn[] = [];
  let skipped = 0;

  for (const line of dataLines) {
    const cols = splitLine(line, delim);
    const date = toISODate(cols[dateIdx] ?? "");
    if (!date) { skipped++; continue; }

    const descParts = descIdxs.length > 0
      ? descIdxs.map((i) => cols[i] ?? "")
      : [cols[1] ?? ""];
    const description = joinDescriptions(descParts);

    let amount: number | null = null;

    // 1) explicit single amount column
    if (amountIdx >= 0) amount = toAmount(cols[amountIdx] ?? "");

    // 2) RBC currency columns: take whichever of CAD$/USD$ has a value (prefer CAD)
    if (amount === null && currencyIdxs.length > 0) {
      for (const ci of currencyIdxs) {
        const a = toAmount(cols[ci] ?? "");
        if (a !== null) { amount = a; break; }
      }
    }

    // 3) separate debit / credit columns
    if (amount === null && (debitIdx >= 0 || creditIdx >= 0)) {
      const debit = debitIdx >= 0 ? toAmount(cols[debitIdx] ?? "") : null;
      const credit = creditIdx >= 0 ? toAmount(cols[creditIdx] ?? "") : null;
      if (debit) amount = -Math.abs(debit);
      else if (credit) amount = Math.abs(credit);
    }

    // 4) fallback: last numeric column on the line
    if (amount === null) {
      for (let c = cols.length - 1; c >= 0; c--) {
        const a = toAmount(cols[c]);
        if (a !== null) { amount = a; break; }
      }
    }

    if (amount === null) { skipped++; continue; }
    rows.push({ date, description, amount });
  }

  return { rows, skipped };
}
