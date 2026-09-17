import { evidenceClauses, escapePattern } from "./evidence-text.mjs";

/** Evaluate each capability mention against its own clause and predicate.
 * Unknown research language is not a denial. Lists inherit a shared predicate,
 * while a contrast or a new predicate starts a separate clause.
 */
export function publishedCapabilityStatus(value, terms) {
  if (!terms.length) return "unknown";
  const mention = new RegExp(`\\b(?:${[...new Set(terms)].map(escapePattern).join("|")})(?:ed|ing)?\\b`, "gi");
  let positive = false;
  let negative = false;
  for (const clause of evidenceClauses(value)) {
    for (const match of clause.matchAll(mention)) {
      const before = clause.slice(0, match.index);
      const after = clause.slice(match.index + match[0].length);
      // Do not treat absence of published evidence as an explicit exclusion.
      if (/\b(?:seed|unused|unknown|unpublished|unverified|unconfirmed|not (?:(?:yet|currently) )?(?:publicly )?(?:published|stated|established|confirmed|verified|a stated))\b/i.test(clause)) continue;
      const excludedBefore = /\b(?:no|not|without|cannot|can't|doesn't|don't|neither)\b/i.test(before.replace(/\bnot only\b/gi, ""));
      // Strip a shared subject list before inspecting the trailing predicate.
      // Clause splitting already separated subjects with independent predicates.
      const predicateAfter = after.replace(/^(?:(?:\s*,\s*|\s+(?:and|or)\s+)[\w-]+(?:\s+(?!is\b|are\b|was\b|were\b|isn't\b|aren't\b|and\b|or\b)[\w-]+)*)+(?=\s+(?:is|are|was|were|isn't|aren't)\b)/i, "");
      const excludedAfter = /^(?:\s+(?:production|processing|capability|service|runs?|batches|products?))?\s*(?:(?:is|are|was|were)\s+(?:currently\s+)?)?(?:not\s+(?:(?:currently|yet)\s+)?(?:offered|available|supported|provided|possible)|unavailable|unsupported|excluded)\b/i.test(predicateAfter)
        || /^\s+(?:isn't|aren't)\s+(?:yet\s+)?(?:offered|available|supported|provided)\b/i.test(predicateAfter);
      if (excludedBefore || excludedAfter) negative = true;
      else positive = true;
    }
  }
  return positive && negative ? "conflicting" : negative ? "mismatch" : positive ? "supported" : "unknown";
}
