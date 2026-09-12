# Generated clay image inventory

The Line List's exploration imagery is a face-free, product-only claymation system generated with OpenAI image generation and processed with Sharp. Product and supporting cutouts are 640 × 640 WebP files with genuine alpha transparency. Their high-resolution source sheets are preserved in `design-assets/clay-sources/`. The September 12 guide collection uses 960 × 960 WebP illustrations on warm yellow, matching the founder-provided water-bottle and prepared-meal references.

The assets share handmade clay texture, a three-quarter isometric camera, soft studio lighting, rounded forms, and a coordinated palette. Category identity is intentionally not uniform: each product has a distinct silhouette, packaging structure, color story, and relevant props. No asset contains a person, hand, face, readable label, real brand, fake company name, watermark, or manufacturing equipment.

## Product categories

| Asset | Distinct product direction |
| --- | --- |
| `/images/clay-v2/products/soda.webp` | Squat coral soda bottle with a cream dotted collar and carbonation bubbles. |
| `/images/clay-v2/products/energy-drink.webp` | Deep-green slim can with a single energetic yellow bolt and small motion props. |
| `/images/clay-v2/products/sports-hydration.webp` | Aqua ribbed squeeze bottle with an orange sport cap and water droplets. |
| `/images/clay-v2/products/functional-beverages.webp` | Lavender apothecary bottle with botanical relief, leaves, and blueberries. |
| `/images/clay-v2/products/cold-pressed-juice.webp` | Square green juice bottle with cucumber, pear, and leafy produce props. |
| `/images/clay-v2/products/juice.webp` | Rounded orange juice bottle with citrus slice and splash props. |
| `/images/clay-v2/products/rtd-coffee-tea.webp` | Contrasting coffee can and amber tea bottle with bean and leaf props. |
| `/images/clay-v2/products/water.webp` | Minimal pale-blue bottle with droplet relief and bubble props. |
| `/images/clay-v2/products/hot-sauce.webp` | Tall coral-red bottle with flame relief and a whole chile. |
| `/images/clay-v2/products/sauce.webp` | Squared navy sauce bottle with a coral panel and serving ramekin. |
| `/images/clay-v2/products/salsa.webp` | Wide salsa jar with tomato, jalapeño, and red-onion props. |
| `/images/clay-v2/products/dressings-marinades.webp` | Herb-forward dressing bottle with lemon and whisk props. |
| `/images/clay-v2/products/dips-hummus.webp` | Lavender hummus tub with chickpeas and pita. |
| `/images/clay-v2/products/prepared-refrigerated-foods.webp` | Compartmented prepared-food tray with vegetables, grains, and a cream band. |

## Supporting exploration assets

| Asset | Use |
| --- | --- |
| `/images/clay-v2/support/idea-to-product.webp` | Homepage hero journey from product sketch and samples through simple mixing, filling, and finished unbranded products. |
| `/images/clay-v2/support/question-mark.webp` | Expressive standalone question mark for the homepage “Not sure yet?” quiz card. |
| `/images/clay-v2/support/beginner-onboarding.webp` | Homepage How it works section and matching-wizard introduction. |
| `/images/clay-v2/support/empty-results.webp` | Directory and category empty states. |
| `/images/clay-v2/support/newsletter.webp` | Newsletter page and newsletter callouts. |
| `/images/clay-v2/support/first-production-run.webp` | First-production-run guide cover. |

The homepage hero uses one wide transparent diorama so the idea-to-product story reads as a single journey rather than repeating the category selector. Each of the 27 published guides has its own cover, registered in `lib/guides/artwork.json`. Nine suitable existing illustrations are retained and eighteen new guide illustrations replace repeated artwork or fill missing covers. The guide library has a separate nineteenth new illustration. A guide keeps its own illustration across its card, article cover, and social preview; different guides never share a cover. Manufacturing lessons remain responsive inline SVG diagrams with accessible titles and descriptions; exact process sequences are implemented in code, not generated imagery.

## Preserved source sheets

- `design-assets/clay-sources/product1-chroma-source.png`
- `design-assets/clay-sources/product2-chroma-source.png`
- `design-assets/clay-sources/product3-chroma-source.png`
- `design-assets/clay-sources/product4-chroma-source.png`
- `design-assets/clay-sources/support-chroma-source.png`
- `design-assets/clay-sources/idea-to-product-source.png`
- `design-assets/clay-sources/question-mark-source.png`

Run `node scripts/process-clay-assets.cjs <product1|product2|product3|product4|support>` to rebuild a set. The script removes the matte, decontaminates edge pixels, trims cross-panel spill, and exports the optimized transparent WebP assets.

## September 12 guide illustrations

Generated with the built-in image-generation tool, one illustration per subject. Original PNGs are preserved in `design-assets/guide-sources/`; browser assets live in `public/images/clay-guides/`. Full prompts and style-reference paths are recorded in `docs/guide-art-prompts-2026-09-12.json`.

The images use handmade clay, rounded forms, soft light, forest green, coral, aqua, lavender, cream, and yellow. They illustrate topics, not verified factory equipment, capabilities, certifications, or process instructions. Generated lettering and logos are excluded.

