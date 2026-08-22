# Co-packer starter CSV audit

Audited `/workspace/niche-research/copackers-starter.csv` against `/workspace/niche-research/copackers-sources.md` and dumps under `/workspace/niche-research/raw/` (plus the intermediate extracts `/workspace/niche-research/data_mn.json`, `data_ca.json`, `data_other.json`, because Minnesota MDA and MFPA HTML are not in `raw/`, and the 2015 CLFP PDF was not saved as a local PDF). CSV was **not** edited. No plants were emailed. No contacts or capabilities were invented.

Fetched-date on the source log: 2026-08-21.

---

## 1. Row counts

| Metric | Count | Notes |
|---|---:|---|
| Data rows in `copackers-starter.csv` | **318** | Matches `copackers-sources.md` “318 plants” and `_stats.json` `"n": 318`. Header + 318. |
| Unique normalized name + state | **318** | Same key the builder used (`Inc/LLC/Co/The` stripped). No leftover exact-key dupes. |
| Unique name + city + state (raw strings) | **318** | Also unique. Does **not** mean multi-site firms or DBA pairs were collapsed — those survive as different name strings. |

One row has blank city **and** blank state: **Dutch Valley Food Development** (`/workspace/niche-research/raw/psu-copackers.html` listing is name + website + products only; no city/state printed).

---

## 2. Remaining dupes

Builder already collapsed name+state. What remains is shared phone / email / website (blanks ignored) plus the named parent/DBA families.

### Same phone (normalized digits; blanks ignored) — 6 groups

| Phone | Names (both listed) | Why it is a dupe |
|---|---|---|
| 866-610-2666 | **PacMoore Innovation Lab** (Gridley, IL) / **PacMoore Process Technologies** (Mooresville, IN) | Same Cornell contact Josh Warren. Third sibling **PacMoore Products (Corporate Headquarters)** (Hammond, IN) has empty phone. `/workspace/niche-research/raw/cornell-text.txt` lists all three as one firm (Gridley IL lab, Hammond IN HQ, Mooresville IN). |
| 231-845-6248 | **Indian Summer Cooperative, Inc.** / **Michigan Food Processor Coop. Inc.** (both Ludington, MI) | Same number in `/workspace/niche-research/data_other.json` MFPA tuples. Likely same office; both flagged as processors not co-packers. |
| 518-775-1742 | **Imperial Co-Packing Espuna (Pata Legra LLC)** / **Pata Negra LLC** (both Gloversville, NY, 20 Harrison St) | Cornell lists both at the same address and phone (`cornell-text.txt`). DBA/alias (CSV even has the typo “Pata **Legra**”). |
| 717-397-9578 | **Lancaster Fine Foods** / **Lancaster Fine Foods (Stir Foods)** (both Lancaster, PA) | Cornell vs PSU. Same email too. Addresses 2320 vs 2316 Norman Road. |
| 925-808-1548 | **Crave Co-Packing** / **Crave Copacking** (both Verona, PA, 555 Wildwood Ave) | Cornell vs PSU. Same email `trever@cravecp.com`. |
| 512-633-8904 | **ATX Specialty Foods** / **Zilks Foods, LLC** (both Austin, TX) | `/workspace/niche-research/raw/texas-agrilife.html`: both use P.O. Box 152289, Austin, TX 78715 and the same phone. |

### Same email (blanks ignored) — 4 groups

| Email | Names |
|---|---|
| jwarren@pacmoore.com | **PacMoore Innovation Lab** / **PacMoore Process Technologies** |
| info@lancasterfinefoods.com | **Lancaster Fine Foods** / **Lancaster Fine Foods (Stir Foods)** |
| trever@cravecp.com | **Crave Co-Packing** / **Crave Copacking** |
| theresa.hinckley@macobag.com | **Lupo's Bottling LLC** (Endicott, NY) / **Maco Packaging** (Newark, NY) |

The Lupo/Maco share is a **parser error**, not a real shared mailbox. `cornell-text.txt` for Lupo's is:

> Email: theresa.hinckley [at] macobag.com (lupostephen[at]gmail[dot]com)

The builder took the first `@`-like string instead of the parenthetical `lupostephen@gmail.com`. Maco's own listing correctly uses Theresa Hinckley.

### Same website (host, blanks ignored) — 4 groups

| Website | Names |
|---|---|
| nationalfoodworks.com | **National Foodwork Services** (Decatur, IL, Cornell) / **National Foodworks Services, LLC** (city blank, IL, UC Davis 2026) |
| bylersrelishhouse.com | **Byler's Relish House** (Cornell) / **Bylers Relish House** (PSU) — both Saegertown, PA, 18258 Leimbach Rd |
| organicfoodincubator.com | **BAO Food and Drink Organic Food Incubator, New Jersey** (Cornell; city field is the company name) / **The Organic Food Incubator** (Bloomfield, NJ, PSU) |
| tulkoff.com | **Tulkoff Food Products** (Baltimore, MD, PSU) / **Mikesell's Snack Food Company** (Dayton, OH, Cornell) |

The Tulkoff/Mikesell's website pair is **not** a real DBA. Cornell's Mikesell's block has no website; CSV `http://www.tulkoff.com/` leaked from the earlier Tulkoff block in `cornell-text.txt`. Mikesell's email is also smashed: CSV `jstevenson@mike-sells.commikesell` vs Cornell `JStevenson [at] mike-sells.com`.

