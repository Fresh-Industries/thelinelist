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

export interface GeographyMatchPreflightResponse {
  matchingAttempted: false;
  resultsShown: false;
  matchingGuidance: {
    strictSearchReturnedNoResults: false;
    geographyInputNeedsClarification: true;
    instruction: string;
  };
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
  const stateCode = uppercaseCode && STATE_CODES.has(uppercaseCode) ? uppercaseCode : null;
  if (stateCode) return { understood: true, label: STATE_NAMES[stateCode], stateCodes: [stateCode] };

  const region = Object.entries(REGION_STATES).find(([term]) => normalized.includes(term))?.[1];
  if (region) return { understood: true, label: region.label, stateCodes: region.states };

  return { understood: false, label: value.trim(), stateCodes: [] };
}

export function getGeographyMatchPreflight(value: unknown): GeographyMatchPreflightResponse | null {
  if (typeof value !== "string" || interpretGeographyPreference(value).understood) return null;

  return {
    matchingAttempted: false,
    resultsShown: false,
    matchingGuidance: {
      strictSearchReturnedNoResults: false,
      geographyInputNeedsClarification: true,
      instruction: "This geography cannot be evaluated precisely yet. Ask for a state name, an uppercase two-letter state code, or a supported region such as Midwest, Northeast, Southeast, Southwest, or West before matching.",
    },
  };
}
