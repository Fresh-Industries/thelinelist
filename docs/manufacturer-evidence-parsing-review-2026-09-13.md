# Manufacturer evidence parsing follow-up — September 13, 2026

Implemented locally on `fix/manufacturer-evidence-parsing`, based on current main `8e48f1436996b467331d36f135814d3bd5286935`, in `/Users/nikolasmanuel/thelinelist-evidence-parsing`. Main and its README/ProductMockup work remain unchanged. This follow-up is awaiting review; it has not been pushed, merged, or deployed. No production database, production storage, or outreach delivery was used.

## Confirmed root causes and implementation

1. **Allocation was lost during intake.** The quantity extractor only retained allocations across SKUs, products and flavors. Run/order/batch suffixes were dropped before saving. The extractor and matcher now share scope vocabulary, retain the complete allocation and source span, and recognize each/per/every wording. Tests create a workspace, save it to local storage, reload it and evaluate a manufacturer for all six bases. Totals are never divided equally.
2. **Minimum selection operated on whole sentences and then the first number.** A sentence mentioning commercial and pilot production could be assigned to pilot while retaining the commercial quantity. The existence of any named offer also discarded unqualified commercial floors. Minimums are now bound to individual offer clauses and normalized scopes before comparison. All applicable constraints must be satisfied; a known failing applicable constraint disproves fit, and unaligned/ambiguous constraints remain unknown. Conjoined scope-specific floors are retained. Distinct containers, weight, volume, cases and currency retain their existing comparison boundaries. Supported case-pack conversions still require published pack information.
3. **Negation only looked before a capability.** It missed trailing denials and allowed unrelated negative clauses to affect positive claims. A shared clause parser separates contrast/new predicates while preserving lists with a shared predicate. Capability polarity handles preceding and trailing denial, unknown research language, and contradictory public claims. Import process tags, directory filtering, sourcing evidence and ranking use the same interpretation. The candidate eligibility check also recognizes explicit contract packaging without relying on an unconfirmed MOQ as its only capability evidence.
4. **Scope matching only recognized a narrow `per` spelling.** `each flavor`, `for each SKU`, `per-SKU`, `every product`, and equivalent run/order/batch wording now normalize consistently. SKU, flavor, product, run, batch and order remain distinct; a differently scoped amount cannot prove or disprove an unrelated minimum.
5. **Small-run extraction discarded program context.** Own-brand batch descriptions and custom-label programs became generic small-batch options. Options now require external-program evidence, retain own-formula/private-label restrictions across sentences, and reject unbound own-product or equipment-only statements. Reviewed program evidence is a separate source input consumed by both catalog generation and runtime filtering; it does not overwrite older source snapshots or imply supplier confirmation.

The existing generic small-batch positive fixture now explicitly names customer co-packing. Its positive assertion remains, and a negative assertion for the former unqualified text was added. Existing tests were not disabled or relaxed.

## Before and after

| Reproduction | Before on main | After |
| --- | --- | --- |
| Intake: `Initial order 1,000 bottles across 4 runs`; supplier: `Minimum 500 bottles per run` | Saved `1,000 bottles`; supported | Saves full allocation; needs quantity per run clarified |
| `Pilot 1000 bottles`; `Commercial minimum 100 bottles, pilot minimum 5000 bottles` | Supported using 100 | Known mismatch against the 5,000-bottle pilot floor; 6,000-bottle pilot control is supported |
| Commercial `100 bottles`; `Minimum 500 bottles; pilot minimum 100 bottles` | General minimum discarded | Known mismatch against 500; commercial 1,000-bottle control is supported |
| `Hot-fill is not offered.` | Supported | Explicit conflict; no hot-fill import/filter support |
| `We do not offer cold-fill, but hot-fill is available.` | Hot-fill conflict | Hot-fill supported; unrelated cold-fill denial stays separate |
| `1000 bottles across 4 flavors`; `Minimum 500 bottles each flavor` | Supported | Unknown allocation; explicitly stating 1,000 per flavor is supported |
| Food for Thought | External small-batch label quoted its 240-jar own-brand story | Uses the actual client co-pack program and separately published 1,200-unit-per-product minimum |
| Blackberry Patch | Generic small-batch label | Private-label option limited to its own formulas/products with custom labels; preserves the 10-case offer minimum |

## Supplier review and proposed local data changes

[The generated dry run](../artifacts/manufacturer-evidence-parsing-2026-09-13/data-repair-dry-run.json) compares against `8e48f14`, records every one of the 38 previous option dispositions, and lists each changed generated field. The [original 98-signal audit](../artifacts/directory-trust-2026-09-13/data-repair-dry-run.json) was regenerated with the follow-up dispositions too.

