# Product Workspace design constraints

Status: working product-design source of truth for concept exploration and implementation.

This document governs The Line List Product Workspace. Read it with [`UX.md`](../UX.md), which remains the source of truth for the wider site. [`docs/sourcing-webmcp.md`](sourcing-webmcp.md) describes the checked-out prototype and its technical seams; it does not override these product constraints. Where sources conflict, reconcile the documents before designing or implementing rather than silently choosing one.

This is a constraint document, not a wireframe or implementation specification.

## Product decision hierarchy

- **Must**: an invariant. Reject concepts that violate it.
- **MVP default**: the current v1 decision. It may change after evidence, but it must not be reopened without a concrete reason.
- **Validation item**: design may continue using the stated working assumption, but research must test it.
- **Later architecture**: do not expose it in the first UX; avoid choices that make it impossible later.

## 1. Product purpose

The Product Workspace turns an incomplete food or beverage idea into a trustworthy, persistent product brief that a manufacturer can meaningfully evaluate.

The transformation is:

> I have an idea → I understand the important decisions → I have made or explicitly deferred them → I know which manufacturers may fit and why → I am ready for a serious introductory fit conversation.

For v1, **manufacturer-ready** means ready for a manufacturer to quickly respond with one of three useful outcomes:

- Yes, this may fit.
- No, this does not fit.
- We need these specific things next.

It does not mean production onboarding, quote-ready, safety-validated, regulatory-approved, or ready to run on a line.

The workspace must be:

- The canonical record of the product as currently understood.
- A decision-making artifact, not merely a record of answers.
- Persistent across conversations, sessions, and manual edits.
- Legible to a founder without manufacturing expertise.
- Honest about unknowns, assumptions, conflicts, and evidence.
- Capable of producing a recipient-specific manufacturer brief.
- Useful with or without the Codex agent, WebMCP, or 3D support.

It is not:

- A generic document editor.
- A SaaS or analytics dashboard.
- A giant form or rigid wizard.
- A chatbot transcript.
- A CRM or project-management system.
- A manufacturing execution system.
- A substitute for a manufacturer, food scientist, process authority, or regulatory advisor.

## 2. Primary user

The v1 owner is a single first-time or early-stage food or beverage founder. Collaboration may be supported later, but the initial mental model is **My product plan**.

The founder may:

- Begin with only a category, flavor, audience, or retail ambition.
- Use consumer language instead of manufacturing terminology.
- Be unable to distinguish product format, package, process, storage method, or formulation readiness.
- Feel embarrassed about not knowing an answer.
- Have unreliable early estimates for volume, budget, cost, or timing.
- Be intimidated by manufacturers.
- Prefer conversational help to a technical form.
- Return after days or weeks and need immediate reorientation.
- Use the Codex agent and the workspace together in the supported Codex app flow.
- Worry that an agent may invent, expose, or send something without permission.

Therefore:

- “I don’t know yet” is a valid state, not a failure.
- Technical vocabulary is never required to begin.
- Technical terms appear only when the underlying decision becomes relevant.
- Partial progress is useful without being presented as completion.
- Reversible actions remain reversible until external contact occurs.
- The founder can always distinguish what they confirmed, what was suggested, and what remains open.
- Returning users can immediately see what changed and what deserves attention next.

## 3. Core mental model

The governing mental model is an **agent-assisted living product brief**.

- The brief is the product’s canonical state.
- The Codex agent is a collaborator that can read and propose changes to it.
- Manual edits change the same brief.
- The current unresolved decision appears in the context of the brief.
- Matching, comparison, and outreach are consequences of the brief, not separate products.
- The document becomes more precise as the founder makes decisions.
- The founder can inspect how a value entered the brief.

“Workbench” may inform packaging exploration. “Notebook” may support incompleteness. Neither replaces the living-brief model. A “production line” is too rigid and a generic document editor is too unstructured.

Avoid these mental models:

- Generic SaaS dashboard.
- CRM pipeline.
- Analytics dashboard.
- Giant questionnaire.
- Chatbot with no persistent artifact.
- Marketing landing page inside the workspace.
- 3D configurator pretending to be a complete product-development system.
- Invisible autonomous sourcing agent.

