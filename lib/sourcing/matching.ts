import { getDirectoryPlants, type Plant } from "@/lib/directory";
import { FIELD_DEFINITION_BY_KEY } from "./fields";
import { hasMinimumMatchingInfo } from "./readiness";
import type { ManufacturerMatch, MatchEvidence, SourcingFieldKey, SourcingWorkspace } from "./types";

interface RequirementResult {
  key: SourcingFieldKey;
  label: string;
  outcome: "supported" | "mismatch" | "conflicting" | "unknown";
  claim: string;
  sourceField: "products" | "processes" | "packaging" | "minimums" | "certifications";
  notes?: string;
}

const STATE_ALIASES: Record<string, string> = {
  texas: "TX", california: "CA", colorado: "CO", arizona: "AZ", florida: "FL", georgia: "GA",
  illinois: "IL", michigan: "MI", minnesota: "MN", missouri: "MO", "new jersey": "NJ",
  "new york": "NY", ohio: "OH", oregon: "OR", pennsylvania: "PA", tennessee: "TN", washington: "WA",
  wisconsin: "WI",
};

function searchablePlantText(plant: Plant): string {
  return [
    plant.productTypesPublished,
    plant.manufacturingCapabilitiesPublished,
    plant.packaging,
    plant.moqDisplay,
    ...plant.certs,
    ...plant.rawProductTags ?? [],
    ...plant.rawCapabilityTags ?? [],
    ...plant.overview,
  ].filter(Boolean).join(" \n").toLowerCase();
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function fieldValue(workspace: SourcingWorkspace, key: SourcingFieldKey): string | null {
  const field = workspace.fields[key];
  return field.status === "confirmed" ? field.value : null;
}

function inferPreferredState(value: string): string | null {
  const normalized = value.toLowerCase().replace(/\b(?:near|around|in|close to|within)\b/g, " ").trim();
  const abbreviation = normalized.match(/\b[A-Z]{2}\b/i)?.[0].toUpperCase();
  if (abbreviation) return abbreviation;
  return Object.entries(STATE_ALIASES).find(([name]) => normalized.includes(name))?.[1] ?? null;
}

function productRequirement(plant: Plant, value: string): RequirementResult {
  const normalized = value.toLowerCase();
  const categories = new Set(plant.categories ?? []);
  const text = searchablePlantText(plant);
  let supported = false;
  if (includesAny(normalized, ["energy drink", "functional beverage", "sports drink", "wellness drink"])) {
    supported = categories.has("energy-drink") || includesAny(text, ["energy drink", "energy drinks"]);
  } else if (includesAny(normalized, ["sparkling water", "seltzer"])) {
    supported = (categories.has("water") || categories.has("soda")) && includesAny(text, ["sparkling", "seltzer", "carbonated"]);
  } else if (includesAny(normalized, ["banana bread", "bread", "bakery", "cake", "cookie", "muffin"])) {
    supported = categories.has("bakery") && includesAny(text, ["bread", "bakery", "baked", "cake", "cookie", "muffin", "loaf"]);
  } else if (includesAny(normalized, ["protein snack", "snack", "protein bar", "granola", "cracker", "chips"])) {
    supported = categories.has("snacks") && includesAny(text, ["snack", "bar", "granola", "cracker", "chip", "popcorn"]);
  } else if (includesAny(normalized, ["drink", "beverage", "juice", "tea", "coffee"])) {
    supported = plant.finderProducts.includes("beverage");
  } else if (includesAny(normalized, ["sauce", "salsa", "condiment", "marinade"])) {
    supported = plant.finderProducts.includes("sauce");
  } else if (includesAny(normalized, ["soup", "meal", "dip", "prepared", "refrigerated"])) {
    supported = plant.finderProducts.includes("prepared-rte");
  }
  return {
    key: "product_type",
    label: FIELD_DEFINITION_BY_KEY.product_type.label,
    outcome: supported ? "supported" : plant.productTypesPublished ? "unknown" : "unknown",
    claim: supported
      ? includesAny(normalized, ["energy drink", "functional beverage", "sports drink", "wellness drink"])
        ? "Reviewed product information explicitly includes energy drinks."
        : `Reviewed product information includes ${value}.`
      : `A direct fit for ${value} is not publicly established.`,
    sourceField: "products",
  };
}

function evaluateRequirement(plant: Plant, workspace: SourcingWorkspace, key: SourcingFieldKey, value: string): RequirementResult | null {
  const text = searchablePlantText(plant);
  const label = FIELD_DEFINITION_BY_KEY[key].label;
  switch (key) {
    case "product_type":
      return productRequirement(plant, value);
    case "packaging_format": {
      const wanted = value.toLowerCase();
      const terms = wanted.includes("can") ? ["can", "cans", "canning"]
        : wanted.includes("bottle") ? ["bottle", "bottles", "bottling"]
        : wanted.includes("pouch") ? ["pouch", "pouches"]
        : wanted.includes("jar") ? ["jar", "jars"] : [wanted];
      const packaging = plant.packaging?.toLowerCase() ?? "";
      return {
        key, label,
        outcome: packaging && includesAny(packaging, terms) ? "supported" : "unknown",
        claim: packaging && includesAny(packaging, terms) ? `Published packaging includes ${value}.` : `${value} capability is not publicly listed.`,
        sourceField: "packaging",
      };
    }
    case "packaging_size": {
      const normalized = value.toLowerCase().replace(/ounces?/g, "oz").replace(/\s+/g, " ");
      const packaging = plant.packaging?.toLowerCase().replace(/ounces?/g, "oz").replace(/\s+/g, " ") ?? "";
      return {
        key, label,
        outcome: packaging.includes(normalized) ? "supported" : "unknown",
        claim: packaging.includes(normalized) ? `Published packaging includes ${value}.` : `${value} is not publicly listed for the packaging line.`,
        sourceField: "packaging",
      };
    }
    case "carbonation": {
      const wantsCarbonated = /carbonated|carbonation|sparkling/i.test(value);
      const supported = wantsCarbonated && includesAny(text, ["carbonation", "carbonated", "carbonated beverage"]);
      const conflict = wantsCarbonated && includesAny(text, ["non-carbonated", "non carbonated", "still beverages only"]);
      return {
        key, label,
        outcome: conflict ? "mismatch" : supported ? "supported" : "unknown",
        claim: conflict ? "Published information limits the relevant line to non-carbonated products."
          : supported ? "Carbonation is publicly listed as a capability."
          : "Carbonation capability is not publicly listed.",
        sourceField: "processes",
      };
    }
    case "formulation_assistance": {
      if (!/need|required|yes|help|assistance/i.test(value)) return null;
      const supported = includesAny(text, ["formulation", "product development", "recipe development", "r&d", "scale-up", "scale up"]);
      return {
        key, label,
        outcome: supported ? "supported" : "unknown",
        claim: supported ? "Formulation or product-development help is publicly listed." : "Formulation assistance is not publicly listed.",
        sourceField: "processes",
      };
    }
    case "manufacturing_process": {
      const mappings: Array<[RegExp, string[], string]> = [
        [/hot.?fill/i, ["hot fill", "hot-fill"], "hot fill"],
        [/cold.?fill/i, ["cold fill", "cold-fill"], "cold fill"],
        [/retort/i, ["retort"], "retort"],
        [/hpp|high pressure/i, ["hpp", "high pressure"], "HPP"],
        [/aseptic/i, ["aseptic"], "aseptic processing"],
      ];
      const mapping = mappings.find(([pattern]) => pattern.test(value));
      if (!mapping) return null;
      const supported = includesAny(text, mapping[1]);
      return { key, label, outcome: supported ? "supported" : "unknown", claim: supported ? `${mapping[2]} is publicly listed.` : `${mapping[2]} is not publicly listed.`, sourceField: "processes" };
    }
    case "preferred_geography": {
      const state = inferPreferredState(value);
      if (!state) return null;
      const supported = plant.sites.some((site) => site.state === state);
      return {
        key, label,
        outcome: supported ? "supported" : "mismatch",
        claim: supported ? `A listed facility is in ${state}.` : `Listed facilities are outside the ${state} preference.`,
        sourceField: "products",
        notes: supported ? undefined : "Geography is a preference, not a statement about manufacturing capability.",
      };
    }
    case "certifications": {
      const requested = value.split(/[,;/]|\band\b/i).map((part) => part.trim()).filter(Boolean);
      const certText = plant.certs.join(" ").toLowerCase();
      const supported = requested.filter((certification) => certText.includes(certification.toLowerCase()));
      return {
        key, label,
        outcome: supported.length === requested.length && requested.length > 0 ? "supported" : "unknown",
        claim: supported.length === requested.length && requested.length > 0
          ? `Published certification information includes ${supported.join(", ")}.`
          : `Not every requested certification is publicly listed; confirm the exact facility and line.`,
        sourceField: "certifications",
      };
    }
    case "production_volume":
      return {
        key, label,
        outcome: "unknown",
        claim: plant.moqDisplay ? `A public minimum is listed, but compatibility with ${value} needs direct confirmation.` : "The current minimum is not publicly listed.",
        sourceField: "minimums",
        notes: plant.moqDisplay ?? undefined,
      };
    default:
      return null;
  }
}

function evidenceFor(plant: Plant, result: RequirementResult): MatchEvidence {
  const sourceUrls = plant.fieldSourceUrls?.[result.sourceField];
  const sourceUrl = sourceUrls?.[0] ?? plant.website.href ?? null;
  const sourceLabel = sourceUrl === plant.website.href ? plant.website.label : sourceUrl ? "Field source" : null;
  const sourceType = plant.claimSource === "directory-reported" ? "directory_reported"
    : plant.claimSource === "company-published" ? "company_published" : "mixed_public_sources";
  const hasFieldSpecificSource = Boolean(sourceUrls?.length);
  const knownStatus = plant.listingStatus === "LISTABLE" || (plant.listingStatus === "VERIFIED" && !hasFieldSpecificSource)
    ? "publicly_listed"
    : "verified";
  return {
    requirementKey: result.key,
    requirementLabel: result.label,
    claim: result.claim,
    status: result.outcome === "supported" || result.outcome === "mismatch" ? knownStatus : result.outcome === "conflicting" ? "conflicting" : "not_publicly_listed",
    sourceType,
    sourceUrl,
    sourceLabel,
    lastReviewed: plant.lastVerified,
    confidence: plant.confidence ?? null,
    notes: result.notes ?? (!hasFieldSpecificSource && plant.listingStatus !== undefined ? "Record-level public source; a field-specific URL is not stored." : null),
  };
}

export function matchManufacturers(
  workspace: SourcingWorkspace,
  options: { resultLimit?: number; geographyPreference?: string; requiredRequirements?: SourcingFieldKey[]; preferredRequirements?: SourcingFieldKey[] } = {},
): ManufacturerMatch[] {
  if (!hasMinimumMatchingInfo(workspace)) return [];
  const confirmed = Object.values(workspace.fields).filter((field) => field.status === "confirmed" && field.value);
  const requirementKeys = new Set<SourcingFieldKey>([
    "product_type", "packaging_format", "packaging_size", "carbonation", "formulation_assistance",
    "manufacturing_process", "preferred_geography", "certifications", "production_volume",
  ]);
  const usable = confirmed.filter((field) => requirementKeys.has(field.key));
  if (options.geographyPreference) {
    usable.push({ ...workspace.fields.preferred_geography, value: options.geographyPreference, status: "confirmed" });
  }
  const product = fieldValue(workspace, "product_type");
  const candidates = getDirectoryPlants().filter((plant) => product ? productRequirement(plant, product).outcome === "supported" : false);
  const required = new Set(options.requiredRequirements ?? []);
  const preferred = new Set(options.preferredRequirements ?? []);

  const ranked = candidates.map((plant) => {
    const results = usable.flatMap((field) => {
      const result = evaluateRequirement(plant, workspace, field.key, field.value!);
      return result ? [result] : [];
    });
    const supported = results.filter((result) => result.outcome === "supported");
    const conflicts = results.filter((result) => result.outcome === "mismatch" || result.outcome === "conflicting");
    const unknowns = results.filter((result) => result.outcome === "unknown");
    const productSupport = supported.some((result) => result.key === "product_type");
    const geographySupport = supported.some((result) => result.key === "preferred_geography");
    const match: ManufacturerMatch = {
      manufacturerSlug: plant.slug,
      manufacturerName: plant.name,
      location: plant.locationDisplay,
      fitExplanation: supported.length > 0
        ? `Reviewed public information supports ${supported.slice(0, 3).map((item) => item.label.toLowerCase()).join(", ")}. ${unknowns.length > 0 ? `${unknowns.length} important detail${unknowns.length === 1 ? " remains" : "s remain"} to confirm.` : "No requested detail is currently missing from the reviewed record."}`
        : "The product category may be relevant, but the reviewed record does not confirm the other requirements yet.",
      supportedMatches: supported.map((result) => result.claim),
      possibleConflicts: conflicts.map((result) => result.claim),
      unknowns: unknowns.map((result) => result.claim),
      evidence: results.map((result) => evidenceFor(plant, result)),
      requirementsUsed: results.map((result) => result.key),
      introductionAvailable: !plant.introductionsPaused,
      deliveryMethod: plant.introductionsPaused ? "paused" : "line_list_introduction",
      lastReviewed: plant.lastVerified,
    };
    return {
      match,
      supportedCount: supported.length,
      conflictCount: conflicts.length,
      productSupport,
      geographySupport,
      requiredGaps: results.filter((result) => required.has(result.key) && result.outcome !== "supported").length,
      preferredSupport: results.filter((result) => preferred.has(result.key) && result.outcome === "supported").length,
    };
  });

  return ranked
    .sort((left, right) => left.requiredGaps - right.requiredGaps
      || Number(right.productSupport) - Number(left.productSupport)
      || Number(right.geographySupport) - Number(left.geographySupport)
      || right.preferredSupport - left.preferredSupport
      || right.supportedCount - left.supportedCount
      || left.conflictCount - right.conflictCount
      || left.match.manufacturerName.localeCompare(right.match.manufacturerName))
    .filter(({ productSupport }) => productSupport)
    .slice(0, Math.min(options.resultLimit ?? 3, 3))
    .map(({ match }) => match);
}
