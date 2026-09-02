# Product Workspace and WebMCP

This document describes the production Product Workspace integration. Product and design authority remains [`UX.md`](../UX.md) and [`docs/product-workspace-design-constraints.md`](product-workspace-design-constraints.md).

## Founder journey

`/sourcing` has one canonical entry path. With WebMCP, the founder describes the product conversationally and `create_sourcing_workspace` creates the private guest workspace before navigating to `/sourcing/[workspaceId]`. A progressively disclosed manual form creates the same workspace when an agent is unavailable or the founder prefers typing on the page. Manual creation conservatively extracts only closed, explicitly stated facts and stores their exact character spans from `originalIdea`; anything not covered by a deterministic extractor remains open instead of being guessed.

The workspace has two focused, URL-addressable views over one canonical ProductPlan. `/sourcing/[workspaceId]` owns the living Product brief, package direction, and current decision. `/sourcing/[workspaceId]/manufacturers` owns evidence-backed possibilities, the founder shortlist, comparison, and introduction review. The shared workspace header uses normal links with `aria-current="page"`; browser Back, Forward, reload, and direct child-route entry therefore preserve a predictable navigation model without copying product state.

The canonical ProductPlan keeps the founder's raw `originalIdea`, optional `brand_name`, and concise `product_type` descriptor separate. Creation captures explicit facts immediately and may add reversible, visibly attributed proposals; for the broad banana-bread example it starts with a usable brief while keeping format, storage, and first-run volume open. Material product decisions come before an optional brand question, and the agent asks one simple material question at a time, persists the answer, and rereads the workspace before continuing. Direct founder corrections edit that same document inline. Packaging opens as a focused 3D workbench from either workspace view using jar, bottle, slim-can, stand-up-pouch, and procedural windowed bakery-bag models. The bakery bag supports exact front copy, copy placement, and an adjustable real window with a visible loaf behind it. Every agent or founder preview persists the complete design as `stagedPackageDesign`, including closure, finish, artwork, copy, window, placement, dimensions, and provenance, so it survives child-route navigation and reload. A geometry-only agent preview is explicitly labeled `Placeholder styling - visual direction has not been discussed` and carries `placeholder: true` with `source: system_defaults`; explicit founder controls or approved generated artwork replace that provenance. Closing the workbench or generating artwork never clears or reconstructs that stage from defaults. When the founder uses the visible direction button, the browser first stages that exact complete design, captures its WebGL view as a private package-preview asset, and invokes the dedicated founder commit against the persisted stage. The same ProductPlan then references the committed design for a restrained brief preview and the exported PDF.

Neither view opens an external AI website or presents a manual prompt handoff. WebMCP is exposed to the Codex app through the model-context API; both normal HTML views remain fully usable when that API is unavailable. Agent-authored changes are attributed, highlighted as the latest change, and stored with a one-step undo snapshot.

## Canonical state and persistence

- `lib/sourcing/product-plan.ts` owns the versioned Zod `ProductPlanSchema`.
- UI routes, WebMCP tools, matching, outreach, and persistence use this same model.
- PostgreSQL is the production system of record through Prisma.
- `ProductWorkspace.plan` contains the evolving plan JSON. Row columns own access, lifecycle, revision, and list/query metadata.
- `WorkspaceActivity` is append-only history.
- `WorkspaceAsset` links a workspace to private Blob artwork and saved 3D package-preview bytes.
- `ManufacturerPacket` owns expiring packet-token metadata and snapshots.
- Writes use optimistic revision checks; stale writes return `409` instead of overwriting newer changes. Package-stage and founder-commit mutations use opaque IDs: reuse an ID only for an exact retry, and use a new ID when the payload changes. Their authoritative receipts identify replay versus first application and make a post-response refetch safe.

Vercel Blob is not a workspace store. It is used only for uploaded artwork bytes.

## Guest and authenticated ownership

Guests can use the full product flow before signing in.

1. Workspace creation generates a 256-bit random guest credential.
2. PostgreSQL stores only the SHA-256 hash and a 30-day expiry.
3. The browser receives the raw credential in a `Secure` (production), `HttpOnly`, `SameSite=Lax` cookie.
4. Every workspace read and mutation checks either Better Auth user ownership or the exact guest credential hash on the server. Guest credentials are stored in workspace-scoped cookies, so creating another product never revokes browser access to an earlier product.
5. Save opens `/auth?workspaceId=...` for email/password signup or login.
6. The claim route transactionally assigns the existing row to the authenticated user, clears the guest credential and expiry, and appends activity.
7. `/products` lists only rows owned by the current authenticated user.