## 4. Journey constraints

The journey is dependency-aware but not rigidly linear.

| Stage | Founder needs to understand | Decision or state needed | Completion artifact | Hidden until relevant |
| --- | --- | --- | --- | --- |
| Idea | A plain-language idea is enough | What they broadly want to make | Preserved founder idea | Process, certifications, MOQ, manufacturers |
| Product definition | What the product is and who it is for | Working category and description | Coherent product overview | Detailed production requirements |
| Product format | The physical item someone buys or consumes | Liquid, loaf, bar, sauce, snack, and similar format | Defined physical format | Exact packaging engineering |
| Formulation | Recipe readiness changes the help and manufacturer needed | Recipe ready, needs work, or needs development; known allergen constraints | Formulation-readiness statement and open questions | Proprietary recipe detail and premature process jargon |
| Packaging | Packaging changes equipment fit, cost, storage, and shipping | Alternatives may be compared; one active direction is chosen | Active package plus quietly preserved alternatives | Secondary package details until useful |
| Production requirements | A useful range is enough for an initial conversation | Approximate volume, storage, sourcing responsibilities, relevant timing | Initial production brief | Premature pallet, freight, or detailed costing questions |
| Certifications and constraints | Some requirements are mandatory and others aspirational | Required, preferred, unknown, or not applicable | Prioritized requirements with reasons | Catalog of every possible certification |
| Manufacturer matching | A result means worth evaluating, not confirmed capable | Decide whether to explore candidates; unknowns may remain | Evidence-backed candidate set plus narrowing questions | Contact actions before evidence exists |
| Comparison | The goal is choosing who deserves a conversation | Shortlist, reject, or investigate | Shortlist with rationale and questions | Giant specification matrix and vanity ranking |
| Outreach preparation | The founder must know exactly what will be shared | Recipient, message, fields, and questions | Founder-approved draft and packet preview | Send before review |
| Contact | Sending creates an external consequence | Approve the exact recipient and content, then founder sends or copies | Delivery/contact record | Unrelated workflow options |
| Manufacturer packet | “Done” means ready for evaluation | Approve a recipient-specific snapshot | Founder master brief plus manufacturer packet | Private notes, rankings, rejected ideas, other manufacturers |

The packet must be prepared before contact because it supports the introduction. A later final packet may be a refined snapshot, but packet preparation is not deferred until after sending.

## 5. Next-action rules

- There is normally one dominant unresolved decision or consequence.
- One dominant action does not prevent direct editing elsewhere in the brief.
- The next decision is derived from prerequisites and category context, not a universal static field order.
- The founder sees why a question matters when the reason is not obvious.
- Advanced decisions remain hidden until their prerequisites exist.
- “I’m not sure” preserves momentum and never becomes a confirmed factual answer.
- Matching may begin with unknowns; unanswered questions improve and narrow results rather than blocking all discovery.
- The product should say, for example, “We found possible matches. Answering these two questions would narrow them,” not “Complete your profile to continue.”
- Agent updates recalculate the next action without unexpectedly navigating the founder away from the current task.
- Returning founders see what changed, where they are, and what matters next.
- Readiness uses meaningful language, never a percentage.
- The interface does not show multiple equally weighted continue, research, edit, ask, and match actions.

## 6. Codex agent and WebMCP relationship

The relationship is **one product state, two ways of collaborating with it**.

The Codex agent owns conversation, clarification, explanation, research synthesis, tradeoff discussion, and draft generation.

The Line List owns persistent state, provenance, evidence, founder confirmation, manufacturer data, matching constraints, sharing controls, undo, approval, and external actions.

The Line List does not care whether an instruction originated from the Codex agent through WebMCP or from the workspace UI. Both surfaces read and write the same canonical product.

When a founder answers the Codex agent:

1. The agent reads the latest workspace state.
2. It extracts structured values.
3. Explicit founder statements may become confirmed immediately.
4. Agent inference, research, and recommendations remain proposed.
5. The workspace updates visibly without changing the founder’s location.
6. The agent explains what changed and asks the next useful question.

Example:

