import { PRODUCT_CATEGORIES, plantMatchesCategory, type Plant, type ProductCategorySlug } from "@/lib/directory";

export interface RelatedGuideLink { href: string; title: string; description: string }

const G = {
  bakery: { href: "/guides/bakery-manufacturing", title: "Prepare a bakery product", description: "Compare finished bake, frozen dough, batter, and dry mixes." },
  dryBlending: { href: "/guides/dry-blending", title: "Plan a spice blend or drink powder", description: "Separate blending, filling, sourcing, and first-run costs." },
  frozen: { href: "/guides/frozen-food-cold-chain", title: "Prepare a frozen food", description: "Plan cooling, freezing, packaging, storage, and freight." },
  find: { href: "/guides/how-to-find-a-co-packer", title: "How to find a co-packer", description: "Build a focused, evidence-based shortlist." },
  send: { href: "/guides/what-to-send-a-manufacturer", title: "What to send a manufacturer", description: "Prepare a brief that can get a useful reply." },
  moq: { href: "/guides/food-manufacturing-moqs", title: "How minimum orders work", description: "Compare units, costs, and first-run risk." },
  package: { href: "/guides/packaging-formats", title: "Packaging formats explained", description: "Match the container, process, and filling line." },
  process: { href: "/guides/food-processing-methods", title: "Hot fill, cold fill, HPP, or retort?", description: "Start with storage and product needs." },
  certs: { href: "/guides/food-manufacturing-certifications", title: "Certifications explained", description: "Separate regulation, safety systems, certification, and claims." },
  hotSauce: { href: "/guides/start-hot-sauce", title: "Start a hot sauce brand", description: "Go from recipe idea to a prepared first run." },
  energy: { href: "/guides/energy-drink", title: "Manufacture an energy drink", description: "Compare formula, carbonation, package, and line fit." },
  juice: { href: "/guides/cold-pressed-juice", title: "Manufacture cold-pressed juice", description: "Separate extraction, processing, package, and cold chain." },
  water: { href: "/guides/private-label-bottled-water", title: "Private-label bottled water", description: "Plan water type, bottle, label, order, and freight." },
  fermented: { href: "/guides/fermented-food-manufacturing", title: "Manufacture fermented foods", description: "Plan cultures, controls, packaging, and storage." },
  refrigerated: { href: "/guides/refrigerated-food-manufacturing", title: "Manufacture refrigerated foods", description: "Plan controls, cold storage, shelf life, and freight." },
} satisfies Record<string, RelatedGuideLink>;

const CATEGORY_GUIDES: Partial<Record<ProductCategorySlug, RelatedGuideLink[]>> = {
  "hot-sauce": [G.hotSauce, G.process, G.package],
  "energy-drink": [G.energy, G.package, G.moq],
  "functional-beverages": [G.energy, G.process, G.package],
  "sports-hydration": [G.energy, G.package, G.moq],
  "cold-pressed-juice": [G.juice, G.process, G.refrigerated],
  juice: [G.juice, G.process, G.package],
  water: [G.water, G.package, G.moq],
  soda: [G.energy, G.package, G.process],
  "fermented-foods": [G.fermented, G.refrigerated, G.package],
  "prepared-refrigerated-foods": [G.refrigerated, G.process, G.package],
  "dips-hummus": [G.refrigerated, G.process, G.package],
  supplements: [G.certs, G.moq, G.send],
  "spices-dry-mixes": [G.dryBlending, G.package, G.moq],
  "dry-coffee-tea": [G.dryBlending, G.package, G.moq],
  bakery: [G.bakery, G.frozen, G.moq],
  "frozen-foods": [G.frozen, G.package, G.moq],
};

export function relatedGuidesForCategory(category: ProductCategorySlug): RelatedGuideLink[] {
  return CATEGORY_GUIDES[category] ?? [G.find, G.send, G.moq];
}

export function relatedGuidesForPlant(plant: Plant): RelatedGuideLink[] {
  const links = PRODUCT_CATEGORIES.filter((category) => plantMatchesCategory(plant, category.slug)).flatMap((category) => relatedGuidesForCategory(category.slug));
  const unique = links.filter((link, index) => links.findIndex((candidate) => candidate.href === link.href) === index);
  return (unique.length > 0 ? unique : [G.find, G.send, G.certs]).slice(0, 3);
}
