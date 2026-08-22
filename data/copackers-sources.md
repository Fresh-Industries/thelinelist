# Co-packer starter database — source log

Fetched: **2026-08-21** (America/Chicago). Public sources only. No invented plants or emails. FDA Food Facility Registration is not public and was not used. CoPack Connect was not scraped behind a login.

## Output

- File: `/workspace/niche-research/copackers.csv`
- Unique plants after name+state dedupe: **771**
- Have phone: **713** (92%)
- Have email: **590** (77%)
- Have website: **611** (79%)
- Have process tag: **477** (62%)
- Have MOQ: **232** (30%)
- By state: OR **107**, WA **74**, IL **22**, WI **15**, MI **16**, CA **69**

Columns: name, city, state, website, phone, email, source_url, source_name, product_types_raw, processes_inferred, moq, certs, notes. Blank = unknown (never guessed). `processes_inferred` only from words the source actually used (HPP, retort, hot-fill, acidified, bakery, dairy, beverage, canning, stick-pack, frozen, snacks, sauces, dry-blend, meat, etc.).

Historical starter extract (not overwritten): `/workspace/niche-research/copackers-starter.csv` — **318** plants; phone 278 (87%); email 179 (56%); website 188 (59%); process 195 (61%); MOQ 60 (19%).


## Sources that yielded plant rows

| Source | URL | Date fetched | Rows extracted (pre-dedupe) | Quality notes |
|---|---|---|---:|---|
| Penn State Extension co-packer list | https://extension.psu.edu/list-of-co-packers-in-pennsylvania-and-beyond/ | 2026-08-21 | 37 | **HTML dump.** Best Mid-Atlantic roster. Addresses, phones, emails in the clear, product types, some certs/MOQ. Updated **Dec 16 2025**. Includes regional NJ/MD/OH/NY/CT/CO plants. 'Website' is a labeled hyperlink. One listing (Snack Foods Brokerage Firm) excluded as a finder, not a plant. |
| Minnesota Dept. of Agriculture co-packer directory | https://www.mda.state.mn.us/minnesota-co-packer-directory | 2026-08-21 | 61 | **Searchable HTML.** Best-in-class: location table + detailed listings with capacity, MOQ, emails, certs. Page says reviewed July 2018 / updated 2022; detailed listings were live on fetch. Includes several WI plants. Few websites. |
| Texas A&M AgriLife co-packer list | https://aggie-horticulture.tamu.edu/food-technology/food-processing-entrepreneurs/getting-started/co-packers-in-texas/ | 2026-08-21 | 30 | **HTML table.** Name, address, city, phone, some emails/websites. Footnote: most pack acidified foods; Eilenberger's bakery only; Son Beverage cold-fill beverages only. Last table update not dated. |
| Cornell Food Venture Center kitchens/co-packers | https://cals.cornell.edu/cornell-agritech/partners-institutes/cornell-food-venture-center/kitchensco-packers | 2026-08-21 | 122 | **Large HTML dump**, state dropdown. Mix of co-packers and shared-use kitchens. Parser dropped kitchen-only blocks (no co-pack language) and nav/footer junk. Emails often obfuscated as `name [at] domain`; decoded when unambiguous. NY 'small co-packers' section is the strongest. |
| UC Food Safety / CLFP California PDF | https://ucfoodsafety.ucdavis.edu/sites/g/files/dgvnsk7366/files/inline-files/240926.pdf | 2026-08-21 | 32 | **Static PDF** attributed to Rob Neenan, CLFP, **2015**, still posted. Addresses, phones, many emails in the clear, product notes, a few MOQs. Stale — some plants may have closed or moved. |
| UC Food Quality co-packers page | https://ucfoodquality.ucdavis.edu/food-industry-contacts/co-packers | 2026-08-21 | 28 | **HTML list** of name + website + state. Last update **March 16 2026**. Little city/phone/email. Used mainly to add websites / extra CA names not in the 2015 PDF. |
| NC State Extension Other Services & Supplies | https://foodbusiness.ces.ncsu.edu/tools-for-success/other-services-supplies/ | 2026-08-21 | 14 | **HTML dump.** Copackers subsection: name, city, phone, some emails. Page updated **Aug 17 2026**. Mix of NC plants and out-of-state referrals. Product types mostly missing. |
| UF/IFAS Finding and Using a Co-packer (FS380) | https://edis.ifas.ufl.edu/publication/FS380 | 2026-08-21 | 37 | **PDF.** Florida & Georgia co-packer list with address, phone, many emails/websites, processing notes. Two-column layout. Good quality for FL/GA. |
| Michigan Food Processors Association processors | https://www.michfpa.org/processors/ | 2026-08-21 | 10 | **HTML dump. Processors, not a co-packer directory.** Included because MI has no official extension co-packer list; flagged in notes. Addresses, some phones/emails, product types. Contract tanking / co-pack liaison noted where stated. |
| comanufacturers.com public preview | https://www.comanufacturers.com/collections/all-manufacturers | 2026-08-21 | 2 | Public preview shows 3 of 6,588 manufacturers; contacts locked in app. Only two US food-ish preview names kept (third was Ontario). **Not useful as a roster without an account.** |
| Oregon ODA PNW Co-packer Locator | https://www.oregon.gov/odaroadmap/operations/pages/pnw-co-packer-locator.aspx | 2026-08-21 | 172 | **Public SharePoint REST** the in-page widget calls (`Co-Packers` + `Co-Packer Low Minimums` lists); no login. 172 extracted (OR 99 / WA 72 / VA 1 Fife mistag — locator state field reads VA; city Fife is in WA). Field presence of 172: city 171, product/activity 170, email 167, phone 162, website 145, MOQ 123, certs 106. Dedupe vs starter: **172 new** / **0 overlap** / **0 enrichments** / **0** starter-field conflicts (Ventura Foods Salem OR kept as a separate site from starter Ventura Foods CA). Files: `additions-pnw.csv` (verbatim), `additions-pnw-new.csv`, `enrichments-pnw.csv`, `pnw-conflicts.md`. Starter not merged. |

