import { resolveProductCategoryFromText, type ProductCategory } from "./product-category";

export type PackageArtworkStyle = "warm-handmade" | "modern-premium" | "playful-retail";

export const PACKAGE_ARTWORK_ASPECT = 5 / 6;

export type PackageArtworkMotif = "berry" | "bubbles" | "chickpea" | "chili" | "citrus" | "coffee" | "drop" | "grain" | "honey" | "leaf" | "lightning" | "star" | "sunburst" | "wave";

export type PackageArtworkMotifGeometry =
  | "berry-cluster"
  | "bubble-rings"
  | "chickpea-beans"
  | "chili-pod"
  | "citrus-wheel"
  | "coffee-bean"
  | "liquid-drop"
  | "grain-stalk"
  | "honeycomb"
  | "leaf-sprig"
  | "lightning-bolt"
  | "five-point-star"
  | "sunburst"
  | "wave-lines";

export interface PackageArtworkMotifRenderPlan {
  motif: PackageArtworkMotif;
  geometry: PackageArtworkMotifGeometry;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  arrangement: "single" | "around";
}

export interface PackageArtworkRenderPlan {
  version: 2;
  brand: string;
  product: string;
  category: ProductCategory;
  style: PackageArtworkStyle;
  accentColor: string | null;
  kicker: string;
  footer: string;
  motifs: PackageArtworkMotifRenderPlan[];
}

export interface PackageArtworkConcept {
  category: ProductCategory;
  kicker: string;
  footer: string;
  motifs: PackageArtworkMotif[];
}

function includesAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term));
}

const MOTIF_TERMS: Record<PackageArtworkMotif, string[]> = {
  berry: ["berry", "strawberry", "blueberry", "raspberry"],
  bubbles: ["bubble", "bubbles", "bubbly", "sparkling", "fizz", "effervescent"],
  chickpea: ["chickpea", "chickpeas"],
  chili: ["chili", "chile", "pepper", "spicy", "hot"],
  citrus: ["citrus", "lemon", "lime", "orange"],
  coffee: ["coffee"],
  drop: ["drop", "pour"],
  grain: ["grain", "wheat"],
  honey: ["honey"],
  leaf: ["leaf", "leaves", "plant"],
  lightning: ["lightning", "bolt", "electric", "energy arc"],
  star: ["star", "sparkle", "spark"],
  sunburst: ["sunburst", "sun burst", "rays", "radiating"],
  wave: ["wave", "waves", "ripple", "flowing line"],
};

const MOTIF_GEOMETRY: Record<PackageArtworkMotif, PackageArtworkMotifGeometry> = {
  berry: "berry-cluster",
  bubbles: "bubble-rings",
  chickpea: "chickpea-beans",
  chili: "chili-pod",
  citrus: "citrus-wheel",
  coffee: "coffee-bean",
  drop: "liquid-drop",
  grain: "grain-stalk",
  honey: "honeycomb",
  leaf: "leaf-sprig",
  lightning: "lightning-bolt",
  star: "five-point-star",
  sunburst: "sunburst",
  wave: "wave-lines",
};

