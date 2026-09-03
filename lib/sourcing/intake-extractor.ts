import { certificationEvidenceSpans, normalizeCertificationRequirements } from "./certification-requirements";
import type { AgentFieldUpdate, FounderSourceSpan, SourcingFieldKey, SourcingFieldStatus } from "./types";

interface ExplicitFact {
  key: SourcingFieldKey;
  value: string | null;
  status?: Extract<SourcingFieldStatus, "confirmed" | "needs_decision">;
  spans: FounderSourceSpan[];
  reason: string;
}

const STARTING_IDEA_SOURCE = "Founder starting idea";

export function extractExplicitFounderFacts(idea: string, source = STARTING_IDEA_SOURCE): AgentFieldUpdate[] {
  const facts = new Map<SourcingFieldKey, ExplicitFact>();
  const put = (
    key: SourcingFieldKey,
    value: string | null,
    matches: RegExpMatchArray | RegExpMatchArray[],
    reason: string,
    status: Extract<SourcingFieldStatus, "confirmed" | "needs_decision"> = value ? "confirmed" : "needs_decision",
  ) => {
    const values = Array.isArray(matches) && typeof matches[0] !== "string" ? matches as RegExpMatchArray[] : [matches as RegExpMatchArray];
    facts.set(key, { key, value, status, spans: values.map((match) => sourceSpan(idea, match)), reason });
  };

  const rejectedBrand = lastMatch(idea, /(?:actually\s+no[^.?!]*brand\s+is\s+undecided[^.?!]*|brand\s+is\s+undecided[^.?!]*|please\s+do\s+not\s+(?:use\s+that\s+name|call\s+this\s+[^;.!?]+)(?:;\s*we\s+have\s+not\s+chosen\s+a\s+brand)?)/gi);
  if (rejectedBrand) put("brand_name", null, rejectedBrand, "The founder explicitly rejected the tentative name and left the brand undecided.", "needs_decision");

  const spreadCandidates = [
    ...allMatches(idea, /\b(?:shelf[-\s]?stable\s+)?(?:(?:roasted|fermented|smoky)\s+)?[a-z][a-z-]*(?:\s+[a-z][a-z-]*){0,2}\s+and\s+[a-z][a-z-]*(?:\s+[a-z][a-z-]*){0,2}\s+spread\b/gi),
    ...allMatches(idea, /\b(?:shelf[-\s]?stable\s+)?(?:(?:roasted|fermented|smoky)\s+)?[a-z][a-z-]*(?:\s+(?:bean|vegetable|pepper|seed))?\s+spread\b/gi),
  ].filter((match) => !isNegatedAt(idea, match)).sort(bySourcePosition);
  const productCandidates = [
    ...allMatches(idea, /\bbaked\s+chickpea\s+crisp(?:\s+with\s+[a-z][a-z\s-]*?(?=[.?!]|\s+\d+(?:\.\d+)?\s*(?:oz|ounces?|g|grams?)\b))?/gi),
    ...allMatches(idea, /\b(?:tomato[-\s]free\s+|smoky\s+carrot\s+)?hot\s+sauce\b/gi),
    ...allMatches(idea, /\b(?:roasted\s+)?(?:chickpea|fava[-\s]bean|bean|nut|seed|granola|popcorn)\s+snack\b/gi),
    ...allMatches(idea, /\b(?:packaged\s+)?(?:(?:sparkling\s+)?(?:drink|beverage)|seltzer|sparkling water)\b/gi),
    ...spreadCandidates,
  ].sort(bySourceEndThenSpecificity);
  const product = productCandidates.at(-1);
  if (product) {
    if (/hot\s+sauce/i.test(product[0])) {
      put("product_type", "Hot sauce", product, "The founder explicitly described the product as hot sauce.");
      put("product_category", "Sauce / condiment", product, "The founder explicitly named a sauce or condiment product.");
    } else if (/\bspread\b/i.test(product[0])) {
      const productValue = sentenceCase(product[0].replace(/^shelf[-\s]?stable\s+/i, "").replace(/^(?:a|an)\s+/i, ""));
      put("product_type", productValue, product, "The founder explicitly named the food as a spread.");
      put("product_category", "Sauce / condiment", product, "The founder explicitly described a spread or condiment product.");
      put("product_format", "Spread", product, "The founder explicitly described the customer-facing food format as a spread.");
      put("product_description", hasPositiveShelfStable(idea) ? `Shelf-stable ${lowerFirst(productValue)}` : productValue, product, "The founder explicitly described the product and its active storage direction.");
    } else if (/baked\s+chickpea\s+crisp/i.test(product[0])) {
      put("product_type", "Baked chickpea crisp", product, "The founder's latest explicit correction identifies a baked chickpea crisp.");
      put("product_category", "Snack", product, "The corrected product is explicitly a snack.");
      put("product_description", sentenceCase(product[0]), product, "The founder explicitly described the corrected product and flavor.");
    } else if (/snack/i.test(product[0])) {
      put("product_type", titleCase(product[0]), product, "The founder explicitly named a snack product.");
      put("product_category", "Snack", product, "The founder explicitly named a snack product category.");
    } else {
      put("product_type", sentenceCase(product[0]), product, "The founder explicitly named a beverage product.");
      put("product_category", "Beverage", product, "The founder explicitly named a beverage category.");
    }
  }

  const sizedPackages = allMatches(idea, /\b(\d+(?:\.\d+)?)\s*(oz|ounces?|fl\.?\s*oz|fluid\s+ounces?|ml|milliliters?|g|grams?)\s+(?:(single[-\s]serve)\s+)?(?:(glass|plastic|aluminum|aluminium|compostable|recyclable)\s+)?(?:(woozy|boston round|mason|slim|sleek|standard|pillow|snack|stand[-\s]up)\s+)?(bottles?|jars?|cans?|pouch(?:es)?|bags?|cartons?|box(?:es)?)\b/gi);
  const unsizedPackages = allMatches(idea, /\b(?:use\s+(?:an?\s+)?)?(glass|plastic|aluminum|aluminium|compostable|recyclable)\s+(?:(woozy|boston round|mason|slim|sleek|standard|pillow|snack|stand[-\s]up)\s+)?(bottles?|jars?|cans?|pouch(?:es)?|bags?|cartons?|box(?:es)?)\b/gi);
  const sizedPackage = sizedPackages.at(-1);
  const packageChoice = [...sizedPackages, ...unsizedPackages].sort(bySourcePosition).at(-1);
  if (sizedPackage) {
    const size = `${sizedPackage[1]} ${normalizeUnit(sizedPackage[2])}`;
    put("packaging_size", size, sizedPackage, "The founder explicitly gave the retail package size.");
  }
  if (packageChoice) {
    const sized = packageChoice.length >= 7;
    const material = packageChoice[sized ? 4 : 1];
    const style = packageChoice[sized ? 5 : 2];
    const container = packageChoice[sized ? 6 : 3];
    const conditional = /compostable/i.test(material ?? "") && /if\s+(?:possible|production[-\s]ready)/i.test(idea.slice(packageChoice.index ?? 0, (packageChoice.index ?? 0) + packageChoice[0].length + 30));
    const packageValue = [material, style, singular(container)].filter(Boolean).map((part) => titleCase(part!)).join(" ")
      + (conditional ? " if production-ready" : "");
    put("packaging_format", packageValue, packageChoice, "The latest explicit package direction supersedes earlier alternatives.");
    if (sizedPackage && (product || sizedPackages.some((match) => Boolean(match[3])))) {
      const size = `${sizedPackage[1]} ${normalizeUnit(sizedPackage[2])}`;
      const singleServe = sizedPackages.some((match) => Boolean(match[3]));
      const customerContainer = /bag|pouch/i.test(container) && /snack/i.test(`${product?.[0] ?? ""} ${style ?? ""}`) ? "snack bag" : [style, singular(container)].filter(Boolean).join(" ");
      if (!facts.has("product_format")) put("product_format", [size, singleServe ? "single-serve" : null, customerContainer].filter(Boolean).join(" "), [sizedPackage, packageChoice], "The founder explicitly described the customer-facing retail format.");
    }
  }

  const packageIndexes = new Set(sizedPackages.map((match) => match.index));
  const quantities = allMatches(idea, /\b(?:first\s+run\s+)?(?:about|around|approximately|roughly)?\s*(\d[\d,]*(?:\.\d+)?)\s+(bottles?|jars?|cans?|pouch(?:es)?|bags?|units?|cases?|gallons?|pounds?|lbs?)\b/gi)
    .filter((match) => !packageIndexes.has(match.index) && Number(match[1].replace(/,/g, "")) >= 10);
  const quantity = quantities.at(-1);
  if (quantity) {
    const approximate = /\b(?:about|around|approximately|roughly)\b/i.test(quantity[0]);
    put("production_volume", `${approximate ? "About " : ""}${quantity[1]} ${quantity[2].toLowerCase()}`, quantity, "The latest explicit first-run quantity supersedes earlier quantities.");
  }

  const geography = lastMatch(idea, /\b(?:near(?:by)?\s+)?(?:Texas|California|Florida|New York|Illinois|Ohio|Georgia|Pennsylvania|Colorado|Arizona)(?:\s+(?:or|and)\s+nearby)?\b|\b(?:Midwest|Northeast|Southeast|Southwest|West Coast|West)\b/gi);
  if (geography) {
    const trailing = idea.slice((geography.index ?? 0) + geography[0].length, (geography.index ?? 0) + geography[0].length + 40);
    const flexible = /\s+is\s+preferred\s+but\s+flexible/i.test(trailing);
    put("preferred_geography", `${normalizeGeography(geography[0])}${flexible ? " preferred; flexible" : ""}`, geography, "The founder explicitly named a state or region preference.");
  }

  const storageCandidates = allMatches(idea, /\b(?:shelf[-\s]?stable|room[-\s]?temperature|ambient|refrigerated|chilled|frozen)\b/gi).filter((match) => !isNegatedAt(idea, match));
  const storage = storageCandidates.at(-1);
  const storageContext = storage ? idea.slice(Math.max(0, (storage.index ?? 0) - 24), (storage.index ?? 0) + storage[0].length + 24) : "";
  if (storage && !/\b(?:goal|possible|maybe|might|could)\b/i.test(storageContext)) put("storage_distribution", normalizeStorage(storage[0]), storage, "The founder explicitly stated the intended storage condition.");

  const formula = lastMatch(idea, /\b(?:finished|complete|tested)\s+(?:home|kitchen)?\s*recipe\b|\b(?:bench\s+formula\s+exists|draft\s+kitchen\s+recipe[^.?!]*not\s+tested[^.?!]*(?:not\s+)?(?:scale[-\s]ready|ready\s+to\s+scale)|(?:home|kitchen)\s+recipe\s+(?:that\s+is\s+)?not\s+(?:scaled|commercialized)|recipe\s+(?:is\s+)?(?:at\s+)?(?:the\s+)?idea\s+stage|(?:still\s+|(?:the\s+recipe|it)\s+(?:is|'s|’s)\s+)?(?:a\s+)?home\s+prototype[^.?!;]*(?:not\s+tested|untested)[^.?!;]*(?:not\s+)?scale[-\s]ready|(?:it\s+(?:is|'s|’s)\s+)?(?:a\s+)?prototype\s+(?:made\s+)?at\s+home[^.?!;]*(?:not\s+tested|untested)[^.?!;]*not\s+ready\s+to\s+scale)\b/gi);
  if (formula) put("formula_status", normalizeFormulaStatus(formula[0]), formula, "The founder explicitly described the current recipe status; commercial validation is not implied.");

  const validationMatches = [
    lastMatch(idea, /\bprocess[-\s]?authority\s+(?:and\s+)?(?:review|validation)\b/gi),
    lastMatch(idea, /\bshelf[-\s]?life\s+(?:testing|test|review|validation)\b/gi),
  ].filter((match): match is RegExpMatchArray => Boolean(match));
  const assistance = lastMatch(idea, /\b(?:need|needs|needed|require|requires|required|yes,?\s*i\s+need)\s+(?:help\s+(?:(?:creating|finishing|finalizing|scaling)(?:\s+the)?\s+(?:recipe|formula)|with\s+formulation)|formulation\s+(?:assistance|help))\b/gi);
  if (validationMatches.length) {
    const needs = [validationMatches.some((match) => /process/i.test(match[0])) ? "process-authority review" : null, validationMatches.some((match) => /shelf/i.test(match[0])) ? "shelf-life review" : null].filter((value): value is string => Boolean(value));
    put("formulation_assistance", `${formatList(needs)} needed`, validationMatches, "The founder explicitly identified qualified validation work that remains open.");
  } else if (assistance) put("formulation_assistance", "Required", assistance, "The founder explicitly requested formulation assistance.");

  const allergenMatches = [
    ...allMatches(idea, /\b(?:sesame|peanut|dairy|gluten|soy|egg|wheat|tree[-\s]?nut)[-\s]?free(?:\s*(?:,|and)\s*(?:sesame|peanut|dairy|gluten|soy|egg|wheat|tree[-\s]?nut)[-\s]?free)*\s+(?:is|are)\s+(?:a\s+must|required)\b/gi),
    ...allMatches(idea, /\bmust\s+be\s+(?:sesame|peanut|dairy|gluten|soy|egg|wheat|tree[-\s]?nut)[-\s]?free(?:\s*(?:,|and)\s*(?:sesame|peanut|dairy|gluten|soy|egg|wheat|tree[-\s]?nut)[-\s]?free)*/gi),
    ...allMatches(idea, /\bno\s+dairy\s+is\s+allowed\b/gi),
    ...allMatches(idea, /\bmust\s+(?:avoid|exclude)\s+(?:sesame|peanuts?|dairy|gluten|soy|eggs?|wheat|tree[-\s]?nuts?)(?:\s*(?:,|and)\s*(?:sesame|peanuts?|dairy|gluten|soy|eggs?|wheat|tree[-\s]?nuts?))*\b/gi),
  ].sort(bySourcePosition);
  if (allergenMatches.length) {
    const currentAllergenText = allergenMatches.map((match) => match[0]).join(" ");
    const requirements = [
      /dairy/i.test(currentAllergenText) ? "Dairy-free" : null,
      /sesame/i.test(currentAllergenText) ? "Sesame-free" : null,
      /peanut/i.test(currentAllergenText) ? "peanut-free" : null,
      /gluten/i.test(currentAllergenText) ? "gluten-free" : null,
      /\bsoy\b/i.test(currentAllergenText) ? "soy-free" : null,
      /\beggs?\b/i.test(currentAllergenText) ? "egg-free" : null,
      /\bwheat\b/i.test(currentAllergenText) ? "wheat-free" : null,
      /tree[-\s]?nuts?/i.test(currentAllergenText) ? "tree-nut-free" : null,
    ].filter((value): value is string => Boolean(value));
    put("allergens", sentenceCase(`${formatList(requirements)} required`), allergenMatches, "The founder explicitly stated required allergen exclusions.");
  }

  const hotFill = lastMatch(idea, /\b(?:use\s+)?hot[-\s]?fill\b[^.?!;]*/gi);
  if (hotFill && !isNegatedAt(idea, hotFill)) {
    const conditional = /(?:if|only\s+after)[^.?!;]*(?:qualified\s+)?process\s+authority[^.?!;]*(?:safe|validat)/i.test(hotFill[0]);
    put("manufacturing_process", conditional ? "Hot fill only if validated safe by a qualified process authority" : "Hot fill", hotFill, conditional ? "The founder explicitly chose hot fill only if a qualified process authority validates it as safe." : "The founder explicitly chose hot fill as the intended process direction.");
  }

  const retailChannel = lastMatch(idea, /\b(?:sell(?:\s+first)?\s+(?:through|in|to)|start\s+at)\s+(farmers?\s+markets?(?:\s+and\s+regional\s+grocery\s+stores?)?|regional\s+grocery\s+stores?|specialty\s+grocers?|food\s+halls?)\b/gi);
  if (retailChannel) put("retail_channel", sentenceCase(retailChannel[1].toLowerCase()), retailChannel, "The founder explicitly named the first retail channel.");

  const packagingSourcing = [
    ...allMatches(idea, /\b(?:we|the\s+founder)\s+(?:can\s+)?(?:supply|provide)\s+printed\s+labels?[^.?!;]*(?:manufacturer|co[-\s]?packer)\s+(?:must|should|needs?\s+to|to)\s+source\s+(?:the\s+)?(?:jars?|bottles?|cans?|pouches?|bags?)\b/gi),
    ...allMatches(idea, /\b(?:the\s+)?(?:manufacturer|co[-\s]?packer)\s+(?:must|should|needs?\s+to)\s+source\s+(?:the\s+)?(?:jars?|bottles?|cans?|pouches?|bags?)[^.?!;]*(?:we|the\s+founder)\s+(?:can\s+)?(?:supply|provide)\s+printed\s+labels?\b/gi),
  ].sort(bySourcePosition).at(-1);
  if (packagingSourcing) {
    const container = [...packagingSourcing[0].matchAll(/\b(jars?|bottles?|cans?|pouches?|bags?)\b/gi)].at(-1)?.[1] ?? "packaging";
    put("packaging_sourcing", `Founder supplies printed labels; manufacturer sources ${container.toLowerCase()}`, packagingSourcing, "The founder explicitly assigned label and container sourcing responsibilities.");
  }

  const certifications = normalizeCertificationRequirements(idea, null);
  const certificationSpans = certificationEvidenceSpans(idea);
  if (certificationSpans.length && (certifications.required.length || certifications.preferred.length || certifications.negated.length)) {
    const parts = [certifications.required.length ? `Required: ${certifications.required.join(", ")}` : null, certifications.preferred.length ? `Preferred: ${certifications.preferred.join(", ")}` : null, certifications.negated.length ? `Not required: ${certifications.negated.join(", ")}` : null].filter((part): part is string => Boolean(part));
    facts.set("certifications", { key: "certifications", value: parts.join("; "), status: "confirmed", spans: certificationSpans, reason: "The founder explicitly stated certification priorities or negations; the original wording is preserved in the source span." });
  }

  const launchDate = lastMatch(idea, /\b20\d{2}-\d{2}-\d{2}\b/g);
  if (launchDate) put("target_launch_date", launchDate[0], launchDate, "The latest explicit launch-date correction supersedes earlier dates.");

  return [...facts.values()].map((fact) => ({ key: fact.key, value: fact.value, status: fact.status, explicitlyStated: true, source, sourceSpans: uniqueSpans(fact.spans), reason: fact.reason, suggestedSharing: fact.key !== "certifications" || !/^Not required:/i.test(fact.value ?? "") }));
}