- Founder: “I want 12 oz cans.” → `12 oz can` is confirmed.
- Agent: “Most products like this use 12 oz cans, so I added that.” → `12 oz can` remains proposed until approved.

When the founder edits the workspace manually, the same canonical state changes and the agent sees it on the next read. The founder must not repeat the edit to the agent.

Agent updates should:

- Identify changed content in place.
- Distinguish confirmed and proposed values.
- Offer lightweight undo for agent changes.
- Preserve scroll position and the current task.
- Record an audit event behind the scenes.
- Never use fake AI activity theater.

Explicit confirmation is required for:

- Agent inference or research-derived recommendations.
- Destructive changes.
- Changes to already confirmed decisions when the founder did not clearly request them.
- Safety-sensitive interpretations.
- Making private information shareable.
- External actions and manufacturer contact.

WebMCP may expose tools to read state, apply clear founder statements, propose uncertain changes, retrieve decision context, find evidence-backed candidates, prepare reversible outreach drafts, and open human review. It must not provide an agent-callable manufacturer-send action.

WebMCP is progressive enhancement. The complete human workflow remains usable without it. The interface does not open an external AI website or imply a cross-tab connection; the supported agent integration is the Codex app.

## 7. Document and state model

Do not collapse decision, provenance, evidence, and sharing into one status.

### Decision state

- **Open**: no usable decision exists.
- **Proposed**: a specific value awaits founder acceptance.
- **Confirmed**: the founder explicitly stated or accepted the value.
- **Excluded**: a considered value was rejected or marked not applicable.

### Provenance

- Founder stated.
- Agent proposed.
- System derived.
- Source supported.
- Manufacturer confirmed.

### External evidence state

- Supported by reviewed source.
- Unknown or not publicly found.
- Conflicting.
- Mismatch or directly disproven.

### Sharing state

- Private.
- Eligible to share.
- Included in this recipient’s packet.

“Needs decision” is normally derived priority, not durable truth. “Founder decision” is provenance, not a status. “Sourced” is evidence provenance, not a decision status.

The main brief shows the product identity, physical format, current packaging, formulation context, match-shaping production constraints, material proposals, and current important unknown. History, rejected alternatives, detailed evidence metadata, optional commercial fields, and private notes remain available without competing with current work.

## 8. 3D product constraints

The 3D object earns its place only when it helps make a packaging decision.

V1 may support a deliberately small set:

- Cans.
- Bottles.
- Jars.
- Pouches.
- Boxes or cartons.

It may represent package family, proportions, size, material, closure, label area, finish, artwork, and multipack arrangement where the model genuinely supports those differences.

Packaging exploration supports alternatives while preserving one active direction. A founder may compare, for example, a standard can and a slim can, discuss tradeoffs, then choose one. Rejected alternatives remain quiet history rather than active product state.

The model must:

- Visibly change when a represented packaging decision changes.
- Make proposed alternatives look tentative and confirmed choices stable.
- Never make an unconfirmed package appear resolved.
- Have accessible non-3D controls for every decision.
- Recede or disappear when it does not improve the current decision.

It must never represent formula readiness, safety, shelf life, certifications, manufacturer capability, commercial viability, or production readiness. It must not become an interior hero that displaces the living brief.

## 9. Manufacturer matching constraints

Matching starts with enough information to reduce obvious irrelevance, not with a complete profile.

The working category-specific readiness inputs are some variation of:

- Product/category.
- Physical format.
- Formulation status or development need.
- Package format or flexibility.
- Approximate production volume.
- Storage requirements.
- Shelf-life expectation or current validation status.
- Certifications or special constraints.

This is a validation item, not a universal final dataset. Manufacturer interviews must shape the real category gates.

Every candidate claim is classified as supported, unknown, conflicting, or mismatch. Founder and agent assumptions are not manufacturer evidence.

The product must not:

- Convert missing information into support.
- Generate numeric match scores.
- Label a candidate “strongest” from field count or list order.
- Say a manufacturer can make the product before direct confirmation.
- Pad results to meet a result count.
- Hide conflicts behind positive summaries.

