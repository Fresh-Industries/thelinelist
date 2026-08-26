# The Line List UX source of truth

## Product principles

- Start with what the visitor wants to make.
- Use one obvious route from product idea to manufacturer results.
- Reveal manufacturing language only when it helps a decision.
- Show sourced facts. Directory cards hide unknown technical fields except for a compact MOQ prompt; profiles may use "Unknown, ask the manufacturer" when a listing is blank.
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
- Your product plan: guided founder-and-ChatGPT workflow from a plain-language product idea through an approved introduction.
- Sourcing packet: separate, expiring manufacturer-facing view containing only founder-approved fields.

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

### Sourcing workspace

Owns the shared product plan, founder decisions, evidence-backed matches, manufacturer selection, introduction draft, sharing controls, and approval state. ChatGPT suggestions never silently become founder-confirmed facts. The workspace uses three real screens—Your plan, Matches, and Contact—and renders only the current screen. The default plan view asks one question at a time; the full structured model lives behind Review all details.

### Sourcing landing

Owns the promise and first action: tell ChatGPT what you want to make, then watch the product plan take shape on The Line List. “Use with ChatGPT” is primary, the manual path remains secondary, and example ideas accelerate onboarding. It may explain the relationship with a static conversation-to-plan visual, but it never claims a verified connection or embeds a fake chatbot.

### Manufacturer-facing sourcing packet

Owns the portable, manufacturer-safe project summary. It never contains internal notes, rankings, private concerns, comparisons, or unconfirmed proposals. It uses a separate unguessable link, is not indexable, and can expire or be revoked independently from the workspace.

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

### Prepare and send a manufacturer introduction

1. Start with ChatGPT onboarding or the manual path and create a private product plan.
2. Answer one plain-language question at a time and confirm important ChatGPT suggestions.
3. Move to Matches only when the product and at least one match-shaping requirement are confirmed.
4. Show at most three explicit product fits; never pad the list with generic manufacturers.
5. Add one manufacturer to the shortlist and draft a personalized introduction without sending it.
6. Review the exact shared fields and product-brief preview; budget remains private unless explicitly selected.
7. Approve the visible message and product brief, then send only to the configured safe demo inbox.
8. Mark the manufacturer Contacted only after successful delivery.

## Design patterns

- The information is serious. The experience is friendly: keep the visual balance approximately 70% professional and 30% playful.
- Use Bricolage Grotesque at 700–800 only for major marketing headings and page titles. Use Manrope at 400–700 for body copy, navigation, buttons, labels, forms, cards, and supporting headings. The approved logo remains artwork rather than web-font text.
- Treat neo-brutalism as a shared system, not a page template. Exploration pages may use the full palette, thick forest borders, offset shadows, and clay artwork. Workflow pages use those cues to clarify steps and selected states. Directory, profile, verification, form, and legal pages keep the same typography and geometry with fewer shadows and quieter backgrounds.
- Reserve the strongest hard shadows for primary actions, educational cards, and high-level orientation panels. Manufacturer facts, sources, tables, and legal copy use firm borders without decorative depth so evidence stays easy to scan.
- Use coral, aqua, lavender, and yellow as bounded accent surfaces rather than text colors. Keep body copy and critical labels in ink or forest for contrast.
- Prefer compact corner radii and visibly physical press states over pills on primary controls. Pills remain appropriate only for small tags or filters.
- On mobile, remove decorative transforms and reduce offset shadows before reducing text size or tap targets.
- Progressive disclosure for wizard and introduction flows.
- Product-plan workflows use one dominant question or action at a time, a compact live-plan summary on desktop, and a collapsible plan summary on mobile. Future stages are disabled or hidden until useful.
- Tappable product cards with clear selected and focus states.
- Evidence labels for verified capabilities and neutral labels for unknown fields.
- Directory result cards use compact decision summaries: name, primary location, source-backed product and capability chips, a concise public-product fallback only when structured product tags are absent, compact minimum order copy, a few useful certification badges, compare, and one profile link. Do not generate "Best for" by pairing independent product and process fields; show it only if a future source record supports that exact summary. Hide unknown process, packaging, and operating-model fields rather than repeating empty labels. Do not repeat sources, reviewed dates, disclaimers, or every database field on each card.
- The comparison page owns shortlist editing after arrival. Keep its floating directory dock hidden, show the selected manufacturers before the evidence table, and preserve readable column widths with intentional horizontal scrolling instead of squeezing five manufacturers onto one screen.
- Visible breadcrumbs on nested routes.
- Use face-free claymation product imagery for exploration surfaces: the homepage hero, product selection, guide covers, beginner onboarding, empty states, newsletter sections, and educational callouts.
- Clay assets share handmade material, three-quarter isometric camera, soft studio lighting, scale, and a restrained deep-green, yellow, coral, lavender, aqua, navy, and cream family. Each category still needs its own silhouette, color story, packaging structure, and relevant props; do not repeat one label pattern across products.
- Clay assets use real alpha transparency and no baked background. They contain no people, faces, hands, readable labels, real brands, fake company names, or watermarks. The homepage hero may use simple, plausible, unbranded manufacturing equipment to tell the high-level idea-to-product story; exact process education still belongs in accessible SVG diagrams.
- Keep manufacturer search results, manufacturer cards and profiles, verification information, sources, reviewed dates, introduction forms, and legal pages clean and data-focused. Clay products represent the founder's idea, never an actual manufacturer or facility.
- Keep copy universal and practical. Color and interaction may feel current, but never describe the product publicly as being for a generation or age group.
- Accurate accessible SVG diagrams for manufacturing lessons; never use generated imagery to explain an exact process sequence.
- Guide pages lead with a 30-second answer, a visual decision aid, a numbered game plan, and a saveable checklist before deeper reference material. The guide hub starts with product intent, then offers a storage-first process map for people who do not know the manufacturing term yet.
- Neutral monograms or category treatments for manufacturers without rights-cleared media.
- No match scores, fake badges, urgency, ratings, or vanity counters.

## Terminology

- Prefer "manufacturer" in navigation and beginner copy.
- Explain "co-packer" after the user has context.
- Prefer "wellness drinks & shots" in beginner-facing category choices. Introduce "functional beverage" as the industry term only after the category is selected.
- Prefer "Unknown, ask the manufacturer" for missing information.
- In the primary product-plan experience prefer "Suggested," "You said," "You confirmed this," and "We still need this" over internal field-state language.
- Prefer "Your product plan," "First production amount," "Recipe readiness," "Draft my introduction," and "Product brief." Keep WebMCP, callback, approval-version, and delivery-transport language out of founder-facing copy.
- Avoid "CPG founders," "NDA posture," "organic order," and promotional filler.
