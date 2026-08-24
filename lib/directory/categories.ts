import type { FinderProduct, Plant } from "./types";

export const PRODUCT_CATEGORIES = [
  { slug: "soda", label: "Soda", group: "beverage", description: "Soft drinks and sparkling beverages" },
  { slug: "energy-drink", label: "Energy drinks", group: "beverage", description: "Canned or bottled energy beverages" },
  { slug: "sports-hydration", label: "Sports and hydration", group: "beverage", description: "Still or sparkling hydration drinks" },
  { slug: "functional-beverages", label: "Wellness drinks & shots", group: "beverage", description: "Drinks and shots with added ingredients for a specific benefit" },
  { slug: "cold-pressed-juice", label: "Cold-pressed juice", group: "beverage", description: "Pressed juice with a separate safety process" },
  { slug: "juice", label: "Juice", group: "beverage", description: "Juice, lemonade, smoothies, and shots" },
  { slug: "rtd-coffee-tea", label: "Tea and coffee drinks", group: "beverage", description: "Ready-to-drink coffee and tea" },
  { slug: "water", label: "Water", group: "beverage", description: "Still or sparkling packaged water" },
  { slug: "hot-sauce", label: "Hot sauce", group: "sauce", description: "Pepper sauces and small-bottle formats" },
  { slug: "sauce", label: "Sauce", group: "sauce", description: "Sauces, condiments, and syrups" },
  { slug: "salsa", label: "Salsa", group: "sauce", description: "Fresh or shelf-stable salsa" },
  { slug: "dressings-marinades", label: "Dressings and marinades", group: "sauce", description: "Dressings, vinaigrettes, and marinades" },
  { slug: "dips-hummus", label: "Dips and hummus", group: "prepared-rte", description: "Refrigerated dips and spreads" },
  { slug: "prepared-refrigerated-foods", label: "Prepared refrigerated foods", group: "prepared-rte", description: "Prepared meals, soups, salads, and sides" },
] as const satisfies readonly {
  slug: string;
  label: string;
  group: FinderProduct;
  description: string;
}[];

export type ProductCategorySlug = (typeof PRODUCT_CATEGORIES)[number]["slug"];

export const CATEGORY_HUB_CONTENT: Record<
  ProductCategorySlug,
  { seoTitle: string; h1: string; description: string; questions: string[] }
