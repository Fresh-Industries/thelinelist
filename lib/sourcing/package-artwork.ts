export type PackageArtworkStyle = "warm-handmade" | "modern-premium" | "playful-retail";

export const PACKAGE_ARTWORK_ASPECT = 5 / 6;

export type PackageArtworkMotif = "berry" | "bubbles" | "chickpea" | "chili" | "citrus" | "coffee" | "drop" | "grain" | "honey" | "leaf";

export interface PackageArtworkConcept {
  category: "bakery" | "beverage" | "food" | "sauce" | "snack";
  kicker: string;
  footer: string;
  motifs: PackageArtworkMotif[];
}

function includesAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term));
}

export function getPackageArtworkConcept({
  product,
  artDirection,
}: {
  product: string;
  artDirection: string;
  style: PackageArtworkStyle;
}): PackageArtworkConcept {
  const text = `${product} ${artDirection}`.toLowerCase();
  const category: PackageArtworkConcept["category"] = includesAny(text, ["bread", "bakery", "cake", "cookie", "muffin", "loaf"])
    ? "bakery"
    : includesAny(text, ["snack", "chickpea", "cracker", "chips", "granola", "popcorn", "protein bar"])
      ? "snack"
      : includesAny(text, ["drink", "beverage", "juice", "water", "seltzer", "tea", "soda"])
        ? "beverage"
        : includesAny(text, ["sauce", "salsa", "condiment", "marinade", "hot honey"])
          ? "sauce"
          : "food";

  const copy = {
    bakery: { kicker: "BAKED FOR THE GOOD STUFF", footer: "SMALL BATCH • BAKED WITH CARE" },
    beverage: { kicker: "READY TO REFRESH", footer: "BOLD FLAVOR • MADE TO SIP" },
    food: { kicker: "MADE TO STAND OUT", footer: "CRAFTED WITH CARE" },
    sauce: { kicker: "POUR ON THE FLAVOR", footer: "BOLD FLAVOR • MADE TO POUR" },
    snack: { kicker: "CRUNCH WITH CHARACTER", footer: "BIG FLAVOR • READY TO SHARE" },
  }[category];

  const motifs: PackageArtworkMotif[] = [];
  const add = (motif: PackageArtworkMotif) => { if (!motifs.includes(motif) && motifs.length < 3) motifs.push(motif); };
  if (text.includes("chickpea")) add("chickpea");
  if (text.includes("honey")) add("honey");
  if (includesAny(text, ["chili", "chile", "pepper", "spicy", "hot "])) add("chili");
  if (includesAny(text, ["lemon", "lime", "orange", "citrus"])) add("citrus");
  if (includesAny(text, ["berry", "strawberry", "blueberry", "raspberry"])) add("berry");
  if (text.includes("coffee")) add("coffee");
  if (!motifs.length) add(({ bakery: "grain", beverage: "bubbles", food: "leaf", sauce: "drop", snack: "chickpea" } as const)[category]);

  return { category, ...copy, motifs };
}
