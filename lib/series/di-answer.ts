// Shared between server and client. Data Insights answers with several parts
// are stored and sent as a canonical JSON string, e.g. {"col1":1,"col2":3}.
// Letter answers (Verbal, Quant, DI single-choice) are unchanged.

export function canonicalDi(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      out[k] = sortKeys((v as Record<string, unknown>)[k]);
    }
    return out;
  }
  return v;
}

// A multi-part answer string is accepted only if it parses to a JSON object
// no longer than 500 characters.
export function isDiPartAnswer(s: string): boolean {
  if (s.length > 500 || !s.startsWith("{")) return false;
  try {
    const parsed = JSON.parse(s);
    return !!parsed && typeof parsed === "object" && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

// Correct only if every part matches the key exactly.
export function diAnswerCorrect(picked: string | null, key: string): boolean {
  if (!picked) return false;
  try {
    return canonicalDi(JSON.parse(picked)) === canonicalDi(JSON.parse(key));
  } catch {
    return false;
  }
}
