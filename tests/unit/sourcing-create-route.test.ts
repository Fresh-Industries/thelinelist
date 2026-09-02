import { createHash } from "node:crypto";
import { createWorkspace } from "@/lib/sourcing/workspace";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createGuestCredential: vi.fn(),
  getAuthorizedWorkspace: vi.fn(),
  getRequestContext: vi.fn(),
  getSession: vi.fn(),
  getSourcingWorkspace: vi.fn(),
  getWorkspaceOwnership: vi.fn(),
  rateLimit: vi.fn(),
  saveSourcingWorkspace: vi.fn(),
  setGuestWorkspaceCookie: vi.fn(),
  sourcingStoreAdapter: vi.fn(),
}));

vi.mock("@/lib/auth/server", () => ({ getSession: mocks.getSession }));
vi.mock("@/lib/request", () => ({ getRequestContext: mocks.getRequestContext }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: mocks.rateLimit }));
vi.mock("@/lib/sourcing/access", () => ({
  createGuestCredential: mocks.createGuestCredential,
  getAuthorizedWorkspace: mocks.getAuthorizedWorkspace,
  setGuestWorkspaceCookie: mocks.setGuestWorkspaceCookie,
}));
vi.mock("@/lib/sourcing/store", () => ({
  SourcingStoreUnavailableError: class SourcingStoreUnavailableError extends Error {},
  SourcingWorkspaceConflictError: class SourcingWorkspaceConflictError extends Error {},
  getSourcingWorkspace: mocks.getSourcingWorkspace,
  getWorkspaceOwnership: mocks.getWorkspaceOwnership,
  saveSourcingWorkspace: mocks.saveSourcingWorkspace,
  sourcingStoreAdapter: mocks.sourcingStoreAdapter,
}));

import { POST } from "@/app/api/sourcing/route";

describe("sourcing creation integrity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRequestContext.mockResolvedValue({ ipHash: "test-ip" });
    mocks.rateLimit.mockResolvedValue({ ok: true });
    mocks.getSession.mockResolvedValue(null);
    mocks.sourcingStoreAdapter.mockReturnValue("filesystem");
    mocks.getAuthorizedWorkspace.mockResolvedValue(null);
    mocks.createGuestCredential.mockImplementation((workspaceId: string) => ({
      workspaceId,
      token: "guest-token",
      tokenHash: "guest-token-hash",
      expiresAt: new Date(Date.now() + 60_000),
    }));
  });

  it("fails before generating guest credentials when durable storage is unavailable", async () => {
    mocks.sourcingStoreAdapter.mockReturnValue("unavailable");
    const response = await create({ idea: "Fictional storage failure product", mutationId: "storage-unavailable-mutation-01" });

    expect(response.status).toBe(503);
    expect(mocks.createGuestCredential).not.toHaveBeenCalled();
    expect(mocks.saveSourcingWorkspace).not.toHaveBeenCalled();
  });

  it("turns a concurrent exact retry into an authorized replay and refreshes its guest cookie", async () => {
    const idea = "Fictional exact replay beverage";
    const mutationId = "concurrent-creation-mutation-001";
    const workspaceId = createHash("sha256").update(`workspace:${mutationId}`).digest("base64url").slice(0, 24);
    const creationRequestHash = createHash("sha256").update(JSON.stringify({ idea, initialUpdates: [] })).digest("hex");
    const raced = createWorkspace({ id: workspaceId, idea, creationRequestHash });
    mocks.getSourcingWorkspace.mockResolvedValueOnce(null).mockResolvedValueOnce(raced);
    mocks.getWorkspaceOwnership.mockResolvedValue({ userId: null, guestTokenHash: "guest-token-hash", expiresAt: new Date(Date.now() + 60_000) });
    const store = await import("@/lib/sourcing/store");
    mocks.saveSourcingWorkspace.mockRejectedValueOnce(new store.SourcingWorkspaceConflictError());

    const response = await create({ idea, mutationId });
    const body = await response.json() as { workspace: { id: string }; receipt: { outcome: string; authoritative: boolean } };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ workspace: { id: workspaceId }, receipt: { outcome: "replayed", authoritative: true } });
    expect(mocks.setGuestWorkspaceCookie).toHaveBeenCalledOnce();
  });

  it("does not reveal or overwrite an existing workspace when the replay is unauthorized", async () => {
    const existing = createWorkspace({ id: "unauthorized-workspace-001", idea: "Existing idea", creationRequestHash: "a".repeat(64) });
    mocks.getSourcingWorkspace.mockResolvedValue(existing);
    mocks.getWorkspaceOwnership.mockResolvedValue({ userId: "different-user", guestTokenHash: null, expiresAt: null });

    const response = await create({ idea: "Different idea", mutationId: "unauthorized-replay-mutation-01" });

    expect(response.status).toBe(404);
    expect(mocks.saveSourcingWorkspace).not.toHaveBeenCalled();
  });
});

function create(body: Record<string, unknown>) {
  return POST(new Request("http://localhost/api/sourcing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));
}
