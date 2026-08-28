import { describe, expect, it } from "vitest";
import { getVercelBuildPlan } from "../../scripts/vercel-build.mjs";

describe("Vercel build plan", () => {
  it("runs committed migrations before the production build when explicitly enabled", () => {
    expect(getVercelBuildPlan({ VERCEL_ENV: "production", VERCEL_RUN_MIGRATIONS: "1" })).toEqual({
      production: true,
      migrationsEnabled: true,
      steps: [
        { command: "npm", args: ["run", "db:migrate:deploy"] },
        { command: "npm", args: ["run", "build"] },
      ],
    });
  });

  it.each(["preview", "development", undefined])("never migrates in %s builds", (vercelEnvironment) => {
    expect(getVercelBuildPlan({ VERCEL_ENV: vercelEnvironment, VERCEL_RUN_MIGRATIONS: "1" }).steps).toEqual([
      { command: "npm", args: ["run", "build"] },
    ]);
  });

  it("requires an explicit migration flag in production", () => {
    expect(getVercelBuildPlan({ VERCEL_ENV: "production" }).steps).toEqual([
      { command: "npm", args: ["run", "build"] },
    ]);
  });
});