## Sources checked that did **not** yield plant rows

| Source | URL | Date fetched | Why no rows |
|---|---|---|---|
| Oregon ODA PNW Co-packer Locator | https://www.oregon.gov/odaroadmap/operations/pages/pnw-co-packer-locator.aspx | 2026-08-21 | JS locator; no HTML roster or CSV. ODA/OSU historically maintain ~100 PNW listings (76 in Oct 2023 → 101 in Mar 2024 per ODA outreach PDF). **Largest geographic hole: Oregon/Washington.** Contact ODA Trade Development / OSU Food Innovation Center (503-872-6680). **Later extracted** the same day (172 rows) via the widget's public SharePoint REST — see the yielded-rows table and section below. |
| FaB Wisconsin member co-packers | https://fabwisconsin.com/member-copackers/ | 2026-08-21 | **HTTP 404** on fetch. Search index still snippets Maglio, Create-A-Pack (Ixonia), Krier Beverage (Random Lake), East Shore, Tribe 9, PAK Technologies. Not copied from snippets (would invent fields). WI plants in this CSV come from MN MDA + Cornell. DATCP licensed food-processing-plant PDFs exist but are all processors, not co-packers. |
| MSU Product Center / MDARD | various | 2026-08-21 | No public co-packer roster; counseling model (call 517-432-8750). |
| Contract Packaging Association member directory | https://www.contractpackaging.org/directory | 2026-08-21 | Portal/JS membership directory; no scrapeable HTML roster. Midwest directory mentioned, not dumped. |
| CoPack Connect | https://copackconnect.com/ | 2026-08-21 | RFQ platform; **not scraped behind login** per brief. CPA exclusive RFQ tool. |
| 3PL Hub find-a-co-manufacturer | https://3plhub.co/resources/tools/find-a-co-manufacturer | 2026-08-21 | Claims **1,096** vetted co-mans, free, no signup; results load 25 at a time via JS, no public CSV/API in HTML. Names not in initial dump. High-value follow-up. Published state counts: CA 134, NY 76, IL 76, TX 65, FL 46, PA 44, MA 44, MN 42, NJ 42. |
| USDA Organic Integrity Database | https://organic.ams.usda.gov/integrity | 2026-08-21 | Public Advanced Search **is** filterable by scope Handler. It is **not** a co-packer list — tens of thousands of handlers (distributors, retailers, farms). Dumping Handler=Certified would mix non-co-packers. Use to **verify** organic claims on plants already in this sheet. Spreadsheet export exists after search. |
| SQF Certified Supplier Directory | https://directory.sqfi.com/certified-supplier/ | 2026-08-21 | Public searchable table of **all** SQF sites (food, packaging, storage). Not labeled co-packer. Use to verify SQF on known plants. Paginated; not ingested as plants. |
| PACK EXPO exhibitor lists | packexpo25.mapyourshow.com (LV 2025 PDF as of 8/19/26); packeast26.mapyourshow.com; categories.packexpo.com/category/contract-manufacturing-packaging-services | 2026-08-21 | Full exhibitor PDFs are public but mostly machinery OEMs. Contract Manufacturing & Packaging Services **category page had no items**. Search API returned 403. CPA booth listed. Not used as a plant roster. |
| Specialty Food Co-Packers Directory | https://www.specialtyfoodcopackers.com/The-Directory.html | 2026-08-21 | Category hub (appetizers, candy, sauces) without a scrapeable company table. |
| Specialty Food Resource copackers | https://www.specialtyfoodresource.com/find-a-business-resource/copackers/ | 2026-08-21 | Points at SFA member listing (~700) rather than an open HTML roster. |
| FDA Food Facility Registration | n/a | — | **Not public.** Not used. |
| Wisconsin DATCP food processing plant license holders PDF | https://mydatcp.wi.gov/documents/dfrs/Food%20Processing%20Plant%20License%20Holders.pdf | 2026-08-21 | Public license dump of **all** processors, not co-packers. Not ingested. |

