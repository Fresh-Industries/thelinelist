import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyFounderFieldUpdate, applyManufacturerResearch, createWorkspace } from "@/lib/sourcing/workspace";
import type { SourcingFieldKey, SourcingWorkspace } from "@/lib/sourcing/types";

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

  it("returns the deterministic hot-sauce ranking without changing founder-controlled state", async () => {
    workspace = reportWorkspace();
    persisted = workspace;
    const request = {
      resultLimit: 3,
      requiredRequirements: ["product_type", "manufacturing_process", "storage_distribution"],
      preferredRequirements: ["packaging_format", "packaging_size", "production_volume", "formulation_assistance", "preferred_geography"],
    };

    const firstResponse = await post(request);
    const first = await firstResponse.json() as { workspace: SourcingWorkspace; receipt: { researchId: string; planFingerprint: string } };
    expect(firstResponse.status).toBe(200);
    expect(first.workspace.matches.map((match) => match.manufacturerSlug)).toEqual(["the-spice-guy", "creative-foodworks"]);
    expect(first.workspace).toMatchObject({
      selectedManufacturerSlugs: [],
      outreachDrafts: [],
      inquiries: [],
      packageDesign: null,
      packageCommit: null,
    });

    workspace = persisted;
    const secondResponse = await post(request);
    const second = await secondResponse.json() as { workspace: SourcingWorkspace; receipt: { researchId: string; planFingerprint: string } };
    expect(secondResponse.status).toBe(200);
    expect(second.receipt.planFingerprint).toBe(first.receipt.planFingerprint);
    expect(second.receipt.researchId).not.toBe(first.receipt.researchId);
    expect(second.workspace).toMatchObject({ selectedManufacturerSlugs: [], outreachDrafts: [], inquiries: [], packageDesign: null, packageCommit: null });
  });
});

function post(body: Record<string, unknown>) {
  return POST(new Request("http://localhost/api/sourcing/judge-broadening-workspace/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }), { params: Promise.resolve({ workspaceId: "judge-broadening-workspace" }) });
}

function reportWorkspace(): SourcingWorkspace {
  let result = createWorkspace({ id: "judge-broadening-workspace", idea: "Fictional smoked peach habanero hot sauce." });
  const updates: Array<[SourcingFieldKey, string]> = [
    ["product_type", "Hot sauce"],
    ["manufacturing_process", "Acidified, shelf-stable hot-fill"],
    ["storage_distribution", "Shelf-stable"],
    ["packaging_format", "5 fl oz glass woozy bottle"],
    ["packaging_size", "5 oz"],
    ["production_volume", "5,000 bottles"],
    ["formulation_assistance", "Process-authority and acidified-food help needed"],
    ["preferred_geography", "Midwest"],
  ];
  for (const [key, value] of updates) {
    result = applyFounderFieldUpdate(result, { key, value, status: "confirmed", shareWithManufacturer: true });
  }
  return result;
}
