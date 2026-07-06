// Minimal, dependency-free CSV parser tuned for bank statement exports.
// Handles quoted fields, commas inside quotes, and common date/amount shapes.

export type ParsedTxn = {
  date: string; // ISO yyyy-mm-dd
  description: string;
  amount: number; // signed: negative = money out, positive = money in
};

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function toISODate(raw: string): string | null {
  const s = raw.trim().replace(/["']/g, "");
  if (!s) return null;

  // already ISO
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  // mm/dd/yyyy or dd/mm/yyyy (assume North American mm/dd for bank exports)
  m = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})$/);
  if (m) {
    let [, a, b, y] = m;
    if (y.length === 2) y = "20" + y;
    const mm = a.padStart(2, "0");
    const dd = b.padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  }

  // Mon dd, yyyy
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return null;
}

function toAmount(raw: string): number | null {
  if (raw == null) return null;
  let s = raw.trim().replace(/["']/g, "");
  if (!s) return null;
  let negative = false;
  // parentheses = negative
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  }
  s = s.replace(/[$,\s]/g, "");
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return negative ? -n : n;
}

// Guess which columns hold date, description, amount (or debit/credit pair).
export function parseStatementCsv(text: string): { rows: ParsedTxn[]; skipped: number } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { rows: [], skipped: 0 };

  const first = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const looksLikeHeader = first.some((h) =>
    /date|description|amount|debit|credit|memo|details|transaction/.test(h)
  );

  let dateIdx = 0;
  let descIdx = 1;
  let amountIdx = -1;
  let debitIdx = -1;
  let creditIdx = -1;
  let startRow = 0;

  if (looksLikeHeader) {
    startRow = 1;
    first.forEach((h, i) => {
      if (dateIdx === 0 && /date/.test(h)) dateIdx = i;
      if (/desc|memo|detail|narration|payee|transaction/.test(h)) descIdx = i;
      if (/amount|value/.test(h)) amountIdx = i;
      if (/debit|withdrawal|out/.test(h)) debitIdx = i;
      if (/credit|deposit|in\b/.test(h)) creditIdx = i;
    });
    if (!/date/.test(first[dateIdx] || "")) {
      const di = first.findIndex((h) => /date/.test(h));
      if (di >= 0) dateIdx = di;
    }
  }

  const rows: ParsedTxn[] = [];
  let skipped = 0;

  for (let i = startRow; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const date = toISODate(cols[dateIdx] ?? "");
    if (!date) {
      skipped++;
      continue;
    }
    const description = (cols[descIdx] ?? "").replace(/\s+/g, " ").trim() || "(no description)";

    let amount: number | null = null;
    if (amountIdx >= 0) {
      amount = toAmount(cols[amountIdx] ?? "");
    } else if (debitIdx >= 0 || creditIdx >= 0) {
      const debit = debitIdx >= 0 ? toAmount(cols[debitIdx] ?? "") : null;
      const credit = creditIdx >= 0 ? toAmount(cols[creditIdx] ?? "") : null;
      if (debit) amount = -Math.abs(debit);
      else if (credit) amount = Math.abs(credit);
    } else {
      // fallback: last numeric-looking column
      for (let c = cols.length - 1; c >= 0; c--) {
        const a = toAmount(cols[c]);
        if (a !== null) {
          amount = a;
          break;
        }
      }
    }

    if (amount === null) {
      skipped++;
      continue;
    }
    rows.push({ date, description, amount });
  }

  return { rows, skipped };
}
