import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { defineConfig } from "vitest/config";

// Run the new regression fixtures against unchanged application code/data.
// The program-review JSON is test expectation data absent from the old checkout.
const root = fileURLToPath(new URL("../../", import.meta.url));
const baseline = process.env.EVIDENCE_BASELINE_ROOT;
if (!baseline) throw new Error("Set EVIDENCE_BASELINE_ROOT to a clean checkout of 8e48f14.");
const revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: baseline, encoding: "utf8" }).trim();
if (revision !== "8e48f1436996b467331d36f135814d3bd5286935") throw new Error(`Unexpected baseline revision: ${revision}`);
const changes = execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], { cwd: baseline, encoding: "utf8" }).trim();
if (changes) throw new Error("The baseline must have no tracked modifications.");

export default defineConfig({
  resolve: { alias: [
    { find: "@/data/manufacturer-imports/small-run-program-reviews-2026-09-13.json", replacement: join(root, "data/manufacturer-imports/small-run-program-reviews-2026-09-13.json") },
    { find: "@", replacement: baseline },
    { find: "server-only", replacement: join(baseline, "tests/server-only.ts") },
  ] },
  test: { environment: "node", include: [join(root, "tests/unit/manufacturer-evidence-parsing.test.ts")] },
});