Comparison helps the founder choose a conversation. It focuses on supported fit, conflicts, unknowns, qualified minimums, package/process capability, formulation help, location, required certifications, contact availability, review dates, and useful questions.

## 10. Outreach constraints

V1 uses founder-approved draft outreach:

> The Line List prepares → founder reviews → founder sends or copies.

Later, The Line List may send an approved introduction, but nothing is ever silently sent.

The outreach sequence is:

> Shortlist → choose recipient → prepare recipient-specific draft → review shared details → review exact message → founder approval → founder send/copy → record outcome.

Constraints:

- Outreach is recipient-specific, not a bulk blast.
- Draft generation is reversible and never implies contact occurred.
- The founder sees the exact recipient, subject, message, and packet fields.
- Private and excluded information remains excluded unless deliberately added for that recipient.
- Changing recipient, message, or shared packet invalidates approval.
- Approval is bound to a specific version.
- Delivery success, not a click, creates Contacted state when The Line List eventually supports delivery.

## 11. Manufacturer packet

There are two artifacts:

1. The founder master brief, including private state and history.
2. A recipient-specific manufacturer packet containing an approved subset.

The manufacturer packet should normally contain:

- Working product name and concise overview.
- Product and physical format.
- Package format and size.
- Formula/readiness status without proprietary formulation detail.
- Development-help need.
- Approximate first-run volume with units.
- Storage and distribution needs.
- Shelf-life expectation or validation status.
- Confirmed allergen constraints.
- Relevant mandatory certifications or requirements.
- Ingredient or packaging sourcing responsibilities when useful.
- Channel or launch context only when it affects fit.
- Questions for that manufacturer.
- Founder/company identity and reply path.
- A concise source-backed reason for contact.
- Packet generation date or version.

It excludes internal notes, rankings, other manufacturers, rejected ideas, agent reasoning, unconfirmed proposals presented as facts, comparison tables, and budget/cost/retail targets without recipient-specific consent.

The exact packet requirements are a validation item. Interview 5–10 manufacturers after the prototype exists and ask what information would make them respond to a new-brand inquiry. Do not let an agent invent the answer.

## 12. Information-density constraints

- Progressive disclosure is mandatory.
- The main document emphasizes current relevance, not schema completeness.
- Document hierarchy provides most visual separation.
- Information has one canonical location.
- Explanation sits beside the decision it supports.
- Helper copy is omitted when the question and choices are already clear.
- Status is quiet unless it changes trust or action.
- Empty fields do not generate empty sections.
- Future stages do not consume space merely to advertise that they exist.
- Evidence status remains visible even when full evidence details are disclosed progressively.

Use a card only for genuine peers, a modal only for a short interruptive decision, a drawer only for temporary reference, a sidebar only for persistent cross-workspace utility, a table only for repeated-field comparison, a badge only for scannable repeated state, and a tooltip only for nonessential supplemental information.

## 13. Copy constraints

- Begin with founder language and introduce the manufacturing term second.
- Ask one short, specific question.
- Explain why only when it improves the decision.
- Distinguish fact, proposal, and uncertainty.
- Avoid motivational marketing language inside the workspace.
- Avoid narrating obvious interface behavior.
- Never imply certainty the evidence cannot support.
- Never shame incomplete information.
- Use consistent terms across the Codex agent, workspace, outreach, and packet.

| Avoid | Prefer |
| --- | --- |
| Enter your target MOQ | About how much would you like to make first? |
| Configure storage distribution requirements | Will it be sold at room temperature, refrigerated, or frozen? |
| Strongest manufacturer match | Possible fit based on reviewed public information |
| Capability unavailable | We could not find this in the manufacturer’s public information |
| Complete this field to continue | Answering this would help exclude manufacturers whose minimums are too large |
| AI-generated recommendation | Your agent suggested this. You have not confirmed it yet |
| Your product is 80% ready | One decision would make these matches more specific |

## 14. Visual constraints

The workspace should feel calm, editorial, tactile without being toy-like, physical-product oriented, serious enough for consequential decisions, and friendly enough for a beginner.

