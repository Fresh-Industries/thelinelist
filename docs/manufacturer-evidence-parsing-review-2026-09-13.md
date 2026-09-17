# Manufacturer evidence parsing repair review

## PR #9 review follow-up — September 17, 2026

The v2 export below records `90e100d`. Before merging [PR #9](https://github.com/Fresh-Industries/thelinelist/pull/9), six additional automated-review findings were verified and corrected:

- Allocation capture ends known phrases at their scope, excluding same-sentence budget and internal-note continuations from the shareable production-volume field. Uninterpreted allocation wording is preserved through its clause and stays private until founder review. Storage and manufacturer-packet regressions cover both comma-separated and conjunction-separated continuations.
- Independent predicates such as `We don't use preservatives, hot-fill is available` are separated before applying negation; the hot-fill claim remains supported across import, filtering, and sourcing.
- Explicit `no order minimum` wording does not add an unknown numeric floor to an otherwise supported per-flavor comparison. `No order minimum is published` remains unknown.
- Published `for one SKU` and other single-scope minimums participate in allocation alignment, so a total across several SKUs cannot satisfy them.
- Literal seed products no longer become unknown solely because of the word `seed`. Explicit research wording such as HNO's `claims are not on the live site` remains unknown. Regeneration confirmed no catalog or source-date changes from v2.
- Audit dates require a real UTC calendar date, rejecting values such as `2026-02-31`.

Added 22 unit cases. The first three findings produced 11 failing cases before corrections; the next review regressions produced seven failing cases before corrections. An additional catalog-backed HNO control preserves the existing research boundary. Final validation results and logs use the `pr-` prefix in `artifacts/manufacturer-evidence-parsing-2026-09-17`; earlier logs retain their original historical results.

Final PR validation: **391 unit tests across 23 files passed**, **all 12 targeted browser checks passed together (1.1 minutes)**, standalone typecheck and focused lint passed, catalog freshness passed, and the production build generated all **444 pages**. Catalog regeneration and the dated audit produce exactly the v2 data files. No production data or live supplier contact was used.

## Independent-review corrections — September 17, 2026 (v2 export)

Continued from clean commit `115226299993bd313cb3626e491d694634ba242d` on `fix/manufacturer-evidence-parsing` in `/Users/nikolasmanuel/thelinelist-evidence-parsing`. The original review base remains `8e48f1436996b467331d36f135814d3bd5286935`. The earlier repair was retained. Only task changes are included in the new local commit and the complete v2 patch against the original base. Nothing was pushed, merged, deployed, or sent to a supplier; no production data was accessed.

### Four findings and resulting behavior

1. **Temporal negation:** the shared clause splitter treated every `yet` as a contrast, separating `not` from its predicate. It now preserves `not yet` and negative contractions while still splitting genuine contrasts. Capability interpretation handles trailing `not yet offered` as mismatch and `not yet confirmed` as unknown. Regression cases cover process import tags, directory filters, sourcing evidence, and suppression of small-run labels.
2. **Allocation capture:** intake depended on the same narrow pattern used to interpret allocation. `total`, modifiers such as `production`, and number words beyond six caused the entire suffix to disappear. Capture now retains the complete quantity-context suffix through its sentence boundary independently of interpretation. Interpretation accepts production scopes and count wording without calculating shares; unrecognized allocation terms produce an explicit unknown comparison. The saved value and exact source span survive local storage/reload and manufacturer research. Explicit per-run amounts remain comparable, and existing order/batch/SKU/product/flavor assertions remain intact.
3. **Unbound minimum quantities:** the guard only recognized comma-separated pairs, so the first number in a conjunction could establish support. Each bound constraint now checks all quantities and requires additional quantities to be explicitly related as case-pack data or equivalent yield; otherwise the comparison remains unknown. Existing offer/scope splitting still evaluates separately bound floors. Private-label, pilot, and commercial offers remain separate. Published package-size-specific case yields remain available to the existing size-aware conversion, and container, weight, volume, and missing-pack boundaries remain enforced.
4. **Consolidated Mills:** the stored review narrative correctly limited the option, but generic paragraph parsing joined the test-item statement to a separate general contract-packaging statement. The existing `publicProgram` reviewed-evidence mechanism now supplies the relevant stored-source excerpt as one scoped program. Generated and runtime output both classify it as `private-label` and retain the library-of-proven-recipes/customer-label context. The original review reason is unchanged; no supplier names were added to generic parsing and no custom-recipe minimum was inferred.

| Input / evidence | At reviewed repair `1152262` | Current result |
| --- | --- | --- |
| `We do not yet offer hot-fill.` | Supported | Mismatch; no process/filter support |
| `Hot-fill is not yet offered.` | Supported | Mismatch |
| `Hot-fill is not yet confirmed.` | Supported | Unknown |
| `We do not yet offer small-batch co-packing.` | Small-batch label | No label |
| `Initial order 1000 bottles total across 4 runs` | Saved `1000 bottles`; supported against 500/run | Complete quantity/source span saved; comparison unknown |
| `1000 bottles across 4 production runs` / `across seven runs` | Allocation omitted | Complete allocation saved; comparison unknown |
| `1000 bottles split according to demand` | Allocation omitted | Evidence retained; unresolved allocation is unknown |
| `1000 bottles per production run` vs. `Minimum 500 bottles per production run` | Intake dropped scope | Scope preserved; compatible |
| `1000 bottles` vs. `Minimum 500 bottles and 2000 bottles` | Supported using 500 | Unknown, including when the total exceeds both numbers |
| `1000 bottles per run` vs. `Minimum 500 bottles per run and 2000 bottles per run` | Incompatible | Still incompatible; 3000/run is compatible |
| Consolidated Mills test-item program | Generic small-batch label; restriction omitted | Private-label label with catalog-recipe evidence |

### Catalog and review artifacts

All **345 listings** remain (309 imported, 36 curated), with 41 imported small-run options. Compared with `1152262`, the sole generated record change is Consolidated Mills' `smallRunSignal`: kind, full evidence, program-source links, and separate review date. Its contact-page link remains in the listing but is excluded from the program evidence links. Its source snapshot and `lastVerified` remain **2026-08-26**; **2026-09-17** dates this stored-evidence interpretation, not a new website check or supplier confirmation.

A full-object comparison, excluding only `smallRunSignal`, passed for every imported record. The curated catalog source is byte-identical to `1152262`. Identity, order, names, locations, minimums, raw capabilities, process tags, contacts, and original source dates are unchanged. The import report changes one record fingerprint. The two prior data audits were regenerated through their existing script; the new [incremental audit](../artifacts/manufacturer-evidence-parsing-2026-09-17/data-repair-dry-run.json) compares with `1152262`. The audit accepts an explicit review date so the new run is distinguishable from historical snapshots.

Current logs are in [`artifacts/manufacturer-evidence-parsing-2026-09-17`](../artifacts/manufacturer-evidence-parsing-2026-09-17). September 13 logs below are historical and are not evidence of current validation.

### Current validation

- Added **42 regression cases before fixing implementation**: 27 failed and 15 passed on unchanged `1152262`; all 58 prior cases still passed. The before-fixes log records 27 failures / 73 passes across 100 cases.
- Focused manufacturer-evidence and directory-trust checks: **145 passed**.
- Full unit suite on the final implementation: **369 passed across 23 files**. Existing assertions and positive controls were retained. The first full pass caught a Swift Cider case-pack regression (1 failed / 368 passed); that log is retained, the binding guard was corrected, and all 369 then passed.
- Production build: **passed**, including TypeScript and **444 generated pages**, with database/blob/Vercel credentials removed from the process environment.
- Catalog freshness and full catalog invariants: **passed**.
- Final standalone typecheck and relevant ESLint: **passed** (exit 0).
- **11 distinct targeted browser checks passed**: 10 in the initial 11-test run (1.3 minutes), then the corrected Consolidated Mills test passed on its targeted rerun (8.9 seconds). The new test originally expected the directory label as the profile heading; the profile correctly uses a generic heading with full private-label evidence. Only that new assertion was corrected. Both run logs are retained; trailing whitespace is normalized for the patch. Allocation wording (including total, production-run modifiers, and word counts) survives manual intake, source spans, reload, and research; directory/profile restrictions and existing sourcing/pack-conversion/founder-control checks passed. No application change was needed for the browser assertion.
- **No required checks blocked or omitted.**

Commands run in the repair checkout:

```sh
# Failing proof was run with tests added and implementation still at 1152262.
env -u DATABASE_URL -u DIRECT_URL -u BLOB_READ_WRITE_TOKEN -u BLOB_STORE_ID -u VERCEL_OIDC_TOKEN -u VERCEL npx vitest run tests/unit/manufacturer-evidence-parsing.test.ts
npm run manufacturers:dry-run
npm run manufacturers:import
node scripts/audit-directory-trust.mjs --baseline=8e48f14 --output=artifacts/manufacturer-evidence-parsing-2026-09-13/data-repair-dry-run.json
node scripts/audit-directory-trust.mjs --output=artifacts/directory-trust-2026-09-13/data-repair-dry-run.json
node scripts/audit-directory-trust.mjs --baseline=1152262 --reviewed-at=2026-09-17 --output=artifacts/manufacturer-evidence-parsing-2026-09-17/data-repair-dry-run.json
npm run manufacturers:check
env -u DATABASE_URL -u DIRECT_URL -u BLOB_READ_WRITE_TOKEN -u BLOB_STORE_ID -u VERCEL_OIDC_TOKEN -u VERCEL npm run test:unit
npm run typecheck
npx eslint lib/directory/evidence-text.mjs lib/directory/capability-evidence.mjs lib/sourcing/intake-extractor.ts lib/sourcing/matching.ts lib/sourcing/minimum-scope.ts scripts/audit-directory-trust.mjs tests/unit/manufacturer-evidence-parsing.test.ts tests/e2e/directory-trust.spec.ts tests/e2e/sourcing.spec.ts
env -u DATABASE_URL -u DIRECT_URL -u BLOB_READ_WRITE_TOKEN -u BLOB_STORE_ID -u VERCEL_OIDC_TOKEN -u VERCEL npm run build
env -u DATABASE_URL -u DIRECT_URL -u BLOB_READ_WRITE_TOKEN -u BLOB_STORE_ID -u VERCEL_OIDC_TOKEN -u VERCEL PLAYWRIGHT_PORT=3037 npx playwright test tests/e2e/directory-trust.spec.ts tests/e2e/sourcing.spec.ts --grep 'directory separates|hot-sauce discovery|small-run program labels|Consolidated Mills displays|manual intake keeps run allocation|manual hot-sauce intake|realistic acidified hot-sauce|competitive beverage sourcing' --workers=1 --timeout=120000
# Rerun only the corrected new profile assertion; the other ten checks passed.
env -u DATABASE_URL -u DIRECT_URL -u BLOB_READ_WRITE_TOKEN -u BLOB_STORE_ID -u VERCEL_OIDC_TOKEN -u VERCEL PLAYWRIGHT_PORT=3037 npx playwright test tests/e2e/directory-trust.spec.ts --grep 'Consolidated Mills displays' --workers=1 --timeout=120000
```

### Remaining limitations and review boundary

This remains a conservative lexical interpreter, not a general natural-language parser. Unknown allocation, unresolved applicable minimums, unsupported unit conversions, and conflicting source claims need clarification. Multiple founder quantities are retained when part of captured quantity context but are not automatically aligned or divided. The broader capture may retain adjacent same-sentence context; it must not turn uninterpreted wording into positive fit. Existing first-run versus later-forecast controls still pass. Published case-pack and yield notes do not establish a recipe, process, or package capability.

No public pages were re-fetched and no supplier facts were newly verified in this follow-up. Browser checks use the local development server and local guest storage; production build validation is separate. The full browser suite, production browser, production persistence, and live send were not run. No required check is intentionally omitted.

The deliverable is `/Users/nikolasmanuel/thelinelist-matching-review-v2.patch`, exported with `git diff --binary 8e48f1436996b467331d36f135814d3bd5286935 HEAD` after committing all task code, tests, data, this report, and the new artifacts. It includes the earlier repair plus these corrections.

---

## Initial repair — September 13, 2026 (historical)

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