### Named parent / DBA families (requested)

**Universal Pure** — only **one** CSV row: Meriden, CT, from PSU. PSU text (`psu-copackers.html`) already says beverage co-packing in Meriden, CT **and Mira Loma, CA**. The 2026 UC Davis HTML (`raw/ucdavis-copackers.html`) lists “Universal Pure (Beverage co-packing in California and Connecticut)” with `https://universalpure.com/beverage-bottling/`. That CA site was not ingested as a second row (UC Davis extract skipped the name because PSU already had it under CT).

**Tulkoff** — CSV has **Tulkoff Food Products** (Baltimore, MD, PSU: 800-638-7343, info@tulkoff.com). Cornell (`cornell-text.txt`) says “SQF plants in Baltimore, MD and Cincinnati, OH” and a different phone (410-864-0561) / email (`mtulkoff@tulkoff.com`). The Ohio plant is not a row. **Mikesell's Snack Food Company** is a different Dayton snack plant that wrongly received `tulkoff.com`.

**PacMoore** — three CSV rows, one company: **PacMoore Innovation Lab** (Gridley, IL) / **PacMoore Products (Corporate Headquarters)** (Hammond, IN, empty contacts) / **PacMoore Process Technologies** (Mooresville, IN). Cornell prints HQ address `1844 Summer Street, Hammond, IN 46320` and Mooresville `100 PacMoore Parkway` plus the shared 866-610-2666 / jwarren@pacmoore.com; the HQ row dropped those fields when the parser split the stacked names.

**Victoria** — **Victoria Fine Foods (formerly Victoria Packing)** (Cornell, Brooklyn, 718-927-3000, jaquilina@victoriafinefoods.com, victoriafinefoods.com) vs **Victoria Packing** (PSU, Brooklyn, **719**-927-3000, victoriapastasauces.com). Same street in both sources: 443 East 100th Street, Brooklyn, NY 11236. Phone 718 vs 719 is a source/OCR disagreement, not two plants.

**Nikola's** — only **one** CSV row, already concatenated: **Nikola's Foods, Nikola's Bakery** (Bloomington, MN) from `/workspace/niche-research/data_mn.json`. No second Nikola row to merge.

**Cluster count:** 11 contact/name clusters of 2+ CSV rows (PacMoore is a 3-row cluster). Plus two named parents that are **under-split** (Universal Pure CA missing, Tulkoff OH missing) rather than over-split.

---

## 3. Orphan source_url / source_name

CSV unique `source_url` pieces (split on ` | `): **9 URLs, all present** in the “Sources that yielded plant rows” table in `copackers-sources.md`.

| CSV source_url | In sources.md? |
|---|---|
| https://extension.psu.edu/list-of-co-packers-in-pennsylvania-and-beyond/ | yes |
| https://www.mda.state.mn.us/minnesota-co-packer-directory | yes |
| https://aggie-horticulture.tamu.edu/food-technology/food-processing-entrepreneurs/getting-started/co-packers-in-texas/ | yes |
| https://cals.cornell.edu/cornell-agritech/partners-institutes/cornell-food-venture-center/kitchensco-packers | yes |
| https://ucfoodsafety.ucdavis.edu/sites/g/files/dgvnsk7366/files/inline-files/240926.pdf | yes |
| https://ucfoodquality.ucdavis.edu/food-industry-contacts/co-packers | yes |
| https://foodbusiness.ces.ncsu.edu/tools-for-success/other-services-supplies/ | yes |
| https://edis.ifas.ufl.edu/publication/FS380 | yes |
| https://www.michfpa.org/processors/ | yes |

Two merged rows carry ` | `-joined URLs, both sides still in that table: **Endorphin Farms** (NC + UF) and **Sunny Dell Foods** (PSU + Cornell).

**source_name strings** are not verbatim for two labels (same URLs, different wording than the markdown table):

- CSV: `NC State Extension Food Business — Other Services & Supplies (Copackers section; page updated Aug 17 2026)` vs sources.md: `NC State Extension Other Services & Supplies`
- CSV: `UF/IFAS Extension — Finding and Using a Co-packer (FS380 PDF, Florida & Georgia list)` vs sources.md: `UF/IFAS Finding and Using a Co-packer (FS380)`

Not orphans — label drift.

**Reverse orphans (claimed in sources.md, absent from CSV):**

- `https://www.comanufacturers.com/collections/all-manufacturers` — sources.md says 2 US preview rows (**1000 Springs Mill**, Buhl ID; **21 Holdings LLC**, West Chicago IL). Both are missing. `build_main.py` drops names matching `^\d`, so they were parsed then discarded.
- **California Concentrate Co.** (Acampo, CA) is in `data_ca.json` PDF extract (209-334-9112, thomas@softcom.com) but missing from CSV. Junk filter `^california` in `build_main.py`.
- **California Spice Basket, Inc.** is in `data_ca.json` UC Davis extract and in `raw/ucdavis-copackers.html` (`http://www.caspicebasket.com`) but missing from CSV. Same `^california` junk filter.
- **Vor Foods** is on the 2026 UC Davis HTML list (`https://www.vorfoods.com/`) and in Cornell (`27 Steam Whistle Dr, Ivyland, PA`) but was never put into `data_ca.json` and is not in the CSV.

