import { getDirectoryPlants, type Plant } from "@/lib/directory";
import { FIELD_DEFINITION_BY_KEY } from "./fields";
import { interpretGeographyPreference } from "./geography";
import { MATCHABLE_REQUIREMENT_KEYS, type MatchableRequirementKey } from "./matching-requirements";
import { resolveProductCategoryFromText } from "./product-category";
import { hasMinimumMatchingInfo } from "./readiness";
import type { ManufacturerMatch, MatchEvidence, SourcingFieldKey, SourcingWorkspace } from "./types";

interface RequirementResult {
  key: SourcingFieldKey;
  label: string;
  outcome: "supported" | "mismatch" | "conflicting" | "unknown";
  claim: string;
  sourceField: "products" | "processes" | "packaging" | "minimums" | "certifications" | "location" | null;
  notes?: string;
}

const FIT_EXPLANATION_LABELS: Partial<Record<SourcingFieldKey, string>> = {
  product_type: "the product type",
  packaging_format: "the packaging format",
  packaging_size: "the package size",
  carbonation: "carbonation",
  formulation_assistance: "formulation support",
  manufacturing_process: "the manufacturing process",
  preferred_geography: "the geography preference",
  certifications: "certification requirements",
  production_volume: "production volume",
  storage_distribution: "storage and distribution",
  allergens: "allergen requirements",
};

function formatNaturalList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "the evaluated requirements";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function supportedRequirementSummary(results: RequirementResult[]): string {
  return formatNaturalList([...new Set(results.slice(0, 3).map((result) =>
    FIT_EXPLANATION_LABELS[result.key] ?? result.label.replace(/[?.!]+$/g, "").toLowerCase(),
  ))]);
}

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

function hasPublishedManufacturingCapability(plant: Plant): boolean {
  const capabilities = plant.manufacturingCapabilitiesPublished?.toLowerCase() ?? "";
  return /co-?pack|co-manufact|contract manufactur|private label|wholesale production|bakery manufacturing/.test(capabilities);
}

function fieldValue(workspace: SourcingWorkspace, key: SourcingFieldKey): string | null {
  const field = workspace.fields[key];
  return field.status === "confirmed" ? field.value : null;
}

function productRequirement(plant: Plant, value: string): RequirementResult {
  const normalized = value.toLowerCase();
  const productCategory = resolveProductCategoryFromText(value);
  const categories = new Set(plant.categories ?? []);
  const text = searchablePlantText(plant);
  let supported = false;
  if (includesAny(normalized, ["energy drink", "functional beverage", "sports drink", "wellness drink"])) {
    supported = categories.has("energy-drink") || includesAny(text, ["energy drink", "energy drinks"]);
  } else if (includesAny(normalized, ["sparkling water", "seltzer"])) {
    supported = (categories.has("water") || categories.has("soda")) && includesAny(text, ["sparkling", "seltzer", "carbonated"]);
  } else if (normalized.includes("banana bread")) {
    supported = categories.has("bakery") && text.includes("banana bread");
  } else if (productCategory === "bakery") {
    supported = categories.has("bakery") && includesAny(text, ["bread", "breads", "baked goods", "finished baked", "cake", "cookie", "muffin", "loaf"]);
  } else if (productCategory === "snack") {
    const broadSnackSupport = categories.has("snacks") && includesAny(text, ["snack", "bar", "granola", "cracker", "chip", "popcorn"]);
    const exactProductSupport = broadSnackSupport && text.includes(normalized);
    return {
      key: "product_type",
      label: FIELD_DEFINITION_BY_KEY.product_type.label,
      outcome: exactProductSupport ? "supported" : "unknown",
      claim: exactProductSupport
        ? "Reviewed product information explicitly includes this product type."
        : broadSnackSupport
          ? "Reviewed information supports the broader snack category, but exact capability for this product is not publicly established."
          : "A direct fit for this snack product is not publicly established.",
      sourceField: "products",
    };
  } else if (productCategory === "beverage") {
    supported = plant.finderProducts.includes("beverage");
  } else if (productCategory === "sauce") {
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
      : normalized.includes("banana bread") && categories.has("bakery") && includesAny(text, ["bread", "breads", "baked goods", "finished baked", "cake", "cookie", "muffin", "loaf"])
        ? "Reviewed information supports the broader bakery category, but exact banana-bread capability is not publicly established."
      : `A direct fit for ${value} is not publicly established.`,
    sourceField: "products",
  };
}

