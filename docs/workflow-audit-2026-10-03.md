# The Line List workflow audit and improvements

Reviewed October 3, 2026 in `C:\Users\Nik\thelinelist`, branch `codex/fix-package-readiness`, starting commit `18262b8`. The starting checkout was clean. The initial findings and tests below describe that baseline. The release follow-up records integration with newer `main` changes and final validation. Browser evidence is local, not hosted end-to-end proof.

## Result

The main opportunity was to connect the approachable directory to the more useful product plan. The homepage now leads with **“Food or drink idea? Make a plan for your first run.”** Its primary action starts a plan; browsing remains available. The product workspace puts the next decision before the detailed brief on mobile. Empty optional details remain editable under a disclosure, and known details stay visible.

The audit reproduced and fixed input-integrity failures rather than assuming the earlier production report still described this checkout. Manufacturer evidence, unknowns, founder approval, and the separate send action remain central to the experience. See [the marketing experiment](marketing-plan-2026-10-03.md) for channel rationale, creative drafts, measurement limits, and a thirty-day sequence.

## Reproduced issues and changes

| Problem | Change | Evidence |
| --- | --- | --- |
| Homepage mainly routed idea-stage founders into category browsing; the persistent plan was hard to discover. | Primary plan CTA, shared plan navigation, clearer workflow explanation, updated metadata. Retained approved static social previews. Removed unsupported popularity and quiz-speed claims. | Desktop and 390×844 homepage inspection. |
| The next action was buried below readiness and many empty fields on mobile. | Next decision moved above the brief, blank optional fields disclosed, touch edit controls enlarged. | Mobile plan screenshot and successful inline editing. |
| A description answer also mentioning shelf-life validation saved the validation detail but dropped the requested description. | Preserve the current free-text answer while capturing other explicit details. | Exact failing sentence repeated in a fresh browser plan, persisted on reload; unit regression. |
| “I need help developing the recipe” was missed by initial intake. | Capture the explicit assistance request without inventing recipe readiness. | Fresh intake shows Required assistance and open recipe stage; unit regression. |
| Mixed certification priorities leaked between comma-separated statements; a later correction could remain negated. | Local priority parsing and latest explicit correction, preserving required/preferred/not-required/open distinctions. | Unit regressions for SQF/organic/kosher and correction round trip. |
| Rejected package and finished-recipe mentions became confirmed facts. | Exclude explicitly negated facts during conservative intake. | Regression for “do not want a 5 oz glass bottle” and “do not have a finished kitchen recipe.” |
| First-run quantity ranges became only their upper endpoint; a range overlapping MOQ could imply support. | Preserve ranges and keep MOQ overlap unknown unless the requested range establishes compatibility. | Range and strict-MOQ regressions. |
| Non-carbonated requirements could match carbonated-only evidence. | Evaluate still/non-carbonated intent explicitly; use the same distinction in introduction questions. | Strict carbonated-only fixture regression. |
| Common uncertainty answers could be confirmed; the old optional “not” pattern also classified “sure” as uncertain. | Shared explicit uncertainty recognizer and response-based UI acknowledgement. | Five uncertainty variants in regressions; browser “I’m not sure” remains open and research can continue. |
| An agent update moving a blank optional field into the brief could remount its active editor and lose unsaved founder text. | Pin active editors to their original container until save/cancel. | Independent review and browser proposal while typing: the founder draft survives. |
| Undo of an older agent proposal could overwrite a later founder correction. | Remove founder-edited fields from the pending undo snapshot and guard stale undo. | Browser two-field proposal, founder correction, then undo: correction remains and untouched proposal is removed; regressions. |
| The matching quiz collected formula, storage, carbonation, volume, and timing but discarded them. | Three steps containing only implemented directory filters, optional process disclosure, and “still deciding” defaults. | Chosen hot-sauce/bottle/hot-fill/Texas/SQF/small-run filters appear in results. |
| Quiz progress was lost on reload/return; query serialization could erase campaign attribution. | Persist filters and step in the URL; preserve only the five existing safe UTM keys through results. | Reload at step 3, internal Back, browser Back from results; legacy `product=energy-drink` works and arbitrary `privateNote` is dropped. |
| Empty directory results offered only a complete reset. | Keep product and clear the other filters, plus a contextual guide. | Bakery + HPP has zero results; recovery keeps Bakery and returns 43 listings. |
| Guides promised saveable checklists without a save action. | Native text download from the exact displayed checklist with source page and review date. | Energy-drink checklist downloaded and inspected on disk. |
| Manufacturer trace UI exposed internal labels such as `not_required`. | Plain-language priority and evidence labels. | Manufacturer research review. |