## 10 best-documented plants

Ranked by filled contact fields plus extra weight for MOQ and certifications (still only what the source stated).

1. **Sonoma Gourmet** (Sonoma, CA)
   - phone: 707-939-3700 · email: sauceboy@sonomagourmet.com · web: http://sonomagourmet.com
   - processes: — · MOQ: Minimum run 300-400 cases · certs: FDA
   - source: UC Food Safety / CLFP — California Food Processing Co-Packers (Rob Neenan, CLFP, 2015 PDF still posted)

2. **Premier Foods, LLC** (Santa Fe Springs, CA)
   - phone: 562-944-1858 · email: premierfoods@verizon.net · web: —
   - processes: cold-fill · MOQ: small minimum runs · certs: FDA; organic; kosher
   - source: UC Food Safety / CLFP — California Food Processing Co-Packers (Rob Neenan, CLFP, 2015 PDF still posted)

3. **Riffs Smokehouse** (Arden Hills, MN)
   - phone: 651-955-6133 · email: ethan@riffssmokehouse.com · web: —
   - processes: sauces; meat · MOQ: varies by product · certs: USDA
   - source: Minnesota Department of Agriculture — Minnesota Co-Packer Directory (reviewed 2018; updated 2022; detailed listings live as of fetch)

4. **Nikola's Foods, Nikola's Bakery** (Bloomington, MN)
   - phone: 952-253-5991 · email: dir@nikolasbakery.com · web: —
   - processes: bakery · MOQ: case-by-case · certs: AIB; FDA; kosher; HACCP
   - source: Minnesota Department of Agriculture — Minnesota Co-Packer Directory (reviewed 2018; updated 2022; detailed listings live as of fetch)

