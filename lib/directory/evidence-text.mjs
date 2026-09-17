/** Lexical boundaries shared by capability, program and minimum interpretation.
 * Keep enumerated lists together; a contrast or a new explicit predicate starts
 * a clause. Never split decimal points or thousands separators.
 */
export function evidenceClauses(value = "") {
  const predicate = /\b(?:is|are|was|were|isn't|aren't|offer\w*|provide\w*|support\w*|available|unavailable)\b/i;
  return value.split(/;|\n|[.!?](?:\s+|$)|\s*\b(?:but|however|whereas|(?<!\b(?:not|isn't|aren't)\s+)yet)\b\s*/i)
    .flatMap((sentence) => {
      // A list shares its predicate ("A and B are not offered"). Split only
      // when both sides have their own predicate ("A is offered and B is not").
      const pieces = sentence.split(/(,\s+|\s+and\s+)/i);
      const clauses = [pieces[0]];
      for (let index = 1; index < pieces.length; index += 2) {
        const next = pieces[index + 1];
        if (predicate.test(clauses.at(-1)) && predicate.test(next)) clauses.push(next);
        else clauses[clauses.length - 1] += pieces[index] + next;
      }
      return clauses;
    })
    .map((text) => text.trim().replace(/^,\s*/, ""))
    .filter(Boolean);
}

export function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const SCOPE_NOUN = "(?:SKUs?|flavo[u]?rs?|products?|runs?|batch(?:es)?|orders?)";
const EACH_START = "(?:(?:for\\s+)?(?:each|every)|per)";
const ACROSS_START = "(?:across|over|split|distributed|divided|spread)";
export const EACH_SCOPE = `${EACH_START}[\\s-]+(?:production[\\s-]+)?(${SCOPE_NOUN})\\b`;
// The count is not used for arithmetic. Preserve word counts and qualifiers
// without depending on a finite list of number words or assuming equal shares.
export const ACROSS_SCOPE = `${ACROSS_START}\\s+(?:[\\w-]+\\s+)*?(${SCOPE_NOUN})\\b`;
// Capture is deliberately broader than interpretation. Once quantity context
// starts, keep its full wording through the sentence boundary, even if unknown.
export const ALLOCATION_SUFFIX = `\\s*,?\\s*(?:(?:in\\s+)?total|${EACH_START}|${ACROSS_START})\\b[\\s\\S]*?(?=;|\\n|[.!?](?:\\s|$)|$)`;

export function normalizeScope(value) {
  return value.toLowerCase().replace("flavour", "flavor").replace(/batches$/, "batch").replace(/s$/, "");
}

export function quantityAllocation(value) {
  const interpreted = new RegExp(`\\b(?:${EACH_SCOPE}|${ACROSS_SCOPE})`, "gi");
  return {
    each: [...value.matchAll(new RegExp(EACH_SCOPE, "gi"))].map((match) => normalizeScope(match[1])),
    across: [...value.matchAll(new RegExp(ACROSS_SCOPE, "gi"))].map((match) => normalizeScope(match[1])),
    single: [...value.matchAll(new RegExp(`\\b(?:one|single|1)[\\s-]+(?:production[\\s-]+)?(${SCOPE_NOUN})\\b`, "gi"))].map((match) => normalizeScope(match[1])),
    unresolved: new RegExp(`\\b(?:${EACH_START}|${ACROSS_START})\\b`, "i").test(value.replace(interpreted, "")),
  };
}
