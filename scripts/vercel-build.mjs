import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

/** @param {Record<string, string | undefined>} environment */
export function getVercelBuildPlan(environment = process.env) {
  const production = environment.VERCEL_ENV === "production";
  return {
    production,
    migrate: production,
    steps: [
      { command: "npx", args: ["prisma", "generate"] },
      ...(production ? [{ command: "npx", args: ["prisma", "migrate", "deploy"] }] : []),
      { command: "npx", args: ["next", "build"] },
    ],
  };
}

/** @param {Record<string, string | undefined>} environment */
export function runVercelBuild(environment = process.env) {
  const plan = getVercelBuildPlan(environment);
  if (plan.migrate && !environment.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is required for production Vercel migrations.");
  }

  if (plan.migrate) {
    console.log("[vercel-build] Applying committed production migrations.");
  } else {
    console.log("[vercel-build] Skipping database migrations outside production.");
  }

  for (const step of plan.steps) {
    const result = spawnSync(step.command, step.args, { env: environment, stdio: "inherit" });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}

const entryPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (fileURLToPath(import.meta.url) === entryPath) runVercelBuild();
