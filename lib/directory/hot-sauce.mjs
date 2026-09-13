import { publishedCapabilityStatus } from "./capability-evidence.mjs";

/** Shared by CSV ingestion, directory profiles/filters, and founder matching.
 * Product language alone never establishes process, storage, or packaging fit.
 */
export const HOT_SAUCE_PATTERN = /\bhot[\s-]+sauces?\b/i;

export function hasHotSauceClaim(value = "") {
  const status = publishedCapabilityStatus(value, ["hot sauce", "hot sauces", "hot-sauce", "hot-sauces"]);
  if (status === "mismatch" || status === "conflicting") return false;
  return value.split(/[;\n]|\.(?:\s|$)/).some((statement) => (
    HOT_SAUCE_PATTERN.test(statement)
    && !/\b(?:no|not|without|except|excluding|unknown|unconfirmed|unverified)\b/i.test(statement)
    && !/\b(?:dry|powder(?:ed)?)\s+hot[\s-]+sauces?\b|\bhot[\s-]+sauces?\s+(?:powder|seasoning|mix)\b/i.test(statement)
  ));
}
