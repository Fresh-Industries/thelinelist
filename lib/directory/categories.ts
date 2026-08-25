import type { Plant } from "./types";

export type ProductMacroSlug =
  | "beverages"
  | "sauces-dips-condiments"
  | "snacks-bakery"
  | "dry-goods-supplements"
  | "dairy-frozen"
  | "prepared-foods-meals";

export const PRODUCT_CATEGORIES = [
  { slug: "soda", label: "Soda", group: "beverages", description: "Soft drinks and sparkling beverages" },
  { slug: "energy-drink", label: "Energy drinks", group: "beverages", description: "Canned or bottled energy beverages" },
  { slug: "sports-hydration", label: "Sports and hydration", group: "beverages", description: "Still or sparkling hydration drinks" },
  { slug: "functional-beverages", label: "Wellness drinks & shots", group: "beverages", description: "Bottled or canned functional drinks and wellness shots" },
  { slug: "cold-pressed-juice", label: "Cold-pressed juice", group: "beverages", description: "Pressed juice with a separate safety process" },
  { slug: "juice", label: "Juice", group: "beverages", description: "Juice, lemonade, smoothies, and shots" },
  { slug: "rtd-coffee-tea", label: "Tea and coffee drinks", group: "beverages", description: "Ready-to-drink coffee and tea" },
  { slug: "water", label: "Water", group: "beverages", description: "Still or sparkling packaged water" },
  { slug: "hot-sauce", label: "Hot sauce", group: "sauces-dips-condiments", description: "Pepper sauces and small-bottle formats" },
  { slug: "sauce", label: "Sauce", group: "sauces-dips-condiments", description: "Sauces, condiments, and syrups" },
  { slug: "salsa", label: "Salsa", group: "sauces-dips-condiments", description: "Fresh or shelf-stable salsa" },
  { slug: "dressings-marinades", label: "Dressings and marinades", group: "sauces-dips-condiments", description: "Dressings, vinaigrettes, and marinades" },
  { slug: "dips-hummus", label: "Dips and hummus", group: "sauces-dips-condiments", description: "Dips, hummus, and spreads" },
  { slug: "snacks", label: "Snacks", group: "snacks-bakery", description: "Popcorn, bars, jerky, nuts, granola, and other snacks" },
  { slug: "bakery", label: "Bakery", group: "snacks-bakery", description: "Breads, baked goods, batters, cookies, fillings, and icings" },
  { slug: "confectionery", label: "Confectionery", group: "snacks-bakery", description: "Candy, confections, panned chocolate, and sugar floss" },
  { slug: "spices-dry-mixes", label: "Spices and dry mixes", group: "dry-goods-supplements", description: "Spices, seasonings, dry blends, and powdered mixes" },
  { slug: "supplements", label: "Supplements", group: "dry-goods-supplements", description: "Dry dietary supplements, capsules, protein, and nutrition blends" },
  { slug: "dry-coffee-tea", label: "Dry coffee, tea, and pods", group: "dry-goods-supplements", description: "Coffee, tea, K-Cups, pods, and other dry formats" },
  { slug: "dairy", label: "Dairy", group: "dairy-frozen", description: "Milk, butter, cultured dairy, cottage cheese, and ice cream mix" },
  { slug: "frozen-foods", label: "Frozen foods", group: "dairy-frozen", description: "Frozen meals, bakery products, batters, and other frozen foods" },
  { slug: "prepared-refrigerated-foods", label: "Refrigerated prepared foods", group: "prepared-foods-meals", description: "Prepared foods explicitly sold or handled refrigerated" },
  { slug: "shelf-stable-meals", label: "Shelf-stable meals and retort foods", group: "prepared-foods-meals", description: "Shelf-stable ready-to-eat meals, sides, and retort foods" },
  { slug: "soups-broths-entrees", label: "Soups, broths, and entrées", group: "prepared-foods-meals", description: "Soups, broths, stocks, stews, and entrées" },
  { slug: "fermented-foods", label: "Fermented foods", group: "prepared-foods-meals", description: "Foods explicitly described as fermented or lacto-fermented" },
] as const satisfies readonly {
  slug: string;
  label: string;
  group: ProductMacroSlug;
  description: string;
}[];