No CSV row points at a URL or source name that is not a listed yield source.

---

## 4. Unsourced `processes_inferred`

Rule used: each `;`-separated token must appear as a **word** in `product_types_raw` or `notes` (hyphen/space variants of the token allowed: `cold-fill` ≡ `cold fill`). Substring accidents fail: `Candy` does not source `canning`. Synonyms (`juice` → `beverage`, `ice cream` → `dairy`, `candy` → `chocolate`) fail. Inflections (`sauce` vs `sauces`, `canned` vs `canning`, `baked goods` vs `bakery`) also fail the stated rule.

| | Count |
|---|---:|
| Rows with any `processes_inferred` | 195 |
| Rows with ≥1 unsourced token | **116** |
| Unsourced token flags | **178** |

Flags by token: beverage 36, bakery 33, cold-fill 32, dry-blend 20, sauces 15, canning 13, dairy 7, chocolate 5, snacks 4, spray-dry 3, hot-fill 2, dehydration 2, meat/fermentation/frozen/acidified/extrusion/stick-pack 1 each.

Three mechanical causes (not double-counted below as excuses — all 178 still fail the word rule):

1. **Texas footnote leak — 58 flags.** `parse_texas()` copies this footnote into **every** TX `notes` field (`raw/texas-agrilife.html`): “Most of the co-packers listed here pack acidified foods. Eilenberger's does baked goods only, and Son Beverage Company only does cold filled beverages.” The process inferrer then tags essentially all 30 TX rows `cold-fill; acidified; bakery; beverage`. **Son Beverage Company** (San Antonio) is the only plant the footnote says does cold-filled beverages; it still also got `bakery` and `acidified`. **Eilenberger's Inc.** (Palestine) is bakery-only in the footnote and `product_types_raw` is `baked goods only`, yet CSV process is `cold-fill; acidified; bakery; beverage`. **ATX Specialty Foods** / **Zilks Foods, LLC** / **Jardine Foods** / etc. have `product_types_raw` = `acidified foods` only.

2. **Inflection / variant — 63 flags.** Token is a different word than the source used: **Esco Foods, Inc.** (San Francisco) `sauces` from “BBQ sauce”; **Hot Wachulas** (Bartow, FL) `sauces` from “hot sauce”; **House Autry** (Edgewater, FL) `dry-blend` from “dry blends”; **Triple H Food Processors** `dry-blend` from “dry blends”; **Timber Crest Farms** `canning` from “cannery”; **George Chiala Farms** `cold-fill` from “cold packing”; **Quality Ingredients Corporation** `spray-dry` from “spray drying”; **Chubby's Sauce** / **Avon Food Company** (MA) `hot-fill` from “Hot Pack”; **Burnette Foods** / **Honee Bear Canning Company** `canning` from “Canned …”.

3. **Synonym inference — 57 flags.** Token word never appears. Examples:
   - **Ajmera Innovations** (Anaheim Hills, CA): `beverage` from “RTD coffee” (`data_ca.json` / PDF extract).
   - **Ramar Foods International Inc.** (Pittsburg, CA): `dairy; beverage` from “ice cream/sorbet” and “juice/cider”.
   - **G. S. Gelato** (Fort Walton Beach, FL): `dairy` from “gelato” (`raw/uf-ifas-fs380.txt`).
   - **Old Meeting House Ice Cream** (Tampa, FL): `dairy` from “ice cream”.
   - **Cape Cod Provisions** (MA): `chocolate` from “candy, confectionary” (`cornell-text.txt`).
   - **Maud Borup** (MN): `chocolate` from “Candy…” and `dry-blend` from “powdered mixes” (`data_mn.json`). Closest thing in this sheet to the “`can` from Candy” accident — candy sourced **chocolate**, not `canning`.
   - **Bongards Premium Cheese** (MN): `dairy` from “cheese” (token `dairy` absent).
   - **European Roasterie Inc.** / **Coffeewomple** / **MBH, LLC** (MN): `beverage` from “coffee”.
   - **Private Label Foods** (NY): `acidified` from “Formulated acid sauces” (token `acidified` absent).
   - **Refresco Beverages US, Inc.** (Dade City, FL): `beverage` from “water, juices, teas, energy drinks” — company name has Beverages; product text does not use the word.

`processes_inferred` was computed from products+notes+certs+moq in `build_helpers.py`; this audit only credits product_types_raw + notes, per the rule.

### Spot-check ≥15 rows vs raw (quoted mismatches)

Sources covered: PSU, MN (`data_mn.json`; no MDA HTML in `raw/`), TX, Cornell, CA PDF extract, NC (`data_other.json`), UF, MFPA.

