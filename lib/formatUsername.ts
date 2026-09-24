/**
 * Display Title Case for usernames (ademola → Ademola, john_doe → John_Doe).
 * Usernames are ASCII `[A-Za-z0-9_]`; first letter of each `_`-segment is uppercased.
 */
export function formatUsername(raw: string | null | undefined): string {
  const s = (raw ?? '').trim();
  if (!s) {
    return '';
  }
  let out = '';
  let capNext = true;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i]!;
    if (ch === '_') {
      out += ch;
      capNext = true;
      continue;
    }
    if (capNext) {
      out += ch.toUpperCase();
      capNext = false;
    } else {
      out += ch.toLowerCase();
    }
  }
  return out;
}