export type ProductCategorySlug = (typeof PRODUCT_CATEGORIES)[number]["slug"];

export const PRODUCT_MACRO_GROUPS = [
  { slug: "beverages", label: "Beverages", description: "Still, sparkling, hot-filled, and refrigerated drinks" },
  { slug: "sauces-dips-condiments", label: "Sauces, dips, and condiments", description: "Sauces, salsa, dressings, marinades, dips, and spreads" },
  { slug: "snacks-bakery", label: "Snacks and bakery", description: "Savory snacks, baked goods, and confectionery" },
  { slug: "dry-goods-supplements", label: "Dry goods and supplements", description: "Dry blends, spices, supplements, coffee, tea, and pods" },
  { slug: "dairy-frozen", label: "Dairy and frozen", description: "Dairy and foods explicitly made or sold frozen" },
  { slug: "prepared-foods-meals", label: "Prepared foods and meals", description: "Refrigerated foods, shelf-stable meals, soups, entrées, and fermented foods" },
] as const satisfies readonly { slug: ProductMacroSlug; label: string; description: string }[];

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
  snacks: { seoTitle: "Snack Food Co-Packers", h1: "Find snack food co-packers", description: "Compare manufacturers that publicly name snacks such as popcorn, bars, granola, nuts, jerky, or similar products.", questions: ["Does the line run my exact snack format?", "How are allergens and seasoning changeovers controlled?"] },
  bakery: { seoTitle: "Bakery and Baked Goods Co-Manufacturers", h1: "Find bakery and baked goods manufacturers", description: "Compare manufacturers that publicly name breads, batters, cookies, baked goods, fillings, or icings.", questions: ["Do you make finished baked goods, frozen dough or batter, or dry mixes?", "Which allergens can the facility handle?"] },
  confectionery: { seoTitle: "Confectionery and Candy Co-Manufacturers", h1: "Find confectionery manufacturers", description: "Compare manufacturers that publicly name candy, confections, panned chocolate, or related products.", questions: ["Which confectionery processes and inclusions does the line support?", "How are temperature and allergen controls handled?"] },
  "spices-dry-mixes": { seoTitle: "Spice Blenders and Dry Mix Co-Packers", h1: "Find spice and dry mix manufacturers", description: "Compare manufacturers that publicly name spices, seasonings, dry blends, bases, or powdered mixes.", questions: ["What blending and particle-size range does the equipment support?", "Which package formats and allergen controls apply?"] },
  supplements: { seoTitle: "Dry Supplement and Nutrition Product Manufacturers", h1: "Find supplement manufacturers", description: "Compare manufacturers that publicly name dry dietary supplements, capsules, protein, collagen, or sports-nutrition products.", questions: ["Which regulatory and certification scope applies to my product?", "Can the line meet my dose, blend-uniformity, and package requirements?"] },
  "dry-coffee-tea": { seoTitle: "Coffee, Tea, and Pod Co-Packers", h1: "Find dry coffee, tea, and pod co-packers", description: "Compare manufacturers that publicly name coffee, tea, K-Cups, pods, or other dry beverage formats. Ready-to-drink products are listed separately.", questions: ["Do you run pods, pouches, bags, or another dry format?", "Do you offer toll processing, private label, or both?"] },
  dairy: { seoTitle: "Dairy Private-Label and Co-Manufacturing", h1: "Find dairy manufacturing partners", description: "Compare manufacturers that publicly name milk, butter, cultured dairy, cottage cheese, ice cream mix, or related dairy products.", questions: ["Which operating entity and facility would make this product?", "Which dairy products and package formats are currently in scope?"] },
  "frozen-foods": { seoTitle: "Frozen Food Co-Manufacturers", h1: "Find frozen food manufacturers", description: "Compare manufacturers that publicly name frozen foods, frozen meals, or frozen bakery products.", questions: ["Which products are made and stored frozen at this facility?", "Who owns freezing, frozen storage, and outbound freight?"] },
  "prepared-refrigerated-foods": { seoTitle: "Refrigerated Prepared Foods Co-Packers", h1: "Find refrigerated prepared food co-packers", description: "Compare manufacturers whose public sources explicitly name refrigerated prepared foods. Confirm inspection scope, cold chain, pack, and audit needs.", questions: ["Is the facility scope right for the ingredients?", "Where are finished goods cooled and stored after production?"] },
  "shelf-stable-meals": { seoTitle: "Shelf-Stable Meal and Retort Food Manufacturers", h1: "Find shelf-stable meal and retort food manufacturers", description: "Compare manufacturers that publicly name shelf-stable ready-to-eat meals, sides, or retort foods.", questions: ["Which retort or shelf-stable process fits this formula and package?", "Who establishes and files the scheduled process when required?"] },
  "soups-broths-entrees": { seoTitle: "Soup, Broth, and Entrée Co-Manufacturers", h1: "Find soup, broth, and entrée manufacturers", description: "Compare manufacturers that publicly name soups, broths, stocks, stews, or entrées. Storage condition is shown separately when a source states it.", questions: ["Is this product refrigerated, frozen, or shelf-stable?", "Which process and package support the intended storage condition?"] },
  "fermented-foods": { seoTitle: "Fermented Food Co-Manufacturers", h1: "Find fermented food manufacturers", description: "Compare manufacturers whose public descriptions explicitly name fermented or lacto-fermented foods.", questions: ["Which fermentation steps happen at the facility?", "How are process control, refrigeration, and packaging handled?"] },
};