1. **Dutch Valley Food Development** (PSU, `raw/psu-copackers.html`): source is “Dutch Valley Food Development Website Products: All-Natural and Organic Bulk Foods…”. No city/state/phone. CSV state/city blank; `processes_inferred=sauces` from “Dressing Mixes” (token `sauces` not a word).
2. **Victoria Packing** (PSU): “443 East 100th Street Brooklyn, NY 11236 719-927-3000”. CSV phone 719-927-3000 matches PSU and **contradicts** Cornell’s 718-927-3000 for the same address (**Victoria Fine Foods**).
3. **Universal Pure** (PSU): “65 Chamberlain Hwy Meriden, CT 06451 888-240-2070 … Meriden, CT and Mira Loma, CA.” CSV is CT-only; CA site dropped. Phone stored as `1 888-240-2070`.
4. **Tulkoff Food Products** (PSU): “2229 Van Deman Street Baltimore, MD 21224 800-638-7343 … info@tulkoff.com … secondary facility in Pittsburgh, CA”. CSV matches PSU Baltimore. Cornell’s Tulkoff block uses 410-864-0561 / Cincinnati OH — not merged onto this row because name+state already filled.
5. **Millennium Packaging Service, Inc.** (PSU): “100 Enterprise Drive, Carbondale, 18407” — ZIP-only, no state. CSV state `PA` was patched in `build_main.py` (`tidy` special case), not printed as “PA” in the HTML.
6. **Nikola's Foods, Nikola's Bakery** (MN, `data_mn.json`): Bloomington, 952-253-5991, dir@NikolasBakery.com, “Full-service bakery…”, MOQ case-by-case. CSV matches. `bakery` is a word in products — sourced.
7. **Sno Pac Foods** (MN): Caledonia, 507-725-5281, SnoPac@SnoPac.com, “Frozen vegetables”. CSV matches; `frozen` sourced.
8. **Karlsburger Foods Inc.** (MN): Monticello, 763-295-2273. CSV `processes_inferred=sauces; dry-blend`. `sauces` is in “Soup bases, sauces…”; `dry-blend` is **not** a word (source says “seasoning blends”).
9. **ATX Specialty Foods** vs **Zilks Foods, LLC** (TX, `raw/texas-agrilife.html`): both “P.O. Box 152289 Austin, TX 78715 512-633-8904”. CSV duplicated them as two plants and stamped the shared footnote processes.
10. **Son Beverage Company** (TX): table says cold-filled beverages only (`tim@sonbeverage.com | www.sonbeverage.com`). CSV `product_types_raw=cold filled beverages only` but process still includes `bakery` and `acidified` from the footnote. Token `cold-fill` is not a word (`cold filled` is).
11. **Eilenberger's Inc.** (TX): “Palestine, TX 75801 903-729-2176 www.eilenbergerbakery.com”. CSV process includes `cold-fill; acidified; beverage` which the footnote explicitly denies.
12. **Nilda's Desserts** (Cornell, `cornell-text.txt`): “188 Washington Street … Poughkeepsie, NY 12601-3317 Phone: 845-454-5876 Email: nildasdesserts [at] gmail.com Website: www.nildasdesserts.com … Shared use kitchen, co-packing…”. CSV: city blank, **state=WA**, phone/email/website/products all empty. Parser treated “Washington Street” as Washington state and dropped the NY listing.
13. **Mikesell's Snack Food Company** (Cornell): “333 Leo Street Dayton, OH 45404 … Email: JStevenson [at] mike-sells.com”. CSV email `jstevenson@mike-sells.commikesell`, website `http://www.tulkoff.com/` (not in this block), products field starts “Tulkoff Food Products, Inc. Product Minimum: 40,000 cases…” — **Tulkoff’s MOQ leaked into Mikesell's products**.
14. **Earth Ranch** (Cornell): “N173W21170 Northwest Passage / Jackson, WI 53037”. CSV city `Passage Jackson`; `product_types_raw` is the street (`N173W21170 Northwest Passage`) instead of “dehydration of fruits and vegetables…”.
15. **PacMoore Products (Corporate Headquarters)** (Cornell): address `1844 Summer Street, Hammond, IN 46320` plus the shared phone/email/website printed under the stacked names. CSV Hammond row is empty except name/city/state.
16. **Lupo's Bottling LLC** (Cornell): parenthetical email `lupostephen@gmail.com`; CSV `theresa.hinckley@macobag.com` (Maco’s address).
17. **Ajmera Innovations** (CA 2015 extract `data_ca.json`): products “Organic/Natural, vegetarian, tea, RTD coffee, concentrates and powders”. CSV `processes_inferred=beverage` — token not a word.
18. **Premier Foods, LLC** (CA 2015): “Private label, hot and cold fill…”, MOQ “small minimum runs”. CSV matches the extract. `cold-fill` sources from “cold fill”; `hot-fill` was **not** tagged because the text is “hot and cold fill” (pattern wants `hot-fill`/`hot fill` contiguous).
19. **California Concentrate Co.** (CA 2015 extract): present in `data_ca.json` (Acampo, 209-334-9112, Juice concentrates) — **not in CSV** (junk `^california`).
20. **Endorphin Farms** (NC `data_other.json`): city `St. Augustine`, FL, 904-824-2006, notes `3255 Parker Drive`. UF PDF (`uf-ifas-fs380.txt`) same phone/address as **Endorphin Farms, Inc.**, “Processing: sauces”. CSV merged to one row but city became **Augustine** (`tidy_city` treats `St.` as Street).
21. **Hope and Main** (NC): Warren, RI, 401-245-7400, empty products. CSV empty products/process — an incubator, not a described co-packer.
22. **Blue Ridge Food Ventures** (NC): notes “also listed under commercial kitchens”. CSV empty products.
23. **All Wrapped Up** (UF `uf-ifas-fs380.txt`, two-column layout): “Processing: chocolate, other candy and snacks, specialty food packaging”; Ft. Lauderdale; info@allwrappedup-gifts.com. CSV matches the extract. Gift/packaging firm, not a process plant. Two-column PDF interleaves this block with **Criollos Food, USA**.
24. **Hot Wachulas** (UF): “Processing: Salsa, hot sauce”. CSV `processes_inferred=sauces` (plural token not in text).
25. **Freestone Pickle Company Inc.** (MFPA `data_other.json`): “Food service pickles and relishes; contract tanking”. CSV notes “Mentions contract tanking”; no co-pack sentence.
26. **Bayview Food Products / Mr. Chips Inc.** (MFPA): notes in extract “MFPA processor listing; co-pack not explicitly stated”. CSV keeps that flag.
27. **Indian Summer Cooperative, Inc.** and **Michigan Food Processor Coop. Inc.** (MFPA): same Ludington phone 231-845-6248 in `data_other.json`. CSV kept both.

