import { STATE_NAMES } from "@/lib/directory/labels";

const STATE_ALIASES = Object.fromEntries(
  Object.entries(STATE_NAMES).map(([code, name]) => [name.toLowerCase(), code]),
);
const STATE_CODES = new Set(Object.keys(STATE_NAMES));
const REGION_STATES: Record<string, { label: string; states: readonly string[] }> = {
  "pacific northwest": { label: "Pacific Northwest", states: ["ID", "OR", "WA"] },
  "mountain west": { label: "Mountain West", states: ["AZ", "CO", "ID", "MT", "NV", "NM", "UT", "WY"] },
  "mid-atlantic": { label: "Mid-Atlantic", states: ["DE", "DC", "MD", "NJ", "NY", "PA", "VA", "WV"] },
  "mid atlantic": { label: "Mid-Atlantic", states: ["DE", "DC", "MD", "NJ", "NY", "PA", "VA", "WV"] },
  "new england": { label: "New England", states: ["CT", "ME", "MA", "NH", "RI", "VT"] },
  midwest: { label: "Midwest", states: ["IL", "IN", "IA", "KS", "MI", "MN", "MO", "NE", "ND", "OH", "SD", "WI"] },
  northeast: { label: "Northeast", states: ["CT", "ME", "MA", "NH", "RI", "VT", "NJ", "NY", "PA"] },
  southeast: { label: "Southeast", states: ["AL", "AR", "FL", "GA", "KY", "LA", "MS", "NC", "SC", "TN", "VA", "WV"] },
  southwest: { label: "Southwest", states: ["AZ", "NM", "OK", "TX"] },
  west: { label: "West", states: ["AK", "AZ", "CA", "CO", "HI", "ID", "MT", "NV", "NM", "OR", "UT", "WA", "WY"] },
};

export interface GeographyPreference {
  understood: boolean;
  label: string;
  stateCodes: readonly string[];
}

export function interpretGeographyPreference(value: string): GeographyPreference {
  const normalized = value.toLowerCase().replace(/\s+/g, " ").trim();
  const namedState = Object.entries(STATE_ALIASES)
    .sort(([left], [right]) => right.length - left.length)
    .find(([name]) => normalized.includes(name));
  if (namedState) {
    return { understood: true, label: STATE_NAMES[namedState[1]], stateCodes: [namedState[1]] };
  }

  const uppercaseCode = value.match(/\b[A-Z]{2}\b/)?.[0];
  const compactCode = normalized.match(/^(?:near|around|in|close to|within)\s+([a-z]{2})$/)?.[1]?.toUpperCase();
  const stateCode = [uppercaseCode, compactCode].find((code): code is string => Boolean(code && STATE_CODES.has(code)));
  if (stateCode) return { understood: true, label: STATE_NAMES[stateCode], stateCodes: [stateCode] };

  const region = Object.entries(REGION_STATES).find(([term]) => normalized.includes(term))?.[1];
  if (region) return { understood: true, label: region.label, stateCodes: region.states };

  return { understood: false, label: value.trim(), stateCodes: [] };
}