Workspace IDs are identifiers, not authorization credentials. Client-provided user IDs are ignored because no sourcing schema accepts one.

## Registered WebMCP tools

One tool registers on `/sourcing`:

1. `create_sourcing_workspace` — creates the canonical workspace from the founder's idea, optionally accepts the agent's explicitly classified first-pass updates, and navigates only after returning an authoritative creation receipt. The caller supplies one opaque `mutationId` and reuses it for an exact retry; the server returns the same workspace ID instead of creating a duplicate. It returns the same compact action state plus the current workspace ID and revision. It does not match, select, draft, or contact manufacturers.

Thirteen tools register in the shared authorized workspace layout and remain available across both child routes:

1. `get_sourcing_workspace` — reads a compact action state grouped as confirmed, proposed, needs-validation, open, founder decisions, package direction, creative next question, evidence-backed candidates, and outreach gates. It omits the full field map, undo snapshots, duplicate route payloads, and internal readiness percentages.
2. `update_sourcing_workspace` — applies explicit founder statements as confirmed and keeps inference/research as proposed or needs-decision. It uses the current server revision.
3. `get_package_design` — reads the saved package direction and category-relevant options. The visible workbench presents those category-fit 3D models first and keeps other supported package families behind a deliberate “More package types” disclosure.
4. `preview_package_design` — merges a partial agent direction into the current persisted package state, persists the resulting complete design under the caller's opaque `stageId`, and opens it in the shared 3D workbench without committing it, changing matching, or changing the current workspace route. Bread can use the windowed `bakery-bag` with exact `frontText`, adjustable `windowScale`, and copy placement. When the request supplies only geometry or package type and no visual direction, the persisted preview is a visibly labeled system-default placeholder.
5. `generate_package_artwork` — creates a founder-requested raster label from an explicit brand and approved art direction entirely through WebMCP, uploads it, and stages it on the visible 3D package. It never commits the package direction.
6. `stage_package_artwork` — uploads supplied PNG, JPEG, or WebP bytes and stages them in the visible workbench; the founder still commits the direction.
7. `refine_package_design_in_3d` — persists and opens a complete, explicit founder packaging direction as a staged live refinement; it never commits invisibly, and the founder uses the visible workbench action to commit that exact persisted stage.
8. `undo_last_agent_change` — reverses the current visible agent update after the founder asks.
9. `export_product_packet` — returns an authenticated private PDF download URL containing the saved 3D package render and never shares the file externally.
10. `audit_outreach_readiness` — reads the exact research, shortlist, manufacturer-brief, saved-package, draft, approval, and founder-send gates without mutating state. It explicitly reports that the agent cannot select, approve, or send.
11. `match_manufacturers` — runs once the brief is ready to research, accepts only requirements the matching engine can actually evaluate, returns one to three possibilities, navigates to `/sourcing/[workspaceId]/manufacturers` when needed, and focuses the simple results heading rather than a large bordered layout region. It interprets state names, state codes, and broad US regions such as Midwest; an unsupported geography stays visibly unknown and the tool asks for a state or supported region before strict matching. Exact product and container claims require field-specific published evidence: broad sauce or bottle capability is useful support but does not prove hot sauce or a glass woozy bottle. Numeric size and production evidence is parsed in compatible units so required mismatches are excluded and preferred mismatches remain visible conflicts. Required, preferred, and explicitly negated certifications are normalized before gating. It returns supported facts, conflicts, unknowns, field-specific capability URLs when reviewed, and date-only review dates rendered without timezone drift. A pending founder shortlist survives fit-changing edits only until the next research run, which retains the intersection of still-current candidates. If a strict search returns zero, the agent cannot silently retry weaker criteria: the founder reviews an exact Before/After diff, and confirmation persists the original request, broader request, founder actor, server time, workspace revision, and mutation ID. It never creates a draft. Unknown never means match.
12. `prepare_manufacturer_outreach` — the final agent-owned step. It prepares current recipient-specific drafts only for the exact manufacturers selected by the founder, immediately opens the exact-message review, and cannot approve or send. Private `founderInstructions` guide review but are never copied verbatim into the recipient message.
13. `open_manufacturer_introduction_review` — navigates to the manufacturer view's `#manufacturer-introductions` review surface when needed, focuses its heading, and never sends.