---

## 5. Contradictions

### Same plant, different city / phone / email (CSV vs CSV, or CSV vs raw)

| Plant | Conflict |
|---|---|
| **Victoria Fine Foods (formerly Victoria Packing)** vs **Victoria Packing** | Same Brooklyn address. Cornell phone **718**-927-3000 + jaquilina@victoriafinefoods.com vs PSU **719**-927-3000 and no email. Websites victoriafinefoods.com vs victoriapastasauces.com. |
| **Lancaster Fine Foods** vs **Lancaster Fine Foods (Stir Foods)** | Same phone/email. Cornell 2320 Norman Road vs PSU 2316 Norman Road. |
| **National Foodwork Services** vs **National Foodworks Services, LLC** | Same IL website. Cornell city Decatur + phone 217.330.8512 vs UC Davis city blank, no phone. |
| **Crave Co-Packing** vs **Crave Copacking** | Same Verona phone/email; only PSU row has https://cravecp.com/. |
| **Byler's Relish House** vs **Bylers Relish House** | Same Saegertown phone/website; PSU has ext 103 + copacking@bylersrelishhouse.com, Cornell does not. |
| **Imperial Co-Packing Espuna (Pata Legra LLC)** vs **Pata Negra LLC** | Same Gloversville phone/address; different emails (info@imperialcopacking.com vs info@patanegrausa.com). Cornell describes both as dry-cured sausage. |
| **Tulkoff Food Products** | PSU 800-638-7343 / info@tulkoff.com / “Pittsburgh, CA” vs Cornell 410-864-0561 / mtulkoff@tulkoff.com / Cincinnati, OH. CSV kept PSU only. |
| **Nilda's Desserts** | Cornell: Poughkeepsie **NY**, 845-454-5876, nildasdesserts@gmail.com. CSV: state **WA**, all contacts blank. |
| **Endorphin Farms** | NC extract city `St. Augustine`; CSV city `Augustine`. |
| **Earth Ranch** | Cornell city Jackson, WI; CSV city `Passage Jackson`. |
| **Pulp Kitchen** | CSV city is a sentence: `contract co-packer arrangements to produce closer New York City metro area and` (state CT). |
| **BAO Food and Drink Organic Food Incubator, New Jersey** | CSV city = `BAO Food and Drink Organic Food Incubator`. |
| **Mikesell's Snack Food Company** | Contacts/products contradict Cornell (see §4). |
| **Lupo's Bottling LLC** | Email contradicts Cornell parenthetical. |
| **Dutch Valley Food Development** | Blank state vs every other PSU row; source truly has no geography. |
| **Schoolhouse Preserves** (Mt. Upton, NY) | `product_types_raw` bleeds the next Cornell listing: “Siena Development Group, Inc.…” |

### CA 2015 PDF vs 2026 UC Davis name+URL list

CSV after name+state merge shows **0 overlapping names** and **0 overlapping websites** between the 31 PDF-sourced rows and the 27 UC Davis-sourced rows. That is an artifact of how `data_ca.json` was built: the 2026 names that already existed in the 2015 extract were **omitted** from the UC Davis tuple list, so merge never combined 2026 URLs onto 2015 contact rows.

The actual 2026 HTML (`raw/ucdavis-copackers.html`, heading “Co-Packers (Mostly California)”, modified 2026-03-16) **does** overlap the 2015 PDF roster. Plants on **both** lists:

