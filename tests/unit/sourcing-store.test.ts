import { beforeEach, describe, expect, it, vi } from "vitest";
import { createWorkspace } from "@/lib/sourcing/workspace";

vi.mock("server-only", () => ({}));
vi.mock("@vercel/blob", () => ({
  BlobNotFoundError: class BlobNotFoundError extends Error {},
  get: vi.fn(),
  put: vi.fn(),
}));
vi.mock("@/lib/request", () => ({ getRequestContext: vi.fn(async () => ({ ipHash: "test-ip" })) }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn(async () => ({ ok: true, remaining: 19, adapter: "memory" })) }));

import { POST as createSourcingWorkspace } from "@/app/api/sourcing/route";
import {
  SourcingStoreUnavailableError,
  SourcingWorkspaceConflictError,
  getSourcingWorkspace,
  saveSourcingWorkspace,
  sourcingStoreAdapter,
} from "@/lib/sourcing/store";

describe("production sourcing storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
  });

  it("uses PostgreSQL for structured state when DATABASE_URL is configured", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgresql://app:test@127.0.0.1:5432/thelinelist_test");
    expect(sourcingStoreAdapter()).toBe("postgres");
  });

  it("does not use Blob credentials as a structured workspace adapter", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "blob-only");
    expect(sourcingStoreAdapter()).toBe("unavailable");
  });

  it("keeps a development-only filesystem adapter for local UI work", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const workspace = createWorkspace({ idea: `A test product ${crypto.randomUUID()}` });
    expect(sourcingStoreAdapter()).toBe("filesystem");
    await saveSourcingWorkspace(workspace, null);
    await expect(getSourcingWorkspace(workspace.id)).resolves.toEqual(workspace);
  });

  it("preserves optimistic revision conflicts in the development adapter", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const workspace = createWorkspace({ idea: `A test product ${crypto.randomUUID()}` });
    await saveSourcingWorkspace(workspace, null);
    const first = await getSourcingWorkspace(workspace.id);
    const stale = await getSourcingWorkspace(workspace.id);
    expect(first).not.toBeNull();
    expect(stale).not.toBeNull();
    await saveSourcingWorkspace({ ...first!, revision: first!.revision + 1 }, first!.revision);
    await expect(saveSourcingWorkspace({ ...stale!, revision: stale!.revision + 1 }, stale!.revision)).rejects.toBeInstanceOf(SourcingWorkspaceConflictError);
  });

  it("fails closed in production when PostgreSQL is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const workspace = createWorkspace({ idea: "A packaged banana bread" });
    expect(sourcingStoreAdapter()).toBe("unavailable");
    await expect(getSourcingWorkspace(workspace.id)).resolves.toBeNull();
    await expect(saveSourcingWorkspace(workspace, null)).rejects.toBeInstanceOf(SourcingStoreUnavailableError);
  });

  it("returns a JSON 503 instead of creating an unusable production workspace", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = await createSourcingWorkspace(new Request("https://www.thelinelist.com/api/sourcing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea: "A packaged banana bread for coffee shops" }),
    }));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "Product-plan storage is temporarily unavailable. Please try again later." });
  });
});
