# Product Workspace and WebMCP

This document describes the production Product Workspace integration. Product and design authority remains [`UX.md`](../UX.md) and [`docs/product-workspace-design-constraints.md`](product-workspace-design-constraints.md).

## Founder journey

`/sourcing` has one canonical entry path. With WebMCP, the founder describes the product conversationally and `create_sourcing_workspace` creates the private guest workspace before navigating to `/sourcing/[workspaceId]`. A progressively disclosed manual form creates the same workspace when an agent is unavailable or the founder prefers typing on the page.

The workspace is one living product brief. Its canonical ProductPlan keeps the founder's raw `originalIdea`, optional `brand_name`, and concise `product_type` descriptor separate. The product collaborator asks about an existing brand early without making it a readiness requirement. Direct founder corrections edit that same document inline. Packaging opens as a focused 3D workbench using the production jar, bottle, slim-can, and stand-up-pouch models. Its selected direction writes back into the same ProductPlan, and the brief renders a restrained preview from that exact saved configuration. Manufacturer matching and introduction preparation continue below the document when ready.

The page does not open an external AI website or present a manual prompt handoff. WebMCP is exposed to the Codex app through the model-context API; the normal HTML workspace remains fully usable when that API is unavailable. Agent-authored changes are attributed, highlighted as the latest change, and stored with a one-step undo snapshot.

## Canonical state and persistence

- `lib/sourcing/product-plan.ts` owns the versioned Zod `ProductPlanSchema`.
- UI routes, WebMCP tools, matching, outreach, and persistence use this same model.
- PostgreSQL is the production system of record through Prisma.
- `ProductWorkspace.plan` contains the evolving plan JSON. Row columns own access, lifecycle, revision, and list/query metadata.
- `WorkspaceActivity` is append-only history.
- `WorkspaceAsset` links a workspace to private Blob artwork bytes.
- `ManufacturerPacket` owns expiring packet-token metadata and snapshots.
- Writes use optimistic revision checks; stale writes return `409` instead of overwriting newer changes.

Vercel Blob is not a workspace store. It is used only for uploaded artwork bytes.

## Guest and authenticated ownership

Guests can use the full product flow before signing in.

1. Workspace creation generates a 256-bit random guest credential.
2. PostgreSQL stores only the SHA-256 hash and a 30-day expiry.
3. The browser receives the raw credential in a `Secure` (production), `HttpOnly`, `SameSite=Lax` cookie.
4. Every workspace read and mutation checks either Better Auth user ownership or the exact guest credential hash on the server.
5. Save opens `/auth?workspaceId=...` for email/password signup or login.
6. The claim route transactionally assigns the existing row to the authenticated user, clears the guest credential and expiry, and appends activity.
7. `/products` lists only rows owned by the current authenticated user.

Workspace IDs are identifiers, not authorization credentials. Client-provided user IDs are ignored because no sourcing schema accepts one.

## Registered WebMCP tools

One tool registers on `/sourcing`:

1. `create_sourcing_workspace` — creates the canonical workspace from the founder's idea and navigates into it. It does not match, select, draft, or contact manufacturers.

Eleven tools register only on an authorized workspace page:

1. `get_sourcing_workspace` — reads the canonical plan, readiness, product journey, package direction, matches, and outreach state.
2. `update_sourcing_workspace` — applies explicit founder statements as confirmed and keeps inference/research as proposed or needs-decision. It uses the current server revision.
3. `get_package_design` — reads the saved package direction and valid options.
4. `preview_package_design` — opens a partial agent-staged direction in the 3D workbench without committing it or changing matching.
5. `stage_package_artwork` — uploads generated PNG, JPEG, or WebP artwork and stages it in the visible workbench; the founder still commits the direction.
6. `update_package_design` — applies only complete, explicit founder packaging instructions; exploration uses the preview tool.
7. `undo_last_agent_change` — reverses the current visible agent update after the founder asks.
8. `export_product_packet` — returns an authenticated private PDF download URL and never shares the file externally.
9. `match_manufacturers` — runs once the brief is ready to research and returns supported facts, conflicts, unknowns, URLs, and review dates. It clears selection and never creates a draft. Unknown never means match.
10. `prepare_manufacturer_outreach` — prepares drafts only for the exact manufacturers already selected by the founder in the visible workspace.
11. `open_manufacturer_introduction_review` — opens the human review surface and never sends.

