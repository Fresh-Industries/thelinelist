# Product Workspace Production Architecture

Status: implementation handoff
Date: 2026-08-28
Scope: move the approved living-document sourcing workspace into the production Next.js app without redesigning the experience.

## 1. Pre-migration architecture snapshot

The production app already has a working sourcing domain, but its presentation and persistence predate the approved experience.

- `/sourcing` is a client-rendered landing page with two competing entry paths, a local-storage recent-products area, and demo framing.
- `/sourcing/[workspaceId]` is the production workspace. It currently presents stage navigation, a large product pedestal, a separate manual-answer path, match selection, outreach review, and human send controls.
- `lib/sourcing/types.ts`, `schemas.ts`, `workspace.ts`, `matching.ts`, `readiness.ts`, and `outreach.ts` contain useful domain behavior: typed sourcing fields, provenance, readiness checks, evidence-backed manufacturer matches, multi-recipient draft preparation, approval state, and activity history.
- The real package mockup builder lives in `components/product-visuals`. It supports the existing jar, bottle, can, and stand-up pouch models and must remain part of the product journey.
- The approved interaction and visual source is `design-explorations/product-workspace/refined-prototype`. It establishes the living document, product collaborator, packaging workbench, match continuation, and introduction review. Production will port this direction rather than invent a new one.
- Current workspace authorization is effectively possession of a workspace URL. The production migration replaces that with server-verified user or guest ownership on every read and mutation.

## 2. Current Vercel Blob usage

| Use | Current location | Production decision |
| --- | --- | --- |
| Sourcing workspace JSON | `lib/sourcing/store.ts` | Move to PostgreSQL as the canonical `ProductWorkspace.plan` JSON. |
| Public packet token lookup | `lib/sourcing/store.ts` | Move token hash, snapshot, expiry, and revocation metadata to PostgreSQL. |
| Send idempotency locks | `lib/sourcing/store.ts` | Retire with the legacy send path. No agent or automatic send is exposed. |
| Uploaded product artwork bytes | `lib/sourcing/store.ts` | Keep in private Blob storage; store only metadata and ownership linkage in PostgreSQL. A filesystem adapter remains development-only. |
| Lead/claim submission JSON | `lib/leads/store.ts` | Move structured lead records and duplicate fingerprints to PostgreSQL. Owner email remains a notification channel, not the system of record. |

After the migration, Blob is only for binary assets such as uploaded artwork. Structured application state is PostgreSQL-owned.

## 3. Current WebMCP integration

`components/sourcing/WebMcpSourcingTools.tsx` progressively registers five browser tools through `document.modelContext` (with the existing compatibility fallback):

1. `get_sourcing_workspace`
2. `update_sourcing_workspace`
3. `match_manufacturers`
4. `prepare_manufacturer_outreach`
5. `open_manufacturer_introduction_review`

There is no WebMCP send tool, which is the correct safety boundary. The migration keeps the compact tool set and updates every input/output to the canonical ProductPlan. Tools receive workspace IDs and revisions, while the server derives the actual user or guest owner from the authenticated session and secure cookie. Tool descriptions make the journey order explicit: understand the idea, identify the next unresolved decision, update the plan, open the real packaging workbench when useful, match only from supported evidence, then prepare an introduction for visible founder review. The UI does not launch an external AI website or imply a cross-tab connection; the supported WebMCP agent integration is the Codex app.

## 4. Proposed Prisma schema

The PostgreSQL schema is intentionally small:

- Better Auth models: `User`, `Session`, `Account`, and `Verification`.
- `ProductWorkspace`: ownership (`userId` or `guestTokenHash`), expiry, lifecycle status, optimistic `revision`, indexed display fields, and the canonical typed `plan` JSON.
- `WorkspaceActivity`: append-only actor, event kind, summary, and optional structured change details.
- `WorkspaceAsset`: private Blob pathname plus safe file metadata; never the file bytes.
- `ManufacturerPacket`: hashed public token, review snapshot, expiry, and revocation metadata.
- `LeadSubmission`: existing introduction/claim lead records and duplicate fingerprints, replacing Blob JSON.

The `plan` column stores one versioned, Zod-validated `ProductPlan`. It contains the evolving sourcing decisions and provenance, packaging configuration, evidence-backed matches, selected manufacturers, outreach drafts/inquiries, and unresolved questions. Row columns are ownership, lifecycle, concurrency, and query indexes; they are not a second editable product model.

## 5. Better Auth setup

Better Auth uses its Prisma adapter and database sessions. Email/password is the minimum supported method. The catch-all handler lives at `/api/auth/[...all]`, with client helpers isolated in `lib/auth/client.ts` and server session access isolated in `lib/auth/server.ts`.