- The document, not a hero composition, dominates.
- Typography and whitespace create hierarchy before containers do.
- Use very few container styles.
- Color communicates action, provenance, or evidence rather than decorating every section.
- Proposed and confirmed content remain distinguishable without color alone.
- Product imagery may provide identity but does not displace the work.
- Interior workspace views do not resemble marketing pages.
- Motion communicates real state change, never fake AI activity.
- Evidence and outreach become visually quieter and more precise as consequences increase.

## 15. Component constraints

The product needs a small vocabulary of behavioral primitives:

- Document section.
- Structured field or decision row.
- Current-decision block.
- Proposed-change review.
- Evidence disclosure.
- Packaging visualization/editor.
- Manufacturer candidate and comparison unit.
- Outreach draft and sharing review.
- Consequential confirmation.
- Quiet system feedback and undo.

Every component has one responsibility, preserves the same state vocabulary, works through keyboard and touch, supports unknown states, avoids inventing another navigation model, and degrades without WebMCP or 3D.

## 16. Mobile constraints

- The product and next decision are immediately identifiable.
- The founder can inspect the latest agent change without hunting.
- Moving between the Codex agent and the workspace preserves state and position.
- The workspace communicates whether it received the latest change.
- Manual editing remains fully usable.
- 3D never pushes the decision out of context.
- Every 3D manipulation has explicit controls.
- Manufacturer comparison preserves like-for-like factors without requiring a giant squeezed table.
- Evidence status and unknowns remain visible.
- Outreach keeps recipient, message, shared fields, and consequence understandable without desktop columns.
- No consequential action depends on hover or horizontal page scrolling.

## 17. Trust constraints

- Secure expiring guest workspaces can complete the full flow before authentication. Saving claims the same workspace into the founder account; a workspace ID alone never grants access.
- Founder-confirmed values are distinct from agent proposals.
- Source-backed claims show the claim, source, and review date.
- Unknown never becomes no unless a source explicitly disproves the capability.
- Inference never looks like sourced evidence.
- Conflicting evidence remains conflicting.
- Confidence is not reduced to an unexplained score.
- Stale evidence is identified.
- Manual and agent changes enter the same audit trail.
- V1 provides lightweight undo for agent changes; full revision history comes later.
- Sharing is recipient-specific.
- The exact approved and sent content remains recoverable.
- Manufacturer contact always requires explicit founder action.

Verified manufacturer corrections outrank older directory assumptions while preserving provenance and the prior source. Manufacturer replies create proposed state rather than silently rewriting the product or directory. These are later architecture requirements, not first-concept UI.

## 18. Anti-slop rules

Do not add by default:

- A card merely for separation.
- An icon beside every heading or field.
- A badge for every state.
- A progress percentage.
- Dashboard metrics unrelated to the current decision.
- More than one dominant CTA.
- A sidebar without persistent utility.
- A modal for ordinary editing.
- Required information inside a tooltip.
- A giant interior hero.
- Decorative gradients, halos, or glows.
- Faux AI activity indicators.
- Animated typing that does not reflect a real stream.
- A chatbot panel duplicating the Codex agent.
- Repeated summaries of the same product data.
- Separate AI and manual versions of the workflow.
- Future-stage teasers competing with present work.
- Empty sections for unanswered fields.
- Jargon merely because the data model uses it.
- Match scores or unsupported “best” labels.
- A giant comparison table by default.
- Pills for ordinary controls.
- Encouragement copy after every action.
- Decorative 3D that implies unmade decisions.
- A new component when a document primitive expresses the same behavior.

## 19. Deletion test

For every element ask:

> What becomes harder, less trustworthy, less safe, or impossible if this disappears?

An element earns its place only if it helps answer the current decision, communicates canonical state, distinguishes certainty from uncertainty, provides evidence, prevents an unsafe consequence, supports editing or recovery, clarifies a difficult comparison, or communicates an external result.

Delete or demote it when it repeats information, only makes the interface feel populated, explains obvious behavior, decorates a state without clarifying it, represents unactionable future work, or exists only because the schema has a field.

## 20. Observable success criteria

