// Dependency-free statement parser. Auto-detects delimiter (comma or tab),
// skips preamble junk, and handles BMO's specific export layout plus generic CSVs.

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
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delim && !inQuotes) {
      out.push(cur);
      cur = "";
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

  // mm/dd/yyyy or dd/mm/yyyy (assume mm/dd for North American banks)
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

function cleanDescription(raw: string): string {
  return (raw || "")
    .replace(/\[[A-Z]{2}\]/g, "") // strip BMO [DS] [CW] codes
    .replace(/\s+/g, " ")
    .trim() || "(no description)";
}

// Detect delimiter by counting tabs vs commas across the first several lines.
function detectDelimiter(lines: string[]): string {
  let tabs = 0;
  let commas = 0;
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

  // Find the header row: the first line that names date/amount/description-ish columns.
  let headerIdx = -1;
  for (let i = 0; i < nonEmpty.length; i++) {
    const low = nonEmpty[i].toLowerCase();
    if (/date/.test(low) && (/amount|debit|credit|description/.test(low))) {
      headerIdx = i;
      break;
    }
  }

  let dateIdx = -1;
  let descIdx = -1;
  let amountIdx = -1;
  let debitIdx = -1;
  let creditIdx = -1;
  let dataLines: string[];

  if (headerIdx >= 0) {
    const header = splitLine(nonEmpty[headerIdx], delim).map((h) => h.toLowerCase());
    header.forEach((h, i) => {
      if (dateIdx < 0 && /date/.test(h)) dateIdx = i;
      if (/desc|memo|detail|narration|payee/.test(h)) descIdx = i;
      if (/amount|value/.test(h) && !/type/.test(h)) amountIdx = i;
      if (/debit|withdrawal/.test(h)) debitIdx = i;
      if (/credit|deposit/.test(h)) creditIdx = i;
    });
    dataLines = nonEmpty.slice(headerIdx + 1);
  } else {
    // no header — assume date, description, amount by position
    dateIdx = 0;
    descIdx = 1;
    amountIdx = 2;
    dataLines = nonEmpty;
  }

  const rows: ParsedTxn[] = [];
  let skipped = 0;

  for (const line of dataLines) {
    const cols = splitLine(line, delim);
    const date = toISODate(cols[dateIdx] ?? "");
    if (!date) {
      skipped++;
      continue;
    }
    const description = cleanDescription(cols[descIdx] ?? "");

    let amount: number | null = null;
    if (amountIdx >= 0) {
      amount = toAmount(cols[amountIdx] ?? "");
    } else if (debitIdx >= 0 || creditIdx >= 0) {
      const debit = debitIdx >= 0 ? toAmount(cols[debitIdx] ?? "") : null;
      const credit = creditIdx >= 0 ? toAmount(cols[creditIdx] ?? "") : null;
      if (debit) amount = -Math.abs(debit);
      else if (credit) amount = Math.abs(credit);
    }
    if (amount === null) {
      // fallback: last numeric column
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
