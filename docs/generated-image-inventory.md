# Generated clay image inventory

The Line List's exploration imagery is a face-free, product-only claymation system generated with OpenAI image generation and processed with Sharp. Production assets are 640 × 640 WebP files with genuine alpha transparency. High-resolution source sheets are preserved in `design-assets/clay-sources/`.

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

The homepage hero uses one wide transparent diorama so the idea-to-product story reads as a single journey rather than repeating the category selector. Cornerstone guide covers reuse the relevant product asset. Manufacturing lessons remain responsive inline SVG diagrams with accessible titles and descriptions; exact process sequences are implemented in code, not generated imagery.

## Preserved source sheets

- `design-assets/clay-sources/product1-chroma-source.png`
- `design-assets/clay-sources/product2-chroma-source.png`
- `design-assets/clay-sources/product3-chroma-source.png`
- `design-assets/clay-sources/product4-chroma-source.png`
- `design-assets/clay-sources/support-chroma-source.png`
- `design-assets/clay-sources/idea-to-product-source.png`
- `design-assets/clay-sources/question-mark-source.png`

Run `node scripts/process-clay-assets.cjs <product1|product2|product3|product4|support>` to rebuild a set. The script removes the matte, decontaminates edge pixels, trims cross-panel spill, and exports the optimized transparent WebP assets.
