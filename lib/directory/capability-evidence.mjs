/** Interpret only statements containing the capability; a mention in a negation
 * or an unresolved research note is not positive evidence. */
export function publishedCapabilityStatus(value, terms) {
  const escaped = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const term = `(?:${escaped.join("|")})`;
  const mentions = new RegExp(`\\b${term}(?:ed|ing)?\\b`, "i");
  const negative = new RegExp(`\\b(?:no|not|without|cannot|doesn't)\\b[^.;\\n]{0,75}\\b${term}(?:ed|ing)?\\b`, "i");
  const statements = value.split(/[;\n]|\.(?:\s|$)/).filter((part) => mentions.test(part));
  let positive = false;
  let disproven = false;
  for (const statement of statements) {
    if (/\b(?:seed|unused|unknown|unpublished|unverified|unconfirmed|not published|not stated|not established|not confirmed)\b/i.test(statement)) continue;
    if (negative.test(statement)) disproven = true;
    else positive = true;
  }
  return positive && disproven ? "conflicting" : disproven ? "mismatch" : positive ? "supported" : "unknown";
}
