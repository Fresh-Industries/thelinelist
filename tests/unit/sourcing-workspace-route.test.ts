import { createWorkspace, packageDesignHash } from "@/lib/sourcing/workspace";
import { mergePackagePreview } from "@/lib/sourcing/package-preview";
import type { PackageDesign, PackageDesignPreviewInput, SourcingWorkspace } from "@/lib/sourcing/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthorizedWorkspace: vi.fn(),
  getRequestContext: vi.fn(),
  rateLimit: vi.fn(),
  saveSourcingWorkspace: vi.fn(),
}));

vi.mock("@/lib/sourcing/access", () => ({ getAuthorizedWorkspace: mocks.getAuthorizedWorkspace }));
vi.mock("@/lib/request", () => ({ getRequestContext: mocks.getRequestContext }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: mocks.rateLimit }));
vi.mock("@/lib/sourcing/store", () => ({
  SourcingWorkspaceConflictError: class SourcingWorkspaceConflictError extends Error {},
  getSourcingWorkspace: vi.fn(),
  saveSourcingWorkspace: mocks.saveSourcingWorkspace,
  sourcingStoreAdapter: () => "filesystem",
}));

import { PATCH } from "@/app/api/sourcing/[workspaceId]/route";

describe("sourcing workspace mutation boundaries", () => {
  let workspace: SourcingWorkspace;

  beforeEach(() => {
    vi.clearAllMocks();
    workspace = createWorkspace({ idea: "Fictional package integrity test beverage" });
    mocks.getAuthorizedWorkspace.mockImplementation(async () => ({ workspace, access: "development" }));
    mocks.getRequestContext.mockResolvedValue({ ipHash: "test-ip" });
    mocks.rateLimit.mockResolvedValue({ ok: true });
    mocks.saveSourcingWorkspace.mockImplementation(async (next: SourcingWorkspace) => { workspace = next; });
  });

  it("rejects the retired direct package-design payload without saving", async () => {
    const response = await patch({
      revision: workspace.revision,
      packageDesign: design,
      updatedBy: "agent",
      explicitlyStated: true,
    });

    expect(response.status).toBe(400);
    expect(mocks.saveSourcingWorkspace).not.toHaveBeenCalled();
    expect(workspace.packageDesign).toBeNull();
    expect(workspace.packageCommit).toBeNull();
  });

  it("persists a complete preview without treating it as founder-saved", async () => {
    const response = await patch({
      revision: workspace.revision,
      stagePackageDesign: { stageId: "route-package-stage-000001", packageDesign: placeholderDesign, stagedBy: "agent" },
    });
    const body = await response.json() as { workspace: SourcingWorkspace; readiness: { packageDesignReady: boolean }; receipt: { outcome: string } };

    expect(response.status).toBe(200);
    expect(body.receipt.outcome).toBe("staged");
    expect(body.workspace.stagedPackageDesign?.design).toEqual(placeholderDesign);
    expect(body.workspace.packageDesign).toBeNull();
    expect(body.workspace.packageCommit).toBeNull();
    expect(body.readiness.packageDesignReady).toBe(false);
  });

  it("replays an exact package stage and rejects a changed payload using the same stage ID", async () => {
    const stageId = "route-package-stage-replay-0001";
    const request = {
      revision: workspace.revision,
      stagePackageDesign: { stageId, packageDesign: placeholderDesign, stagedBy: "agent" },
    };
    const first = await patch(request);
    const revisionAfterFirst = workspace.revision;
    const replay = await patch({ ...request, revision: revisionAfterFirst });
    const replayBody = await replay.json() as { receipt: { outcome: string }; workspace: SourcingWorkspace };

    expect(first.status).toBe(200);
    expect(replay.status).toBe(200);
    expect(replayBody.receipt.outcome).toBe("replayed");
    expect(replayBody.workspace.revision).toBe(revisionAfterFirst);
    expect(mocks.saveSourcingWorkspace).toHaveBeenCalledTimes(1);

    const changed = await patch({
      revision: workspace.revision,
      stagePackageDesign: {
        stageId,
        packageDesign: { ...placeholderDesign, dimensions: { width: 65, height: null, depth: null } },
        stagedBy: "agent",
      },
    });
    expect(changed.status).toBe(409);
    await expect(changed.json()).resolves.toMatchObject({ error: "That package stage ID was already used for a different design." });
    expect(mocks.saveSourcingWorkspace).toHaveBeenCalledTimes(1);
  });

  it("commits only the exact persisted stage with founder UI provenance", async () => {
    await patch({
      revision: workspace.revision,
      stagePackageDesign: { stageId: "route-package-stage-000002", packageDesign: design, stagedBy: "agent" },
    });
    const fieldsBeforeCommit = structuredClone(workspace.fields);
    const response = await patch({
      revision: workspace.revision,
      founderPackageCommit: { commitId: "route-package-commit-00002", stagedPackageId: "route-package-stage-000002" },
    });
    const body = await response.json() as { workspace: SourcingWorkspace; receipt: { outcome: string } };

    expect(response.status).toBe(200);
    expect(body.receipt.outcome).toBe("committed");
    expect(body.workspace.packageDesign).toEqual(design);
    expect(body.workspace.stagedPackageDesign).toBeNull();
    expect(body.workspace.fields).toEqual(fieldsBeforeCommit);
    expect(body.workspace.packageCommit).toMatchObject({
      actor: "founder",
      channel: "workspace_ui",
      designHash: packageDesignHash(design),
      stagedPackageId: "route-package-stage-000002",
    });
  });

  async function patch(body: Record<string, unknown>) {
    return PATCH(new Request("http://localhost/api/sourcing/workspace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }), { params: Promise.resolve({ workspaceId: workspace.id }) });
  }
});

describe("package preview provenance", () => {
  const workspace = createWorkspace({ idea: "Fictional bottled sauce" });

  it("keeps package type alone as system-default placeholder geometry", () => {
    expect(mergePackagePreview(workspace, { packagingType: "bottle" })).toMatchObject({
      packagingType: "bottle",
      placeholder: true,
      source: "system_defaults",
    });
  });

  it("keeps dimensions and supplied or derived summaries as system-default placeholder geometry", () => {
    expect(mergePackagePreview(workspace, {
      packagingType: "bottle",
      dimensions: { width: 55, height: 170, depth: 55 },
      summary: "Bottle geometry for review",
    })).toMatchObject({
      dimensions: { width: 55, height: 170, depth: 55 },
      summary: "Bottle geometry for review",
      placeholder: true,
      source: "system_defaults",
    });
    expect(mergePackagePreview(workspace, { packagingType: "jar" }).summary).toBe("Jar · dimensions still open");
  });

  it.each<[string, PackageDesignPreviewInput]>([
    ["finish", { finish: "clear" }],
    ["base color", { baseColor: "#173f35" }],
    ["label color", { labelColor: "#fff0b8" }],
    ["artwork", { artworkId: "artwork-explicit-visual" }],
    ["front text", { frontText: { brand: "Ember", product: "Sauce" } }],
    ["window scale", { windowScale: 0.5 }],
    ["closure", { closure: { style: "screw cap", color: "#173f35" } }],
    ["logo aspect", { logoAspect: 1.25 }],
    ["logo scale", { logoScale: 0.9 }],
    ["logo position", { logoPosition: { x: 0.1, y: -0.1 } }],
  ])("treats explicit %s as agent visual direction", (_label, patch) => {
    expect(mergePackagePreview(workspace, patch)).toMatchObject({ placeholder: false, source: "agent_direction" });
  });

  it("does not treat null artwork, front copy, or closure as visual direction", () => {
    expect(mergePackagePreview(workspace, { artworkId: null, frontText: null, closure: null })).toMatchObject({
      placeholder: true,
      source: "system_defaults",
    });
  });

  it.each(["agent_direction", "founder_direction"] as const)("preserves existing %s provenance through geometry-only patches", (source) => {
    const explicit = { ...mergePackagePreview(workspace, { baseColor: "#173f35" }), source };
    expect(mergePackagePreview(workspace, {
      packagingType: "jar",
      dimensions: { width: 70 },
      summary: "Jar geometry for review",
    }, explicit)).toMatchObject({ placeholder: false, source });
  });
});

const design: PackageDesign = {
  packagingType: "bottle",
  finish: "clear",
  baseColor: "#f2e8d5",
  labelColor: "#173f35",
  artworkId: null,
  previewAssetId: null,
  frontText: null,
  windowScale: 0,
  closure: { style: "screw cap", color: "#173f35" },
  logoAspect: 1,
  logoScale: 0.84,
  logoPosition: { x: -0.12, y: 0.09 },
  dimensions: { width: 63, height: 190, depth: 63 },
  summary: "Clear bottle · 63 × 190 × 63 working dimensions",
  placeholder: false,
  source: "founder_direction",
};

const placeholderDesign: PackageDesign = {
  ...design,
  finish: "colored",
  baseColor: "#b64d2c",
  artworkId: null,
  frontText: null,
  closure: null,
  dimensions: { width: null, height: null, depth: null },
  summary: "Bottle · dimensions still open",
  placeholder: true,
  source: "system_defaults",
};
