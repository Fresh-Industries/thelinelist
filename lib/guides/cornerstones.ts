import { PRACTICAL_GUIDES } from "./practical";

export interface GuideSource {
  label: string;
  href: string;
}

export interface CornerstoneGuide {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  eyebrow: string;
  image: string;
  imageAlt: string;
  directAnswer: string;
  whoThisIsFor: string;
  reviewedLabel: string;
  datePublished?: string;
  dateModified: string;
  steps: { title: string; text: string }[];
  checklist: string[];
  decisions: { decision: string; why: string }[];
  definitions: { term: string; meaning: string }[];
  questions: string[];
  mistakes: string[];
  faq: { question: string; answer: string }[];
  directoryHref: string;
  directoryLabel: string;
  sources: GuideSource[];
  diagram: "hot-sauce" | "formula" | "package" | "storage" | "first-run";
  relatedLinks?: { href: string; label: string }[];
}

const commonSources = {
  uf: { label: "UF/IFAS Extension: Finding and Using a Co-packer", href: "https://edis.ifas.ufl.edu/publication/FS380" },
  ncsu: { label: "NC State Extension: Choosing and Using a Copacker", href: "https://content.ces.ncsu.edu/choosing-and-using-a-copacker" },
  msu: { label: "Michigan State Extension: Preparing for High-Volume Food Product Sales", href: "https://www.canr.msu.edu/news/preparing_for_high_volume_food_product_sales_are_you_ready_for_a_co_packer" },
  acid: { label: "NC State Extension: Resources for Acidified Processors", href: "https://foodbusiness.ces.ncsu.edu/tools-for-success/resources-steps-for-acidified-processors/" },
  hotFill: { label: "University of Georgia Extension: Hot-Fill-Hold for Acidified Foods", href: "https://fieldreport.caes.uga.edu/publications/C1328-02/producing-shelf-stable-acidified-foods-using-hot-fill-hold/" },
  fdaAcidified: { label: "FDA: Acidified and Low-Acid Canned Foods", href: "https://www.fda.gov/food/guidance-documents-regulatory-information-topic-food-and-dietary-supplements/acidified-low-acid-canned-foods-guidance-documents-regulatory-information" },
  juice: { label: "FDA: Questions and Answers on the Juice HACCP Regulation", href: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/guidance-industry-questions-and-answers-juice-haccp-regulation" },
  sqf: { label: "SQFI Certified Site Directory", href: "https://directory.sqfi.com/" },
};

const CORE_GUIDES: CornerstoneGuide[] = [
  {
    slug: "start-hot-sauce",
    title: "How to start a hot sauce brand",
    seoTitle: "How to Start a Hot Sauce Brand: Beginner Guide",
    description: "Turn a hot sauce idea into a safe, bottled product. Follow the beginner path from recipe and process review to packaging, trials, and finding a manufacturer.",
    eyebrow: "Hot sauce guide",
    image: "/images/clay-v2/products/hot-sauce.webp",
    imageAlt: "Face-free clay hot sauce bottle with a flame emblem and chili prop",
    directAnswer: "You do not need your own factory to start a hot sauce brand. Choose an existing private-label sauce or bring your own recipe, have a qualified expert set the safe commercial process, confirm the bottle works with that process, run a trial, and then hire a manufacturer that fits your product and budget.",
    whoThisIsFor: "This guide is for first-time founders with a sauce idea or kitchen recipe who want to understand the path to a professionally made, packaged product. You do not need to know food-science terms before you start.",
    reviewedLabel: "25 Aug 2026",
    dateModified: "2026-08-25",
    steps: [
      { title: "Pick your starting route", text: "For the faster route, use a manufacturer’s existing sauce and put your brand on it. For a one-of-a-kind product, bring your own recipe and plan for more testing and development." },
      { title: "Turn the idea into a clear brief", text: "Write down the flavor, heat level, thickness, chunks or seeds, bottle size, where it will be stored, how many you hope to make, and when you want to launch. List ingredients by weight if you can." },
      { title: "Have a food-safety expert review it", text: "Many shelf-stable hot sauces are acidified foods. A qualified process authority should classify your sauce and set the commercial safety process when one is required. Do not guess this from a home pH reading." },
      { title: "Choose the process and bottle together", text: "A flowable acidified sauce may use hot-fill-hold, but the recipe, bottle, cap, fill temperature, and hold time must work as one approved system. Let the process authority and manufacturer confirm the exact setup." },
      { title: "Make a trial batch on real equipment", text: "A trial shows how the sauce pumps, fills, tastes, and looks at a larger scale. Agree on what will be checked and who approves changes before a full production run." },
      { title: "Compare the right manufacturers", text: "Shortlist plants that publicly mention hot sauce, your likely process, and your bottle type. Ask each plant for its current minimum order; there is no standard hot sauce minimum." },
      { title: "Plan the launch after fill day", text: "Before production, confirm the label review, ingredient and packaging orders, total costs, finished-case storage, freight, and who receives the product." },
    ],
    checklist: ["Private label or your own recipe", "Ingredients listed by weight, if possible", "Flavor and heat goal", "Thickness, seeds, and chunks described", "Shelf-stable or refrigerated goal", "Preferred bottle size and cap", "Estimated number of bottles", "Target launch date", "Process-authority review plan", "Budget for trial, production, storage, and freight"],
    decisions: [
      { decision: "Existing sauce or your recipe", why: "An existing private-label sauce is usually a shorter path. Your own recipe gives you more control but needs more development and testing." },
      { decision: "Refrigerated or shelf-stable", why: "This changes the safety process, bottle, storage, shipping, and which manufacturer can make it." },
      { decision: "Smooth or chunky", why: "Seeds, pepper pieces, and thickness affect whether a manufacturer’s pumps and filling equipment can handle the sauce." },
      { decision: "Bottle and cap", why: "The container must fit the filling line and tolerate the approved process. Confirm it before buying a large quantity." },
    ],
    definitions: [
      { term: "Co-packer", meaning: "A company that makes and packages a product for another brand. On this site, we usually call it a manufacturer." },
      { term: "Private label", meaning: "A manufacturer’s existing sauce sold under your brand, based on the terms you agree to." },
      { term: "Acidified food", meaning: "A food with low-acid ingredients that has acid added so its finished equilibrium pH is 4.6 or below. Extra commercial processing rules can apply." },
      { term: "Process authority", meaning: "A qualified food-safety expert who evaluates the product and sets the commercial processing instructions when required." },
      { term: "Scheduled process", meaning: "The written, product-specific instructions a commercial processor follows for safety. It can cover the recipe, container, time, temperature, pH, and other controls." },
      { term: "MOQ", meaning: "Minimum order quantity: the smallest batch a manufacturer currently agrees to run." },
    ],
    questions: ["Do you make hot sauce with my thickness, seeds, or pepper pieces?", "Can your line run the bottle size and cap I am considering?", "Who will confirm the safe process, and which records or tests are required?", "What is your current minimum for this sauce and bottle?", "What happens during a trial, and who approves the result?", "Who buys the ingredients, bottles, caps, labels, and cases?", "What costs are not included in the production quote?", "How much time should I plan for development, packaging, and production?"],
    mistakes: ["Treating a kitchen pH reading as a complete commercial safety plan", "Buying bottles before the process and filling line are confirmed", "Sending manufacturers only a recipe with no volume, package, or launch goal", "Assuming a small-looking bottle means a small minimum order", "Forgetting where finished cases will be stored and how they will ship"],
    faq: [
      { question: "Do I need my own hot sauce recipe?", answer: "No. You can use a manufacturer’s existing private-label sauce or develop your own formula. Ask what you can change and who owns the final formula." },
      { question: "Can I take my home recipe straight to a manufacturer?", answer: "You can use it as a starting point, but it usually needs to be written by weight, reviewed for commercial food safety, and tested on larger equipment." },
      { question: "Does every hot sauce use hot fill?", answer: "No. The right process depends on the actual recipe, acidity, texture, package, and storage goal. A qualified process authority and the manufacturer should confirm the method." },
      { question: "What is a typical hot sauce minimum order?", answer: "There is no universal minimum. It depends on the manufacturer, equipment, bottle, ingredients, and current schedule. Ask for the current number in bottles, cases, or gallons so you can compare it correctly." },
      { question: "Should I buy bottles before I contact a manufacturer?", answer: "Usually not in bulk. Bring examples or preferences, but confirm that the bottle, cap, label, process, and filling line work together before placing a large order." },
    ],
    directoryHref: "/find-manufacturers/hot-sauce",
    directoryLabel: "Find hot sauce manufacturers",
    sources: [commonSources.fdaAcidified, commonSources.hotFill, commonSources.acid, commonSources.uf, commonSources.ncsu],
    diagram: "hot-sauce",
  },
  {
    slug: "energy-drink",
    title: "How to start an energy drink brand",
    seoTitle: "Energy Drink Private Label vs Custom Formula",
    description: "Compare private-label and custom energy drinks, cans and bottles, carbonation, storage, and the questions to ask manufacturers.",
    eyebrow: "Energy drink guide",
    image: "/images/clay-v2/products/energy-drink.webp",
    imageAlt: "Face-free clay energy drink can with a single lightning emblem and floating accents",
    directAnswer: "Start by choosing an existing private-label base or a custom formula. Then define carbonation, package, storage, volume, and timing. A plant that fills juice or water is not automatically a fit for an energy drink. Confirm product experience and line compatibility instead of relying on a broad beverage label.",
    whoThisIsFor: "This guide is for first-time energy drink founders comparing an existing formula with a custom product and trying to understand which details a manufacturer needs.",
    reviewedLabel: "24 Aug 2026",
    dateModified: "2026-08-24",
    steps: [
      { title: "Choose private label or custom", text: "Private label can reduce early development. A custom formula gives more control but needs specifications, trials, and ingredient review." },
      { title: "Define the drink", text: "State still or carbonated, can or bottle, pack size, shelf-stable or refrigerated goal, volume, timing, and required certifications." },
      { title: "Match the actual line", text: "Confirm the manufacturer runs energy drinks, your packaging, and your carbonation level. Do not treat all beverage equipment as interchangeable." },
      { title: "Clarify process and storage", text: "Formula and packaging determine the needed controls. Ask how the finished drink reaches its intended shelf life and storage condition." },
      { title: "Plan the first run", text: "Ask who sources ingredients and packaging, what a trial includes, and when materials and production deposits are due." },
    ],
    checklist: ["Private label or custom formula", "Still or carbonated", "Can or bottle and size", "Storage goal", "Ingredient and claim review questions", "Volume and timing", "Packaging sourcing plan", "Trial and first-run budget"],
    decisions: [
      { decision: "Private label or custom", why: "Balances speed against formula control and development work." },
      { decision: "Can or bottle", why: "The package determines which filling equipment can run the product." },
      { decision: "Still or carbonated", why: "Carbonation capability is a specific line requirement." },
      { decision: "Refrigerated or shelf-stable", why: "Changes process, distribution, and storage." },
    ],
    definitions: [
      { term: "RTD", meaning: "Ready to drink. The product is sold already mixed and packaged." },
      { term: "Private label", meaning: "A manufacturer’s existing formula sold under your brand, subject to the agreement." },
      { term: "Custom formula", meaning: "A formula developed or supplied for your product and made to written specifications." },
      { term: "MOQ", meaning: "The manufacturer’s minimum production for a particular line and package." },
    ],
    questions: ["Do you run carbonated and still energy drinks?", "Which can and bottle sizes can the line handle?", "What does a formula and line trial include?", "Who reviews ingredient and label requirements?", "What is the current minimum for this package?", "Who sources ingredients and packaging?"],
    mistakes: ["Assuming every beverage filler runs energy drinks", "Choosing a can before confirming line compatibility", "Underestimating packaging lead times", "Contacting plants without volume and timing"],
    faq: [
      { question: "Can I private label an energy drink?", answer: "Some manufacturers offer existing bases under a new brand. Others work only from custom formulas. Ask what the agreement includes." },
      { question: "Should an energy drink use cans or bottles?", answer: "Either can work when the formula, line, closure, and storage plan are compatible. Confirm the exact package with the manufacturer." },
    ],
    directoryHref: "/find-manufacturers/energy-drink",
    directoryLabel: "Find energy drink manufacturers",
    sources: [commonSources.uf, commonSources.ncsu, commonSources.msu, commonSources.sqf],
    diagram: "package",
  },
  {
    slug: "cold-pressed-juice",
    title: "How to manufacture cold-pressed juice",
    seoTitle: "Cold-Pressed Juice Manufacturing for Beginners",
    description: "Understand cold-pressed juice manufacturing, HPP, Juice HACCP, packaging, cold storage, and manufacturer questions.",
    eyebrow: "Juice guide",
    image: "/images/clay-v2/products/cold-pressed-juice.webp",
    imageAlt: "Face-free clay cold-pressed juice bottle with cucumber, pear, and leafy produce props",
    directAnswer: "Cold pressed describes extraction. It does not mean HPP. A manufacturer must pair the juice with a validated food-safety process, compatible packaging, and the right storage plan. Juice processors subject to Juice HACCP must achieve at least a 5-log reduction in the pertinent microorganism. High pressure, heat, and UV are possible controls when validated for the product.",
    whoThisIsFor: "This guide is for founders planning a bottled juice and trying to connect the recipe, food-safety process, bottle, refrigeration, and manufacturer search.",
    reviewedLabel: "24 Aug 2026",
    dateModified: "2026-08-24",
    steps: [
      { title: "Choose a formula path", text: "Compare an existing private-label blend with your own recipe. Custom blends need written ingredient, quality, pH, and Brix targets when known." },
      { title: "Separate extraction from food safety", text: "Cold pressed explains how juice is extracted. Ask how the manufacturer validates pathogen control for your specific juice." },
      { title: "Choose the storage goal", text: "Refrigerated and shelf-stable products follow different process, packaging, and distribution paths." },
      { title: "Match package and process", text: "A package used for high pressure may differ from one made for hot fill. Confirm the exact bottle, closure, label, and process together." },
      { title: "Plan the cold chain", text: "For a refrigerated product, decide where finished goods go, how they stay cold, and who owns freight before the run." },
    ],
    checklist: ["Private label or custom blend", "Ingredients by weight", "Pack size and closure", "Refrigerated or shelf-stable goal", "pH and Brix targets if known", "Validated pathogen-control question", "Cold-chain plan", "Volume and timing"],
    decisions: [
      { decision: "Refrigerated or shelf-stable", why: "Determines process, package, storage, and distribution." },
      { decision: "HPP, heat, or another control", why: "Food-safety controls must be validated for the actual product." },
      { decision: "Bottle and closure", why: "The package must tolerate the selected process." },
    ],
    definitions: [
      { term: "Cold pressed", meaning: "A description of juice extraction. It is not a complete food-safety process." },
      { term: "HPP", meaning: "High pressure processing. It can be a validated control for some juice products." },
      { term: "Juice HACCP", meaning: "The juice hazard-control framework that includes a 5-log performance standard for covered processors." },
      { term: "Cold chain", meaning: "Refrigerated storage and transport maintained from production through delivery." },
    ],
    questions: ["How is the 5-log control validated for my juice?", "Do you run HPP, hot fill, or another process?", "Which bottles and labels are compatible?", "What happens to the product after fill day?", "What is the minimum for this pack?", "Which product tests and records will I receive?"],
    mistakes: ["Using cold pressed and HPP as if they mean the same thing", "Choosing packaging before confirming the process", "Ignoring refrigerated storage and freight", "Bringing only a kitchen recipe with no specifications"],
    faq: [
      { question: "Is all cold-pressed juice HPP?", answer: "No. Cold pressed describes extraction. HPP is one possible processing control and must be validated for the product." },
      { question: "Can cold-pressed juice be shelf-stable?", answer: "The storage condition depends on the formula, validated process, and package. Confirm the intended shelf life and storage with qualified experts and the manufacturer." },
    ],
    directoryHref: "/find-manufacturers/cold-pressed-juice",
    directoryLabel: "Find cold-pressed juice manufacturers",
    sources: [commonSources.juice, commonSources.uf, commonSources.ncsu, commonSources.msu],
    diagram: "storage",
  },
  {
    slug: "first-production-run",
    title: "How to prepare for your first manufacturing run",
    seoTitle: "First Production Run for Food and Beverage Brands",
    description: "Prepare specifications, trials, packaging, cash, storage, and manufacturer questions for a first food or beverage production run.",
    eyebrow: "First-run guide",
    image: "/images/clay-v2/support/first-production-run.webp",
    imageAlt: "Face-free clay production-planning scene with varied packages, a pallet, clipboard, carton, and caliper",
    directAnswer: "A first manufacturing run is not just a larger kitchen day. Prepare a clear product and packaging specification, an honest volume, a funded trial and production plan, and somewhere for finished goods to go. The manufacturer sets the minimum. Ask what is included, what can change during scale-up, and who owns each material and decision.",
    whoThisIsFor: "This guide is for food and beverage founders preparing to move from development into a first trial or production run with a manufacturer.",
    reviewedLabel: "24 Aug 2026",
    dateModified: "2026-08-24",
    steps: [
      { title: "Write the product brief", text: "Describe the product, customer, package, storage condition, target volume, launch goal, and the formula path." },
      { title: "Build the specifications", text: "Use ingredients by weight when possible. Add package, label, quality, allergen, and process information that the manufacturer needs." },
      { title: "Confirm process readiness", text: "Identify open technical questions early. Acidified foods, juice, and refrigerated products have different expert and record needs." },
      { title: "Plan a trial", text: "Ask what the trial proves, how changes are approved, what product is saleable, and which costs sit outside the quote." },
      { title: "Fund the full run", text: "Plan for deposits, ingredients, packaging, production, testing, storage, and freight, not only the filling fee." },
      { title: "Plan what happens next", text: "Reserve storage and transportation before production. Write down who releases the run and where finished goods go." },
    ],
    checklist: ["Product brief", "Weight-based formula or private-label request", "Packaging and label specs", "Quality and allergen requirements", "Volume and forecast", "Trial plan", "Material ownership", "Storage and freight", "Approval responsibilities", "Contingency for delays or rework"],
    decisions: [
      { decision: "First-run size", why: "Must fit both the manufacturer’s minimum and your cash and storage plan." },
      { decision: "Who buys materials", why: "Changes lead time, cash timing, and ownership of leftovers." },
      { decision: "What approves the run", why: "Written release criteria prevent avoidable disagreements." },
      { decision: "Where goods go", why: "Finished products need storage and transport immediately after production." },
    ],
    definitions: [
      { term: "Specifications", meaning: "Written product, packaging, process, and quality requirements." },
      { term: "Trial or pilot", meaning: "A developmental run used to test formula, process, and package before full production." },
      { term: "Scale-up", meaning: "Moving from kitchen methods to commercial equipment, where mixing, heating, and pumping can change the product." },
      { term: "Release criteria", meaning: "The agreed checks used to approve finished production." },
    ],
    questions: ["What is the current minimum for my package?", "What is included in the trial and production quote?", "Who buys ingredients and packaging?", "Which checks approve the run?", "What happens to unused materials?", "Where can finished goods wait for freight?", "What lead time includes trials and packaging?"],
    mistakes: ["Contacting manufacturers with vague volume and packaging", "Assuming a kitchen recipe scales without changes", "Budgeting only for the fill", "Waiting until production day to arrange storage", "Sharing a full formula before confidentiality is clear"],
    faq: [
      { question: "How large should a first production run be?", answer: "There is no universal number. Balance the manufacturer’s current minimum with demand, cash, shelf life, and storage." },
      { question: "Will the first trial produce saleable product?", answer: "Not always. Ask what the trial is designed to prove, how samples are evaluated, and whether any output can be sold." },
    ],
    directoryHref: "/find-manufacturers",
    directoryLabel: "Find manufacturers for your product",
    sources: [commonSources.uf, commonSources.ncsu, commonSources.msu, commonSources.sqf],
    diagram: "first-run",
  },
];

export const CORNERSTONE_GUIDES: CornerstoneGuide[] = [...CORE_GUIDES, ...PRACTICAL_GUIDES];

export function getCornerstoneGuide(slug: string): CornerstoneGuide | undefined {
  return CORNERSTONE_GUIDES.find((guide) => guide.slug === slug);
}
