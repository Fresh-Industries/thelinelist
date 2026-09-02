import { certificationEvidenceSpans, normalizeCertificationRequirements } from "./certification-requirements";
import type { AgentFieldUpdate, FounderSourceSpan, SourcingFieldKey } from "./types";

interface ExplicitFact {
  key: SourcingFieldKey;
  value: string;
  spans: FounderSourceSpan[];
  reason: string;
}

const SOURCE = "Founder starting idea";

export function extractExplicitFounderFacts(idea: string): AgentFieldUpdate[] {
  const facts: ExplicitFact[] = [];
  const add = (key: SourcingFieldKey, value: string, matches: RegExpMatchArray | RegExpMatchArray[], reason: string) => {
    const values = Array.isArray(matches) && typeof matches[0] !== "string" ? matches as RegExpMatchArray[] : [matches as RegExpMatchArray];
    const spans = values.map((match) => sourceSpan(idea, match));
    if (!facts.some((fact) => fact.key === key)) facts.push({ key, value, spans, reason });
  };

  const hotSauce = idea.match(/\b(?:tomato[-\s]free\s+|smoky\s+carrot\s+)?hot\s+sauce\b/i);
  if (hotSauce) {
    add("product_type", "Hot sauce", hotSauce, "The founder explicitly described the product as hot sauce.");
    add("product_category", "Sauce / condiment", hotSauce, "Hot sauce is explicitly a sauce or condiment category; this does not infer a process.");
  } else {
    const snack = idea.match(/\b(?:roasted\s+)?(?:chickpea|fava[-\s]bean|bean|nut|seed|granola|popcorn)\s+snack\b/i);
    const beverage = idea.match(/\b(?:packaged\s+)?(?:drink|beverage|seltzer|sparkling water)\b/i);
    if (snack) {
      add("product_type", titleCase(snack[0]), snack, "The founder explicitly named a snack product.");
      add("product_category", "Snack", snack, "The founder explicitly named a snack product category.");
    } else if (beverage) {
      add("product_type", titleCase(beverage[0]), beverage, "The founder explicitly named a beverage product.");
      add("product_category", "Beverage", beverage, "The founder explicitly named a beverage category.");
    }
  }

  const packageMatch = idea.match(/\b(\d+(?:\.\d+)?)\s*(oz|ounces?|fl\.?\s*oz|fluid\s+ounces?|ml|milliliters?|g|grams?)\s+(?:(glass|plastic|aluminum|aluminium)\s+)?(?:(woozy|boston round|mason|slim|sleek|standard)\s+)?(bottles?|jars?|cans?|pouches?|bags?|cartons?|boxes?)\b/i);
  if (packageMatch) {
    const size = `${packageMatch[1]} ${normalizeUnit(packageMatch[2])}`;
    const formatParts = [packageMatch[3], packageMatch[4], singular(packageMatch[5])].filter(Boolean).map((part) => titleCase(part!));
    const customerFormat = [size, packageMatch[3], packageMatch[4], singular(packageMatch[5])].filter(Boolean).join(" ").toLowerCase();
    add("packaging_size", size, packageMatch, "The founder explicitly gave the retail package size.");
    add("packaging_format", formatParts.join(" "), packageMatch, "The founder explicitly named the package material and container.");
    add("product_format", customerFormat, packageMatch, "The founder explicitly described the customer-facing retail format.");
  }

  const quantity = idea.match(/\b(?:about|around|approximately|roughly)?\s*(\d[\d,]*(?:\.\d+)?)\s+(bottles?|jars?|cans?|pouches?|bags?|units?|cases?|gallons?|pounds?|lbs?)\b/i);
  if (quantity && (!packageMatch || quantity.index !== packageMatch.index)) {
    const prefix = /\b(?:about|around|approximately|roughly)\b/i.test(quantity[0]) ? "About " : "";
    add("production_volume", `${prefix}${quantity[1]} ${quantity[2].toLowerCase()}`, quantity, "The founder explicitly stated a first production quantity.");
  }

  const geography = idea.match(/\b(?:near(?:by)?\s+)?(?:Texas|California|Florida|New York|Illinois|Ohio|Georgia|Pennsylvania|Colorado|Arizona)(?:\s+(?:or|and)\s+nearby)?\b|\b(?:Midwest|Northeast|Southeast|Southwest|West Coast|West)\b/i);
  if (geography) add("preferred_geography", normalizeGeography(geography[0]), geography, "The founder explicitly named a state or region preference.");

  const storage = idea.match(/\b(?:shelf[-\s]?stable|room[-\s]?temperature|ambient|refrigerated|chilled|frozen)\b/i);
  const storageContext = storage ? idea.slice(Math.max(0, (storage.index ?? 0) - 24), (storage.index ?? 0) + storage[0].length + 24) : "";
  if (storage && !/\b(?:goal|possible|maybe|might|could)\b/i.test(storageContext)) {
    add("storage_distribution", normalizeStorage(storage[0]), storage, "The founder explicitly stated the intended storage condition.");
  }

  const formula = idea.match(/\b(?:finished|complete|tested)\s+(?:home|kitchen)?\s*recipe\b|\b(?:home|kitchen)\s+recipe\s+(?:that\s+is\s+)?not\s+(?:scaled|commercialized)\b|\brecipe\s+(?:is\s+)?(?:at\s+)?(?:the\s+)?idea\s+stage\b/i);
  if (formula) add("formula_status", normalizeFormulaStatus(formula[0]), formula, "The founder explicitly described the current recipe status; commercial validation is not implied.");

  const validationMatches = [
    idea.match(/\bprocess[-\s]?authority\s+(?:and\s+)?(?:review|validation)\b/i),
    idea.match(/\bshelf[-\s]?life\s+(?:testing|test|review|validation)\b/i),
  ].filter((match): match is RegExpMatchArray => Boolean(match));
  if (validationMatches.length) {
    const needs = [
      validationMatches.some((match) => /process/i.test(match[0])) ? "process-authority review" : null,
      validationMatches.some((match) => /shelf/i.test(match[0])) ? "shelf-life review" : null,
    ].filter((value): value is string => Boolean(value));
    add("formulation_assistance", `${formatList(needs)} needed`, validationMatches, "The founder explicitly identified qualified validation work that remains open.");
  }

  const certifications = normalizeCertificationRequirements(idea, null);
  const certificationSpans = certificationEvidenceSpans(idea);
  if (certificationSpans.length && (certifications.required.length || certifications.preferred.length || certifications.negated.length)) {
    const parts = [
      certifications.required.length ? `Required: ${certifications.required.join(", ")}` : null,
      certifications.preferred.length ? `Preferred: ${certifications.preferred.join(", ")}` : null,
      certifications.negated.length ? `Not required: ${certifications.negated.join(", ")}` : null,
    ].filter((part): part is string => Boolean(part));
    facts.push({
      key: "certifications",
      value: parts.join("; "),
      spans: certificationSpans,
      reason: "The founder explicitly stated certification priorities or negations; the original wording is preserved in the source span.",
    });
  }

  return facts.map((fact) => ({
    key: fact.key,
    value: fact.value,
    status: "confirmed",
    explicitlyStated: true,
    source: SOURCE,
    sourceSpans: fact.spans,
    reason: fact.reason,
    suggestedSharing: fact.key !== "certifications" || !/^Not required:/i.test(fact.value),
  }));
}