## Browser workflow coverage

All interactions used the Codex in-app browser at `http://127.0.0.1:3012`. Only fictional local product state and a non-deliverable `example.invalid` reply address were used. External service credentials were unset for the QA server. Storage used the existing development-only filesystem fallback.

| Workflow | Observed outcome |
| --- | --- |
| Manual plan creation | Exact idea retained; explicit package, amount, geography, assistance, and certification intent captured. No invented brand. |
| Agent/manual shared plan | Registered page tools read and propose into the same visible plan; proposals need review and can be undone. Inline founder edits persist. |
| Product questions | Recipe, carbonation, storage intent, and description advance to the appropriate next decision. The corrected description survives reload. |
| Research with uncertainty | Open storage stays open; research remains available and possibilities distinguish support, conflicts, and unknowns. |
| Package workbench | Visible staged mockup and placeholder styling; only the explicit “Use this package direction” action saves the direction. Saved preview survives route changes. |
| Manufacturer selection | One sourced possibility selected, pending save allowed to complete, then shortlist preserved across routes/reload. |
| Introduction preparation | Recipient-specific draft produced for the selected manufacturer, with shared/private details and founder reply-address requirement. |
| Approval and send boundary | Approval says “Approved · not sent.” Send opens a separate exact-recipient confirmation. Canceled there; Send now was never clicked. |
| Product-plan PDF | Actual three-page PDF downloaded and inspected for product facts, open decisions, saved package information, research, and private-plan footer. |
| Directory discovery | Real filters, result URL, unknown option defaults, legacy category entry, reload/back, and contextual empty recovery checked. |
| Comparison | Two public manufacturer profiles compared; missing packaging/minimum information remained unknown. Clear shortlist returned the empty-state guidance. |
| Guide checklist | Native `.txt` download contains the displayed checklist, canonical guide link, and review date. The browser download-event observer timed out, but the successful file was verified in Downloads. |
| Mobile | Home, intake, plan, optional edits, and wizard inspected at 390×844. Plan next action is above the detailed brief. Temporary viewport override reset afterward. |

## Initial validation

- `npm run test:unit`: **20 suites, 218 tests passed**, including 16 new founder-integrity regressions. Starting baseline was 19 suites / 202 tests.
- `npm run build`: passed compilation, TypeScript, and generation of **436 pages**.
- `npm run lint`: zero errors; seven existing warnings in the design prototype and sourcing store, outside these changes.
- `node scripts/check-seo.mjs`: **394 sitemap URLs** returned direct 200 responses with exact canonical links and valid structured data. Unfiltered directory caching and filtered-directory noindex passed.
- `git diff --check`: passed.
- Existing Playwright regression specifications were updated for labels, the three-step wizard, persistence, actual filter forwarding, and empty recovery. They were not launched in a separate browser; current interaction evidence comes from the in-app browser.
- A separate agent reviewed the sourcing UI/analytics and discovery changes. Its active-editor and UTM findings were fixed and retested.

## Marketing and measurement

Lead with the first-run outcome and practical founder questions. Gen Z is an internal audience focus; public language remains useful to founders of all ages, consistent with `UX.md`. The proposed first test is six practical founder/screen videos on TikTok and Instagram, supported by existing intent-specific guides and a workshop/checklist referral experiment. Channel reach is a reason to test, not proof of founder acquisition.

