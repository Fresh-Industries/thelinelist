# The Line List

The Line List helps food and beverage founders turn an early product idea into a manufacturer-ready brief, evidence-backed possibilities, and founder-controlled introductions.

- **Live app:** [thelinelist.com/sourcing](https://www.thelinelist.com/sourcing)
- **Demo video:** **TODO before submission — add the public challenge video URL here.**
- **License:** [MIT](LICENSE)

## The problem

Early-stage founders often know the product they want to make but not the manufacturing language, packaging constraints, production volumes, or evidence needed for a useful first conversation. The Line List keeps those unknowns visible, turns founder decisions into a living product brief, and searches reviewed public manufacturer information without presenting missing data as proof.

## Why WebMCP fits

Sourcing is conversational, but the result cannot live only in a chat transcript. WebMCP lets an agent collaborate with the same persistent product state the founder sees and edits in the browser. The agent can structure explicit answers, stage packaging work, research manufacturer possibilities, and prepare reversible drafts; The Line List owns provenance, evidence, persistence, visual review, and consequential approval.

The demonstrated flow is:

> Product idea → living brief → packaging direction → evidence-backed manufacturer possibilities → founder-selected shortlist → introduction drafts → founder approval and separate send confirmation

### Founder and agent responsibilities

The founder reviews and edits the visible brief, chooses a package direction, selects up to three manufacturers, reviews each exact introduction, approves that version, and separately confirms **Send now**. The agent reads the canonical workspace, records explicit founder statements, keeps inferences proposed, stages supported package previews, runs evidence-backed matching, and prepares recipient-specific drafts. There is no agent-callable send tool.

## WebMCP tools in the current implementation

The sourcing landing page registers:

- `create_sourcing_workspace`

An authorized workspace registers:

- `get_sourcing_workspace`
- `update_sourcing_workspace`
- `get_package_design`
- `preview_package_design`
- `generate_package_artwork`
- `stage_package_artwork`
- `refine_package_design_in_3d`
- `undo_last_agent_change`
- `export_product_packet`
- `audit_outreach_readiness`
- `match_manufacturers`
- `prepare_manufacturer_outreach`
- `open_manufacturer_introduction_review`

Registration lives in [`components/sourcing/WebMcpSourcingTools.tsx`](components/sourcing/WebMcpSourcingTools.tsx) and [`components/sourcing/SourcingLanding.tsx`](components/sourcing/SourcingLanding.tsx). Canonical state, validation, matching, persistence, and outreach live under [`lib/sourcing`](lib/sourcing), with HTTP boundaries under [`app/api/sourcing`](app/api/sourcing).

## Safety controls

- Explicit founder statements may be confirmed; agent inference and research remain proposed.
- Manufacturing feasibility, shelf life, packaging compatibility, certifications, and similar professional claims retain separate validation status.
- Unknown or conflicting manufacturer facts remain visible and never become a match by omission.
- A zero-result search is not silently broadened; the founder reviews the exact change first.
- Packaging work opens as a visible staged preview and becomes canonical only after the founder selects **Use this package direction**.
- Manufacturer selection, exact-draft approval, and **Send now** are visible founder actions. Nothing is contacted from a WebMCP tool.

## Architecture and stack

This is a Next.js 16 App Router application using React 19 and TypeScript. PostgreSQL and Prisma store workspaces, ownership, activity, packet metadata, and lead submissions. Better Auth provides accounts and sessions. Vercel Blob stores private artwork and package-preview bytes; Upstash Redis can provide shared rate limiting. React Three Fiber and Three.js power supported package previews. Vitest and Playwright cover unit and browser flows.

The checked-in manufacturer catalog is sourced public data used by the directory and matching layer. It is not a claim that every listed manufacturer supports every product or package.

## Local development

Requirements: Node.js 20+, npm, and a non-production PostgreSQL database for persistence and authentication flows.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000/sourcing](http://localhost:3000/sourcing). Never point local Prisma or test commands at a production database.

Required production configuration:

```text
DATABASE_URL
BETTER_AUTH_URL
BETTER_AUTH_SECRET
```

Feature-dependent configuration:

```text
BLOB_READ_WRITE_TOKEN
BLOB_STORE_ID
VERCEL_OIDC_TOKEN
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
EMAIL_PROVIDER
RESEND_API_KEY
POSTMARK_SERVER_TOKEN
POSTMARK_MESSAGE_STREAM
NOTIFY_FROM_EMAIL
NOTIFY_TO_EMAIL
NEWSLETTER_PROVIDER
BEEHIIV_API_KEY
BEEHIIV_PUBLICATION_ID
KIT_FORM_ID
KIT_API_KEY
CONVERTKIT_API_SECRET
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_ANALYTICS_PROVIDER
NEXT_PUBLIC_PLAUSIBLE_DOMAIN
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_HOST
```

Safe placeholders and descriptions are in [`.env.example`](.env.example) and [`docs/env.md`](docs/env.md).

## Verification

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run build
npx playwright test tests/e2e/sourcing.spec.ts --project=chrome --workers=1
```

The persistence/auth smoke requires a non-production PostgreSQL database with the checked-in Prisma migration applied.

## WebMCP Challenge

The challenge work meaningfully extended The Line List from public manufacturer discovery into a persistent, agent-native Product Workspace: shared founder/agent state, explicit provenance, WebMCP package staging and artwork generation, evidence-backed matching, private product-plan export, recipient-specific outreach drafts, and founder-only approval/send gates. Normal browser editing remains usable when WebMCP or 3D rendering is unavailable.
