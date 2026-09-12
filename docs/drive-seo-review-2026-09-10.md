# Drive and SEO improvement pass: 10 September 2026

Implemented locally after reviewing the connected `line` folder, its manufacturer batches, recent growth/content notes, and the Search Console screenshot supplied in this session. Existing edits to the root README and ProductMockup were preserved. No deployment, production database access, or outreach was performed.

## Manufacturer reconciliation

- Paginated through all 112 documents/spreadsheets in `line/plants`; no batch 27 or later was present. The September 7 plant digest also reports no new research rows since August 31. Older research-master and site-ready lists are not substitutes for the cleaned ingestion batches.
- Restored **Trillium Foods, Brundidge, Alabama**, from the existing verified Batch 7 source. The importer previously merged it into Lancaster because both use `trilliumfoods.com`.
- Rechecked the official [facility descriptions](https://trilliumfoods.com/about-us/) and [contact locations](https://trilliumfoods.com/contact-us/): Brundidge and Lancaster are separately identified plants. The source row now carries `distinct_facility_confirmed` with the review explanation. A different city alone does not disable deduplication.
- The catalog moves from **344 to 345 listings**, with **320 indexable manufacturer profiles**. No existing profile or URL was removed. LISTABLE and ownership-review profiles retain their indexing restrictions.
- The added record retains its source's unknown MOQ, certifications, and packaging fields. The facility-identity recheck is recorded separately from the original full-record review date; other records were not marked freshly verified.
- Removed **41 unsupported small-run claims**. The old `/first_run/` flag fallback matched negative and speculative research notes such as `not_first_run`, `first_run_unknown`, and `first_run_possible`. Published capability language and minimums still qualify independently. Generated imported-record small-run signals fell from 139 to 98.
- Other than the one new plant, the generated manufacturer diff changes only `smallRunSignal` on those 41 records. All other existing record fields are unchanged.
- Two malformed historical Batch 23 rows remain quarantined: Indian Summer Cooperative and InHarvest. Their validation errors predate this pass and are unchanged. Vermont Bottling / Green Mountain Co-Pack remains NEEDS_REVIEW; the review did not establish new official evidence supporting admission.

## Recent files incorporated

| Drive source | Result |
| --- | --- |
| [September 7 plant digest](https://docs.google.com/document/d/1mZGFT1QU5Rm3B-TqHBVC1-kbUHHY-q0hqF-YcUnyAZI/edit) | Checked the no-new-batch finding against the current folder and repository. |
| [September 7 growth review](https://docs.google.com/document/d/1Nylf17IrphqY4dejTxeLGwy61J6TSzu1YThHgbGLL_U/edit) | Identified the unpublished production guides and existing research boundaries. Historical counts were not copied into new public prose. |
| [September 10 bakery draft](https://docs.google.com/document/d/1t0U-3E8fDWPcBw2AZwVtjnGV_v7uai50A0cSuLCzYKo/edit) | Added `/guides/bakery-manufacturing`. |
| [September 3 frozen-food draft](https://docs.google.com/document/d/1VlI0484mcW0VCXPzX9FC3IYfbH-jX99fM0m1UC7r1BI/edit) | Added `/guides/frozen-food-cold-chain`. |
| [September 3 dry-blending draft](https://docs.google.com/document/d/1o-84Eh0UJXu4RC84CjpurEDOQPulangNcWkxbouETzA/edit) | Added `/guides/dry-blending`. |
| [August 31 directory packet](https://docs.google.com/document/d/1KoIGa9UthCx3uNB3zpXGuO_91zkC5saVgW-2CyuTHwE/edit) and [site audit](https://docs.google.com/document/d/1K5XpF8aVhSfpWhoo5JDAlHaQ2K0imfez6_D86z0g3xI/edit) | Verified the Trillium import gap and added current coverage statements to thin categories. Broader workflow proposals were evaluated against current UX rather than treated as settled requirements. |
| August 31 category join-copy drafts | Guides and category hubs now disclose the current number of matches when there are five or fewer, computed from the canonical directory. No separate thin blog posts or hardcoded counts. |
| September 2 outreach notes and September 4 monetization review | Reviewed for context. Draft messages, channel joins, paid offers, and contact actions were not published or sent. |

The new guides use the existing guide structure, artwork, checklists, decision tables, and first-run diagram. They link to the appropriate manufacturer categories, and those categories link back to the guides. They have specific titles, descriptions, canonicals, Article metadata, FAQs, and sitemap entries.

The drafts were adapted rather than copied verbatim. Omitted stale directory totals, named-plant capability claims that would duplicate canonical profiles, and blanket frozen-storage safety promises. Food-safety statements were checked against the linked FDA and USDA sources. These pages prepare a manufacturer conversation; they do not claim product validation.

## SEO findings and changes

The supplied screenshot reports **268 impressions, 0 clicks, 0% CTR, and average position 77.8** with the three-month range selected. The visible chart runs August 21 through September 8. This is a supplied snapshot, not a live Search Console API export.

The leading visible queries include bottling manufacturers (13 impressions), ingredient systems manufacturer (12), ready-to-use food products manufacturer (11), foodservice-ready products manufacturer (10), packaged food company (10), packaged food manufacturers (8), and canned food manufacturers (6). Sauce manufacturer and food-and-beverage manufacturers near me each show 3 impressions.

Those figures show some search visibility but do not establish why individual pages rank where they do. Without the page/query breakdown or indexing report, they do not prove an indexing fault, a title problem, or demand for a new catch-all page. Do not treat these impression counts as search-volume estimates.

Changes made:

1. Added three substantive, source-linked guides where the existing directory had relevant manufacturers but no matching production guide.
2. Connected guides and product hubs through normal crawlable internal links.
3. Used each guide's actual `dateModified` in the sitemap, replacing the shared directory-review date. This follows [Google's guidance on accurate lastmod dates](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
4. Added dynamic shortlist-size context before sending readers into sparse category results. Current counts remain consistent with actual directory matches.
5. Preserved canonical-host URLs, pagination links, filtered-page noindex, and evidence-based manufacturer indexing. No empty bottling, packaged-food, or foodservice catch-all pages were created.

Next measurement: after publication and recrawling, compare page/query impressions, clicks, CTR, and position for the new guides and linked hubs over equivalent periods. Review Search Console's indexing exclusions and sitemap processing separately. Google notes that changes can take weeks or longer to show an effect; no ranking or traffic improvement is claimed here. [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)

Remaining editorial/data work: verify the malformed Batch 23 rows against the original sheet, review category-primary evidence without guessing from secondary chips, and investigate named stale sources before changing their public status. The larger first-run-default redesign in older notes was not folded into this content and import pass.

## Verification

- Manufacturer dry run, apply, and generated-output freshness check passed; reruns are idempotent.
- 51 focused directory, guide, and SEO unit tests passed.
- 13 production-build browser SEO tests passed, including new guide metadata and guide-to-shortlist navigation.
- Production build passed and generated 440 static pages.
- TypeScript check passed.
- All 398 sitemap URLs returned direct 200 responses with exact canonicals, valid JSON-LD, and canonical slash formatting. Filtered-directory noindex and public caching were checked.
- Changed-file lint passed. Full lint returned zero errors and 717 pre-existing warnings, predominantly in the separate design prototype plus the sourcing store.
- React Doctor reported 97/100 and no issues in its changed-file scan.
- Additional browser checks covered the three guides, water hub, and added Trillium profile at 390px and 1440px: no horizontal overflow, broken images, or browser exceptions. All 16 unique internal links from the new guides returned direct 200 responses. Representative mobile and desktop screenshots were visually inspected; the dry-blending artwork description was corrected to match the visible props.