Required production environment variables:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET` (at least 32 characters of high-entropy secret material)
- `BETTER_AUTH_URL` (the canonical site origin)

The app fails closed for persistence/auth-dependent operations when these variables are absent in production. No client-supplied user ID is accepted.

## 6. Guest claim flow

1. A guest submits the single `/sourcing` idea form.
2. The server creates a random guest credential, stores only its SHA-256 hash on `ProductWorkspace`, and returns the raw credential only in a secure `HttpOnly`, `SameSite=Lax` cookie. The row receives a 30-day expiry.
3. Every private workspace GET, PATCH, match, artwork, claim, and outreach request resolves ownership in the server data-access layer. Access is allowed only when the Better Auth user owns the row or the presented guest credential hash matches the unclaimed row. A shared packet is intentionally bearer-accessible, but only through its server-hashed, unexpired, unrevoked token.
4. The founder can use the entire workspace before signing in.
5. When they choose Save, `/auth?workspaceId=...` creates or restores a Better Auth session.
6. `POST /api/sourcing/[workspaceId]/claim` performs a transactionally guarded ownership update: the row must still be unclaimed, unexpired, and match the guest hash. It assigns `userId`, clears `guestTokenHash` and `expiresAt`, records `claimedAt`, appends activity, and expires the guest cookie.
7. The same workspace ID and state continue at `/sourcing/[workspaceId]`; no copy or fork is created.

## 7. Migration plan

1. Add Prisma 7 configuration, generated client, schema, and an initial SQL migration without connecting to any production database.
2. Add the canonical ProductPlan Zod schema and adapters for the existing sourcing domain.
3. Add the server-only PostgreSQL data-access layer, ownership checks, guest cookie helpers, revision conflicts, and file metadata.
4. Add Better Auth, email/password UI, claim endpoint, and authenticated `/products` list.
5. Move workspace, packet, and lead structured state off Blob. Keep only artwork bytes in private Blob storage.
6. Replace `/sourcing` with the one-path idea handoff and remove demo/recent/manual branches.
7. Port the approved living-document workspace into the production route, preserving the real package builder and evidence-backed multi-manufacturer path.
8. Update WebMCP to the canonical plan and remove legacy send capability from the workspace journey.
9. Update UX, environment, WebMCP, and storage documentation.
10. Run Prisma validation/generation, type/lint/unit checks, production build, browser acceptance flow, and the anonymous-to-authenticated claim smoke against a disposable non-production PostgreSQL instance.

## 8. Files and routes to change

### New infrastructure and auth

- `prisma/schema.prisma`
- `prisma/migrations/*`
- `prisma.config.ts`
- `lib/db/prisma.ts`
- `lib/auth/{server,client}.ts`
- `app/api/auth/[...all]/route.ts`
- `app/auth/page.tsx`
- `components/auth/AuthForm.tsx`

### Canonical workspace and ownership

- `lib/sourcing/product-plan.ts`
- `lib/sourcing/access.ts`
- `lib/sourcing/store.ts`
- `lib/sourcing/types.ts`
- `lib/sourcing/schemas.ts`
- all `app/api/sourcing/**/route.ts` handlers
- new `app/api/sourcing/[workspaceId]/claim/route.ts`

### Production experience

- `app/sourcing/page.tsx`
- `app/sourcing/[workspaceId]/page.tsx`
- `app/sourcing/sourcing.css`
- `components/sourcing/SourcingLanding.tsx`
- `components/sourcing/SourcingWorkspace.tsx`
- `components/sourcing/WebMcpSourcingTools.tsx`
- existing `components/product-visuals/**` only where an integration correction is required
- new `app/products/page.tsx` and small supporting client controls

### Structured storage and documentation

- `lib/leads/store.ts` and related lead types/tests
- `.env.example`
- `docs/env.md`
- `docs/sourcing-webmcp.md`
- `UX.md`
- `docs/product-workspace-design-constraints.md`
- focused sourcing, auth, storage, and browser tests

## Non-negotiable boundaries

- Unknown manufacturer capabilities remain unknown; they never become matches by omission or inference.
- The agent proposes, the founder visibly reviews/approves, and any external send remains a separate human action. No WebMCP tool sends a message.
- The founder can directly correct document values inline, but there is no competing manual-builder journey.
- The package workbench is a focused subflow of the living document and writes its result back into the same ProductPlan.
- Multiple manufacturers can be selected for introduction preparation. Each recipient gets its own reviewable draft and approval state.
- Production database credentials are never used during this repository migration.