function isProductCandidate(plant: Plant, value: string): boolean {
  const result = productRequirement(plant, value);
  if (result.outcome === "supported") return true;
  const normalized = value.toLowerCase();
  if (resolveProductCategoryFromText(value) === "snack") {
    return (plant.categories ?? []).includes("snacks")
      && includesAny(searchablePlantText(plant), ["snack", "bar", "granola", "cracker", "chip", "popcorn"]);
  }
  return normalized.includes("banana bread")
    && (plant.categories ?? []).includes("bakery")
    && includesAny(searchablePlantText(plant), ["bread", "breads", "baked goods", "finished baked", "cake", "cookie", "muffin", "loaf"]);
}

function evaluateRequirement(plant: Plant, workspace: SourcingWorkspace, key: SourcingFieldKey, value: string): RequirementResult | null {
  const text = searchablePlantText(plant);
  const label = FIELD_DEFINITION_BY_KEY[key].label;
  switch (key) {
    case "product_type":
      return productRequirement(plant, value);
    case "packaging_format": {
      const wanted = value.toLowerCase();
      const packaging = plant.packaging?.toLowerCase() ?? "";
      const wantsBakeryBag = /\bbakery(?:[\s-]+)bags?\b/.test(wanted);
      if (wantsBakeryBag) {
        const wantsWindow = /\bwindow(?:ed|ing)?\b/.test(wanted);
        const bakeryBagPublished = /\bbakery(?:[\s-]+)bags?\b/.test(packaging);
        const windowedBakeryBagPublished = /\b(?:windowed[\s-]+bakery(?:[\s-]+)bags?|bakery(?:[\s-]+)bags?[^.;]{0,50}\bwindow(?:ed|ing)?)\b/.test(packaging);
        const exactBakeryBag = wantsWindow ? windowedBakeryBagPublished : bakeryBagPublished;
        const broaderBag = bakeryBagPublished || /\b(?:bags?|gusseted|flexible packaging)\b/.test(packaging);
        return {
          key,
          label,
          outcome: exactBakeryBag ? "supported" : "unknown",
          claim: exactBakeryBag
            ? "Published packaging explicitly includes bakery bags."
            : broaderBag
              ? "Bag packaging is published, but the exact windowed bakery-bag construction is not publicly established."
              : "Bakery-bag packaging is not publicly listed.",
          sourceField: "packaging",
          notes: broaderBag && !exactBakeryBag ? "Confirm the window material, barrier, seal, dimensions, and line compatibility directly." : undefined,
        };
      }
      const terms = wanted.includes("can") ? ["can", "cans", "canning"]
        : wanted.includes("bottle") ? ["bottle", "bottles", "bottling"]
        : wanted.includes("pouch") ? ["pouch", "pouches"]
        : wanted.includes("jar") ? ["jar", "jars"]
        : wanted.includes("bag") ? ["bag", "bags"]
        : wanted.includes("wrap") ? ["individually wrapped", "flow wrap", "flow-wrap", "wrapped"]
        : wanted.includes("loaf") ? ["loaf", "loaves"] : [wanted];
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
      const preference = interpretGeographyPreference(value);
      if (!preference.understood) {
        return {
          key,
          label,
          outcome: "unknown",
          claim: `The geography preference “${value}” could not be interpreted as a state or supported region.`,
          sourceField: null,
          notes: "Use a state name, two-letter state code, or a supported region such as Midwest, Northeast, Southeast, Southwest, or West.",
        };
      }
      const matchingSite = plant.sites.find((site) => preference.stateCodes.includes(site.state));
      const supported = Boolean(matchingSite);
      return {
        key, label,
        outcome: supported ? "supported" : "mismatch",
        claim: matchingSite
          ? `The listed ${matchingSite.city ? `${matchingSite.city}, ` : ""}${matchingSite.state} facility is within the ${preference.label} preference.`
          : `Listed facilities are outside the ${preference.label} preference.`,
        sourceField: "location",
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
    case "storage_distribution": {
      const wanted = value.toLowerCase();
      const terms = /room|ambient|shelf.?stable/.test(wanted) ? ["shelf stable", "shelf-stable", "ambient", "dry shelf"]
        : /refrigerat|chilled|cold/.test(wanted) ? ["refrigerated", "chilled", "cold storage", "cold chain"]
        : /frozen|freezer/.test(wanted) ? ["frozen", "freezer"] : [];
      if (!terms.length) return null;
      const supported = includesAny(text, terms);
      return {
        key, label,
        outcome: supported ? "supported" : "unknown",
        claim: supported ? `Published information supports ${value}.` : `${value} storage or distribution capability is not publicly established.`,
        sourceField: "processes",
      };
    }
    case "allergens": {
      const wantsNutFree = /no nuts|nut.?free|without nuts/i.test(value);
      if (!wantsNutFree) return null;
      const supported = includesAny(text, ["nut-free", "nut free", "peanut-free", "peanut free"]);
      return {
        key, label,
        outcome: supported ? "supported" : "unknown",
        claim: supported ? "Published information includes a nut-free capability or facility statement." : "Nut controls and cross-contact requirements are not publicly established.",
        sourceField: "certifications",
      };
    }
    default:
      return null;
  }
}

function evidenceFor(plant: Plant, result: RequirementResult): MatchEvidence {
  const sourceUrls = result.sourceField && result.sourceField !== "location" ? plant.fieldSourceUrls?.[result.sourceField] : undefined;
  const sourceUrl = result.sourceField === null ? null : sourceUrls?.[0] ?? plant.website.href ?? null;
  const matchingLink = sourceUrl ? plant.extraLinks?.find((link) => link.href === sourceUrl) : undefined;
  const sourceLabel = sourceUrl === plant.website.href ? plant.website.label : matchingLink?.label ?? (sourceUrl ? "Capability source" : null);
  const sourceType = plant.claimSource === "directory-reported" ? "directory_reported"
    : plant.claimSource === "company-published" ? "company_published" : "mixed_public_sources";
  const hasFieldSpecificSource = result.sourceField === "location" || Boolean(sourceUrls?.length);
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
  options: { resultLimit?: number; geographyPreference?: string; requiredRequirements?: MatchableRequirementKey[]; preferredRequirements?: MatchableRequirementKey[] } = {},
): ManufacturerMatch[] {
  if (!hasMinimumMatchingInfo(workspace)) return [];
  const confirmed = Object.values(workspace.fields).filter((field) => field.status === "confirmed" && field.value);
  const requirementKeys = new Set<SourcingFieldKey>(MATCHABLE_REQUIREMENT_KEYS);
  const usable = confirmed.filter((field) => requirementKeys.has(field.key) && (!options.geographyPreference || field.key !== "preferred_geography"));
  if (options.geographyPreference) {
    usable.push({ ...workspace.fields.preferred_geography, value: options.geographyPreference, status: "confirmed" });
  }
  const product = fieldValue(workspace, "product_type");
  const candidates = getDirectoryPlants().filter((plant) => product ? isProductCandidate(plant, product) : false);
  const required = new Set<SourcingFieldKey>(options.requiredRequirements ?? []);
  const preferred = new Set<SourcingFieldKey>(options.preferredRequirements ?? []);

  const ranked = candidates.map((plant) => {
    const results = usable.flatMap((field) => {
      const result = evaluateRequirement(plant, workspace, field.key, field.value!);
      return result ? [result] : [];
    });
    const supported = results.filter((result) => result.outcome === "supported");
    const conflicts = results.filter((result) => result.outcome === "mismatch" || result.outcome === "conflicting");
    const unknowns = results.filter((result) => result.outcome === "unknown");
    const productSupport = supported.some((result) => result.key === "product_type");
    const productCandidate = product ? isProductCandidate(plant, product) : false;
    const geographySupport = supported.some((result) => result.key === "preferred_geography");
    const evidenceCaveat = [
      conflicts.length ? `${conflicts.length} possible conflict${conflicts.length === 1 ? " needs" : "s need"} review.` : null,
      unknowns.length ? `${unknowns.length} important detail${unknowns.length === 1 ? " remains" : "s remain"} to confirm.` : null,
    ].filter(Boolean).join(" ") || "Within the requirements evaluated here, no conflict or unknown was recorded.";
    const match: ManufacturerMatch = {
      manufacturerSlug: plant.slug,
      manufacturerName: plant.name,
      location: plant.locationDisplay,
      fitExplanation: supported.length > 0
        ? `Reviewed public information supports ${supportedRequirementSummary(supported)}. ${evidenceCaveat}`
        : `The product category may be relevant, but the reviewed record does not confirm the other requirements yet. ${evidenceCaveat}`,
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
      productCandidate,
      geographySupport,
      requiredGaps: [...required].filter((key) => {
        const result = results.find((candidate) => candidate.key === key);
        return !result || result.outcome !== "supported";
      }).length,
      preferredSupport: results.filter((result) => preferred.has(result.key) && result.outcome === "supported").length,
      capabilitySupport: supported.filter((result) => result.key !== "product_type" && result.key !== "preferred_geography").length + Number(hasPublishedManufacturingCapability(plant)),
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
    .filter(({ productCandidate, capabilitySupport, requiredGaps }) => productCandidate && capabilitySupport > 0 && requiredGaps === 0)
    .slice(0, Math.min(options.resultLimit ?? 3, 3))
    .map(({ match }) => match);
}
