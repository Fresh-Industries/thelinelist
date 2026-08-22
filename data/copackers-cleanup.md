# Co-packer cleanup — 2026-08-21

Worked on `/workspace/niche-research/copackers.csv`. Starter snapshot `/workspace/niche-research/copackers-starter.csv` (318 rows) was **not** overwritten. 3PL Hub was not touched. No plants were emailed. No emails, phones, or capabilities were invented.

- Starting data rows: **771**
- Final data rows: **763** (8 true DBA/alias pairs collapsed)
- Columns: same as before plus `process_for_pages` immediately after `processes_inferred`
- Dirty snapshot: `/workspace/niche-research/copackers-pre-cleanup.csv` (771 rows, 13 columns)

## 1. Field-leak fixes

### Mikesell's Snack Food Company (Dayton, OH)

| Field | Old | New |
|---|---|---|
| website | `http://www.tulkoff.com/` | *(cleared)* |
| email | `jstevenson@mike-sells.commikesell` | `jstevenson@mike-sells.com` |

Source quotes from `/workspace/niche-research/raw/cornell-text.txt`:

> Email: JStevenson [at] mike-sells.com
>
> Mikesell's Snack Food Company is a 110 year old snack food manufacturer in Dayton, OH. … Potato chip, kettle chip, extruded snacks, pretzels, pork rinds, dips.

The Mikesell block prints **no website**. The next Cornell listing is Tulkoff Food Products, Inc. (Cincinnati) which prints `Website: http://www.tulkoff.com/`. Notes appended: `review: tulkoff.com leaked from prior Cornell block; cleared`.

Product/MOQ text on this row still contains Tulkoff's `40,000 cases…` bleed (not in the requested leak list; left as-is, not invented-over).

### Lupo's Bottling LLC (Endicott, NY)

| Field | Old | New |
|---|---|---|
| email | `theresa.hinckley@macobag.com` | `lupostephen@gmail.com` |

Source quote from Cornell Lupo block:

> Email: theresa.hinckley [at] macobag.com (lupostephen[at]gmail[dot]com)

Maco Packaging (Newark, NY) left on `theresa.hinckley@macobag.com` (Cornell Maco block: `Email: theresa.hinckley [at] macobag.com (theresa[dot]hinckley[at]macobag[dot]com)`). Notes appended: `review: Cornell parenthetical email used; Maco string was parser bleed`. Two rows kept.

### PacMoore Products (Corporate Headquarters) (Hammond, IN) — fill blanks only

| Field | Old | New |
|---|---|---|
| phone | *(blank)* | `866-610-2666` |
| email | *(blank)* | `jwarren@pacmoore.com` |

Source quote from Cornell Indiana stacked firm block (HQ + Mooresville):

> Phone: 866-610-2666
> Contact: Josh Warren, Business Development Specialist
> Email: jwarren [at] pacmoore.com (jwarren[at]pacmoore[dot]com)

Three PacMoore rows kept. Website on HQ left blank (not in the requested copy list). Notes: `review: multi-site PacMoore; contacts copied from Cornell firm block onto blank HQ fields`.

## 2. Collapses (from-name → kept-name)

Keep the named survivor; union blank fields only; join distinct `source_url` / `source_name` with ` | `. Each kept row notes `review: collapsed DBA/alias`.