5. **Sno Pac Foods** (Caledonia, MN)
   - phone: 507-725-5281 · email: snopac@snopac.com · web: —
   - processes: frozen · MOQ: Processing 40,000 pounds raw; packaging 20,000 pounds; ingredient sales no minimum · certs: organic
   - source: Minnesota Department of Agriculture — Minnesota Co-Packer Directory (reviewed 2018; updated 2022; detailed listings live as of fetch)

6. **Dover Processing Inc.** (Dover, MN)
   - phone: 507-932-8660 · email: dovermeats@gmail.com · web: —
   - processes: meat · MOQ: contact to discuss · certs: organic (MOSA); Animal Welfare Approved
   - source: Minnesota Department of Agriculture — Minnesota Co-Packer Directory (reviewed 2018; updated 2022; detailed listings live as of fetch)

7. **North Star Processing LLC** (Litchfield, MN)
   - phone: 320-693-7211 · email: mholmgren@nsp-llc.com · web: —
   - processes: dairy; spray-dry · MOQ: varies with products · certs: kosher (OU); organic (QAI)
   - source: Minnesota Department of Agriculture — Minnesota Co-Packer Directory (reviewed 2018; updated 2022; detailed listings live as of fetch)

8. **Bare Honey & Co. Food Manufacturing** (Minneapolis, MN)
   - phone: 612-315-3952 · email: info@barehoney.com · web: —
   - processes: sauces · MOQ: 200 gallons · certs: organic; FDA; HACCP
   - source: Minnesota Department of Agriculture — Minnesota Co-Packer Directory (reviewed 2018; updated 2022; detailed listings live as of fetch)

9. **Karlsburger Foods Inc.** (Monticello, MN)
   - phone: 763-295-2273 · email: matthewm@karlsburger.com · web: —
   - processes: sauces; dry-blend · MOQ: no minimum on stock; 150 pounds custom seasoning/dry blends; 300 pounds custom bases · certs: SQF level 2; USDA; FDA; organic; halal; HACCP
   - source: Minnesota Department of Agriculture — Minnesota Co-Packer Directory (reviewed 2018; updated 2022; detailed listings live as of fetch)

10. **Krienke Foods International Inc.** (Mountain Lake, MN)
   - phone: 651-238-4770 · email: caleb@popdkerns.com · web: —
   - processes: snacks · MOQ: Negotiable · certs: SQF
   - source: Minnesota Department of Agriculture — Minnesota Co-Packer Directory (reviewed 2018; updated 2022; detailed listings live as of fetch)

## Biggest data holes

1. **Oregon / Washington / PNW** — **Extracted 2026-08-21; not yet merged into `copackers-starter.csv`.** ODA locator yielded 172 rows (OR 99 / WA 72 / VA 1 Fife mistag) via the widget's public SharePoint REST. Deduped against the 318-row starter: **172 new / 0 overlap**. West Coast Co-Packer remains the only OR plant already in the starter (UC Davis); it is not in this locator extract. See `additions-pnw-new.csv` and the follow-up section below.
2. **3PL Hub's 1,096-facility database** — public in-browser, not dumpable without paginated JS scrape.
3. **CPA / CoPack Connect** — industry roster behind portal/login; not scraped.
4. **comanufacturers.com** — 6,588 claimed; 2 public US preview names; contacts gated.
5. **SQF directory and USDA OID** — huge public databases but not co-packer-labeled; verification tools, not source rosters.
6. **Websites missing on MN MDA** detailed listings (phones/emails strong, URLs weak).
7. **California 2015 PDF staleness** vs 2026 UC Davis name+URL list (little overlap of contact depth).
8. **MOQ** is sparse outside Minnesota MDA and a handful of PSU/Cornell/CA notes (60/318).
9. **Michigan** lacks an official co-packer directory; MFPA is processors-not-copackers.
10. **Wisconsin FaB member page 404**; DATCP license PDFs are all processors.
11. **Shared kitchens** were excluded from Cornell unless co-pack language was explicit — some hybrid incubators may have been dropped.
12. Multi-site firms (Universal Pure CT+CA, Tulkoff MD+OH, PacMoore IN+IL, Victoria Brooklyn+NJ) are usually one row per source location, not a full site list.
13. **Illinois** is thin (3 rows) despite 3PL Hub citing 76 IL co-mans.


