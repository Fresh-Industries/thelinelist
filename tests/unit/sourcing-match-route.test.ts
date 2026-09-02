import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyManufacturerResearch, createWorkspace } from "@/lib/sourcing/workspace";
import type { SourcingWorkspace } from "@/lib/sourcing/types";

const mocks = vi.hoisted(() => ({
  getAuthorizedWorkspace: vi.fn(),
  getRequestContext: vi.fn(),
  getSourcingWorkspace: vi.fn(),
  rateLimit: vi.fn(),
  saveSourcingWorkspace: vi.fn(),
}));

vi.mock("@/lib/request", () => ({ getRequestContext: mocks.getRequestContext }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: mocks.rateLimit }));
vi.mock("@/lib/sourcing/access", () => ({ getAuthorizedWorkspace: mocks.getAuthorizedWorkspace }));
vi.mock("@/lib/sourcing/store", () => ({
  SourcingWorkspaceConflictError: class SourcingWorkspaceConflictError extends Error {},
  getSourcingWorkspace: mocks.getSourcingWorkspace,
  saveSourcingWorkspace: mocks.saveSourcingWorkspace,
}));

import { POST } from "@/app/api/sourcing/[workspaceId]/match/route";

const originalRequest = {
  geographyPreference: null,
  resultLimit: 3,
  requiredRequirements: ["product_type"] as const,
  preferredRequirements: ["packaging_size"] as const,
};
const broadenedRequest = {
  geographyPreference: null,
  resultLimit: 3,
  requiredRequirements: [] as const,
  preferredRequirements: ["packaging_size", "product_type"] as const,
};

describe("founder-approved matching broadening API", () => {
  let workspace: SourcingWorkspace;
  let persisted: SourcingWorkspace;

  beforeEach(() => {
    vi.clearAllMocks();
    workspace = applyManufacturerResearch(createWorkspace({
      id: "judge-broadening-workspace",
      idea: "A smoky carrot hot sauce in a 5 oz glass woozy bottle, about 10,000 bottles, shelf-stable.",
    }), {
      ...originalRequest,
      requiredRequirements: [...originalRequest.requiredRequirements],
      preferredRequirements: [...originalRequest.preferredRequirements],
    }, []);
    persisted = workspace;
    mocks.getAuthorizedWorkspace.mockImplementation(async () => ({ workspace }));
    mocks.getRequestContext.mockResolvedValue({ ipHash: "test-ip" });
    mocks.rateLimit.mockResolvedValue({ ok: true });
    mocks.saveSourcingWorkspace.mockImplementation(async (next: SourcingWorkspace) => { persisted = next; });
    mocks.getSourcingWorkspace.mockImplementation(async () => persisted);
  });

  it.each([
    ["downgraded to preferred", broadenedRequest],
    ["silently dropped", { ...broadenedRequest, preferredRequirements: ["packaging_size"] }],
  ])("rejects a blind weaker retry when a required criterion is %s", async (_label, request) => {
    const response = await post(request);
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("confirm") });
    expect(mocks.saveSourcingWorkspace).not.toHaveBeenCalled();
  });

  it("runs exactly the approved criteria and persists the canonical audit payload", async () => {
    const mutationId = "founder-broadening-route-mutation-001";
    const response = await post({
      ...broadenedRequest,
      founderBroadeningApproval: { mutationId, originalRequest, broadenedRequest },
    });
    const body = await response.json() as { workspace: SourcingWorkspace; receipt: { outcome: string } };

    expect(response.status).toBe(200);
    expect(body.receipt.outcome).toBe("persisted");
    expect(body.workspace.manufacturerResearch).toMatchObject({
      request: broadenedRequest,
      broadeningApproval: {
        originalRequest,
        broadenedRequest,
        approvedBy: "founder",
        workspaceRevision: workspace.revision,
        mutationId,
        approvedAt: expect.stringMatching(/^2026-|^20\d\d-/),
      },
    });
    expect(body.workspace.activity[0]).toMatchObject({
      kind: "research_broadened",
      details: { originalRequest, broadenedRequest, mutationId },
    });
  });

  it("rejects an approval whose displayed after-state differs from the executed request", async () => {
    const response = await post({
      ...broadenedRequest,
      preferredRequirements: ["product_type"],
      founderBroadeningApproval: {
        mutationId: "founder-broadening-route-mutation-002",
        originalRequest,
        broadenedRequest,
      },
    });
    expect(response.status).toBe(400);
    expect(mocks.saveSourcingWorkspace).not.toHaveBeenCalled();
  });
});

function post(body: Record<string, unknown>) {
  return POST(new Request("http://localhost/api/sourcing/judge-broadening-workspace/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }), { params: Promise.resolve({ workspaceId: "judge-broadening-workspace" }) });
}