> = {
  soda: { seoTitle: "Soda and Soft Drink Co-Packers", h1: "Find soda and soft drink co-packers", description: "Compare manufacturers whose public product descriptions name soft drinks or soda. Confirm carbonation and pack fit directly.", questions: ["Can the line carbonate my formula?", "Does the line run my can or bottle size?"] },
  "energy-drink": { seoTitle: "Energy Drink Co-Packers", h1: "Find energy drink co-packers", description: "Compare manufacturers whose public product descriptions name energy drinks. Ask about cans, bottles, carbonation, formula path, and shelf stability.", questions: ["Do you run cans, bottles, or both?", "Can you support a private-label base or a custom formula?"] },
  "sports-hydration": { seoTitle: "Sports Drink and Hydration Beverage Manufacturers", h1: "Find sports and hydration beverage manufacturers", description: "Compare publicly stated sports and hydration beverage capabilities. Confirm still or sparkling fit and package format.", questions: ["Do you run still and sparkling beverages?", "Do you fill RTD products, powders, or both?"] },
  "functional-beverages": { seoTitle: "Functional Beverage Co-Packers", h1: "Find wellness drink and shot manufacturers", description: "The industry often calls these functional beverages. Compare manufacturers that publicly name wellness drinks or shots, then confirm ingredient, process, and claim fit directly.", questions: ["Has the line handled a similar ingredient system?", "How will process affect sensitive ingredients?"] },
  "cold-pressed-juice": { seoTitle: "Cold Pressed Juice Co-Manufacturers", h1: "Find cold-pressed juice co-manufacturers", description: "Compare manufacturers that publicly name cold-pressed juice. Cold pressed describes extraction and is not automatically the same as HPP.", questions: ["How is the juice safety process validated?", "Does the package fit HPP, heat, or another control?"] },
  juice: { seoTitle: "Juice Co-Packers and Co-Manufacturers", h1: "Find juice co-packers", description: "Compare manufacturers whose public product descriptions name juice, lemonade, smoothies, or shots.", questions: ["How do you meet Juice HACCP requirements for this product?", "Is the product refrigerated or shelf-stable?"] },
  "rtd-coffee-tea": { seoTitle: "RTD Coffee and Tea Co-Packers", h1: "Find RTD coffee and tea co-packers", description: "Compare manufacturers that publicly name ready-to-drink coffee, tea, or cold brew. Confirm dairy, process, and pack fit.", questions: ["Do you handle dairy and non-dairy products?", "Which process works for this formula and package?"] },
  water: { seoTitle: "Bottled Water Private Label and Co-Packing", h1: "Find bottled water private-label partners", description: "Compare manufacturers that publicly name packaged water. Confirm source, treatment, still or sparkling capability, and label claims.", questions: ["What source and treatment support the intended label?", "Which still or sparkling formats do you fill?"] },
  "hot-sauce": { seoTitle: "Hot Sauce Co-Packers and Co-Manufacturers", h1: "Find hot sauce co-packers", description: "Compare manufacturers that publicly name hot sauce. Ask about acidified process fit, bottle size, particulate handling, and minimum runs.", questions: ["Do you run acidified hot sauce in my bottle?", "What process-authority work is needed before a trial?"] },
  sauce: { seoTitle: "Sauce Co-Packers", h1: "Find sauce co-packers", description: "Compare manufacturers whose public descriptions name sauces or condiments. Confirm formula, process, packaging, and storage fit.", questions: ["Is this formula shelf-stable or refrigerated?", "Can the filler handle the product viscosity and package?"] },
  salsa: { seoTitle: "Salsa Co-Packers", h1: "Find salsa co-packers", description: "Compare manufacturers that publicly name salsa. Ask about acidified process fit, fresh versus shelf-stable storage, and particulate size.", questions: ["Do you run fresh refrigerated or shelf-stable salsa?", "What particulate size can the filler handle?"] },
  "dressings-marinades": { seoTitle: "Dressing and Marinade Co-Packers", h1: "Find dressing and marinade co-packers", description: "Compare manufacturers that publicly name dressings, vinaigrettes, or marinades. Confirm emulsion, allergen, process, and pack fit.", questions: ["Does the line run emulsions or only thinner liquids?", "What allergen controls apply to this formula?"] },
  "dips-hummus": { seoTitle: "Dips and Hummus Co-Packers", h1: "Find dips and hummus co-packers", description: "Compare manufacturers that publicly name dips or hummus. Refrigerated capacity, allergens, packaging, and cold chain drive fit.", questions: ["Is this refrigerated capacity?", "Do you use HPP for this product, or another process?"] },
  "prepared-refrigerated-foods": { seoTitle: "Prepared Refrigerated Foods Co-Packers", h1: "Find prepared refrigerated food co-packers", description: "Compare manufacturers that publicly name prepared or refrigerated foods. Confirm inspection scope, cold chain, pack, and audit needs.", questions: ["Is the facility scope right for the ingredients?", "Where are finished goods stored after production?"] },
};

const CATEGORY_PATTERNS: Record<ProductCategorySlug, RegExp> = {
  soda: /\b(soda|soft drink|sparkling beverage|carbonated beverage)\b/i,
  "energy-drink": /\benergy drink(s)?\b/i,
  "sports-hydration": /\b(sport(s)? drink|hydration|electrolyte)\b/i,
  "functional-beverages": /\b(functional beverage|wellness shot)\b/i,
  "cold-pressed-juice": /\bcold[- ]pressed juice(s)?\b/i,
  juice: /\b(juice|juices|lemonade|smoothie|smoothies|wellness shot|shots)\b/i,
  "rtd-coffee-tea": /\b(tea|teas|coffee|cold[- ]brew|RTD coffee|RTD tea)\b/i,
  water: /\b(bottled water|packaged water|sparkling water)\b/i,
  "hot-sauce": /\bhot sauce\b/i,
  sauce: /\b(sauce|sauces|condiment|condiments|syrup|syrups)\b/i,
  salsa: /\bsalsa(s)?\b/i,
  "dressings-marinades": /\b(dressing|dressings|marinade|marinades|vinaigrette)\b/i,
  "dips-hummus": /\b(dip|dips|hummus)\b/i,
  "prepared-refrigerated-foods": /\b(RTE|ready[- ]to[- ]eat|prepared|refrigerated|meal|meals|salad|salads|soup|soups|broth|broths|entree|entrees|baby food)\b/i,
};

export function getProductCategory(slug: string) {
  return PRODUCT_CATEGORIES.find((category) => category.slug === slug);
}

export function isProductCategorySlug(value: string): value is ProductCategorySlug {
  return PRODUCT_CATEGORIES.some((category) => category.slug === value);
}

