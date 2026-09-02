import { getDirectoryPlants, type Plant } from "@/lib/directory";
import { FIELD_DEFINITION_BY_KEY } from "./fields";
import { interpretGeographyPreference } from "./geography";
import { MATCHABLE_REQUIREMENT_KEYS } from "./matching-requirements";
import { resolveProductCategoryFromText } from "./product-category";
import { hasMinimumMatchingInfo } from "./readiness";
import { normalizeCertificationRequirements } from "./certification-requirements";
import type { ManufacturerMatch, MatchEvidence, SourcingFieldKey, SourcingWorkspace } from "./types";

interface RequirementResult {
  key: SourcingFieldKey;
  label: string;
  outcome: "supported" | "mismatch" | "conflicting" | "unknown";
  claim: string;
  sourceField: "products" | "processes" | "packaging" | "minimums" | "certifications" | "location" | null;
  notes?: string;
  granularity?: "exact" | "broad";
}

const SNACK_FORMAT_PATTERNS = [
  /\bchickpeas?\b/,
  /\bpopcorn\b/,
  /\bgranola\b/,
  /\bcrackers?\b/,
  /\bchips?\b/,
  /\bjerky\b/,
  /\bsnack sticks?\b/,
  /\btrail mix\b/,
  /\bprotein bars?\b/,
  /\benergy bars?\b/,
  /\bnuts?\b/,
  /\bseeds?\b/,
];

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

function productRequirement(plant: Plant, value: string): RequirementResult[] {
  const normalized = value.toLowerCase();
  const productCategory = resolveProductCategoryFromText(value);
  const categories = new Set(plant.categories ?? []);
  const text = searchablePlantText(plant);
  const publishedProducts = [plant.productTypesPublished, ...plant.rawProductTags ?? []].filter(Boolean).join(" ").toLowerCase();
  const hasProductSource = Boolean(plant.fieldSourceUrls?.products?.length);
  let supported = false;
  if (/\bhot\s+sauce\b/.test(normalized)) {
    const broadSauceSupport = plant.finderProducts.includes("sauce") && /\b(?:sauces?|salsas?|condiments?)\b/.test(publishedProducts);
    const exactHotSauceSupport = hasProductSource && /\bhot\s+sauces?\b/.test(publishedProducts);
    if (exactHotSauceSupport) {
      return [{
        key: "product_type",
        label: FIELD_DEFINITION_BY_KEY.product_type.label,
        outcome: "supported",
        claim: "Reviewed product information explicitly names hot sauce.",
        sourceField: "products",
        granularity: "exact",
      }];
    }
    if (broadSauceSupport) {
      return [
        {
          key: "product_type",
          label: FIELD_DEFINITION_BY_KEY.product_type.label,
          outcome: "supported",
          claim: "Reviewed product information supports the broader sauce family.",
          sourceField: "products",
          granularity: "broad",
        },
        {
          key: "product_type",
          label: "Exact hot sauce capability",
          outcome: "unknown",
          claim: "Exact hot sauce capability is not publicly established by a field-specific source.",
          sourceField: "products",
          granularity: "exact",
        },
      ];
    }
    return [{
      key: "product_type",
      label: FIELD_DEFINITION_BY_KEY.product_type.label,
      outcome: "unknown",
      claim: "A direct fit for hot sauce is not publicly established.",
      sourceField: "products",
      granularity: "exact",
    }];
  }
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
    const namedSnackFormats = SNACK_FORMAT_PATTERNS.filter((pattern) => pattern.test(normalized));
    const genericSnackRequest = /^(?:snacks?|snack foods?)$/.test(normalized.trim());
    const exactProductSupport = broadSnackSupport
      && (genericSnackRequest || text.includes(normalized) || (namedSnackFormats.length > 0 && namedSnackFormats.every((pattern) => pattern.test(text))));
    return [{
      key: "product_type",
      label: FIELD_DEFINITION_BY_KEY.product_type.label,
      outcome: exactProductSupport ? "supported" : "unknown",
      claim: exactProductSupport
        ? "Reviewed product information explicitly includes this product type."
        : broadSnackSupport
          ? "Reviewed information supports the broader snack category, but exact capability for this product is not publicly established."
          : "A direct fit for this snack product is not publicly established.",
      sourceField: "products",
      granularity: exactProductSupport ? "exact" : "broad",
    }];
  } else if (productCategory === "beverage") {
    supported = plant.finderProducts.includes("beverage");
  } else if (productCategory === "sauce") {
    supported = plant.finderProducts.includes("sauce");
  } else if (includesAny(normalized, ["soup", "meal", "dip", "prepared", "refrigerated"])) {
    supported = plant.finderProducts.includes("prepared-rte");
  }
  return [{
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
    granularity: supported ? "exact" : "broad",
  }];
}