| 2015 PDF row in CSV (city / phone from PDF) | 2026 HTML name + URL (not copied onto the PDF row) |
|---|---|
| **Bell-Carter Packaging**, Modesto, 209-549-5939 | Bell-Carter Packaging — http://www.bcpackaging.com (CSV already has http://bcpackaging.com from PDF) |
| **Bella Viva Orchards**, Denair, 800-552-8218 | Bella Viva Orchards — http://www.bellaviva.co (truncated vs PDF http://bellaviva.com) |
| **Blossom Valley Foods**, Gilroy, 408-848-5520 | http://www.blossomvalleyfoods.com |
| **E. Waldo Ward & Son**, Sierra Madre, 800-355-9273 | https://waldoward.com/ vs CSV http://waldoward.com |
| **George Chiala Farms**, Morgan Hill, 408-778-0562, **no website in CSV** | George Chiala Farms, Inc. — http://www.gcfarmsinc.com |
| **Pacific Choice Brands, Inc.**, Fresno, 559-237-5583 | Pacific Choice Brands — http://www.pacificchoice.com vs CSV http://www.pacificchoicebrands.com |
| **Santini Foods, Inc.**, San Lorenzo, 510-317-8888 | http://www.santinifoods.com vs CSV http://santinifoodsinc.com |
| **Sonoma Gourmet**, Sonoma, 707-939-3700 | https://www.sonomagourmet.com/ vs CSV http://sonomagourmet.com |
| **Timber Crest Farms**, Healdsburg, 888-374-9325 | http://www.timbercrest.com |
| **Triple H Food Processors**, Riverside, 951-352-5700 | https://www.triplehfoods.com vs CSV http://www.triplehfoods.com |

Also on the 2026 page, **not** represented as UC Davis-only CSV rows because another source already claimed the name+state: **Universal Pure** (PSU, CT only; 2026 says CA+CT), **Maryland Packaging** (PSU, Elkridge MD).

2026-only names in CSV (almost all city/phone/email blank — name+URL+state): **Aaron Thomas Company, Inc.**, **Bella Sun Luci/Mooney Farms**, **Caffe Del Mar**, **Cappucine**, **Gil's Gourmet Gallery**, **Gimbal Fine Candies**, **Heiden's Foods**, **Ibitta Enterprises, Inc.**, **Kitchentown**, **Maison de Monaco**, **Michael's Cookies Inc.**, **Mrs. Leeper's Pasta Inc.**, **Preserve Farm Kitchens**, **Radich Bor-do-lay, Inc.**, **RW Garcia Co. Inc.**, **Santa Barbara Olive Co., Inc.**, **Specialty Enzymes & Probiotics**, **Thatcher's Gourmet Popcorn**, **The Graceful Cookie**, **Traina Foods**, **Valley Lahvosh Baking Co.**, **Ventura Foods**, **Z Specialty Food, LLC**, plus non-CA **Ajinomoto, North America, Inc.** (NC), **Mitsubishi International Food Ingredients, Inc.** (NJ), **National Foodworks Services, LLC** (IL), **West Coast Co-Packer** (OR).

2015-only (in CSV, not on the 2026 name list): **Ajmera Innovations**, **Purveyor's Kitchen**, **Golden West Specialty Foods, Inc.**, **Garry Packing, Inc.**, **Capay Canyon Ranch**, **ABCO Labs**, **Fruit Fillings Inc.**, **Valley Fig Growers**, **Stapleton Spence**, **Sona & Hollen**, **Kagome**, **Wine Country Kitchens**, **Ramar Foods International Inc.**, **Cascade Continental Foods**, **K&G Custom Foods Inc.**, **Esco Foods, Inc.**, **Day-Lee Foods, Inc.**, **Premier Foods, LLC**, **Food Imagineering**, **SupHerb Farms**, **American Natural & Organic Spices, Inc.**, and the dropped **California Concentrate Co.**

Contact-depth overlap is near zero: 2015 has phones/emails/cities; 2026 has websites. Because the overlapping names were not merged, 2026 HTTPS URLs never updated the 2015 rows (Sonoma Gourmet, Waldo Ward, Triple H, Pacific Choice host change, Santini host change, Chiala website missing).

---

## 6. Coverage

### By state (CSV `state`)

| State | n | State | n | State | n |
|---|---:|---|---:|---|---:|
| MN | 55 | CA | 54 | PA | 32 |
| TX | 30 | FL | 27 | NY | 26 |
| NJ | 14 | MI | 11 | NC | 11 |
| GA | 10 | OH | 7 | WI | 7 |
| MA | 5 | CT | 4 | ME | 4 |
| IL | 3 | MD | 3 | CO | 2 |
| IN | 2 | NH | 2 | RI | 2 |
| OR | 1 | WA | 1 | SC | 1 |
| UT | 1 | VA | 1 | VT | 1 |
| (blank) | 1 |  |  |  |  |

27 states + 1 blank. No plants in AL, AZ, AR, DE, HI, ID, IA, KS, KY, LA, MS, MO, MT, NE, NV, NM, ND, OK, SD, TN, WV, WY, DC (among others).

### Called-out states

**IL (3).** **National Foodwork Services** (Decatur, Cornell), **National Foodworks Services, LLC** (blank city, UC Davis — same website), **PacMoore Innovation Lab** (Gridley, a pilot extruder, not a full IL plant roster). Net ~2 firms. sources.md cites 3PL Hub’s 76 IL co-mans. Illinois is a hole.

**OR (1).** **West Coast Co-Packer**, city blank, no phone/email, UC Davis URL only (`http://westcoastcopacker.com/`). Cornell text actually describes Salem, OR hot/cold fill under a West Coast CoPacker paragraph, but that copy was not attached to this row. ODA PNW locator (`raw/oda-pnw-locator-notes.md`, `additions-pnw.csv`) was **not** merged into the starter CSV.

**WA (1).** **Nilda's Desserts** — not a Washington plant. Cornell lists Poughkeepsie, NY. True WA coverage in this CSV is **zero**.

