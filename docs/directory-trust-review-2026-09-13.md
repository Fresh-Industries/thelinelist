# Directory trust and manufacturer matching review — September 13, 2026

Implemented locally on `fix/directory-trust-matching`, based on `dde5d4d`. Awaiting code/data review and a separately authorized release. Nothing deployed, merged, sent, or written to production. The original `main` worktree and its README/ProductMockup edits were preserved.

## Confirmed problems and fixes

| Problem verified in the checked-out code/data | Root cause | Local change |
| --- | --- | --- |
| Unknown, qualified, very large, or unrelated minimums appeared as small-run signals | The importer accepted almost any nonblank MOQ; the runtime also treated a numeric minimum as a small-run signal | Require an explicit sourced small-batch/pilot production statement. Display it as an option needing project/minimum confirmation. MOQ disclosure remains a separate filter. |
| Negative research notes became positive labels | The importer extracted `first-run` inside statements such as “not a first-run kitchen”; internal flags could also create public capability claims | Reject negated, speculative and flag-only support; retain original notes and source links in the audit. |
| Private-label and pilot terms could support custom commercial requests | Volume comparison scanned the combined MOQ string without selecting an offer | Select the requested offer first; unspecified requests use custom-production terms. Distinct or unclear offers remain unknown. Preserve dollar floors as prices, not unit counts. |
| Similar-looking numbers produced false volume fit | Bottle/jar/can counts shared a unit family; SKU/flavor scope was ignored; ambiguous ounces were treated as fluid ounces | Require compatible containers/units, explicit fluid-volume evidence for gallon conversions, and matching SKU/flavor/run/order scope. A per-SKU amount is not treated as a per-flavor allocation. Preserve quantity ranges and pilot/private-label wording from intake. |
| Known incompatibilities could rank ahead of possible fits | Sorting could reward supported fields before considering known packaging, volume, process or storage conflicts | Demote those hard conflicts while retaining field-level supported, unknown, and conflicting evidence. No user-facing fit score was added. |
| Hot-sauce results differed by surface | Singular/plural/hyphen variants had different mappings, and profile/category arrays missed reviewed product overrides | Share conservative normalization across importer, directory, profiles and sourcing. Heritage's existing sourced hot-sauce claim now reaches the directory; hot-fill alone, generic sauce, and dry hot-sauce mixes do not establish exact hot-sauce capability. |
| Four process filters contradicted recorded evidence | Positive substring checks included negated/rejected claims; baseline array merging could restore the tag | Remove Croix Valley cold-fill, HNO acidified, Lupo hot-fill, and Pack'n Fresh acidified. Matching also distinguishes explicit process/storage exclusions from unknowns. |

The legacy `smallMoq` URL remains supported and uses the same qualified-option rules as `smallRun`. The wizard copy now describes published options rather than promising a small MOQ. The legacy data property `publishedSmallMoq` is retained for compatibility; it does not establish suitability. Raw published minimums are retained, including per-SKU/flavor/order terms. Category summary ranges only combine compatible units and scope.

## What the “98 imported signals” actually are

The inspected baseline contains **98 generated small-run signals**, spread across batches 1–26. The repository's import README identifies the CSV files as snapshots of cleaned Google Drive `line/plants/` sheets. This review uses the checked-out snapshots; it does not claim a new live Drive import.

- 50 CSV files, 648 input rows, 646 parsed rows.
- 340 admissible source rows, with 31 duplicates already excluded, producing 309 imported manufacturers.
- 36 curated manufacturers plus 309 imported = **345 total listings**.
- Two invalid Batch 23 rows (Indian Summer Cooperative and InHarvest) remain excluded.
- All 98 prior signal records were audited against their stored source claims and extraction rules. **66 labels are removed; 32 remain as scoped public options.** Fourteen removed labels came from negated/comparative first-run statements.
- Six additional records contain explicit options missed before: Colorado Copacking Company, Encore Cider, Mad Will's, Pacific Choice Brands, Quality Ingredients Corporation, and Salt Road Food Hub. Five are pilot options and Pacific Choice is a private-label option.
- Proposed imported total: **38 scoped options**, with all 345 listings retained. This is not a count of confirmed project fits.
- The generated-file comparison contains 134 field changes across 107 imported suppliers, including label wording/kind, MOQ-disclosure flags and the four process corrections. The separate public-review overlay contains contact and minimum corrections.

The import report's `generatedAt` value is derived from the latest input review date (August 26), not the time this audit ran. Existing source dates remain intact. The September 13 overlay dates only the fields actually reviewed and separately records contact-review limitations; it does not mark every field newly verified.

## Priority official-source review

All entries below are public-source checks, **not supplier confirmations or discovery replies**. Company inboxes are not assigned to named people.

