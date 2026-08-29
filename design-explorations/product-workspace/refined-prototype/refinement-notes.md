# Product Workspace deletion and interaction polish

## Removed

- The duplicate final manufacturer-conversation brief and its repeated product, packaging, production, shelf-life, manufacturer, and open-question fields.
- Permanent `Brief saved`, `Added as your decision`, `Ready to use`, and similar status narration.
- The persistent agent response card and fake typing-dot activity.
- The extra 12 oz agent suggestion, which competed with the packaging decision.
- `Focused workbench` as a second product-state label.
- Packaging combinations that did not have a faithful supplied product image.
- The always-visible faded comparison object.
- Manufacturer ranking numbers, `best starting point` lenses, and evidence-overstating `likely fit` copy.
- Per-row fictional-data caveats. Prototype disclosure now appears once at the system level.
- The large duplicated packet section after outreach approval.
- Decorative background texture and extra status ornament.

## State synchronization fixed

- Package controls, product image, comparison image, summary, document writeback, matching context, and outreach draft now derive from the same packaging object.
- The Product section derives its physical format from the saved packaging direction once that decision exists.
- Selecting a product format automatically preserves only compatible package choices.
- Package comparison uses the same product, finish, weight, and dimensions as the current direction; only the package changes.
- Switching to an alternative makes that exact alternative the working canonical state.
- Clear and printed finish states update the summary and visual artwork treatment together.
- Complete dimensions appear in the workbench summary, document, and recipient draft; incomplete dimensions remain quietly open.
- Manufacturer matching names the exact current packaging direction.
- Each outreach draft is generated from the current package and production quantity.
- Editing packaging, production quantity, or a recipient message invalidates prior approvals.
- Each manufacturer keeps a separate draft and approval signature.

## Agent behavior

- The collaborator leads with one contextual question before the composer.
- A founder answer appears briefly beside the Product passage.
- Product format, sales format, and target channel write into the document in sequence.
- Each affected field receives one restrained arrival highlight.
- The response settles and collapses to a small recoverable `Last agent change` marker.
- The next useful packaging decision appears as contextual guidance, not a transcript entry.

## Packaging interaction

- Product and package controls only expose visually supported combinations.
- The product image changes from the canonical package direction.
- Zoom is directly manipulable.
- Clear and printed film can be compared through the same package state.
- Optional dimensions can be entered without blocking the decision.
- Flow wrap and bakery bag can be shown side by side for the mini-loaf direction.
- The alternative can become the working direction with one action.
- One short contextual consequence remains visible; its rationale expands only on request.
- Rotation was deliberately not simulated: the supplied package studies have one camera angle, so CSS rotation would imply physical information the images do not contain.

## Final document behavior

- The product brief itself progresses from `Product brief` to `Ready for manufacturer matching` to `Ready for manufacturer conversation`.
- Chosen manufacturers, shared open questions, and per-recipient introduction readiness appear as normal document sections.
- Multiple manufacturers can be carried as a contact set while each introduction remains separately reviewed and approved.
- Nothing is sent; an approved recipient-specific introduction can only be copied.

## Remaining duplicate information

- The product name appears in the sticky orientation header and the document title. This is intentional so the product remains identifiable inside a workbench.
- Outreach review repeats the approved subset of the living brief beside the message. This is intentional consequential review, not a second persistent packet.
- Packaging imagery appears in the workbench and as a small document writeback. The first supports a decision; the second records it.

## Remaining generic SaaS traces

- The sticky orientation bar and restart control are prototype utilities.
- Workbench close and sticky confirmation bars remain conventional application chrome because they preserve context and prevent accidental writeback.
- The current banana-bread package studies are image-based, not the production WebGL can, bottle, jar, and pouch builder. That production system was not transplanted into this isolated prototype because these flow-wrap, tray, and bag formats are not represented by its existing 3D models.

## Strongest magic interactions

1. A founder sentence writes three product facts into the document in sequence and then gets out of the way.
2. A package comparison changes one canonical physical direction and writes the exact result back everywhere.
3. One living brief produces several recipient-specific introductions whose approvals remain visibly separate and invalidate when the underlying truth changes.