function isProductCandidate(plant: Plant, value: string, allowBroad = false): boolean {
  const results = productRequirement(plant, value);
  if (results.some((result) => result.outcome === "supported" && (allowBroad || result.granularity !== "broad"))) return true;
  const normalized = value.toLowerCase();
  if (resolveProductCategoryFromText(value) === "snack") return false;
  return normalized.includes("banana bread")
    && (plant.categories ?? []).includes("bakery")
    && includesAny(searchablePlantText(plant), ["bread", "breads", "baked goods", "finished baked", "cake", "cookie", "muffin", "loaf"]);
}

function normalizeOunceText(value: string): string {
  return value.toLowerCase().replace(/fluid\s+ounces?|fl\.?\s*oz|ounces?/g, "oz").replace(/\s+/g, " ").trim();
}

function parseOunces(value: string | null | undefined): number | null {
  const match = normalizeOunceText(value ?? "").match(/\b(\d+(?:\.\d+)?)\s*oz\b/);
  return match ? Number(match[1]) : null;
}

interface PublishedOunceRange {
  minimum: number;
  maximum: number;
  material: string | null;
  context: string;
}

function publishedOunceRanges(value: string, preferredMaterial: string | null): PublishedOunceRange[] {
  const normalized = normalizeOunceText(value).replace(/[–—]/g, "-");
  const ranges = normalized.split(";").flatMap((segment) => [...segment.matchAll(/\b(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*oz\b/g)].map((match) => {
    const material = /\bglass\b/.test(segment) ? "glass" : /\bplastic\b/.test(segment) ? "plastic" : null;
    return { minimum: Number(match[1]), maximum: Number(match[2]), material, context: segment.trim() };
  }));
  if (!preferredMaterial) return ranges;
  const materialMatches = ranges.filter((range) => range.material === preferredMaterial);
  return materialMatches.length ? materialMatches : ranges;
}

function compareProductionVolume(
  requestedValue: string,
  packageSize: string | null,
  publishedMinimum: string | null,
): { compatible: boolean; claim: string } | null {
  if (!publishedMinimum) return null;
  const requested = requestedValue.match(/\b(\d[\d,]*(?:\.\d+)?)\s*(bottles?|jars?|cans?|pouches?|bags?|units?|cases?|gallons?|gal|pounds?|lbs?)\b/i);
  const minimum = publishedMinimum.match(/\b(?:minimum(?:\s+(?:batch|runs?))?|floor|starts?\s+(?:as\s+low\s+as|at)|starting\s+at)\s*:?\s*(\d[\d,]*(?:\.\d+)?)\s*(bottles?|jars?|cans?|pouches?|bags?|units?|cases?|gallons?|gal|pounds?|lbs?)\b/i);
  if (!requested || !minimum) return null;
  const requestedAmount = Number(requested[1].replaceAll(",", ""));
  const minimumAmount = Number(minimum[1].replaceAll(",", ""));
  const requestedUnit = unitFamily(requested[2]);
  const minimumUnit = unitFamily(minimum[2]);

  if (requestedUnit === minimumUnit) {
    const compatible = requestedAmount >= minimumAmount;
    return {
      compatible,
      claim: compatible
        ? `${formatNumber(requestedAmount)} ${requested[2].toLowerCase()} meets the published ${formatNumber(minimumAmount)} ${minimum[2].toLowerCase()} minimum.`
        : `${formatNumber(requestedAmount)} ${requested[2].toLowerCase()} is below the published ${formatNumber(minimumAmount)} ${minimum[2].toLowerCase()} minimum.`,
    };
  }

  const packageOunces = parseOunces(packageSize);
  if (minimumUnit === "volume" && requestedUnit === "unit" && packageOunces !== null && /gallons?|gal/i.test(minimum[2])) {
    const requestedGallons = requestedAmount * packageOunces / 128;
    const compatible = requestedGallons >= minimumAmount;
    return {
      compatible,
      claim: compatible
        ? `${formatNumber(requestedAmount)} ${requested[2].toLowerCase()} is about ${formatNumber(requestedGallons)} gallons at ${formatNumber(packageOunces)} oz each and meets the published ${formatNumber(minimumAmount)}-gallon minimum.`
        : `${formatNumber(requestedAmount)} ${requested[2].toLowerCase()} is about ${formatNumber(requestedGallons)} gallons at ${formatNumber(packageOunces)} oz each, below the published ${formatNumber(minimumAmount)}-gallon minimum.`,
    };
  }
  return null;
}

function unitFamily(value: string): "unit" | "volume" | "weight" | "case" {
  if (/gallon|gal/i.test(value)) return "volume";
  if (/pound|lbs?/i.test(value)) return "weight";
  if (/case/i.test(value)) return "case";
  return "unit";
}

function certificationListed(certText: string, certification: string): boolean {
  if (certification === "Gluten-free") return /\bgluten[-\s]?free\b/i.test(certText);
  if (certification === "Non-GMO") return /\bnon[-\s]?gmo\b/i.test(certText);
  return certText.includes(certification.toLowerCase());
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? value.toLocaleString("en-US") : value.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function evaluateRequirement(plant: Plant, workspace: SourcingWorkspace, key: SourcingFieldKey, value: string): RequirementResult | RequirementResult[] | null {
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
      const wantsBottle = /\bbottles?\b/.test(wanted);
      const wantsWoozy = /\bwoozy\b/.test(wanted);
      const wantsGlass = /\bglass\b/.test(wanted);
      if (wantsBottle && (wantsWoozy || wantsGlass)) {
        const hasPackagingSource = Boolean(plant.fieldSourceUrls?.packaging?.length);
        const bottleFamily = /\b(?:bottles?|bottling)\b/.test(packaging) || /\bglass\s+retail\b/.test(packaging);
        const glass = /\bglass\b/.test(packaging);
        const woozy = /\bwoozy\b/.test(packaging);
        const exact = hasPackagingSource && (!wantsGlass || glass) && (!wantsWoozy || woozy) && bottleFamily;
        if (exact) return [{ key, label, outcome: "supported", claim: `Published packaging explicitly includes ${value}.`, sourceField: "packaging", granularity: "exact" }];
        const broadResults: RequirementResult[] = [];
        if (hasPackagingSource && bottleFamily) {
          broadResults.push({
            key,
            label,
            outcome: "supported",
            claim: glass ? "Published packaging includes glass retail packaging in the bottle family." : "Published packaging includes the broader bottle family.",
            sourceField: "packaging",
            granularity: "broad",
          });
        }
        broadResults.push({
          key,
          label: wantsWoozy ? "Exact glass woozy construction" : "Exact glass bottle construction",
          outcome: "unknown",
          claim: wantsWoozy
            ? "Exact glass woozy-bottle construction is not publicly established; evidence must name both glass and woozy."
            : "Exact glass-bottle construction is not publicly established.",
          sourceField: "packaging",
          granularity: "exact",
        });
        return broadResults;
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
      const requestedOunces = parseOunces(value);
      const packaging = plant.packaging ?? "";
      const requestedMaterial = /\bglass\b/i.test(workspace.fields.packaging_format.value ?? "") ? "glass" : null;
      const ranges = publishedOunceRanges(packaging, requestedMaterial);
      if (requestedOunces !== null && ranges.length && plant.fieldSourceUrls?.packaging?.length) {
        const compatible = ranges.find((range) => requestedOunces >= range.minimum && requestedOunces <= range.maximum);
        const closest = compatible ?? ranges.sort((left, right) => Math.abs(requestedOunces - left.minimum) - Math.abs(requestedOunces - right.minimum))[0];
        return {
          key,
          label,
          outcome: compatible ? "supported" : "mismatch",
          claim: compatible
            ? `Published packaging includes ${formatNumber(requestedOunces)} oz within a ${formatNumber(closest.minimum)}–${formatNumber(closest.maximum)} oz${closest.material ? ` ${closest.material}` : ""} range.`
            : `${formatNumber(requestedOunces)} oz is outside the published ${formatNumber(closest.minimum)}–${formatNumber(closest.maximum)} oz${closest.material ? ` ${closest.material}` : ""} range.`,
          sourceField: "packaging",
          granularity: "exact",
        };
      }
      const normalized = normalizeOunceText(value);
      const normalizedPackaging = normalizeOunceText(packaging);
      return {
        key, label,
        outcome: normalizedPackaging.includes(normalized) && Boolean(plant.fieldSourceUrls?.packaging?.length) ? "supported" : "unknown",
        claim: normalizedPackaging.includes(normalized) && plant.fieldSourceUrls?.packaging?.length ? `Published packaging includes ${value}.` : `${value} is not publicly listed for the packaging line.`,
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
      const normalized = normalizeCertificationRequirements(value);
      const requested = [...normalized.required, ...normalized.preferred];
      if (!requested.length) return null;
      const certText = plant.certs.join(" ").toLowerCase();
      const supported = requested.filter((certification) => certificationListed(certText, certification));
      return {
        key, label,
        outcome: supported.length === requested.length && requested.length > 0 ? "supported" : "unknown",
        claim: supported.length === requested.length && requested.length > 0
          ? `Published certification information includes ${supported.join(", ")}.`
          : `Not every requested certification is publicly listed; confirm the exact facility and line.`,
        sourceField: "certifications",
      };
    }
    case "production_volume": {
      const comparison = compareProductionVolume(value, workspace.fields.packaging_size.value, plant.moqDisplay);
      if (comparison && plant.fieldSourceUrls?.minimums?.length) {
        return {
          key,
          label,
          outcome: comparison.compatible ? "supported" : "mismatch",
          claim: comparison.claim,
          sourceField: "minimums",
          notes: plant.moqDisplay ?? undefined,
          granularity: "exact",
        };
      }
      return {
        key, label,
        outcome: "unknown",
        claim: plant.moqDisplay ? `A public minimum is listed, but its units cannot be responsibly compared with ${value}.` : "The current minimum is not publicly listed.",
        sourceField: "minimums",
        notes: plant.moqDisplay ?? undefined,
      };
    }
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

type MatchOptions = { resultLimit?: number; geographyPreference?: string; requiredRequirements?: SourcingFieldKey[]; preferredRequirements?: SourcingFieldKey[] };

export function matchManufacturers(workspace: SourcingWorkspace, options: MatchOptions = {}): ManufacturerMatch[] {
  return matchManufacturerRecords(workspace, getDirectoryPlants(), options);
}

export function matchManufacturerRecords(
  workspace: SourcingWorkspace,
  plants: Plant[],
  options: MatchOptions = {},
): ManufacturerMatch[] {
  if (!hasMinimumMatchingInfo(workspace)) return [];
  const confirmed = Object.values(workspace.fields).filter((field) => field.status === "confirmed" && field.value);
  const requirementKeys = new Set<SourcingFieldKey>(MATCHABLE_REQUIREMENT_KEYS);
  const usable = confirmed.filter((field) => requirementKeys.has(field.key) && (!options.geographyPreference || field.key !== "preferred_geography"));
  if (options.geographyPreference) {
    usable.push({ ...workspace.fields.preferred_geography, value: options.geographyPreference, status: "confirmed" });
  }
  const product = fieldValue(workspace, "product_type");
  const required = new Set<SourcingFieldKey>(options.requiredRequirements ?? []);
  const preferred = new Set<SourcingFieldKey>(options.preferredRequirements ?? []);
  const certificationPriorities = normalizeCertificationRequirements(fieldValue(workspace, "certifications"));
  if (!certificationPriorities.required.length) required.delete("certifications");
  if (certificationPriorities.preferred.length) preferred.add("certifications");
  if (!certificationPriorities.required.length && !certificationPriorities.preferred.length) preferred.delete("certifications");
  const allowBroadProduct = preferred.has("product_type") && !required.has("product_type");
  const candidates = plants.filter((plant) => product ? isProductCandidate(plant, product, allowBroadProduct) : false);

  const ranked = candidates.map((plant) => {
    const results = usable.flatMap((field) => {
      const result = evaluateRequirement(plant, workspace, field.key, field.value!);
      return result ? Array.isArray(result) ? result : [result] : [];
    });
    const supported = results.filter((result) => result.outcome === "supported");
    const conflicts = results.filter((result) => result.outcome === "mismatch" || result.outcome === "conflicting");
    const unknowns = results.filter((result) => result.outcome === "unknown");
    const productSupport = supported.some((result) => result.key === "product_type");
    const productCandidate = product ? isProductCandidate(plant, product, allowBroadProduct) : false;
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
        const keyed = results.filter((candidate) => candidate.key === key);
        return !keyed.some((result) => result.outcome === "supported" && result.granularity !== "broad")
          || keyed.some((result) => result.outcome === "mismatch" || result.outcome === "conflicting");
      }).length,
      preferredSupport: results.filter((result) => preferred.has(result.key) && result.outcome === "supported").length,
      preferredConflicts: results.filter((result) => preferred.has(result.key) && (result.outcome === "mismatch" || result.outcome === "conflicting")).length,
      capabilitySupport: supported.filter((result) => result.key !== "product_type" && result.key !== "preferred_geography").length + Number(hasPublishedManufacturingCapability(plant)),
    };
  });

  return ranked
    .sort((left, right) => left.requiredGaps - right.requiredGaps
      || left.preferredConflicts - right.preferredConflicts
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
