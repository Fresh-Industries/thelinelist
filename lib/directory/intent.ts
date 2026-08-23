import type { FinderProduct } from "./types";

/**
 * Map founder-language (“hot sauce”, “cold juice”) onto existing finder
 * product filters. Does not invent product types we do not verify.
 */
export type ProductCoverage = "mapped" | "unknown" | "unsupported";

export type UnsupportedKind = "snacks" | "supplements" | "frozen" | "bakery";

export interface ProductIntent {
  query: string;
  product?: FinderProduct;
  coverage: ProductCoverage;
  unsupportedKind?: UnsupportedKind;
}

const UNSUPPORTED: { kind: UnsupportedKind; pattern: RegExp }[] = [
  {
    kind: "supplements",
    pattern:
      /\b(supplement|supplements|vitamin|vitamins|gummy|gummies|nootropic|protein\s+powder|pre[- ]?workout)\b/i,
  },
  {
    kind: "snacks",
    pattern:
      /\b(snack|snacks|protein\s+bar|snack\s+bar|granola|chip|chips|crisp|crisps|cracker|crackers|trail\s+mix|nut\s+butter\s+cup)\b/i,
  },
  {
    kind: "frozen",
    pattern: /\b(frozen|ice\s+cream|popsicle|gelato)\b/i,
  },
  {
    kind: "bakery",
    pattern: /\b(bakery|bread|cookie|cookies|muffin|pastry|cake|brownie)\b/i,
  },
];

const PRODUCT_PHRASES: { product: FinderProduct; pattern: RegExp }[] = [
  {
    product: "sauce",
    pattern:
      /\b(hot\s*sauce|chili\s*crisp|salsa|ketchup|mustard|mayo|mayonnaise|marinade|bbq|barbecue|condiment|dressing|vinaigrette|sauce|pesto|aioli|relish|chutney)\b/i,
  },
  {
    product: "beverage",
    pattern:
      /\b(juice|tea|kombucha|soda|seltzer|sparkling|beverage|drink|lemonade|tonic|smoothie|kefir|coffee|elixir|shot)\b/i,
  },
  {
    product: "prepared-rte",
    pattern:
      /\b(dip|hummus|guacamole|guac|salad|rte|ready[-\s]?to[-\s]?eat|meal|soup|broth|refrigerated|prepared|wet\s+salad|baby\s+food)\b/i,
  },
];

const UNSUPPORTED_LABELS: Record<UnsupportedKind, string> = {
  snacks: "snacks or bars",
  supplements: "supplements",
  frozen: "frozen foods",
  bakery: "bakery",
};

export function interpretProductIntent(raw: string): ProductIntent {
  const query = raw.trim();
  if (!query) {
    return { query, coverage: "unknown" };
  }

  for (const entry of UNSUPPORTED) {
    if (entry.pattern.test(query)) {
      return { query, coverage: "unsupported", unsupportedKind: entry.kind };
    }
  }

  for (const entry of PRODUCT_PHRASES) {
    if (entry.pattern.test(query)) {
      return { query, product: entry.product, coverage: "mapped" };
    }
  }

  return { query, coverage: "unknown" };
}

export function unsupportedLabel(kind: UnsupportedKind): string {
  return UNSUPPORTED_LABELS[kind];
}

export function coverageNote(intent: ProductIntent): string | null {
  switch (intent.coverage) {
    case "unsupported":
      return intent.unsupportedKind
        ? `We do not have listed manufacturers tagged for ${unsupportedLabel(intent.unsupportedKind)} yet. Showing every listed manufacturer instead.`
        : "We do not have sourced coverage for that product yet. Showing every listed manufacturer instead.";
    case "mapped":
      return null;
    case "unknown":
      return intent.query
        ? `We could not map “${intent.query}” onto a supported product type. Showing every listed manufacturer. Try beverage, sauce, or prepared / refrigerated.`
        : null;
    default: {
      const _exhaustive: never = intent.coverage;
      return _exhaustive;
    }
  }
}
