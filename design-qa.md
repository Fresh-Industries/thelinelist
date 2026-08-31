# Design QA — Manufacturers workspace

## Visual truth and capture

- Source visual truth: `C:\Users\Nik\AppData\Local\Temp\codex-clipboard-7582af43-1222-4c94-aa0d-8046a4233641.png`
- Browser-rendered implementation: `C:\Users\Nik\thelinelist\artifacts\design-qa\manufacturers-1440x1024.png`
- Route: `http://127.0.0.1:3010/sourcing/u2PaOFsUzzck4-svpZhoVwAV/manufacturers`
- CSS viewport override: 1440 × 1024
- Source pixels: 1487 × 1058
- Implementation pixels: 1425 × 1013
- Density: both compared at 1×. The captures have the same 1.406 aspect ratio; no density downsampling was needed.
- State: three current manufacturer possibilities, Assemblers, Inc. active and selected, source evidence collapsed, one selected, no draft outreach sent.

## Full-view comparison evidence

The source and implementation were opened together in one comparison input after the final browser capture. The implementation preserves the reference hierarchy and proportions: product-level masthead, sibling Product brief and Manufacturers destinations, product context strip, concise page introduction, 32/68 shortlist-detail split, selected aqua row with forest rule, evidence columns, readiness callout, source disclosure, and bottom comparison action.

Canonical workspace data remains authoritative, so the rendered product title, package-direction copy, unresolved-decision count, and manufacturer locations differ from the illustrative source where the saved workspace differs. The existing Export PDF utility remains visible as a working product action.

## Focused region comparison

No separate crop was needed. At this viewport the full-view capture contains the complete active shortlist row, manufacturer heading and selection control, evidence summary, readiness callout, source-evidence control, selected count, and Compare selected action at readable scale.

## Interaction and responsive evidence

- Researched manufacturers from the empty state and received three evidence-backed results.
- Opened Assemblers, Inc. without changing the persisted shortlist implicitly.
- Verified its explicit selection control exposes `aria-pressed="true"` and includes the manufacturer name in its accessible label.
- Navigated Product brief → browser Back → browser Forward; the canonical selected manufacturer persisted and the correct workspace navigation link retained `aria-current="page"`.
- Verified 12 WebMCP tools register on the Manufacturers route and no send tool is exposed.
- At 390 × 844, verified zero horizontal overflow, a list-first drill-in, reachable full-width detail, and a working “All possibilities” return control.
- Checked browser logs. There were no application errors; only development/HMR messages and one informational Three.js context-lost message when the product brief’s 3D preview unmounted during route navigation.

## Findings

- No actionable P0, P1, or P2 findings remain.
- P3: the implementation keeps the real saved product data and existing Export PDF utility instead of reproducing the reference’s illustrative text exactly.

## Comparison history

1. P1 — The previous single-page manufacturer section used negative selected-row margins, a sticky negative-margin tray, and programmatic focus on the whole section, creating the large overlapping outline seen in the reported screenshot. Fixed by moving Manufacturers to a sibling route, using a contained master-detail layout, a normal-flow action bar, and focusing only the route heading.
2. P2 — The first desktop comparison placed the bottom action below the reference frame and left excess page padding around the manufacturer route. Fixed by overriding the global main padding, tightening the context/header/detail rhythm, and fitting the complete comparison action into the reference-height viewport.
3. P2 — The first post-fix capture showed a gold outline around the active shortlist row because a non-navigation detail activator used `aria-current`. Fixed by reserving `aria-current` for the two workspace navigation links and keeping the active row’s semantic button label plus contained visual state. The final implementation screenshot is the post-fix evidence.

final result: passed
