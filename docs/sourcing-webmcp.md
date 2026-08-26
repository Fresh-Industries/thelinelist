# Guided product plan and WebMCP prototype

The prototype turns The Line List into a shared founder-and-ChatGPT product-planning experience:

`product idea → confirmed brief → missing decisions → sourced matches → approved packet → safe demo introduction`

The founder interface progressively reveals three stages: **Your plan**, **Matches**, and **Contact**. Only the current stage is rendered. The structured 26-field model remains available to WebMCP and behind **Review all details**, while the default plan asks one plain-language question at a time.

The `/sourcing` landing page makes **Use with ChatGPT** the primary path. It creates a personalized prompt from the founder’s exact idea and opens ChatGPT normally in a new tab. It does not claim a verified connection or use a prompt-prefill URL; the product-plan page remains the WebMCP tool surface in supported environments.

The canonical founder route is `/sourcing`. A new workspace receives a 144-bit unguessable identifier and lives at `/sourcing/[workspaceId]`. Manufacturer packets use a separate 192-bit token at `/packet/[token]`; packets expire after 30 days and already carry a `revokedAt` seam for later revocation.

## Architecture

- Framework: Next.js 16 App Router, React 19, TypeScript, Zod.
- Manufacturer data: the existing `Plant` catalog behind `lib/directory/query.ts`.
- Persistent workspace store: Upstash Redis in production. Development falls back to owner-only JSON files under the operating system temp directory so route handlers and Server Components share state. An unconfigured production instance reports single-instance memory and is not suitable for a durable demo.
- Authentication: the current site has no account system. The prototype uses unguessable capability URLs. Anyone with a workspace URL can edit it, so treat it like a private shared document. Adding account ownership can wrap the same store API later.
- Email: the existing Resend/Postmark adapter. Sourcing inquiries never use a manufacturer email address; delivery is redirected to `SOURCING_DEMO_RECIPIENT`.
- Consequential-action safety: the send route requires the persisted founder-approved content version, uses an atomic idempotency claim, rate limits attempts, and records Contacted only after the email provider succeeds.

No database migration is required. Upstash keys use these prefixes:

- `sourcing:workspace:{unguessableWorkspaceId}`
- `sourcing:packet:{unguessablePacketToken}`
- `sourcing:send:{draftUuid}`

## Current WebMCP contract

The implementation follows the current W3C WebMCP draft and Chrome implementation guidance:

- https://webmachinelearning.github.io/webmcp/
- https://developer.chrome.com/docs/ai/webmcp

Tools register on `document.modelContext` with the deprecated `navigator.modelContext` location used only as a compatibility fallback. Registration uses an `AbortSignal` for lifecycle cleanup. Tool callbacks return structured values that the browser serializes for the agent, and the normal website remains fully usable when the API is unavailable.

Five tools are registered only on a private workspace page:

1. `get_sourcing_workspace` — read-only snapshot for the current private workspace.
2. `update_sourcing_workspace` — batch structured updates. Explicit founder statements become confirmed; inferences stay proposed; missing values become founder decisions.
3. `match_manufacturers` — reads confirmed requirements and returns supported facts, possible mismatches, unknowns, field or record sources, and review dates.
4. `prepare_manufacturer_outreach` — creates manufacturer-specific draft and packet state but never sends.
5. `send_manufacturer_inquiry` — sends only an already approved version to the safe demo recipient and rejects duplicates or changed/unapproved drafts.

The write tools update the same server record used by the React UI. Successful tool calls immediately replace the visible client state. Manual UI changes persist through the same API and are returned by the next read tool call.

## Trust rules

- Matching uses confirmed fields only.
- Matching requires a confirmed product plus at least one useful match-shaping detail and no unresolved match-shaping suggestion.
- Product candidates require explicit category or reviewed product-language support. Energy-drink matching does not fall back to every beverage record.
- Results are capped at three and are never padded with weak manufacturers.
- An agent inference is `proposed` until a founder confirms it in the site.
- Missing manufacturer data never means the capability is absent.
- A supported match requires an explicit structured catalog value or reviewed text.
- `Verified` is shown when the record has field-specific reviewed evidence or belongs to the hand-curated catalog.
- `Public source listing` is shown when the catalog has a reviewed record-level source but no field-specific source URL.
- `Not publicly listed` is used when a reviewed record does not establish a requested detail.
- A known geography or line mismatch is displayed as a possible mismatch, not as conflicting source information.
- Internal notes, rankings, comparisons, private concerns, missing-decision notes, and unconfirmed proposals cannot enter a packet.
- Budget is confirmed from a founder statement but excluded by default. Selecting it on the approval screen is the explicit sharing decision.

## Environment

```bash
# Durable workspace and atomic send idempotency in deployed environments
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Existing email provider configuration
EMAIL_PROVIDER=resend
RESEND_API_KEY=
NOTIFY_FROM_EMAIL="The Line List <notifications@mail.thelinelist.com>"

# Required safe inbox for this prototype
SOURCING_DEMO_RECIPIENT=your-safe-demo-inbox@example.com

# Used to build packet links in email
NEXT_PUBLIC_SITE_URL=https://www.thelinelist.com
```

If the safe recipient or email provider is missing, the approval UI remains complete but send stays disabled and the API returns a truthful configuration error. It never reports a delivery or Contacted status.

## Under-three-minute demo

1. Open `/sourcing`, point out the ChatGPT promise, and choose **Use with ChatGPT** (15 seconds).
2. Enter the energy-drink idea, create the personalized prompt, and choose **Copy and continue in ChatGPT** (25 seconds).
3. Return to The Line List or open the ready-made demo. Show the compact plan and one suggested Carbonation decision (20 seconds).
4. Choose **Yes, keep this**, then show “ready enough” and choose **Find my best matches** (20 seconds).
5. Open **Why this match?** to show plain-language fit, unknowns, sources, and review dates (30 seconds).
6. Choose **Add to shortlist**, then **Draft my introduction** (20 seconds).
7. Review the message, product brief, private information, and Budget excluded by default (30 seconds).
8. With `SOURCING_DEMO_RECIPIENT` configured, choose **Approve and send introduction**, then show Introduction sent and open the product brief (20 seconds).

## Verification

```bash
npm run typecheck
npm run lint
npm run test:unit
npx playwright test tests/e2e/sourcing.spec.ts --project=chrome --workers=1
npm run build
```

The browser suite directly invokes all five registered tools through a model-context harness. Its send invocation intentionally uses an unapproved version and verifies the safety rejection without sending email.

Screenshots are stored in `docs/screenshots/` after running:

```bash
UPDATE_SOURCING_SCREENSHOTS=1 npx playwright test tests/e2e/sourcing-screenshots.spec.ts --project=chrome --workers=1
```

## Prototype limitations

- Capability-link access replaces accounts for this hackathon prototype; there is no user-level authorization or workspace list.
- Matching is deterministic and evidence-bound. It does not use an LLM to manufacture claims or to interpret arbitrary unsupported product categories.
- Packet revocation and expiry are represented in the model, but only expiry is enforced through the current UI.
- There is no manufacturer dashboard, reply tracking, bulk outreach, follow-up automation, arbitrary external-form automation, or PDF generator.