## Oregon ODA PNW Co-packer Locator — follow-up extract (2026-08-21)

Moved here from the earlier "did not yield rows" pass. The first look at the page saw only the JS widget (no HTML roster/CSV). Same day, rows were taken from the **public SharePoint REST endpoints the widget itself calls** (anonymous GET; no login, no captcha). That prior OR/WA geographic hole is now filled at the extract layer; the starter CSV has **not** been merged yet (review still running).

- URL: https://www.oregon.gov/odaroadmap/operations/pages/pnw-co-packer-locator.aspx
- Date fetched: **2026-08-21**
- Method: public SharePoint REST `_api/web/lists/getbytitle('Co-Packers')/items` (expand Alert=Activity, Status=Certifications) and `_api/web/lists/getbytitle('Co-Packer Low Minimums')/items`. Same data the in-page cards render. Notes: `/workspace/niche-research/raw/oda-pnw-locator-notes.md`
- Rows extracted: **172** — OR 99 / WA 72 / VA 1 (Fife mis-tagged)
- VA 1 is *La Parisienne Sandwich LLC, Fife* — locator state field reads VA; city Fife is in WA. State was not silently corrected.
- Field presence (of 172): city 171, product/activity 170, email 167, phone 162, website 145, MOQ 123, certs 106. `notes` blank on all locator rows (no free-text notes field).
- Verbatim extract: `/workspace/niche-research/additions-pnw.csv` (not rewritten)

### Dedupe vs `copackers-starter.csv` (318 plants)

Match keys: normalized name+state (lowercase, strip punctuation, strip trailing inc/llc/co/corp/ltd/the); also phone, email, or website-host when both non-empty. No contacts invented. Plants not emailed. Starter CSV not rewritten.

- New plants: **172** → `/workspace/niche-research/additions-pnw-new.csv` (same columns; `processes_inferred` cleaned to allowed whole-word tokens; `can`/`pouch` kept only when activity has canning / 307 can / LACF). La Parisienne Sandwich LLC kept state VA with notes recording the Fife/WA mistag.
- Overlap: **0**
- Enrichments (locator value, starter blank): **0** → `/workspace/niche-research/enrichments-pnw.csv` (header only)
- Conflicts (both sides filled, different): **0** → `/workspace/niche-research/pnw-conflicts.md`
- West Coast Co-Packer (OR) is already in the starter via UC Davis and is **not** in this 172-row extract, so it was not overlapped or enriched.
- Same company name / same host, different state, treated as separate sites (not merged): Ventura Foods (starter CA vs locator Salem OR, shared venturafoods.com); Heritage Specialty Foods (starter Grand Prairie TX / hfsfoods.com vs locator Milwaukie OR / heritagespecialtyfoods.com).

## Method notes

- Deduped by normalized name + state (stripped Inc/LLC/Co/The).
- Emails only when the source printed them (including Cornell `[at]` forms that decoded cleanly). None invented.
- Cornell parser also dropped address-as-name rows, footer/nav, and person-name contacts used as plant names.
- MFPA processors are flagged in `notes` because co-pack is not always stated.
- ODA PNW follow-up (2026-08-21): 172 locator rows deduped against starter by name+state / phone / email / website host; 172 new, 0 overlap, 0 enrichments, 0 starter-field conflicts. See section above. Starter file not rewritten.

## Yielded rows (appended)

Oregon ODA PNW locator was extracted after the starter CSV was built. New/enrichment files are separate; starter CSV was not merged.

| Source | URL | Date fetched | Rows extracted (pre-dedupe) | Quality notes |
|---|---|---|---:|---|
| Oregon ODA PNW Co-packer Locator | https://www.oregon.gov/odaroadmap/operations/pages/pnw-co-packer-locator.aspx | 2026-08-21 | 172 extracted (OR 99, WA 72, VA 1 Fife mistag) | public SharePoint REST the widget calls; no login. |