export function plantMatchesCategory(plant: Plant, category: ProductCategorySlug): boolean {
  if (plant.categories) return plant.categories.includes(category);

  const disclosedText = [
    plant.productTypesPublished,
    ...plant.overview,
    plant.packaging,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");
  return CATEGORY_PATTERNS[category].test(disclosedText);
}

const CATEGORY_FAQ_ANSWERS: Record<ProductCategorySlug, readonly [string, string]> = {
  soda: ["Ask whether the exact line supports your target carbonation level and formula, then confirm how carbonation is measured during the run.", "Confirm the exact container material, volume, closure, and case format. A plant that runs cans or bottles may not run every size."],
  "energy-drink": ["The public listing shows whether cans, bottles, or both are named. Confirm your exact size, closure, and carbonation level directly with the manufacturer.", "Ask whether the plant offers an existing private-label base, custom formulation, or both. The directory does not treat one model as the other."],
  "sports-hydration": ["Ask the manufacturer whether the specific line supports still products, carbonated products, or both; broad beverage experience is not enough.", "These results cover ready-to-drink products only when they are publicly named. Powder blending and RTD filling require different equipment, so confirm which one you need."],
  "functional-beverages": ["Use the public product list to find similar products, then disclose the ingredient system under appropriate confidentiality and ask about solubility, heat, pressure, and line-cleaning constraints.", "Ask how the proposed heat, pressure, or other validated process affects each sensitive ingredient and claim. The manufacturer and qualified technical experts should confirm the final fit."],
  "cold-pressed-juice": ["Cold pressed describes extraction, not the safety step. Ask how the plant validates the required pathogen reduction for your exact juice and whether Juice HACCP applies.", "Confirm the safety process first, then verify that the bottle, closure, and label can tolerate HPP, heat, or the other selected control."],
  juice: ["Ask for the plant’s Juice HACCP scope and how it validates the required 5-log reduction for your specific juice, process, and package.", "Tell the manufacturer your intended storage condition. Refrigerated and shelf-stable juice use different process, package, storage, and distribution plans."],
  "rtd-coffee-tea": ["Do not infer dairy capability from a general coffee or tea listing. Ask whether the facility and exact line handle dairy, non-dairy allergens, or both.", "Formula acidity, ingredients, storage goal, and package determine the process. Ask the manufacturer and qualified process expert to confirm the path for your SKU."],
  water: ["Ask the manufacturer to document the water source, treatment steps, and which label claims those records support.", "Confirm whether the exact line runs still, carbonated, or both and verify your bottle or can size, closure, and case format."],
  "hot-sauce": ["Confirm the line runs your sauce viscosity and particulates in the exact bottle, cap, and fill size; a general sauce claim is not enough.", "For shelf-stable acidified hot sauce, a qualified process authority reviews the formula and process and establishes the scheduled process before commercial production. Ask the manufacturer when it needs that process letter and what the trial must confirm."],
  sauce: ["Have a qualified expert classify the formula and intended storage condition. Shelf-stable acidified, refrigerated, hot-filled, and retorted sauces follow different paths.", "Give the plant viscosity, particulate size, fill temperature, and exact container details, then ask it to confirm pump, filler, and closure compatibility."],
  salsa: ["State the intended storage condition first. Fresh refrigerated and shelf-stable acidified salsa require different process controls, packaging, and distribution.", "Measure and disclose the largest particulate size, then confirm the pump, filler opening, container neck, and scheduled process can handle it."],
  "dressings-marinades": ["Share viscosity and emulsion details under appropriate confidentiality. Ask whether the line can mix and fill that product without separation.", "List every allergen in the formula and ask about storage, scheduling, changeover, sanitation validation, and the facility’s applicable allergen controls."],
  "dips-hummus": ["Confirm that the listing names refrigerated dips or hummus and ask about cold storage and shipping; a general prepared-food listing is not proof of refrigerated capacity.", "HPP is one possible process, not an assumption. Ask which validated process the plant proposes for your formula, package, and intended shelf life."],
  "prepared-refrigerated-foods": ["Share the ingredient and product type so the manufacturer can confirm whether the relevant FDA or USDA scope, allergen controls, and line fit apply.", "Ask where product is cooled and held, how temperature is monitored, how long it can remain on site, and who arranges refrigerated freight."],
};

export function categoryFaqs(slug: ProductCategorySlug) {
  const questions = CATEGORY_HUB_CONTENT[slug].questions;
  const answers = CATEGORY_FAQ_ANSWERS[slug];
  return questions.map((question, index) => ({ question, answer: answers[index] }));
}