export function getPackageArtworkConcept({
  product,
  artDirection,
  category,
}: {
  product: string;
  artDirection: string;
  style: PackageArtworkStyle;
  category?: ProductCategory;
}): PackageArtworkConcept {
  const text = `${product} ${artDirection}`.toLowerCase();
  const resolvedCategory = category ?? resolveProductCategoryFromText(text) ?? "food";

  const copy = {
    bakery: { kicker: "BAKED FOR THE GOOD STUFF", footer: "SMALL BATCH • BAKED WITH CARE" },
    beverage: { kicker: "READY TO REFRESH", footer: "BOLD FLAVOR • MADE TO SIP" },
    food: { kicker: "MADE TO STAND OUT", footer: "CRAFTED WITH CARE" },
    frozen: { kicker: "GOOD FOOD, READY WHEN YOU ARE", footer: "KEEP FROZEN • COOK WITH CARE" },
    sauce: { kicker: "POUR ON THE FLAVOR", footer: "BOLD FLAVOR • MADE TO POUR" },
    snack: { kicker: "CRUNCH WITH CHARACTER", footer: "BIG FLAVOR • READY TO SHARE" },
  }[resolvedCategory];

  const motifs: PackageArtworkMotif[] = [];
  const add = (motif: PackageArtworkMotif) => { if (!motifs.includes(motif) && motifs.length < 3) motifs.push(motif); };
  for (const motif of ["chickpea", "honey", "chili", "citrus", "berry", "coffee", "bubbles", "lightning", "star", "sunburst", "wave", "drop", "grain", "leaf"] as const) {
    if (includesAny(text, MOTIF_TERMS[motif])) add(motif);
  }
  if (!motifs.length) add(({ bakery: "grain", beverage: "bubbles", food: "leaf", frozen: "leaf", sauce: "drop", snack: "chickpea" } as const)[resolvedCategory]);

  return { category: resolvedCategory, ...copy, motifs };
}

export function getPackageArtworkRenderPlan({
  brand,
  product,
  artDirection,
  style,
  category,
  accentColor,
}: {
  brand: string;
  product: string;
  artDirection: string;
  style: PackageArtworkStyle;
  category?: ProductCategory;
  accentColor?: string;
}): PackageArtworkRenderPlan {
  const concept = getPackageArtworkConcept({ product, artDirection, style, category });
  const defaultPositions = concept.motifs.length === 1
    ? [{ x: 0.5, y: 0.69 }]
    : concept.motifs.length === 2
      ? [{ x: 0.32, y: 0.68 }, { x: 0.68, y: 0.7 }]
      : [{ x: 0.2, y: 0.67 }, { x: 0.8, y: 0.69 }, { x: 0.5, y: 0.75 }];
  const clauses = artDirection.toLowerCase().split(/[,;.]+/).map((clause) => clause.trim()).filter(Boolean);
  const explicitlyPositioned = new Set<PackageArtworkMotif>();

  const motifs = concept.motifs.map((motif, index): PackageArtworkMotifRenderPlan => {
    const clause = clauses.find((candidate) => includesAny(candidate, MOTIF_TERMS[motif])) ?? "";
    const large = /\b(?:dramatically\s+larger|much\s+larger|larger|bigger|oversized|large|dominant)\b/.test(clause);
    const small = /\b(?:smaller|small|subtle|tiny)\b/.test(clause);
    const diagonal = /\b(?:diagonal|diagonally|slanted)\b/.test(clause);
    const left = /\bleft(?:ward|wards)?\b/.test(clause);
    const right = /\bright(?:ward|wards)?\b/.test(clause);
    const centered = /\b(?:center|centered|middle)\b/.test(clause);
    const around = /\b(?:around|surround|surrounding|orbit|wreath)\b/.test(clause);
    if (left || right || centered) explicitlyPositioned.add(motif);
    return {
      motif,
      geometry: MOTIF_GEOMETRY[motif],
      x: left ? 0.1 : right ? 0.9 : centered ? 0.5 : defaultPositions[index].x,
      y: defaultPositions[index].y,
      scale: large ? 2.2 : small ? 0.78 : around ? 1.5 : 1.1,
      rotation: diagonal ? -Math.PI / 4 : 0,
      arrangement: around ? "around" : "single",
    };
  });

  for (const motif of motifs) {
    if (motif.arrangement !== "around" || explicitlyPositioned.has(motif.motif)) continue;
    const anchor = motifs.find((candidate) => candidate !== motif && explicitlyPositioned.has(candidate.motif));
    if (anchor) {
      motif.x = anchor.x;
      motif.y = anchor.y;
    }
  }

  return {
    version: 2,
    brand,
    product,
    category: concept.category,
    style,
    accentColor: accentColor?.toLowerCase() ?? null,
    kicker: concept.kicker,
    footer: concept.footer,
    motifs,
  };
}

export function serializePackageArtworkRenderPlan(plan: PackageArtworkRenderPlan): string {
  return JSON.stringify(plan);
}