**WI (7).** Six from MN MDA (**Great River Organic Milling** Cochrane, **Croix Valley Foods** Hudson, **TWT Sauce Inc.** Hudson, **Lakeside Foods Inc.** Manitowoc, **Kaye Family Foods** River Falls, **PURIS** Turtle Lake) plus **Earth Ranch** (Cornell, city mangled to Passage Jackson). FaB Wisconsin member page was 404 (`raw/fab-wisconsin.html`); DATCP license PDF not ingested. No FaB names (Maglio, Create-A-Pack, Krier, etc.) were copied from snippets, correctly.

**MI (11).** Ten MFPA processor rows + **Traverse Bay Farms** (South Bellaire, Cornell). No MDARD/MSU co-packer roster. See §7.

### By process token (195 rows have ≥1; a row can have several)

sauces 79, beverage 75, acidified 44, cold-fill 40, bakery 39, frozen 24, dry-blend 21, canning 14, dairy 11, chocolate 10, snacks 10, meat 10, hot-fill 7, dehydration 3, HPP 3, spray-dry 3, fermentation 1, HTST 1, extrusion 1, stick-pack 1.

HPP only where the letters appear (e.g. **Universal Pure** products contain “(HPP)”). Texas’s 30 `acidified` tags are the footnote, not per-plant evidence except the footnote’s “most”. `bakery` 39 and `cold-fill` 40 are inflated by that same footnote (~29 extra each).

### Blank rates (n=318)

| Field | Filled | Blank | Blank % |
|---|---:|---:|---:|
| phone | 278 | 40 | 12.6% |
| email | 179 | 139 | 43.7% |
| website | 188 | 130 | 40.9% |
| processes_inferred | 195 | 123 | 38.7% |
| moq | 60 | 258 | 81.1% |
| certs | 53 | 265 | 83.3% |
| city | 284 | 34 | 10.7% |
| state | 317 | 1 | 0.3% |
| product_types_raw | 247 | 71 | 22.3% |
| notes | 106 | 212 | 66.7% |

Matches sources.md phone 278 / email 179 / website 188 / process 195 / MOQ 60.

**MN websites:** 0 of 55 MDA rows have a website (phones/emails are strong). That is the sources.md hole, confirmed.

UC Davis 2026 rows are the bulk of blank phone+email+city among CA/IL/OR/NC/NJ.

---

## 7. Not-clearly-copacker rows

Taken from `notes` / `product_types_raw` / `source_name` as they stand. Not a web-research judgment.

### MFPA processors (source itself says processors; co-pack not always stated)

All 10 from `https://www.michfpa.org/processors/`:

- **Bayview Food Products / Mr. Chips Inc.** (Pinconning) — notes: “MFPA processor listing; co-pack not explicitly stated”
- **Burnette Foods** (Elk Rapids) — processor; multiple plants
- **Coloma Frozen Foods** (Coloma) — processor
- **Freestone Pickle Company Inc.** (Bangor) — “contract tanking”
- **Harrison Packing Co., Inc.** (Kalamazoo) — “brine stock and contract tanking”
- **Honee Bear Canning Company** (Lawton) — staff title “Purchasing/Co-Pack Liaison” only
- **Indian Summer Cooperative, Inc.** (Ludington) — processor
- **Michigan Food Processor Coop. Inc.** (Ludington) — processor; same phone as Indian Summer
- **Leelanau Fruit Company** (Suttons Bay) — processor
- **Michigan Freeze Pack** (Hart) — “Frozen IQF vegetables; bagging services”

### Kitchens / incubators / shared-use

- **UTEC Community Kitchen** (Lowell, MA) — Cornell notes “may include shared-use services”; name is a kitchen; products blank.
- **Blue Ridge Food Ventures** (Candler, NC) — “also listed under commercial kitchens”; products blank.
- **Genuine Local** (Laconia, NH) — “shared use production facility … business incubator services … Also offer co-packing”.
- **BAO Food and Drink Organic Food Incubator, New Jersey** — “commercial kitchen rental space available. Further services can provide: small batch co-packing”.
- **The Organic Food Incubator** (Bloomfield, NJ, PSU) — copack language is clearer (25 gallons); same website as BAO.
- **Hope and Main** (Warren, RI, NC) — empty products; NC copackers subsection but no process text.
- **Virginia Food Works** (Farmville, VA) — “Co-packing and commercial kitchen”.
- **Maryland Packaging** (Elkridge, MD, PSU) — “Commercial Kitchen, Co-Packing, Commercial juicing, Logistics, Cold Storage”.
- **South Amboy Kitchen LLC** (South Amboy, NJ) — kitchen mission statement, not a co-pack spec.
- **North Fork Specialty Kitchen** (Cutchogue, NY) — name; products blank in CSV.
- **Agricultural Incubator Foundation** (Bowling Green, OH) — incubator; `product_types_raw` is an undecoded email (`aif [at] agincubator.org`), not products.
- **Nilda's Desserts** — Cornell: “Shared use kitchen, co-packing…” (text lost in CSV).
- **Palmieri Food Products, Inc.** / **Gourmet Products, Inc.** / **Five Way Foods** / **Dolce Amore** — Cornell kitchen-mode note “may include shared-use services” (these four also have some pack language).
- **Kitchentown** / **Preserve Farm Kitchens** (UC Davis) — names only; no products.

