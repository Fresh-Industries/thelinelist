# The Line List UX source of truth

## Product principles

- Start with what the visitor wants to make.
- Use one obvious route from product idea to manufacturer results.
- Reveal manufacturing language only when it helps a decision.
- Show sourced facts. Use "Not publicly listed" when a listing is blank.
- Never treat an unknown capability as a match.
- Keep food and beverage as the only product scope.
- Separate education, manufacturer discovery, and plant-claim workflows.

## User types

### First-time maker

Has a product idea but may not know process, packaging, or volume terms. Wants a calm starting point and permission to choose "I'm not sure."

### Prepared brand operator

Knows some formula, pack, process, location, certification, or timing requirements. Wants fast filters and evidence behind every match.

### Manufacturer representative

Wants to claim or correct a listing. This supply-side workflow must stay outside the primary maker journey.

## Information architecture

- Home: product-first orientation and category choice.
- Find manufacturers: directory, product hubs, wizard, and introduction request.
- Manufacturers: individual sourced profiles.
- Guides: goal-led education and supporting process explanations.
- How we verify: sourcing, freshness, correction, and non-endorsement policy.
- Newsletter: optional educational subscription.
- About, Privacy, and Terms: organization and policy context.
- Claim or submit: manufacturer-side listing workflow.

## Page responsibilities

### Home

The hero owns the outcome: helping a visitor move from an idea toward a prepared first manufacturer conversation. The product selector owns the question "What do you want to make?" Home does not own technical filters or a long manufacturer list.

### Find manufacturers

Owns browsing, search, comparison, and evidence-based filters. Product and location are the primary controls. Process, packaging, certifications, and minimums stay available through progressive disclosure for experienced users. Result cards answer whether a manufacturer is worth opening; complete sources, verification detail, and technical records belong on the profile.

### Wizard

Owns progressive matching for beginners. It collects no contact details before showing useful results.

### Manufacturer profile

Owns the complete sourced record, last-reviewed date, questions to ask, and the introduction entry point.

### Guides

Own education. Product guides introduce process terms in context and link back to relevant directory pages.

### Claim or submit

Owns plant-side corrections and submissions. It is not embedded as a large form on every profile.

## Workflow ownership

### Find a manufacturer

1. Choose a product on Home or enter Find manufacturers.
2. Use the wizard or direct evidence-based filters.
3. Review why each result may fit and which fields are not public.
4. Open a manufacturer profile.
5. Request an introduction only after useful information is visible.

### Learn before searching

1. Choose a product or goal in Guides.
2. Learn only the process and preparation terms needed for that goal.
3. Continue into the matching product hub or wizard.

### Correct a listing

1. Open Claim or submit from the footer, verification page, or a compact profile link.
2. Submit attributable corrections for manual review.

## Design patterns

- The information is serious. The experience is friendly: keep the visual balance approximately 70% professional and 30% playful.
- Use Bricolage Grotesque at 700–800 only for major marketing headings and page titles. Use Manrope at 400–700 for body copy, navigation, buttons, labels, forms, cards, and supporting headings. The approved logo remains artwork rather than web-font text.
- Treat neo-brutalism as a shared system, not a page template. Exploration pages may use the full palette, thick forest borders, offset shadows, and clay artwork. Workflow pages use those cues to clarify steps and selected states. Directory, profile, verification, form, and legal pages keep the same typography and geometry with fewer shadows and quieter backgrounds.
- Reserve the strongest hard shadows for primary actions, educational cards, and high-level orientation panels. Manufacturer facts, sources, tables, and legal copy use firm borders without decorative depth so evidence stays easy to scan.
- Use coral, aqua, lavender, and yellow as bounded accent surfaces rather than text colors. Keep body copy and critical labels in ink or forest for contrast.
- Prefer compact corner radii and visibly physical press states over pills on primary controls. Pills remain appropriate only for small tags or filters.
- On mobile, remove decorative transforms and reduce offset shadows before reducing text size or tap targets.
- Progressive disclosure for wizard and introduction flows.
- Tappable product cards with clear selected and focus states.
- Evidence labels for verified capabilities and neutral labels for unknown fields.
- Directory result cards use compact decision summaries: name, primary location, a short public product description, relevant products, capabilities, minimum order, a few useful certification badges, and one profile link. Do not repeat sources, reviewed dates, disclaimers, or every database field on each card.
- Visible breadcrumbs on nested routes.
- Use face-free claymation product imagery for exploration surfaces: the homepage hero, product selection, guide covers, beginner onboarding, empty states, newsletter sections, and educational callouts.
- Clay assets share handmade material, three-quarter isometric camera, soft studio lighting, scale, and a restrained deep-green, yellow, coral, lavender, aqua, navy, and cream family. Each category still needs its own silhouette, color story, packaging structure, and relevant props; do not repeat one label pattern across products.
- Clay assets use real alpha transparency and no baked background. They contain no people, faces, hands, readable labels, real brands, fake company names, or watermarks. The homepage hero may use simple, plausible, unbranded manufacturing equipment to tell the high-level idea-to-product story; exact process education still belongs in accessible SVG diagrams.
- Keep manufacturer search results, manufacturer cards and profiles, verification information, sources, reviewed dates, introduction forms, and legal pages clean and data-focused. Clay products represent the founder's idea, never an actual manufacturer or facility.
- Keep copy universal and practical. Color and interaction may feel current, but never describe the product publicly as being for a generation or age group.
- Accurate accessible SVG diagrams for manufacturing lessons; never use generated imagery to explain an exact process sequence.
- Neutral monograms or category treatments for manufacturers without rights-cleared media.
- No match scores, fake badges, urgency, ratings, or vanity counters.

## Terminology

- Prefer "manufacturer" in navigation and beginner copy.
- Explain "co-packer" after the user has context.
- Prefer "wellness drinks & shots" in beginner-facing category choices. Introduce "functional beverage" as the industry term only after the category is selected.
- Prefer "Not publicly listed" or "Ask the manufacturer" for missing information.
- Avoid "CPG founders," "NDA posture," "organic order," and promotional filler.
