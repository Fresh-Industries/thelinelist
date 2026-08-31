import type { SourcingWorkspace } from "./types";

const OPEN_BRAND_ANSWER = /^(?:no(?:\s+brand)?(?:\s+yet)?|not\s+yet|i\s+(?:do\s+not|don't|don’t)\s+have\s+(?:a\s+brand|one)(?:\s+yet)?|i\s+(?:have\s+not|haven't|haven’t)\s+decided|(?:(?:i(?:'|’)m)\s+)?(?:not\s+)?sure(?:\s+yet)?)[.!]?$/i;

export interface ProductIdentity {
  brandName: string | null;
  productDescriptor: string;
}

export function getProductIdentity(workspace: SourcingWorkspace): ProductIdentity {
  const brand = workspace.fields.brand_name;
  const brandName = brand.status === "confirmed" && brand.value && !isOpenBrandAnswer(brand.value)
    ? brand.value
    : null;

  return {
    brandName,
    productDescriptor: getProductDescriptor(workspace),
  };
}

export function getProductDescriptor(workspace: SourcingWorkspace): string {
  const candidate = workspace.fields.product_type.value || workspace.fields.product_name.value;
  if (candidate) return deriveProductDescriptorFromIdea(candidate) || "Product in development";

  const format = workspace.fields.product_format.value;
  const category = workspace.fields.product_category.value;
  return deriveProductDescriptorFromIdea(format || category || "") || "Product in development";
}

export function deriveProductDescriptorFromIdea(idea: string): string | null {
  const source = idea.trim().replace(/[.…]+$/u, "").trim();
  if (!source) return null;

  let candidate = source;
  const packageMatch = /^i\s+want\s+to\s+package\s+(.+)$/i.exec(candidate);
  const turnIdeaMatch = /^i\s+want\s+to\s+turn\s+my\s+(.+?)\s+idea\s+into\b.*$/i.exec(candidate);
  const thirdPersonMakerMatch = /^[\p{L}][\p{L}\p{M}'’.-]*(?:\s+[\p{L}][\p{L}\p{M}'’.-]*){0,3}\s+(?:makes?|bakes?)\s+(.+?)(?=\s+(?:at|from)\s+home\b|\s+and\s+(?:i|we)\b|$)/iu.exec(candidate);
  if (packageMatch) {
    candidate = `Packaged ${packageMatch[1]}`;
  } else if (turnIdeaMatch) {
    candidate = `Packaged ${turnIdeaMatch[1]}`;
  } else if (thirdPersonMakerMatch) {
    candidate = thirdPersonMakerMatch[1];
  } else {
    candidate = candidate.replace(
      /^(?:i|we)\s+(?:(?:want|would\s+like|plan|hope)\s+to\s+)?(?:make|create|develop|sell)|^(?:i(?:'|’)m|i\s+am|we(?:'|’)re|we\s+are)\s+(?:making|creating|developing|working\s+on)|^i\s+have\s+an\s+idea\s+for/i,
      "",
    );
  }

  candidate = candidate
    .trim()
    .replace(/^(?:a|an|the)\s+/i, "")
    .replace(/\s+that\b.*$/i, "")
    .replace(/\s+and\s+(?:i\s+|we\s+)?(?:want|would\s+like|plan|hope)\b.*$/i, "")
    .replace(/\s+(?:to\s+sell|for\s+(?:individual\s+sale|sale|coffee\s+shops?|grocery\s+stores?|retail|stores?))\b.*$/i, "")
    .replace(/\s+in\s+(?:(?:\d+(?:\.\d+)?\s*(?:fl\s*)?(?:oz|ounce|ounces|ml|l))\s+)?(?:(?:slim|standard)\s+)?(?:cans?|bottles?|jars?|pouches?|bags?)\b.*$/i, "")
    .replace(/[,.!?;:]+$/u, "")
    .trim();

  if (!candidate) return null;
  if (candidate.length > 90 || candidate.split(/\s+/).length > 10) {
    candidate = fallbackProductPhrase(source) || "";
  }
  if (!candidate) return null;
  if (/^banana\s+bread$/i.test(candidate) && /\b(?:manufactur\w*|retail|stores?)\b/i.test(source)) {
    candidate = "Packaged banana bread";
  }
  return candidate.charAt(0).toUpperCase() + candidate.slice(1);
}

export function isOpenBrandAnswer(value: string | null | undefined): boolean {
  return Boolean(value?.trim() && OPEN_BRAND_ANSWER.test(value.trim()));
}

function fallbackProductPhrase(source: string): string | null {
  const knownProducts: Array<[RegExp, string]> = [
    [/\bbanana\s+bread\b/i, "Banana bread"],
    [/\bhot\s+sauce\b/i, "Hot sauce"],
    [/\benergy\s+drink\b/i, "Energy drink"],
    [/\bsparkling\s+(?:drink|beverage)\b/i, "Sparkling beverage"],
    [/\b(?:sauce|condiment)\b/i, "Packaged sauce"],
    [/\b(?:drink|beverage)\b/i, "Packaged beverage"],
    [/\b(?:baked\s+good|bakery\s+product)\b/i, "Packaged baked good"],
    [/\bsnack\b/i, "Packaged snack"],
    [/\bprepared\s+food\b/i, "Prepared food"],
  ];
  return knownProducts.find(([pattern]) => pattern.test(source))?.[1] ?? null;
}