---

## Additional public-list pass — 2026-08-21 (executor)

Second pass for **Illinois / Wisconsin / Midwest / Mountain / New England / extra Extension-or-gov holes**. Deduped against `copackers-starter.csv` (318, name+state). Starter CSV not rewritten. FDA Food Facility Registration not used. No logins scraped. No plant emails sent. Contacts only when the source page printed them.

### Output files

- `/workspace/niche-research/additions-public-lists.csv` — **376** NEW plants
- `/workspace/niche-research/enrichments.csv` — **67** field fills (website 44, email 10, phone 7, city 5) for plants already in the starter
- `/workspace/niche-research/ca-2015-livecheck.csv` — **31** California 2015-PDF plants, website status only (no new emails/phones from plant marketing sites)

### Sources that yielded plant rows

| Source | URL | Date fetched | Rows kept (post-dedupe vs starter) | Quality notes |
|---|---|---|---:|---|
| Colorado Dept. of Agriculture Co-Pack Directory (public Google Sheet) | https://ag.colorado.gov/colorado-co-pack-directory — sheet `1r5VCrCkI6ONwWipD-_fNCDBAS4CWUdNuKODj7OSFWzk` gid `560248172` | 2026-08-21 | 43 | **Best official hole-fill.** Operation Type = Co Packer only; Kitchen Space for Rent skipped. CDA landing HTML is CloudFront-blocked from this host; public sheet CSV export worked. Raw: `raw/colorado-copack-directory.csv`. Ready Foods + Rocky Mountain Spice already in starter (enrichment). Some CDA "Co Packer" rows are kitchen-share language and are flagged in notes. Includes Fish Ski Provisions (Alcalde, NM). |
| PickYourOwn.org state co-packer HTML lists | https://www.pickyourown.org/copackers-{State}.php (51 state files saved under `raw/pyo-*.html`) | 2026-08-21 | 286 | **Public HTML rosters**, visitor-suggested. Notes say verify still operating. Used for IL/WI and other hole states; also added plants in already-covered states when name+state was new. Empty or near-empty pages: NJ, NH, NY, OK, RI, WV, WY, AK, HI, ND, SD (master index only). Not a government list. |
| Specialty Food Resource — Co-Packers | https://www.specialtyfoodresource.com/find-a-business-resource/copackers/ | 2026-08-21 | 44 | Public HTML roster (WebFetch). Origin HTML is SiteGround captcha-gated from this host (HTTP 202). Hole-state extract only (IL, WI, IA, OH, MO, KS, AZ, NJ, NH, NM, OR, WA, VT, KY, SD, ID, HI, LA, SC, TN, UT). Raw JSON: `raw/sfr-hole-states.json`. Institute of Packaging Professionals skipped (not a plant). |
| Non-GMO Project Co-Packer Directory | https://www.nongmoproject.org/copacker/ | 2026-08-21 | 3 | Public HTML. Goodness Ingredients LLC and Whole & Free Foods (WFF, Inc.) have **no city/state on the page** (left blank; 209 / 847 area codes not used to invent CA/IL). Wildway About text states San Antonio, Texas. Raw: `raw/nongmo-copacker.html`. |

### Sources checked that did **not** yield plant rows (this pass)

