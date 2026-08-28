<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project source-of-truth rules

- Before any product design, UX review, information-architecture change, workflow change, or user-facing implementation, read `UX.md` completely.
- Before any work on `/sourcing`, the Product Workspace, manufacturer matching inside the workspace, outreach, or manufacturer packets, also read `docs/product-workspace-design-constraints.md` completely.
- For WebMCP or agent-tool work, also read `docs/sourcing-webmcp.md` and verify the current checked-out types and browser documentation before changing code.
- `UX.md` governs the site-wide experience. `docs/product-workspace-design-constraints.md` is the more specific authority for Product Workspace behavior. If they conflict, reconcile the documents before implementation rather than silently choosing one.
- Treat the current Product Workspace UI as an implementation to evaluate, not as the design source of truth. Do not preserve a current pattern when it violates the constraint document.
- Never invent manufacturer capabilities, minimums, certifications, package support, or other missing facts. Keep unknown, conflicting, proposed, founder-confirmed, and source-supported information distinct.
- Preserve the founder-control boundary: explicit founder statements may become confirmed, agent inference remains proposed, drafts remain reversible, and no manufacturer is contacted without explicit founder action.
- Keep ChatGPT and direct workspace editing on one canonical product state. Do not create separate “AI mode” and “manual mode” workflows.