Readiness is deliberately staged: `searchReady` allows sourced discovery with visible unknowns; `manufacturerReady` means the core fit-conversation inputs are confirmed; `launchReady` means the planning brief's commercial fields are filled. None is a safety, regulatory, shelf-life, or production approval.
There is no agent-callable send tool. Draft approval and delivery are separate founder actions: the founder approves the exact version, opens the visible final confirmation, and clicks `Send now`. The server then uses the existing email provider to send from The Line List to the manufacturer’s current sourced public email, copies the founder, and routes replies to the founder. Resend idempotency protects the same draft version from double-click delivery.

Tool guidance tells the agent to:

- read before writing;
- drive one unresolved decision at a time;
- preserve confirmed founder decisions;
- keep “I’m not sure” explicit;
- stage partial package choices and generated artwork in the real workbench, while leaving canonical commit to the founder;
- match only from supported evidence;
- prepare up to three recipient-specific drafts;
- open founder review and stop; only the founder can approve and invoke the visible send confirmation.

## Security and operational limits

- All route inputs are validated with Zod and bounded for length/count.
- Workspace creation rejects oversized request bodies.
- Artwork accepts signature-checked PNG, JPG, or WebP files with a 2 MB limit.
- Create, update, artwork, match, draft, approval, send, and claim routes are rate limited.
- Server authorization occurs at the resource boundary on every route, not only at page rendering.
- Auth and database-dependent operations fail closed when production configuration is missing.
- Manufacturer packet pages expose only the packet’s selected confirmed fields; internal notes, rankings, comparisons, and unconfirmed proposals stay private.

## Required production environment

```bash
DATABASE_URL=
BETTER_AUTH_URL=https://www.thelinelist.com
BETTER_AUTH_SECRET=
BLOB_READ_WRITE_TOKEN=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
EMAIL_PROVIDER=resend
RESEND_API_KEY=
NOTIFY_FROM_EMAIL="The Line List <notifications@mail.thelinelist.com>"
```

`BLOB_READ_WRITE_TOKEN` is needed only for durable artwork uploads. Upstash is used only for shared rate limiting.

## Acceptance flow

1. Open `/sourcing`, optionally seed the same idea field with a broad prompt starter, and enter a product idea.
2. Confirm the resulting page has one living brief and the agent asks one next question.
3. Answer naturally and confirm the same document updates without navigation.
4. Say “I’m not sure” and confirm the field remains open rather than becoming a match requirement.
5. Have the agent stage a partial package direction and generated artwork, confirm the 3D workbench opens without changing matching, then use the direction and confirm the brief reflects the same type, color, finish, artwork placement, and dimension state.
6. Complete required decisions, find matches, and verify supported/unknown evidence boundaries.
7. Select two or three manufacturers and prepare separate drafts.
8. Review and approve each exact draft; verify approval alone sends nothing.
9. With email delivery mocked or a controlled test recipient, click `Send introduction`, review the final delivery statement, click `Send now`, and confirm recipient, founder copy, reply-to, sent state, and contact history. Never use a live manufacturer for acceptance testing.
10. Choose Save, create or sign into an account, and confirm the same workspace ID remains.
11. Open `/products` and return to the saved product.

Focused local verification:

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run build
npx playwright test tests/e2e/sourcing.spec.ts --project=chrome --workers=1
```

A persistence/auth smoke additionally requires a non-production PostgreSQL database with the checked-in Prisma migration applied. A native-browser harness can test WebMCP registration locally, but the supported agent integration is the Codex app rather than a cross-tab ChatGPT handoff.