- All **345 listings** remain: 309 imported and 36 curated. The import still reads 648 rows from 50 source files, excluding the same 31 duplicates and two invalid rows.
- **37 of the prior 38 options remain**, with scoped evidence. Boulder Sausage's own-brand batch description does not establish small-batch terms for its separate external programs; its option is withheld pending clarification. Its listing remains searchable.
- **Four recovered external programs** have current official-source evidence: Drayhorse pilot programs, Forchetta custom small-batch pasta, Nashville Kitchen & Cannery client small/large batch production, and Stittsworth's pre-commercial pilot workflow. There are **41 imported options** after this repair; none is a confirmed quantity fit.
- **34 generated `smallRunSignal` fields change.** The dry run shows no changes to MOQ text, capability text, contacts, processing tags, category mappings, listing identities or original source dates. Existing source URLs and raw evidence remain available.
- The review input has **42 individual dispositions**: 38 previous options plus four recovered options. **14 program reviews used live official pages**; 28 reviewed the stored source claims. New program dates are separate from original profile/contact dates.
- Private-label restrictions also remain explicit for Porky's, Ron's Home Style Foods and To Go Packs. Quality Ingredients and Pacific Choice retain scoped pilot-development evidence; a pilot program is not a commercial run MOQ.

Priority source support: [Food for Thought co-pack program](https://foodforthought.net/pages/build-your-brand-with-us), [its own-brand story](https://foodforthought.net/pages/our-story), [Blackberry Patch wholesale/custom labels](https://www.blackberrypatch.com/pages/wholesale), [Boulder foodservice](https://bouldersausage.com/food-service/), [Ron's offer sections](https://ronsfoods.com/co-packing/), [QIC customer pilot services](https://www.qic.us/snapshot-today), and [Pacific Choice R&D](https://pcbrands.com/). The review input contains the remaining URLs and per-record reasoning.

Regenerate through the scripts; do not edit generated artifacts:

```sh
npm run manufacturers:dry-run
npm run manufacturers:import
node scripts/audit-directory-trust.mjs --baseline=8e48f14 --output=artifacts/manufacturer-evidence-parsing-2026-09-13/data-repair-dry-run.json
node scripts/audit-directory-trust.mjs --output=artifacts/directory-trust-2026-09-13/data-repair-dry-run.json
npm run manufacturers:check
```

`manufacturers:import` writes repository catalog/report files only. This is a reviewable local proposal, not a production data operation.

## Validation

- **Regression proof:** all 58 new regression cases run against unchanged main using the baseline configuration: **43 fail, 15 pass**. The same 58 cases all pass on this branch. The configuration verifies the exact clean baseline SHA and uses the new program-review JSON only as test expectation data.
- **Full unit suite:** 327 tests across 23 files passed, including allocation → saved field → matching; offer/scope/container/negation controls; taxonomy boundaries; program/filter/catalog consistency; and mocked manufacturer delivery.
- **TypeScript and focused ESLint:** passed.
- **Catalog freshness:** passed; 309 imported and 345 total. The audit script also asserts every original imported slug remains.
- **Production build:** passed, including all 444 generated pages, with database/blob/Vercel credentials removed from the process environment.
- **Targeted local browser checks: all seven passed together (50.7 seconds).** Allocation survives manual intake, reload and manufacturer research; Food for Thought/Blackberry program copy and source citations; private-label/Boulder filter behavior; disclosed MOQ versus small-run filtering; hot-sauce discovery/profile evidence; manual and acidified hot-sauce sourcing; competitive beverage ranking/case-pack evidence and founder controls. Validation logs are alongside the dry run.
- Initial new browser assertions incorrectly expected direct external citation links and the WebMCP response shape in the raw workspace API; corrected to the existing contracts. One beverage run exceeded its existing 5-second navigation assertion; the unchanged assertion passed on rerun. Matching assertions passed throughout. No production browser or live send check was performed.

Commands used:

```sh
npm run test:unit
npm run typecheck
npm run manufacturers:check
env -u DATABASE_URL -u DIRECT_URL -u BLOB_READ_WRITE_TOKEN -u BLOB_STORE_ID -u VERCEL_OIDC_TOKEN -u VERCEL npm run build
env -u DATABASE_URL -u DIRECT_URL -u BLOB_READ_WRITE_TOKEN -u BLOB_STORE_ID -u VERCEL_OIDC_TOKEN -u VERCEL PLAYWRIGHT_PORT=3032 npx playwright test tests/e2e/directory-trust.spec.ts tests/e2e/sourcing.spec.ts --grep 'directory separates|hot-sauce discovery|small-run program labels|manual intake keeps run allocation|manual hot-sauce intake|realistic acidified hot-sauce|competitive beverage sourcing' --workers=1 --timeout=120000
# Expected failure: point this at a clean, dependency-equipped 8e48f14 checkout.
EVIDENCE_BASELINE_ROOT=/path/to/baseline npx vitest run --config tests/baselines/manufacturer-evidence.config.mts
```

## Remaining questions and release boundary

Boulder needs external-program batch terms confirmed. Unspecified allocation, multiple unbound quantities, conflicting public values, unsupported unit conversions and ambiguous offer language remain unknown. This is conservative interpretation of supported wording, not a general natural-language guarantee. Product-category equivalence does not establish a processing, packaging or storage fit; those requirements remain independently evaluated.

No supplier replies were ingested. The 14 live checks verify public program claims, not every supplier fact or contact; prior unresolved contact questions remain in the original audit. The pre-existing hot-sauce-powder intake gap mentioned in the manager review is outside these five reproductions and remains a follow-up taxonomy question.

Review the diff with `git diff 8e48f14..fix/manufacturer-evidence-parsing`. The Notion handoff includes the committed revision and final validation result. This branch is implemented and tested, awaiting review, and not deployed.