Added privacy-safe milestones for plan CTA, successful plan creation, research results viewed, and drafts prepared. Events carry generic source/count/outcome values, never private product text or workspace tokens. Provider delivery and person-level conversion are not established. Confirm event delivery and observe five consenting founders before spending. The [marketing plan](marketing-plan-2026-10-03.md) contains scripts and proposed research/paid ceilings; no spending was activated.

## Operational checks still needed before a release campaign

This local review does not establish production account recovery, guest-to-account claiming with the deployed database, durable hosted storage, generated-artwork provider behavior, email delivery, analytics ingestion, replies, or campaign conversion. These need an authorized configured environment and focused acceptance checks. During the initial audit, no database migration, live subscription, manufacturer contact, post, ad, push, or deployment occurred. Nik subsequently authorized the fixes and a push to `main`; release validation is below.

The directory and evidence dates were inspected as checked-in data; this was not a live re-verification of every manufacturer's current capabilities. Food safety, commercial validation, minimums, and package compatibility continue to require qualified review and manufacturer confirmation as shown in the existing workflow.

## Release follow-up

Integrated the audit changes with `origin/main` at `15f7bc5`, preserving the newer founder-stage lessons, canonical saved checklists, private cost worksheet, sourced service-intent selector, and manufacturer-evidence safeguards. Approved static social previews remain in use. Updated the incoming founder-journey regression labels to match the revised homepage and intake.

The independent integration review identified and resolved additional problems: ordinary leading certification intent now carries across shared lists; carbonation denials and contradictory opposite-only claims remain mismatches or conflicts; sensitive conversational fallback descriptions are preserved privately and excluded from default drafts and packets; quantity ranges and unresolved allocations retain `main`'s conservative unknown handling. Duplicate plan navigation and creation events were removed, and manual return-to-guide creation has an explicit analytics entry value. TypeScript inference annotations were added without changing behavior.

Final verification:

- **24 unit suites / 419 tests passed**, including 28 new founder-input regressions.
- Production build passed compilation, TypeScript, and generation of **444 pages**.
- Full ESLint passed with zero errors and seven pre-existing warnings; the final changed sourcing files also passed focused ESLint.
- SEO validation checked **402 sitemap URLs**: direct 200 responses, exact canonicals, valid structured data, and filtered-directory noindex.
- Independent final sourcing review passed **212 tests across four suites**, with no remaining concrete blockers in its reviewed scope. The separate UI/marketing review found no remaining correctness issue in its scope.
- Fresh in-app browser checks verified homepage entry, plan creation with an explicit recipe-help request and selected founder stage, stage-specific guide navigation, checklist persistence after reload, and a guide decision saved then intentionally reopened in the same plan. Home and plan have no horizontal overflow at 390×844; the next decision remains above the detailed brief. Home and mobile plan screenshots were refreshed.
- Automated Playwright browser execution was not used; browser evidence comes from the Codex in-app browser. The revised E2E specifications remain available for the normal project runner.

Validation used local fictional workspaces and disabled external providers. No manufacturer message was sent. Remote push confirmation belongs to the release response; these checks do not establish hosted account or provider behavior.

## Evidence

- [Homepage desktop](screenshots/workflow-audit-2026-10-03/home-desktop.jpg)
- [Homepage mobile](screenshots/workflow-audit-2026-10-03/home-mobile.jpg)
- [Product-plan mobile](screenshots/workflow-audit-2026-10-03/product-plan-mobile.jpg)
- [Package review](screenshots/workflow-audit-2026-10-03/package-review.jpg)
- [Separate send confirmation, canceled](screenshots/workflow-audit-2026-10-03/introduction-review.jpg)
- [Wizard mobile](screenshots/workflow-audit-2026-10-03/wizard-mobile.jpg)
- [Fictional QA product-plan PDF](screenshots/workflow-audit-2026-10-03/founder-product-plan.pdf)
