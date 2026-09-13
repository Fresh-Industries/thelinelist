import { EACH_SCOPE, evidenceClauses, quantityAllocation } from "@/lib/directory/evidence-text.mjs";

type Offer = "pilot" | "private-label" | "wholesale" | "custom";
const OFFER_PATTERNS: Array<[Offer, RegExp]> = [
  ["private-label", /\b(?:private[- ]label(?:ing)?|custom label(?:ing)?|white label(?:ing)?)\b/i],
  ["wholesale", /\b(?:wholesale|unlabeled products)\b/i],
  ["pilot", /\b(?:pilot|trial|test[- ](?:run|batch)(?:es|s)?)\b/i],
  ["custom", /\b(?:commercial|co[- ]?pack(?:ing)?|custom[- ](?:recipe|formula|production))\b/i],
];
const OFFER_WORD = "(?:commercial|pilot|trial|private[- ]label|custom[- ](?:label|production|recipe)|co[- ]?packing|wholesale)";
const FLOOR = "(?:minimum|MOQ|floor|starts?\\s+at|starting\\s+at)";
const NUMBER_UNIT = "\\d[\\d,]*(?:\\.\\d+)?\\s+(?:bottles?|jars?|cans?|pouches?|bags?|units?|cases?|gallons?|pounds?|lbs?)";
const SCOPE_PATTERN = EACH_SCOPE.replace(/\((?!\?)/g, "(?:");
const NEXT_CONSTRAINT = `(?:${OFFER_WORD}[^,;.]{0,30}?(?:${FLOOR}|${NUMBER_UNIT})|${FLOOR}|${NUMBER_UNIT}[^,;.]{0,35}?(?:${FLOOR}|for\\s+${OFFER_WORD})|${NUMBER_UNIT}\\s+${SCOPE_PATTERN})`;

function offersIn(value: string): Offer[] {
  return OFFER_PATTERNS.filter(([, pattern]) => pattern.test(value)).map(([offer]) => offer);
}

interface MinimumConstraint { text: string; scopes: string[]; reason?: string }
interface BoundClause { text: string; offer: Offer | null; ambiguous: boolean }

/** Bind quantities before comparison. Explicit offer changes split constraints;
 * conjunctions can continue one offer, while a new unqualified minimum is the
 * general custom-production floor. Ancillary yield/pack notes stay with a floor.
 */
function bindMinimumClauses(published: string): BoundClause[] {
  const result: BoundClause[] = [];
  let headingOffer: Offer | null = null;
  for (const sentence of evidenceClauses(published)) {
    const parts = sentence.split(new RegExp(`(,\\s+|\\s+and\\s+)(?=${NEXT_CONSTRAINT})`, "i"));
    let previousOffer = headingOffer;
    for (let index = 0; index < parts.length; index += 2) {
      let text = parts[index].trim();
      if (!text) continue;
      const offers = offersIn(text);
      const hasQuantity = /\d|\b(?:unknown|unpublished|not published|not stated)\b/i.test(text);
      if (!hasQuantity && offers.length === 1 && /:\s*$/.test(text)) { headingOffer = offers[0]; previousOffer = headingOffer; continue; }
      const hasFloor = new RegExp(`\\b${FLOOR}\\b`, "i").test(text);
      const inheritedFloor = index > 0 && !hasFloor && new RegExp(`^${NUMBER_UNIT}\\s+${EACH_SCOPE}`, "i").test(text);
      const continued = index > 0 && (/and/i.test(parts[index - 1]) || inheritedFloor);
      const offer = offers.length === 1 ? offers[0] : offers.length > 1 ? null : continued ? previousOffer : headingOffer;
      // Equivalent yields and package lists do not introduce another offer or floor.
      const previous = result.at(-1);
      if (inheritedFloor && previous && new RegExp(`\\b${FLOOR}\\b`, "i").test(previous.text)) text = `Minimum ${text}`;
      if (!offers.length && !hasFloor && !inheritedFloor && previous && !/^(?:orders placed|reorders|maximum)/i.test(text)) previous.text += `; ${text}`;
      else if (hasQuantity || hasFloor) result.push({ text, offer: offer ?? (offers.length ? null : "custom"), ambiguous: offers.length > 1 });
      previousOffer = offer;
    }
  }
  return result;
}

export function selectProductionMinimum(request: string, published: string | null): {
  constraints: MinimumConstraint[];
  reason?: string;
} {
  if (!published) return { constraints: [] };
  const offers = offersIn(request);
  if (offers.length > 1) return { constraints: [], reason: "Confirm whether this quantity is for a pilot, private-label order, or custom commercial production." };
  const requestedOffer = offers[0] ?? "custom";
  const clauses = bindMinimumClauses(published);
  if (clauses.some((clause) => clause.ambiguous)
    || /\b(?:also (?:says|cites)|contact form states|conflict|contradict)/i.test(published)) {
    return { constraints: [], reason: "Published minimums differ across sources or cannot be bound to a single offer. Ask which terms apply to this project." };
  }
  const selected = clauses.filter((clause) => clause.offer === requestedOffer);
  if (!selected.length) return { constraints: [], reason: "The published minimum describes a different offer. Confirm separate pilot, private-label, and custom-production terms." };
  return { constraints: selected.map((clause) => {
    const text = clause.text.replace(/,?\s*with orders placed at least quarterly/i, "").trim();
    const scopes = [...new Set<string>(quantityAllocation(text).each)];
    const quantityList = new RegExp(`${NUMBER_UNIT}\\s*,\\s*${NUMBER_UNIT}`, "i").test(text);
    const qualified = /\b(?:annual|quarter|quarterly|per (?:year|month|week|day|hour)|capacity|warehouse|storage rental|lowest band|inquiry form|typical|average|standard batch|range|batch sizes)\b/i.test(text) || /\$|\b(?:dollars?|USD)\b/i.test(text);
    if (quantityList) return { text, scopes, reason: "Several quantities are listed without separate minimum terms. Confirm which quantity, offer, and allocation apply." };
    return { text, scopes, ...(qualified ? { reason: "Published quantities describe an estimate, capacity, time commitment, price, or inquiry band. The production minimum needs confirmation." } : {}) };
  }) };
}

export function requestHasMinimumScope(request: string, scope: string): boolean {
  const allocation = quantityAllocation(request);
  if (allocation.across.includes(scope)) return false;
  if (allocation.each.includes(scope) || allocation.single.includes(scope)) return true;
  return (scope === "run" || scope === "batch") && !allocation.across.length && !allocation.each.length
    && !/\b(?:annual|year|quarter|month|orders?|runs?|batches)\b/i.test(request);
}

export function hasDifferentQuantityBasis(request: string, scope: string): boolean {
  return quantityAllocation(request).each.some((basis: string) => basis !== scope);
}