| Source | URL | Date fetched | Why no rows |
|---|---|---|---|
| FaB Wisconsin member co-packers | https://fabwisconsin.com/member-copackers/ | 2026-08-21 | Still **HTTP 404**. Wayback CDX has one snapshot `20230928184635`; IA returned "Temporarily Offline" (503). Search-index snippets (Maglio, Create-A-Pack, Krier, etc.) not copied. Create-A-Pack / Rural Route 1 came in via PYO + SFR instead. |
| Colorado CDA landing HTML | https://ag.colorado.gov/colorado-co-pack-directory | 2026-08-21 | CloudFront **403** to curl. Sheet export (above) used instead. Wayback 2025-10-13 snapshot contained the public Google Sheet IDs. |
| Illinois Extension IL-EATS Asset Mapping | https://extension.illinois.edu/il-eats/illinois-asset-mapping-initiative | 2026-08-21 | Mapping initiative / processors-food-hubs narrative. **No co-packer roster.** |
| IDPH manufactured-food guide | https://dph.illinois.gov/…/manufactured-food-guide-selfinspection-checklist.pdf | 2026-08-21 | How-to (defines co-packer). Not a plant list. |
| Purdue `links.foodsci.purdue.edu/commercialkitchens` | http://links.foodsci.purdue.edu/commercialkitchens | 2026-08-21 | Timeout / no scrapeable roster. Purdue FEMI is counseling, not a directory. Made-in-Indiana MEP is all manufacturers, not labeled co-packer — not dumped. |
| Oklahoma State FAPC / FAPC-106 | https://extension.okstate.edu/fact-sheets/food-processing-using-a-co-packer | 2026-08-21 | How-to fact sheet. No plant names. |
| UW-Extension FoodBIN / Community Food Systems | https://fyi.extension.wisc.edu/foodbin/ ; https://foodsystems.extension.wisc.edu/food-business-development/ | 2026-08-21 | Describes a network of kitchens/co-packers; **no HTML plant table**. 2012 map page has no extractable roster. |
| Wisconsin DATCP license PDF | already logged | — | All processors, not co-packers. Not ingested. |
| Claytowne "Beats Digging Ditches" resource list | https://claytowne.com/beats-digging-ditches/resources/co-packers-and-private-labelers/ | 2026-08-21 | Fetch timed out. Page is a link-hub (PYO, SFR, Cornell, CPA), not a new roster. |
| Specialty Food Co-Packers Directory | https://www.specialtyfoodcopackers.com/The-Directory.html | 2026-08-21 | Still a category hub; no company table. |
| Oregon ODA PNW locator | https://www.oregon.gov/odaroadmap/operations/pages/pnw-co-packer-locator.aspx | 2026-08-21 | **Not re-scraped.** JS locator; another agent extracted via public SharePoint REST the same day (see section above). |
| 3PL Hub / CPA / CoPack Connect / comanufacturers.com | previously logged | — | JS or login. Not scraped. |
| USDA OID / SQF directories | previously logged | — | Verification tools, not co-packer lists. Not dumped. |
| PACK EXPO category | previously logged | — | Empty / OEM-heavy. Not used. |

### Hole-state yield vs starter

Starter had IL 3, WI 7, CO 2, IA/MO/KS/AZ 0. This pass added (name+state new only):

- **Illinois 20** (PYO + SFR). No official IL Extension/Ag roster exists.
- **Wisconsin 8** (PYO + SFR), including Create-A-Pack (Oconomowoc), Gourmet CoPack (Madison), N.E.W. Co-Packing (Suamico), Contract Comestibles (East Troy).
- **Colorado 50** (CDA sheet + a few PYO-only names).
- **Arizona 9, Iowa 6, Missouri 6, Indiana 6, Ohio 12, Kansas 2**.
- Brand-new states vs starter: AL, AR, AZ, DE, HI, IA, ID, KS, KY, LA, MO, MS, MT, NE, NM, NV, SD, TN.

### California 2015 PDF live check

31 plants whose starter `source_name` contains "2015 PDF". Checked the **listed website only**. No emails/phones added from plant sites.

| status | n | notes |
|---|---:|---|
| live | 14 | Homepage fetched. `still_claims_copack=yes` only when the fetched HTML used co-pack / contract manufactur / private label language: **Blossom Valley Foods, Timber Crest Farms, Bell-Carter Packaging, Triple H Food Processors**. 10 live sites did not use those words in the fetched homepage (`no`). |
| no_website | 12 | PDF had no website. Not invented. |
| dead | 5 | DNS fail or HTTP 400: Ajmera Innovations; Garry Packing; Pacific Choice Brands; Stapleton Spence; Santini Foods. |
| parked / redirect | 0 | None classified. |