function sourceSpan(source: string, match: RegExpMatchArray): FounderSourceSpan {
  const start = match.index ?? source.indexOf(match[0]);
  return { start, end: start + match[0].length, text: match[0] };
}

function normalizeUnit(value: string): string {
  const normalized = value.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
  if (/^(?:ounce|ounces|oz|fl oz|fluid ounce|fluid ounces)$/.test(normalized)) return "oz";
  if (/^(?:milliliter|milliliters|ml)$/.test(normalized)) return "ml";
  return "g";
}

function singular(value: string): string {
  return value.replace(/s$/i, "");
}

function titleCase(value: string): string {
  return value.trim().replace(/\b\w/g, (letter) => letter.toUpperCase()).replace(/\s+/g, " ");
}

function normalizeGeography(value: string): string {
  const trimmed = value.trim();
  if (/^near/i.test(trimmed)) return `${titleCase(trimmed.replace(/^near(?:by)?\s+/i, ""))} or nearby`;
  return titleCase(trimmed).replace(/\s+(?:Or|And)\s+Nearby$/i, " or nearby");
}

function normalizeStorage(value: string): string {
  if (/shelf|room|ambient/i.test(value)) return "Shelf-stable";
  if (/refrigerat|chilled/i.test(value)) return "Refrigerated";
  return "Frozen";
}

function normalizeFormulaStatus(value: string): string {
  if (/finished|complete|tested/i.test(value)) return "Finished kitchen recipe";
  if (/not\s+(?:scaled|commercialized)/i.test(value)) return "Kitchen recipe not scaled for production";
  return "Recipe at idea stage";
}

function formatList(values: string[]): string {
  if (values.length < 2) return values[0] ?? "validation review";
  return `${values.slice(0, -1).join(", ")} and ${values.at(-1)}`;
}