Readiness is deliberately staged: `searchReady` allows sourced discovery with visible unknowns; `manufacturerReady` means the core fit-conversation inputs are confirmed and a supported 3D package direction has been visibly reviewed and saved; `launchReady` means the planning brief's commercial fields are filled. The saved 3D direction is a communication mockup, not a dieline or package validation. None of these stages is a safety, regulatory, shelf-life, or production approval.
There is no agent-callable send tool. Draft approval and delivery are separate founder actions: the founder approves the exact version, opens the visible final confirmation, and clicks `Send now`. The server then uses the existing email provider to send from The Line List to the manufacturer’s current sourced public email, copies the founder, and routes replies to the founder. Resend idempotency protects the same draft version from double-click delivery.

Tool guidance tells the agent to:

- read before writing;
- ask one simple material founder decision at a time, persist it, and reread before asking the next;
- use category-aware wording and ordering; beverage projects cover retail format, formula readiness, carbonation, storage/process goal, package and size, and first-run range without leaking examples from another category;
- preserve confirmed founder decisions;
- keep “I’m not sure” explicit;
- surface the optional creative step instead of waiting for the founder to discover it: ask one simple question at a time (brand name first, then art direction), then use `generate_package_artwork` so creation, upload, and visible 3D staging stay inside WebMCP;
- keep healthy, clean-energy, hydration, organic, and shelf-stable language visibly unvalidated until the relevant qualified review or certification occurs;
- stage every agent-authored visual package choice and generated artwork in the real workbench, while leaving canonical commit to the founder;
- match only from supported evidence;
- prepare up to three recipient-specific drafts;
- end with one explicit sequence: the agent prepares the drafts and opens review; the founder reviews and approves each exact version; the founder separately invokes and confirms `Send now`. No WebMCP tool can approve or send.

Workspace tools register once per workspace rather than on every React state or child-route change. The authorized dynamic layout owns one client provider, one WebMCP registration, canonical workspace state, and the staged package workbench. Callback refs keep the visible UI current without invalidating tool handles during the conversation.

Route-changing tools build and return their authoritative result before scheduling client navigation. Same-workspace child routes keep the registered tool set; workspace changes invalidate the old handle, and a stale handle rejects before starting a mutation. Creation receipts tell the host to refetch workspace tools after navigation. Stage receipts tell the host to treat the returned workspace and staged record as authoritative, allow a safe refetch, reuse the same `stageId` only for an exact replay, and choose a new ID for changed package state.

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
2. Confirm the resulting page has one living brief, already separates confirmed facts, proposals, validation needs, and open decisions, and does not ask for an optional brand first.
3. Answer naturally and confirm the same document updates without navigation.
4. Say “I’m not sure” and confirm the field remains open rather than becoming a match requirement.
5. Have the agent stage a windowed bakery bag with exact front copy, resize the window, move the copy, navigate between Product brief and Manufacturers, reload, and confirm the exact staged design remains. Generate or replace artwork and confirm the stage retains its prior package type, clear finish, closure, copy, window, color, placement, and dimensions. Then use the visible direction button and confirm the brief reflects that exact committed stage and its founder commit provenance.
6. Complete required decisions, find matches, and confirm navigation to `/sourcing/[workspaceId]/manufacturers`. Verify the focused results heading has no layout-sized browser outline and supported facts, conflicts, and not-publicly-confirmed details remain visibly separate.
7. Select two or three manufacturers, move between Product brief and Manufacturers with browser Back and Forward, and confirm the same canonical shortlist remains selected before preparing separate drafts.
8. Have WebMCP prepare current recipient-specific introductions and confirm it automatically opens the exact draft review. Review and approve each exact draft; verify approval alone sends nothing.
9. With email delivery mocked or a controlled test recipient, click `Send introduction`, review the final delivery statement, click `Send now`, and confirm recipient, founder copy, reply-to, sent state, and contact history. Never use a live manufacturer for acceptance testing, and never expose a WebMCP send tool.
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