### Method notes (this pass)

- Deduped by normalized name+state; near-dupes (one name contains the other, same state, ≥8 chars) treated as already present and routed to enrichments when the source filled a blank field.
- `processes_inferred` only from tokens the source actually used.
- Kitchen-only / church kitchen / "permanently closed" PYO rows dropped. Ajinomoto (ingredient solutions) kept with a not-clearly-a-co-packer note.
- PYO city parser rejects street words and will not treat "Co-Packing" as state CO.

## 2026-08-21 Plant Scout update

Merged on disk (Python `csv` module) in order: `copackers-starter.csv` (318) + `additions-pnw-new.csv` (172) + `additions-public-lists.csv` (248) + Specialty Food Resource roster already extracted to `raw/sfr-hole-states.json` (44). Dedupe key = normalize(name)+state (lowercase, strip punctuation, strip inc/llc/co/corp/ltd/the); first row wins; blank website/phone/email/city/moq/certs/product_types_raw copied onto the winner. `enrichments.csv` applied the same way (blank fields only). `copackers-starter.csv` was not overwritten. No contacts invented. Plants not emailed.

Master file: `/workspace/niche-research/copackers.csv` — **771** unique plants. Phone **713** (92%); email **590** (77%); website **611** (79%); process **477** (62%); MOQ **232** (30%). By state: OR 107, WA 74, IL 22, WI 15, MI 16, CA 69.

### Sources added

| Source family | Input rows | Rows in master (first-win origin) |
|---|---:|---:|
| Oregon ODA PNW Co-packer Locator | 172 | 170 |
| PickYourOwn.org state co-packer HTML lists (PYO) | 218 | 218 |
| Colorado Department of Agriculture — Co-Pack Directory | 27 | 27 |
| Non-GMO Project Co-Packer Directory | 3 | 3 |
| Specialty Food Resource (SFR) co-packers roster | 44 | 35 |

Starter origin kept: **318**. Later-row blank fills during concat: **1**. Enrichment field fills applied: **32** (skipped already-filled **2**).

### CA 2015 PDF livecheck

From `/workspace/niche-research/ca-2015-livecheck.csv` (**31** rows): live **14**, dead **5**, no-url **12**. Notes appended as `2015 PDF website: {status}; still_claims_copack={value}`. Dead-website rows kept.

### Remaining holes

- **3PL Hub JS** — claims 1,096 vetted co-mans; results load via paginated JS, no public CSV/API.
- **WI FaB Wisconsin** member co-packers page **HTTP 404**.
- **CPA / CoPack Connect** — roster behind portal/login; not scraped.
- **SQF directory and USDA Organic Integrity Database** — verify-only; not co-packer-labeled rosters.
- **Michigan** — no official co-packer list (MFPA is processors, not a co-packer directory).

## 2026-08-21 cleanup (DBA collapse + field leaks + process_for_pages)

No rematch / re-ingest. `copackers-starter.csv` not overwritten. 3PL Hub not scraped. No plants emailed. No contacts invented.

- Starting brief file **843** was already merged on disk to **771** (Plant Scout update above). This pass collapsed **8** true DBA/alias pairs → **763**.
- Field leaks: Mikesell's `tulkoff.com` cleared and email unsmashed to `jstevenson@mike-sells.com` (Cornell `JStevenson [at] mike-sells.com`). Lupo's email set to `lupostephen@gmail.com` (Cornell parenthetical); Maco Packaging left as Theresa.
- PacMoore HQ (Hammond, IN) received blank-only copy of `866-610-2666` / `jwarren@pacmoore.com`. PacMoore three sites and Ventura CA vs Salem OR kept separate. No Tulkoff Cincinnati or new Universal Pure Mira Loma row.
- New column `process_for_pages` immediately after `processes_inferred`: HPP **8** / hot-fill **29** / retort **1** / sauce/condiment **195** / blank **550** (source words only; no synonym mapping). Any-fill **213**.
- Details: `/workspace/niche-research/copackers-cleanup.md`.
