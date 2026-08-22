# The Line List

Public US food co-packer directory and Tuesday weekly for CPG brand operators. Fresh Industries.

Live: https://the-line-list.vercel.app

The product is a searchable directory of **plant-site-verified** companies. Manufacturer facts stay sourced from the plant’s own site. Unpublished fields stay unpublished. We do not invent plants, phones, emails, MOQs, certs, or search volumes.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

```bash
npm run build
npm start
```

The Next.js app lives at the repo root (Vercel / App Router). Node 20+.

## Data rule

The public directory is the plants already named on the process pages (HPP, hot fill, retort, small MOQ, sauce) — about 36 unique companies after overlap.

- Source of truth for those facts: `lib/directory/plants.ts`
- Query / filter layer (swap-ready for a later database): `lib/directory/query.ts`
- Pages render that data. Guide tables are not a second copy of manufacturer facts.

`data/copackers.csv` is a **public-list lead sheet** (extension lists, locators, visitor rosters). It is **not** a live verified directory. Do not publish unverified CSV rows as company cards.

`linelist-site/` is the archived vanilla HTML. `content/` holds earlier guide drafts.

## Routes

- `/` — finder (“Find the right US co-packer for your product.”)
- `/copackers` — company cards (query: `product`, `process`, `smallMoq=1`, `state`)
- `/copackers/[slug]` — one verified plant
- `/about`, `/glossary`
- `/guides/hpp`, `/guides/hot-fill`, `/guides/retort`, `/guides/small-moq`, `/guides/sauce`

Old `.html` paths redirect to the new routes. Thin pages such as `/copackers/texas` are **not** generated yet. `sites.state` and `finderProducts` on each plant are the slice keys for when a slice has enough verified plants.

## What the finder can filter

Only coverage the verified set actually supports:

- Product: Beverage, Sauce / condiment, Prepared / refrigerated RTE, Not sure
- Process: HPP, Hot fill, Retort, Not sure
- Optional: published small MOQ only — any verified plant whose own site printed a numeric or stated floor, not the six-row small-MOQ guide set; state from verified plants’ city/state
- Empty product/process tags mean unknown. “Not sure” still lists those plants; we do not hide a verified plant because we refused to guess a tag.

No Snacks, Frozen, Supplements, or Cold fill filters — we do not have verified coverage.

## Future slots (not built)

Sponsored listings render in `components/ads/SponsoredSlot.tsx`. They sit beside organic results and are **not** a sort key. Organic order is name, then slug.

The Tuesday newsletter field is visual only (`hello@thelinelist.com` is a placeholder; the list is not open).

Later additions that should not require a frontend rebuild: ads, analytics, newsletter backend, saved companies, accounts, admin, programmatic SEO, a real database behind `lib/directory/query.ts`.