### Brokers / finders / marketing

- PSU **Snack Foods Brokerage Firm** was excluded (not in CSV) — correct.
- **Middle Eastern Delites Copackers** (Toledo, OH, Cornell): products “consulting, product placement, marketing support, financing” plus some condiment types. Broker-ish hybrid; not a described plant process.

### Packaging-only / fulfillment / ingredients (no clear food-process co-pack)

- **Bell-Carter Packaging** (Modesto, CA, 2015 PDF): “Station packaging and assembly line services”.
- **Cascade Continental Foods** (Richmond, CA): “Packaging lines for liquid and dry food products”.
- **Aaron Thomas Company, Inc.** (CA, UC Davis): website packaging.com; no products.
- **All Wrapped Up** (Ft. Lauderdale, FL, UF): “specialty food packaging”; gifts domain.
- **Michigan Freeze Pack** — bagging services (also MFPA).
- **Chippewa Packaging Inc.** (Saint Peter, MN): “Dry food packaging: pre-made pouches, form fill and seal; blending”.
- **Maco Packaging** (Newark, NY): “custom manufacturer of packaging and provider of packaging solutions” (Cornell also says co-packing).
- **Millennium Packaging Service, Inc.** (Carbondale, PA): “Fulfillment of dry food, confectionary, and snacks into flexible and rigid packaging” (PSU also says primary & secondary co-packing in services).
- **Specialty Enzymes & Probiotics** (CA, UC Davis) — name; no products.
- **Mitsubishi International Food Ingredients, Inc.** (NJ, UC Davis) — ingredients, not a co-packer directory entry with process text.
- **All American Foods Inc.** (Mankato, MN): “bulk ingredients”.
- **PURIS** (Turtle Lake, WI): “Plant-based ingredients and protein isolates … flour tolling”.
- **Ajinomoto, North America, Inc.** (NC, UC Davis) — name+URL only.

**Not-clearly-copacker count (conservative unique names above, excluding hybrids that also say co-pack in the same field):** **28** core (10 MFPA + UTEC, Blue Ridge Food Ventures, Genuine Local, BAO incubator, Hope and Main, South Amboy Kitchen, North Fork Specialty Kitchen, Agricultural Incubator Foundation, Nilda's Desserts, Kitchentown, Preserve Farm Kitchens, Middle Eastern Delites, Bell-Carter, Cascade Continental, Aaron Thomas, All Wrapped Up, Chippewa Packaging, Specialty Enzymes, Mitsubishi ingredients, All American Foods, PURIS, Ajinomoto). Another ~10 are **hybrids** (Maryland Packaging, Virginia Food Works, Organic Food Incubator / PSU, Maco, Millennium, Five Way Foods, Palmieri, Gourmet Products, Dolce Amore, Michigan Freeze Pack already in MFPA).

---

## Counts for the parent report

| Bucket | Count |
|---|---:|
| CSV rows / unique name+state / unique name+city+state | 318 / 318 / 318 |
| Remaining dupe clusters (2+ rows) | **11** (PacMoore is 3 rows; plus 10 pairs) |
| Phone / email / website dupe groups | 6 / 4 / 4 |
| Unsourced process flags / rows | **178 / 116** |
| Contradictions called out in §5 | **16** plant-level conflicts + **10** CA 2015∩2026 name overlaps that were not merged |
| Not-clearly-copacker (core) | **28** |
| Orphan source_urls | **0** |
| Claimed-but-missing source rows | comanufacturers.com ×2, California Concentrate Co., California Spice Basket, Vor Foods |

### 5 worst holes

1. **Oregon / Washington are empty in practice.** OR = one URL-only row (**West Coast Co-Packer**). WA = one misfiled NY kitchen (**Nilda's Desserts**). ODA PNW locator was fetched as JS-only; `additions-pnw.csv` exists beside the starter file and was not merged.
2. **Illinois is three rows that are two firms** (National Foodworks twice + PacMoore’s Gridley lab) against 3PL Hub’s published 76 IL co-mans (`copackers-sources.md`).
3. **MOQ 81% blank and certs 83% blank.** Outside MN MDA (and a handful of PSU/CA notes) the sheet cannot filter the way the niche brief requires.
4. **Process tags are not source-faithful.** 116/195 tagged rows fail the word test; 30 TX plants share Eilenberger/Son footnote tags; synonym inference invented `beverage`/`dairy`/`chocolate` from coffee/juice/gelato/candy.
5. **Michigan and Wisconsin are processor lists and leftovers, not co-packer directories.** MI = 10 MFPA processors + 1 Cornell farm. WI = 6 MN-MDA spillover + 1 mangled Cornell row. FaB Wisconsin 404; DATCP PDF correctly not ingested.

Honorable mention (would have been #6–8): CA 2015 vs 2026 non-merge (stale phones, unused 2026 URLs); MN 55/55 websites blank; Cornell parse wrecks (**Nilda's Desserts**, **Mikesell's**, **Earth Ranch**, **Pulp Kitchen**, PacMoore HQ, Lupo email) that make those rows unsafe to email as-is.

---

*Audit output: `/workspace/niche-research/copackers-review.md`. Input CSV untouched.*