const CATEGORY_PATTERNS: Record<ProductCategorySlug, RegExp> = {
  soda: /\b(soda|soft drink|sparkling beverage|carbonated beverage)\b/i,
  "energy-drink": /\benergy drink(s)?\b/i,
  "sports-hydration": /\b(sport(s)? drink|hydration|electrolyte)\b/i,
  "functional-beverages": /\b(functional beverages?|wellness shots?)\b/i,
  "cold-pressed-juice": /\bcold[- ]pressed juice(s)?\b/i,
  juice: /\b(juice|juices|lemonade|smoothie|smoothies|wellness shot|shots)\b/i,
  "rtd-coffee-tea": /\b(tea|teas|coffee|cold[- ]brew|RTD coffee|RTD tea)\b/i,
  water: /\b(?:bottled|packaged|sparkling|still|spring|mineral) waters?\b|^waters?$/i,
  "hot-sauce": /\bhot sauce\b/i,
  sauce: /\b(sauce|sauces|condiment|condiments|syrup|syrups)\b/i,
  salsa: /\bsalsa(s)?\b/i,
  "dressings-marinades": /\b(dressing|dressings|marinade|marinades|vinaigrette)\b/i,
  "dips-hummus": /\b(dip|dips|hummus)\b/i,
  snacks: /\b(snacks?|popcorn|bars? and bites?|jerky|meat snacks?|roasted nuts?|granolas?|extruded snacks?)\b/i,
  bakery: /\b(bakery|baked goods?|breads?|bagels?|cookies?|batters?|cupcakes?|coffee cakes?|(?:bakery|pastry|pie) fillings?|icings?)\b/i,
  confectionery: /\b(candy|confections?|panned products?|sugar floss)\b/i,
  "spices-dry-mixes": /\b(spices?|seasonings?|dry (?:mixes?|blends?|goods|(?:soup )?bases?)|powdered (?:drink )?mixes?|powdered bases?|rubs?|salts?)\b/i,
  supplements: /\b(dietary supplements?|sports nutrition|protein(?:\/collagen)? supplements?|capsules?|supplement concepts?)\b/i,
  "dry-coffee-tea": /\b(K-Cups?|coffee pods?|tea pods?|functional beverage pods?|loose leaf tea|private label coffee|tea pouches?)\b/i,
  dairy: /(?<!non[- ])\b(dairy|milk|butter|sour cream|cottage cheese|ice cream mix)\b/i,
  "frozen-foods": /\bfrozen\b/i,
  "prepared-refrigerated-foods": /\b(refrigerated foods?|refrigerated meals?|refrigerated prepared foods?|fresh refrigerated)\b/i,
  "shelf-stable-meals": /\b(shelf[- ]stable (?:RTE|ready[- ]to[- ]eat|meals?|foods?|sides?)|retort foods?)\b/i,
  "soups-broths-entrees": /\b(soups?|broths?|stews?|chilis?|entr[eé]es?)\b/i,
  "fermented-foods": /(?<!un)\b(?:lacto[- ])?fermented foods?\b|\blacto[- ]fermented\b/i,
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
    ...(plant.rawProductTags ?? []),
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");
  const categoryText = category === "dairy"
    ? disclosedText
      .replace(/\b(?:fruit|nut|seed|peanut|almond|cashew|sunflower|apple|pumpkin) butters?\b/gi, "")
      .replace(/\b(?:non[- ]dairy|dairy[- ]free|no dairy|without dairy|not USDA for dairy)\b/gi, "")
      .replace(/\b(?:does|do) not\b[^.;]{0,60}\bdairy\b/gi, "")
    : disclosedText;
  return CATEGORY_PATTERNS[category].test(categoryText);
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
  snacks: ["Confirm the exact snack format, cooking or baking step, seasoning method, and package. A broad snack claim does not prove every process fits.", "List allergens and ask about segregation, scheduling, sanitation validation, and seasoning or oil changeovers."],
  bakery: ["Ask whether the facility produces finished baked goods, thaw-and-serve items, frozen batter or dough, fillings, or only dry mixes.", "Share every allergen and ask which controls, line scheduling, sanitation, and certification scope apply."],
  confectionery: ["Share the base, inclusions, coating, target piece size, and package so the manufacturer can confirm equipment fit.", "Ask about temperature control, allergen segregation, rework, and changeover validation for the exact line."],
  "spices-dry-mixes": ["Share ingredient particle sizes, density, inclusion fragility, and target batch size so the blender can confirm uniformity and equipment fit.", "Confirm the exact pouch, jar, packet, or bulk package and ask how allergens and dust are controlled."],
  supplements: ["Ask which food or supplement regulations and certifications cover the exact facility, product, and line rather than relying on a broad company claim.", "Share dose, blend-uniformity target, ingredients, and package so the manufacturer can confirm technical fit."],
  "dry-coffee-tea": ["Confirm whether the line fills K-Cups, other pods, bags, pouches, or bulk formats and whether it handles the exact grind or leaf form.", "Ask whether the program is toll processing, custom formulation, private label, or a combination, and who owns ingredients and packaging."],
  dairy: ["Confirm the current operating entity, facility, dairy scope, inspection status, and active package formats before relying on an older listing.", "Ask which cultured, fluid, butter, or mix products are currently made and which certifications apply to that line."],
  "frozen-foods": ["Confirm which products are frozen at the facility, the freezing method, finished-goods temperature, and available frozen storage.", "Decide who owns frozen storage and freight before the run and ask how temperature is monitored through handoff."],
  "prepared-refrigerated-foods": ["Share the ingredient and product type so the manufacturer can confirm whether the relevant FDA or USDA scope, allergen controls, and line fit apply.", "Ask where product is cooled and held, how temperature is monitored, how long it can remain on site, and who arranges refrigerated freight."],
  "shelf-stable-meals": ["Formula, package, fill weight, particulates, and storage goal determine the scheduled process. Ask the manufacturer and a qualified process authority to confirm the path.", "Clarify who owns process development, filings, container-closure checks, incubation, and finished-product release."],
  "soups-broths-entrees": ["State the intended storage condition first. Refrigerated, frozen, hot-filled, and retorted products require different process and distribution plans.", "Share viscosity, particulate size, ingredients, fill weight, and package so the manufacturer can confirm equipment and inspection fit."],
  "fermented-foods": ["Ask which fermentation steps happen on site, which process controls are recorded, and whether the product is live, refrigerated, pasteurized, or shelf-stable.", "Confirm the package, gas management, refrigeration, and distribution plan for the exact product."],
};

export function categoryFaqs(slug: ProductCategorySlug) {
  const questions = CATEGORY_HUB_CONTENT[slug].questions;
  const answers = CATEGORY_FAQ_ANSWERS[slug];
  return questions.map((question, index) => ({ question, answer: answers[index] }));
}