function allMatches(source: string, pattern: RegExp): RegExpMatchArray[] { return [...source.matchAll(pattern)]; }
function lastMatch(source: string, pattern: RegExp): RegExpMatchArray | undefined { return allMatches(source, pattern).at(-1); }
function bySourcePosition(left: RegExpMatchArray, right: RegExpMatchArray) { return (left.index ?? 0) - (right.index ?? 0); }
function bySourceEndThenSpecificity(left: RegExpMatchArray, right: RegExpMatchArray) {
  const leftEnd = (left.index ?? 0) + left[0].length;
  const rightEnd = (right.index ?? 0) + right[0].length;
  return leftEnd - rightEnd || left[0].length - right[0].length;
}
function sourceSpan(source: string, match: RegExpMatchArray): FounderSourceSpan { const start = match.index ?? source.indexOf(match[0]); return { start, end: start + match[0].length, text: match[0] }; }
function uniqueSpans(spans: FounderSourceSpan[]): FounderSourceSpan[] { return spans.filter((span, index) => spans.findIndex((candidate) => candidate.start === span.start && candidate.end === span.end) === index); }
function isNegatedAt(source: string, match: RegExpMatchArray): boolean { const start = match.index ?? 0; return /(?:\bnot|\bno)\s*$/i.test(source.slice(Math.max(0, start - 18), start)); }
function normalizeUnit(value: string): string { const normalized = value.toLowerCase().replace(/\./g, "").replace(/\s+/g, " "); if (/^(?:ounce|ounces|oz|fl oz|fluid ounce|fluid ounces)$/.test(normalized)) return "oz"; if (/^(?:milliliter|milliliters|ml)$/.test(normalized)) return "ml"; return "g"; }
function singular(value: string): string { return value.replace(/pouches$/i, "pouch").replace(/boxes$/i, "box").replace(/s$/i, ""); }
function titleCase(value: string): string { return value.trim().replace(/\b\w/g, (letter) => letter.toUpperCase()).replace(/\s+/g, " "); }
function sentenceCase(value: string): string { const trimmed = value.trim(); return trimmed ? `${trimmed[0].toUpperCase()}${trimmed.slice(1)}` : trimmed; }
function normalizeGeography(value: string): string { const trimmed = value.trim(); if (/^near/i.test(trimmed)) return `${titleCase(trimmed.replace(/^near(?:by)?\s+/i, ""))} or nearby`; return titleCase(trimmed).replace(/\s+(?:Or|And)\s+Nearby$/i, " or nearby"); }
function normalizeStorage(value: string): string { if (/shelf|room|ambient/i.test(value)) return "Shelf-stable"; if (/refrigerat|chilled/i.test(value)) return "Refrigerated"; return "Frozen"; }
function normalizeFormulaStatus(value: string): string { if (/bench\s+formula/i.test(value)) return "Bench formula"; if (/home\s+prototype|prototype\s+(?:made\s+)?at\s+home/i.test(value)) return "Untested home prototype; not scale-ready"; if (/draft\s+kitchen/i.test(value)) return "Draft kitchen recipe; not tested or scale-ready"; if (/finished|complete|tested/i.test(value)) return "Finished kitchen recipe"; if (/not\s+(?:scaled|commercialized)/i.test(value)) return "Kitchen recipe not scaled for production"; return "Recipe at idea stage"; }
function formatList(values: string[]): string { if (values.length < 2) return values[0] ?? "validation review"; return `${values.slice(0, -1).join(", ")} and ${values.at(-1)}`; }
function lowerFirst(value: string): string { return value ? `${value[0].toLowerCase()}${value.slice(1)}` : value; }
function hasPositiveShelfStable(source: string): boolean { return allMatches(source, /\b(?:shelf[-\s]?stable|ambient|room[-\s]?temperature)\b/gi).some((match) => !isNegatedAt(source, match)); }
