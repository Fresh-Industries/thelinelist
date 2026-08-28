import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

/** @param {Record<string, string | undefined>} environment */
export function getVercelBuildPlan(environment = process.env) {
  const production = environment.VERCEL_ENV === "production";
  const migrationsEnabled = environment.VERCEL_RUN_MIGRATIONS === "1";
  return {
    production,
    migrationsEnabled,
    steps: [
      ...(production && migrationsEnabled ? [{ command: "npm", args: ["run", "db:migrate:deploy"] }] : []),
      { command: "npm", args: ["run", "build"] },
    ],
  };
}

/** @param {Record<string, string | undefined>} environment */
export function runVercelBuild(environment = process.env) {
  const plan = getVercelBuildPlan(environment);
  if (plan.production && plan.migrationsEnabled && !environment.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is required when VERCEL_RUN_MIGRATIONS=1.");
  }

  if (plan.production && plan.migrationsEnabled) {
    console.log("[vercel-build] Applying committed production migrations.");
  } else {
    console.log("[vercel-build] Skipping database migrations for this environment.");
  }

  for (const step of plan.steps) {
    const result = spawnSync(step.command, step.args, { env: environment, stdio: "inherit" });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}

const entryPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (fileURLToPath(import.meta.url) === entryPath) runVercelBuild();