| Supplier | Result and outstanding question | Official source |
| --- | --- | --- |
| Create-A-Pack | Its actual HTML form explicitly labels 50,000 as the minimum for glass bottles, plastic bottles or pouches. The old snapshot only retained the lower inquiry band. Preserve the sourced minimum; remove its small-run label. Phone/form available; email unknown. | [Contact form](https://www.capfoodinc.com/contact/) |
| Creative Foodworks | Reconfirmed 1,000 gallons with quarterly orders. Added its public company inbox and main phone to the review overlay. No separate pilot MOQ established. | [Hot sauces](https://creativefw.com/products/hot-sauces) |
| Palace Foods | The current record already has the footer's Yahoo company inbox and phone; the older audit's stale inbox is already gone. Its 500-jar example is not an explicit guaranteed MOQ. | [Official site](https://palacefoodsinc.com/) |
| Byler Canning | The current sales inbox appears in official HTML; the text extractor omits it. Its 20-case minimum applies per private-label catalog product. The $750 unlabeled-order floor and label-design fee remain separate from custom production. Phone was not independently rechecked. | [Private label](https://bylercanningco.com/private-label/), [contact](https://bylercanningco.com/contact-us/) |
| The Spice Guy / Sauce Pack | Reconfirmed 50 gallons **per flavor**. Startup assistance does not prove a total founder quantity meets that scope. Official form available; no email/phone found on the reviewed division page. | [FAQ](https://saucecopackers.com/faq), [official division](https://saucecopackers.com/) |
| Heritage Family Specialty Foods | Product page explicitly lists hot sauce. Contact-page retrieval failed; existing phone remains an older public claim and email remains unknown. | [Capabilities](https://heritagefamilyfoods.com/capabilities/) |
| Croix Valley | Official co-packing page excludes cold-fill. Company inbox reconfirmed. Contact page header and body list different phone numbers (715-800-6328 / 612-756-4985); preferred production number needs clarification. | [Co-packing](https://www.croixvalleyfoods.com/pages/copacking), [contact](https://www.croixvalleyfoods.com/pages/contact-us) |
| HNO Blending Solutions | Snapshot rejects old acidified-canning seed claims. Official contact retrieval failed; retain old contact claims with a verification note. | [Contact URL attempted](https://www.hnoblendingsolutions.com/Contact) |
| Lupo's Bottling | Snapshot explicitly excludes cook/hot-fill. The retail site's toll-free number does not reconfirm the directory's bottling-specific phone/email; do not substitute it or infer a named contact. | [Official retail site](https://www.spiedies.com/) |
| Pack'n Fresh | Official company inbox/toll-free number reconfirmed. Packaging, mixing and fulfillment do not establish acidified production; remove the rejected seed mapping. | [Contact](https://packnfresh.com/contact/) |

Unresolved minimums include Assemblies Unlimited and Earth Ranch's differently qualified public values. Absolutely World Class publishes a 150-gallon minimum and an approximate 1,100-bottle yield for 16 oz containers; keep both rather than replacing either with inferred arithmetic ([official source](https://www.absolutelyworldclass.com/co-packing/)). Suppliers must clarify applicable offer, line, SKU/flavor scope, packaging, losses, cadence and current minimums. Ambiguous free text is intentionally returned as needing clarification; this change does not replace the catalog with a complete structured offer database.

## Reviewable dry run

[Machine-readable audit](../artifacts/directory-trust-2026-09-13/data-repair-dry-run.json) includes all 98 source rows, file/row references, original/proposed signals, raw minimums/capabilities, source URLs/dates, concerns, generated field changes, priority contact reviews, excluded duplicates and invalid rows. [Public review overlay](../data/manufacturer-imports/trust-reviews-2026-09-13.json) contains the separately reviewable factual corrections and evidence.

Reproduce without production access:

```sh
npm run manufacturers:dry-run
npm run manufacturers:check
node scripts/audit-directory-trust.mjs --baseline=dde5d4d --output=artifacts/directory-trust-2026-09-13/data-repair-dry-run.json
```

`manufacturers:import` was used only to regenerate local TypeScript/JSON files after inspecting the dry run. The audit script writes only its local report and has no service/database client. Review this branch and artifact before any separately authorized release. No source CSV rows were deleted or merged in this repair.

## Before / after

| Request / evidence | Before | After |
| --- | --- | --- |
| 1,000 bottles total across four flavors; supplier minimum 500 bottles per flavor | Total count could support volume fit | Needs per-flavor quantity clarification; 1,000 per flavor supports the volume criterion; 100 bottles total is below the minimum |
| Custom 1,000-bottle run; pilot floor 100, commercial floor 5,000 | First numeric floor could make the offer appear suitable | Known commercial volume incompatibility; pilot terms stay separate |
| Unknown MOQ with an internal small-batch research flag | Public small-run label could be generated | No confirmed volume fit; only an explicit sourced production option may receive a qualified option label |
| Bottled hot sauce; supplier only publishes hot-fill generic sauces | Category aliases/broad mapping could blur exact capability | Broader sauce capability remains qualified; hot-fill does not establish an exact hot-sauce product claim |
| Founder wants 5 oz woozy bottles | Ambiguous ounces could be converted to gallons; extra supported fields could offset a known 8–32 oz package mismatch | Volume stays unknown until fluid units are confirmed; the known package mismatch ranks below possible fits |

## Validation and release status

- Implemented locally: code, generated catalog, public review overlay and complete dry-run audit.
- Tested: 269 unit tests across 22 files pass; 11 targeted browser checks pass and cover directory discovery/navigation/mobile, qualified minimum/small-run filters, Heritage/Croix profiles, manual hot-sauce intake, acidified hot-sauce sourcing, and beverage sourcing with founder controls.
- TypeScript, generated-catalog freshness, and lint pass. Lint reports nine pre-existing warnings outside this change. React Doctor reports 91/100 with three existing component-complexity warnings and no errors.
- A pre-existing send-route test fixture could create its draft one millisecond before the research it purported to follow. Its fixture now uses the research timestamp; no delivery behavior changed and email delivery remained mocked.
- Browser setup: copied the existing installed dependencies into the isolated worktree to avoid an external symlink incompatibility. Default Turbopack runs the flows. Cold route compilation initially exceeded the 30-second test limit; affected flows passed with a 120-second test allowance. No dependency upgrade or runtime configuration change.
- Production build: passed with production database/blob environment variables removed. All 345 manufacturer profiles were generated.
- Awaiting review: branch and data repair artifact. No PR has been opened.
- Deployed: **no**. Production database/data access, outreach, merge and deployment: **none**.