| From (dropped) | Kept | Why keep that row | Extra notes |
|---|---|---|---|
| Crave Co-Packing | Crave Copacking | PSU row has website `cravecp.com` plus same phone/email | — |
| Lancaster Fine Foods | Lancaster Fine Foods (Stir Foods) | PSU row has products; contacts otherwise equal | Cornell 2320 Norman Rd vs PSU 2316 Norman Rd |
| Zilks Foods, LLC | ATX Specialty Foods | ATX has sourced email `info@atxspecialtyfoods.com`; unioned `http://www.zilksfoods.com` | Same Texas AgriLife phone 512-633-8904 |
| Victoria Packing | Victoria Fine Foods (formerly Victoria Packing) | Cornell has email + phone 718-927-3000; unioned PSU products | `review: PSU lists 719-927-3000, likely OCR` |
| Byler's Relish House | Bylers Relish House | PSU row has email + ext 103 + products | same Saegertown / 18258 Leimbach Rd |
| National Foodworks Services, LLC | National Foodwork Services | Cornell Decatur row has city + phone 217.330.8512; unioned UC Davis URL | same nationalfoodworks.com |
| BAO Food and Drink Organic Food Incubator, New Jersey | The Organic Food Incubator | PSU Bloomfield + email; unioned Cornell phone 973-748-0111 | same organicfoodincubator.com; Cornell city field was the company name |
| Imperial Co-Packing Espuna (Pata Legra LLC) | Pata Negra LLC | **kept Pata Negra spelling**; unioned Imperial website/products onto Pata Negra row (email already filled `info@patanegrausa.com`) | Cornell heading uses Legra typo for Negra |

## 3. Not collapsed (real multi-site or distinct plants)

| Rows | Action |
|---|---|
| PacMoore Innovation Lab (Gridley, IL); PacMoore Products (Corporate Headquarters) (Hammond, IN); PacMoore Process Technologies (Mooresville, IN) | **Three rows kept.** Shared 866-610-2666 / jwarren@pacmoore.com copied onto blank HQ only. |
| Ventura Foods (CA, UC Davis) and Ventura Foods (Salem, OR, ODA) | Kept both. |
| Heritage Specialty Foods (Grand Prairie, TX) and Heritage Specialty Foods, LLC (Milwaukie, OR) | Kept both. |
| Tulkoff Food Products (Baltimore, MD) | No Cincinnati OH row invented. Cornell mentions SQF plants in Baltimore, MD and Cincinnati, OH but has no full sourced OH contact block in this sheet to add. |
| Universal Pure (Meriden, CT, PSU) | UC Davis HTML is only `Universal Pure (Beverage co-packing in California and Connecticut)` + URL — **no city/phone/email**. No CA row added from UC Davis. A PickYourOwn CA row already in the sheet was left in place (not invented this pass). |
| Indian Summer Cooperative, Inc. and Michigan Food Processor Coop. Inc. (both Ludington, MI, phone 231-845-6248) | Left two rows (both already processor-not-copacker). |
| Lupo's Bottling LLC and Maco Packaging | Left two rows after the Lupo email fix. |

Existing Universal Pure non-CT row(s) left untouched: Mira Loma, CA (phone (951) 582-3828; https://www.pickyourown.org/copackers-California.php).

## 4. process_for_pages

Filled only when `product_types_raw`, `notes`, or `processes_inferred` contain a source-named token (word / hyphen variants). Multiple buckets joined with `; ` in priority order HPP, hot-fill, retort, sauce/condiment. No synonym mapping (juice↛beverage, candy↛chocolate, etc.).

| Token | Rows containing it |
|---|---:|
| HPP | 8 |
| hot-fill | 29 |
| retort | 1 |
| sauce/condiment | 195 |
| *(blank)* | 550 |

Rows with any fill: **213**. Rows with more than one bucket: 19.

Match rules: `HPP` / `high pressure` / `high-pressure processing`; `hot-fill` / `hot fill` / `hotfill`; `retort`; `sauce(s)` / `salsa(s)` / `condiment(s)` / `dressing(s)` / `marinade(s)`.

## 5. Paths / hygiene

- Overwrote `/workspace/niche-research/copackers.csv`
- Dirty snapshot: `/workspace/niche-research/copackers-pre-cleanup.csv`
- Changelog: `/workspace/niche-research/copackers-cleanup.md`
- Starter snapshot untouched: `/workspace/niche-research/copackers-starter.csv` (sha256 8e1aa767f8e1f38c77354e6fb0ba9234114412cd7e158edbae5349546b22285f)
- Final contacts: phone 708 / email 588 / website 605
