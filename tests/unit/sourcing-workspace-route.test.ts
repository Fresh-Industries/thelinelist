import { createWorkspace } from "@/lib/sourcing/workspace";
import type { PackageDesign, SourcingWorkspace } from "@/lib/sourcing/types";
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
      stagePackageDesign: { stageId: "route-package-stage-000001", packageDesign: design, stagedBy: "agent" },
    });
    const body = await response.json() as { workspace: SourcingWorkspace; readiness: { packageDesignReady: boolean }; receipt: { outcome: string } };

    expect(response.status).toBe(200);
    expect(body.receipt.outcome).toBe("staged");
    expect(body.workspace.stagedPackageDesign?.design).toEqual(design);
    expect(body.workspace.packageDesign).toBeNull();
    expect(body.workspace.packageCommit).toBeNull();
    expect(body.readiness.packageDesignReady).toBe(false);
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