| Asset | Subject |
| --- | --- |
| [co-packer-vs-private-label](../public/images/clay-guides/co-packer-vs-private-label.webp) | Clay mixing bowl and sauce jar beside two matching jars and a blank label. |
| [what-to-send-a-manufacturer](../public/images/clay-guides/what-to-send-a-manufacturer.webp) | Clay product folder with blank specification sheets and a small sample bottle. |
| [food-manufacturing-moqs](../public/images/clay-guides/food-manufacturing-moqs.webp) | Clay shipping cartons in three stack sizes with one bottle for scale. |
| [packaging-formats](../public/images/clay-guides/packaging-formats.webp) | Clay jar, bottle, stand-up pouch and lidded tray showing distinct packaging formats. |
| [food-processing-methods](../public/images/clay-guides/food-processing-methods.webp) | Clay food packages surrounding a question mark about choosing a production process. |
| [food-manufacturing-certifications](../public/images/clay-guides/food-manufacturing-certifications.webp) | Clay magnifying glass examining an unbranded document beside a food jar. |
| [fermented-food-manufacturing](../public/images/clay-guides/fermented-food-manufacturing.webp) | Clay fermentation crock with cabbage and radishes. |
| [dry-blending](../public/images/clay-guides/dry-blending.webp) | Clay bowl of dry powder with a scoop, grains and a resealable pouch. |
| [frozen-food-cold-chain](../public/images/clay-guides/frozen-food-cold-chain.webp) | Clay insulated meal shipment with cold packs and a snowflake. |
| [test-food-business-idea](../public/images/clay-guides/test-food-business-idea.webp) | Clay sample food cups beside an idea bulb and a blank feedback card. |
| [food-product-development](../public/images/clay-guides/food-product-development.webp) | Clay mixing bowl, measuring jug and two recipe samples. |
| [manufacturer-inquiry-examples](../public/images/clay-guides/manufacturer-inquiry-examples.webp) | Clay envelope, blank product brief and quote sheet with a sample jar. |
| [hpp](../public/images/clay-guides/hpp.webp) | Clay flexible juice bottle and dip tub with water droplets and a cold-storage cue. |
| [hot-fill](../public/images/clay-guides/hot-fill.webp) | Clay sauce bottles with a lemon and a warm-colored sun motif. |
| [retort](../public/images/clay-guides/retort.webp) | Clay sealed can, food pouch and bowl of soup. |
| [sauce](../public/images/clay-guides/sauce.webp) | Clay saucepan of sauce with a spoon, two jars and vegetables. |
| [small-moq](../public/images/clay-guides/small-moq.webp) | Clay carton with a few sauce bottles and an unmarked measuring tape. |
| [first-run-costs](../public/images/clay-guides/first-run-costs.webp) | Clay calculator, blank receipt, food jar and plain coin stacks. |
| [guide-library](../public/images/clay-guides/guide-library.webp) | Clay guidebooks with a bookmark, bottle and sample jar. |

Run `npm run guides:images` after adding source PNGs to optimize the files without changing their composition. The script samples the backdrop color for the image frame. Guide images use `next/image` with responsive sizes; below-the-fold cards load lazily.

## Social previews

63 distinct 1200 × 630 JPEG cards live in `public/images/og/`: all 27 guides, all 25 product-category hubs, and 11 primary public pages (home, manufacturer directory, guides, matching quiz, product-plan entry, about, newsletter, verification, glossary, manufacturers, and listing claims). Unmapped pages use the home card. Private workspace state never enters the generator.

The layout uses the approved Line List logo, Bricolage Grotesque and Manrope, a cream text panel, a yellow clay-art panel, and a forest-green border. Article-specific artwork is contained, preserving the complete illustration. Each page has a distinct title and saved image. Open Graph and Twitter use the same absolute URL and descriptive image alt text. `/opengraph-image` remains a working compatibility URL for the home JPEG without overriding page-specific metadata.

Run `npm run social:images` after artwork or card-copy changes (Node 22.6+ with TypeScript stripping and local Chrome required; set `SOCIAL_BROWSER_CHANNEL` to use another installed Playwright channel). This runs locally and produces checked-in static files; no rendering service or API key is needed when the site serves previews. `lib/seo/social-pages.json` supplies main-page copy, and the generator combines it with guide artwork and product categories. `lib/seo/social-images.generated.json` is the generated route manifest.

Fonts and SIL Open Font License notices are preserved in `design-assets/social-fonts/`. Font sources: [Bricolage Grotesque](https://github.com/google/fonts/tree/main/ofl/bricolagegrotesque), [Manrope](https://github.com/google/fonts/tree/main/ofl/manrope).

Regression coverage in `tests/unit/guide-artwork.test.ts` checks every guide route, distinct source paths and image hashes, decodable 1200 × 630 JPEGs, asset size, social metadata, and private-state fallback. `tests/e2e/guide-artwork.spec.ts` checks actual crawler metadata and image responses for all 63 pages, the compatibility URL, unique mobile cards, and loaded artwork on article, process-guide, and cost-worksheet layouts.

September 12 local verification passed: production build (444 generated pages), TypeScript, focused ESLint with zero warnings, 18 focused unit tests, 16 production-build browser tests, and the SEO audit of 402 sitemap URLs. Desktop and 390px mobile screenshots were visually inspected, along with representative social cards. The 19 optimized guide illustrations total 828 KiB (largest under 60 KiB); the 63 social JPEGs total 5,204 KiB (largest under 102 KiB). React Doctor scored 83/100 with four existing warnings outside the artwork changes: three complexity warnings and a response-status warning where the code does check `response.ok` after parsing the error payload. No deployment was performed.
