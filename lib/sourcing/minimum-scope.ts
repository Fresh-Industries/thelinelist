type Offer = "pilot" | "private-label" | "wholesale" | "custom";

function offerIn(value: string): Offer | null {
  if (/private[- ]label|custom label/i.test(value)) return "private-label";
  if (/wholesale|unlabeled products/i.test(value)) return "wholesale";
  if (/pilot|trial|test[- ](?:run|batch)/i.test(value)) return "pilot";
  if (/commercial|co-?pack|custom[- ](?:recipe|formula|production)/i.test(value)) return "custom";
  return null;
}

/** Only select terms for the requested offer. Preserve original wording for review.
 * An unspecified request refers to custom production, never a stock-label order.
 */
export function selectProductionMinimum(request: string, published: string | null): {
  text: string | null;
  reason?: string;
  scope?: string;
} {
  if (!published) return { text: null };
  const requestedOffer = offerIn(request) ?? "custom";
  if (/\b(?:also (?:says|cites)|contact form states|conflict|contradict)/i.test(published)) {
    return { text: null, reason: "Published minimums differ across sources or offers. Ask which minimum applies to this project." };
  }
  const segments = published.split(/;|\.(?:\s|$)/);
  const scoped = segments.filter((segment) => offerIn(segment));
  const selected = scoped.length
    ? segments.filter((segment) => offerIn(segment) === requestedOffer)
    : requestedOffer === "custom" ? segments : [];
  if (!selected.length) {
    return { text: null, reason: "The published minimum describes a different offer. Confirm separate pilot, private-label, and custom-production terms." };
  }
  const text = selected.filter((segment) => !/^(?:\s*orders placed|\s*reorders|\s*maximum)/i.test(segment)).join("; ").replace(/,?\s*with orders placed at least quarterly/i, "").trim();
  if (/\b(?:annual|quarter|quarterly|per (?:year|month|week|day|hour)|capacity|warehouse|storage rental|lowest band|inquiry form|typical|average|standard batch|range|batch sizes)\b/i.test(text)
    || /\$|\b(?:dollars?|USD)\b/i.test(text)) {
    return { text: null, reason: "Published quantities describe an estimate, capacity, time commitment, price, or inquiry band. The production minimum needs confirmation." };
  }
  if (/\b(?:unknown|not published|not stated|unpublished|not a (?:production )?minimum)\b/i.test(text)) return { text: null };
  const scope = text.match(/\bper[- ](SKU|flavo[u]?r|product|run|batch|order)\b/i)?.[1].toLowerCase().replace("flavour", "flavor");
  return { text, scope };
}

export function requestHasMinimumScope(request: string, scope: string): boolean {
  const term = scope === "flavor" ? "flavo[u]?r" : scope;
  if (new RegExp(`\\b(?:per|each|one|single|1)\\s+${term}\\b`, "i").test(request)) return true;
  // An unqualified production quantity describes the first run. Multiple runs,
  // orders, or a different per-item basis still need an explicit allocation.
  return (scope === "run" || scope === "batch")
    && !/\b(?:annual|year|quarter|month|per|each|across|split between|orders?|runs?|batches)\b/i.test(request);
}