1. A first-time founder identifies the product state and next decision within five seconds.
2. A founder can begin with one plain-language sentence.
3. A founder never has to browse a giant manufacturing form.
4. The brief visibly changes when the founder answers the Codex agent.
5. A manual edit is visible to the agent on its next read.
6. A user can explain that the Codex agent collaborates and The Line List preserves product state.
7. A proposal cannot be mistaken for a founder-confirmed value.
8. A user can undo a reversible agent change.
9. Matching can begin with unknowns and becomes narrower as useful answers arrive.
10. The 3D object reflects only decisions made or alternatives explicitly previewed.
11. Manufacturer candidates never present unknown capabilities as supported.
12. A founder can explain why each candidate appears and what remains unverified.
13. Comparison helps choose a conversation without a giant table.
14. A packet contains only recipient-approved information.
15. The founder sees the exact recipient, message, and packet before sending or copying.
16. No manufacturer can be contacted without explicit founder action.
17. A manufacturer can understand the opportunity and give a meaningful fit response.
18. The complete journey remains usable without WebMCP or 3D.
19. Mobile preserves the same state, trust, and approval model as desktop.

## Ten highest-priority constraints

1. One canonical product state across the Codex agent and manual editing.
2. The workspace is an agent-assisted living brief, not a dashboard or chatbot.
3. One dominant next decision, without locking the rest of the brief.
4. Clear separation of proposal, confirmation, sharing approval, and external action.
5. Manufacturer-ready means ready for an introductory fit conversation.
6. Matching improves with answers but may begin with explicit unknowns.
7. Evidence before confidence; no unsupported “strongest” or “can make this” claims.
8. The document dominates and 3D appears only when it improves a packaging decision.
9. Every manufacturer packet is recipient-specific and founder approved.
10. The entire core workflow works without the Codex agent, WebMCP, or 3D.

## MVP decision register

### Decided before concept exploration

- Manufacturer-ready means introductory fit-conversation ready.
- The Codex agent and the workspace share one canonical state.
- Explicit founder statements may become confirmed immediately.
- Matching may begin with unknowns.
- 3D is limited to decisions and formats it can faithfully support.
- Packaging supports alternatives with one active direction.
- V1 prepares founder-approved draft outreach; the founder sends or copies.
- V1 scope is packaged food and beverage with conventional co-manufacturing workflows; demos focus on beverages and shelf-stable packaged foods.

### MVP defaults

- Up to three manufacturers may be selected and prepared together, with a separate recipient-specific review for each.
- Founder is the sole workspace owner.
- Guest ownership uses a secure expiring credential; authenticated saving transactionally claims the same workspace.
- Lightweight undo and a background audit trail ship before visible revision history.

### Validate without blocking design

- Category-specific minimum information needed for useful matching.
- The manufacturer-facing information that makes an inquiry worth answering; interview 5–10 manufacturers after the prototype exists.

### Design architecture for later

- Verified manufacturer corrections outrank older public sources while preserving provenance.
- Manufacturer replies create proposed workspace or directory changes rather than silently rewriting state.

## Initial scope boundary

The coherent v1 covers packaged food and beverage products with conventional co-manufacturing workflows. Initial examples may include energy drinks, sparkling beverages, juice, sauces, hot sauce, packaged baked goods, and snacks.

Do not attempt to solve supplements, frozen meals, meat processing, alcohol, dairy, pet food, or every specialty manufacturing workflow simultaneously.

## Current implementation conflicts to resolve during future concept work

- The Codex agent and manual entry are presented as separate modes.
- The product brief is visually subordinate to a large product portrait.
- 3D may display a package value without distinguishing proposal from confirmation.
- The all-details view exposes the schema rather than current relevance.
- Stored state mixes decision, priority, provenance, evidence, and sharing concerns.
- Multiple journey/readiness models can drift.
- Match labels such as “Strongest,” “Strong,” and “Good” overstate evidence.
- “Could make your product” is stronger than public evidence supports.
- The current comparison action advances into single-manufacturer contact preparation.
- Agent updates can unexpectedly switch workspace chapters.
- The packet’s hard-coded sections can omit approved fields.
- Persistent private work still relies on bearer-link access.

These are inputs to concept exploration, not permission to fix individual UI papercuts before a coherent concept is selected.
