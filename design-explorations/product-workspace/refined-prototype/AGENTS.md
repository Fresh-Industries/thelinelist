# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Selected Product Workspace direction

- The living product brief is the sole governing mental model and canonical home surface.
- Agent conversation appears only beside the active passage and may visibly write clear founder statements into the brief; it never becomes a permanent chat sidebar or historical feed.
- Confirmed founder information uses normal text. Only agent inferences receive a subtle Suggested treatment with Accept, Edit, and Not sure.
- Progress is communicated through the growing document and one restrained next-step phrase, never a wizard, stage navigation, or percentage.
- Packaging, matching, comparison, and outreach may temporarily open a contextual workbench. Each tool must write its result back to the same brief and then disappear.
- Manufacturer discovery remains available with explicit unknowns. All prototype manufacturer names and evidence are visibly fictional.
- Outreach preparation and founder approval are separate states. The prototype never sends or connects to a backend.
- The final manufacturer-ready packet is the same document becoming more complete, not a separate export-report experience.
- Visually prefer editorial paper, mature typography, sparse dividers, compact corners, quiet brand color, and real supplied product assets. Remove any element that does not clarify state, action, evidence, or orientation.
- Agent exchanges are temporary: document fields write in sequence, briefly highlight, and then the exchange collapses to one recoverable change marker.
- Packaging format, package, finish, weight, dimensions, preview, comparison, summary, document writeback, matching context, and outreach copy must derive from one canonical packaging object. Do not expose a format/package combination without a faithful supplied visual.
- Manufacturer selection may produce a contact set of up to three candidates, but outreach remains recipient-specific. Every recipient has an independently reviewed message, approved brief snapshot, and approval state; never turn this into a bulk-send flow.
- The living document owns readiness, open questions, manufacturers, and introductions. Do not add a duplicate final brief or packet summary below it.
