import { describe, expect, it } from "vitest";
import { getVercelBuildPlan } from "../../scripts/vercel-build.mjs";

describe("Vercel build plan", () => {
  it("applies committed migrations before the production build", () => {
    expect(getVercelBuildPlan({ VERCEL_ENV: "production" })).toEqual({
      production: true,
      migrate: true,
      steps: [
        { command: "npx", args: ["prisma", "generate"] },
        { command: "npx", args: ["prisma", "migrate", "deploy"] },
        { command: "npx", args: ["next", "build"] },
      ],
    });
  });

  it.each(["preview", "development", undefined])("never migrates in %s builds", (vercelEnvironment) => {
    expect(getVercelBuildPlan({ VERCEL_ENV: vercelEnvironment })).toEqual({
      production: false,
      migrate: false,
      steps: [
        { command: "npx", args: ["prisma", "generate"] },
        { command: "npx", args: ["next", "build"] },
      ],
    });
  });
});
