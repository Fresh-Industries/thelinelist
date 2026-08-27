import { createWorkspace, normalizeWorkspace } from "@/lib/sourcing/workspace";
import { beforeEach, describe, expect, it, vi } from "vitest";

const blobBodies = vi.hoisted(() => new Map<string, string>());
const blobEtags = vi.hoisted(() => new Map<string, string>());
const blobEtagCounter = vi.hoisted(() => ({ value: 0 }));

vi.mock("@vercel/blob", () => {
  class BlobNotFoundError extends Error {}
  class BlobPreconditionFailedError extends Error {}

  return {
    BlobNotFoundError,
    BlobPreconditionFailedError,
    get: vi.fn(async (pathname: string) => {
      const body = blobBodies.get(pathname);
      if (body === undefined) return null;
      const etag = blobEtags.get(pathname) ?? '"external-etag"';
      return {
        statusCode: 200,
        stream: new Response(body).body,
        headers: new Headers(),
        blob: {
          url: pathname,
          downloadUrl: pathname,
          pathname,
          contentDisposition: "inline",
          cacheControl: "no-cache",
          uploadedAt: new Date(),
          etag: `W/${etag}`,
          contentType: "application/json",
          size: body.length,
        },
      };
    }),
    head: vi.fn(async (pathname: string) => {
      if (!blobBodies.has(pathname)) throw new BlobNotFoundError("Blob not found");
      return { pathname, url: pathname, downloadUrl: pathname, etag: blobEtags.get(pathname) ?? '"external-etag"' };
    }),
    put: vi.fn(async (pathname: string, body: string, options: { allowOverwrite?: boolean; ifMatch?: string }) => {
      if (!options.allowOverwrite && blobBodies.has(pathname)) {
        throw new BlobPreconditionFailedError("Blob already exists");
      }
      if (options.ifMatch && options.ifMatch !== blobEtags.get(pathname)) {
        throw new BlobPreconditionFailedError("ETag mismatch");
      }
      const etag = `"test-etag-${++blobEtagCounter.value}"`;
      blobBodies.set(pathname, body);
      blobEtags.set(pathname, etag);
      return { pathname, url: pathname, downloadUrl: pathname, etag };
    }),
    del: vi.fn(async (pathname: string) => {
      blobBodies.delete(pathname);
      blobEtags.delete(pathname);
    }),
  };
});

vi.mock("@/lib/request", () => ({
  getRequestContext: vi.fn(async () => ({ ipHash: "test-ip" })),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({ ok: true, remaining: 19, adapter: "memory" })),
}));

import { POST as createSourcingWorkspace } from "@/app/api/sourcing/route";
import { BlobNotFoundError, BlobPreconditionFailedError, get as blobGet, head as blobHead, put as blobPut } from "@vercel/blob";
import {
  SourcingStoreUnavailableError,
  SourcingWorkspaceConflictError,
  claimInquirySend,
  getSourcingWorkspace,
  getWorkspaceByPacketToken,
  releaseInquirySend,
  saveSourcingWorkspace,
  sourcingStoreAdapter,
} from "@/lib/sourcing/store";

describe("production sourcing storage", () => {
  beforeEach(() => {
    blobBodies.clear();
    blobEtags.clear();
    blobEtagCounter.value = 0;
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("BLOB_STORE_ID", "");
    vi.stubEnv("VERCEL_OIDC_TOKEN", "");
    vi.stubEnv("VERCEL", "");
  });

  it("persists workspaces in Vercel Blob when Redis is unavailable", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-token");
    const workspace = createWorkspace({ idea: "A packaged banana bread for grocery stores" });

    expect(sourcingStoreAdapter()).toBe("blob");
    await saveSourcingWorkspace(workspace, null);

    expect(await getSourcingWorkspace(workspace.id)).toEqual(workspace);
  });

  it("recognizes OIDC Blob credentials but keeps Redis as the first choice", () => {
    vi.stubEnv("BLOB_STORE_ID", "store-id");
    vi.stubEnv("VERCEL_OIDC_TOKEN", "oidc-token");
    expect(sourcingStoreAdapter()).toBe("blob");

    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.test");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "redis-token");
    expect(sourcingStoreAdapter()).toBe("upstash");
  });

  it("recognizes a connected Blob store on Vercel where OIDC refresh is automatic", () => {
    vi.stubEnv("BLOB_STORE_ID", "store-id");
    vi.stubEnv("VERCEL", "1");
    expect(sourcingStoreAdapter()).toBe("blob");
  });

  it("writes private deterministic blobs and resolves packet tokens", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-token");
    const workspace = createWorkspace({ idea: "A packaged banana bread for grocery stores" });
    workspace.outreachDrafts.push({
      id: "draft-1",
      manufacturerSlug: "example-bakery",
      manufacturerName: "Example Bakery",
      subject: "Banana bread manufacturing inquiry",
      body: "Hello",
      questions: [],
      includedFieldKeys: ["product_type"],
      excludedFieldKeys: [],
      warnings: [],
      packet: {
        token: "packet-1",
        manufacturerSlug: "example-bakery",
        manufacturerName: "Example Bakery",
        includedFieldKeys: ["product_type"],
        fieldValues: { product_type: "Packaged banana bread" },
        questions: [],
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        revokedAt: null,
      },
      availableDeliveryMethod: "not_configured",
      demoRecipient: null,
      version: 1,
      approvedVersion: null,
      approvedAt: null,
      sentAt: null,
      deliveryStatus: "draft",
      deliveryError: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await saveSourcingWorkspace(workspace, null);

    expect(await getWorkspaceByPacketToken("packet-1")).toEqual(normalizeWorkspace(workspace));
    expect(vi.mocked(blobPut)).toHaveBeenCalledWith(
      `sourcing/workspaces/${workspace.id}.json`,
      JSON.stringify(workspace),
      expect.objectContaining({
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: false,
        cacheControlMaxAge: 60,
      }),
    );
    expect(vi.mocked(blobPut)).toHaveBeenCalledWith(
      "sourcing/packets/packet-1.txt",
      workspace.id,
      expect.objectContaining({ access: "private", addRandomSuffix: false, allowOverwrite: true }),
    );
  });

  it("rejects a stale Blob workspace update instead of overwriting newer data", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-token");
    const workspace = createWorkspace({ idea: "A packaged banana bread for grocery stores" });
    await saveSourcingWorkspace(workspace, null);
    const firstReader = await getSourcingWorkspace(workspace.id);
    const secondReader = await getSourcingWorkspace(workspace.id);
    expect(firstReader).not.toBeNull();
    expect(secondReader).not.toBeNull();

    const firstUpdate = { ...firstReader!, revision: firstReader!.revision + 1, updatedAt: "first-update" };
    const staleUpdate = { ...secondReader!, revision: secondReader!.revision + 1, updatedAt: "stale-update" };
    await saveSourcingWorkspace(firstUpdate, firstReader!.revision);
    await expect(saveSourcingWorkspace(staleUpdate, secondReader!.revision)).rejects.toBeInstanceOf(SourcingWorkspaceConflictError);

    expect((await getSourcingWorkspace(workspace.id))?.updatedAt).toBe("first-update");
    expect(vi.mocked(blobPut)).toHaveBeenCalledWith(
      `sourcing/workspaces/${workspace.id}.json`,
      JSON.stringify(firstUpdate),
      expect.objectContaining({ allowOverwrite: true, ifMatch: '"test-etag-1"' }),
    );
  });

  it("rejects a duplicate Blob workspace creation", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-token");
    const workspace = createWorkspace({ idea: "A packaged banana bread for grocery stores" });
    await saveSourcingWorkspace(workspace, null);
    await expect(saveSourcingWorkspace(workspace, null)).rejects.toBeInstanceOf(SourcingWorkspaceConflictError);
  });

  it("rejects updates when the current Blob is missing or corrupt", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-token");
    const workspace = createWorkspace({ idea: "A packaged banana bread for grocery stores" });
    await expect(saveSourcingWorkspace({ ...workspace, revision: workspace.revision + 1 }, workspace.revision))
      .rejects.toBeInstanceOf(SourcingWorkspaceConflictError);

    blobBodies.set(`sourcing/workspaces/${workspace.id}.json`, "not-json");
    await expect(saveSourcingWorkspace({ ...workspace, revision: workspace.revision + 1 }, workspace.revision))
      .rejects.toBeInstanceOf(SourcingWorkspaceConflictError);
  });

  it("converts an ETag precondition failure into a workspace conflict", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-token");
    const workspace = createWorkspace({ idea: "A packaged banana bread for grocery stores" });
    await saveSourcingWorkspace(workspace, null);
    const updated = { ...workspace, revision: workspace.revision + 1 };
    vi.mocked(blobPut).mockRejectedValueOnce(new BlobPreconditionFailedError());

    await expect(saveSourcingWorkspace(updated, workspace.revision)).rejects.toBeInstanceOf(SourcingWorkspaceConflictError);
  });

  it("returns null for missing Blob workspaces", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-token");
    await expect(getSourcingWorkspace("missing-workspace")).resolves.toBeNull();
  });

  it("treats thrown Blob not-found errors as missing workspaces", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-token");
    vi.mocked(blobHead).mockRejectedValueOnce(new BlobNotFoundError());
    await expect(getSourcingWorkspace("missing-class-error")).resolves.toBeNull();

    vi.mocked(blobHead).mockRejectedValueOnce(Object.assign(new Error("Missing"), { name: "BlobNotFoundError" }));
    await expect(getSourcingWorkspace("missing-named-error")).resolves.toBeNull();
  });

  it("returns null for corrupt or bodyless Blob workspaces", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-token");
    blobBodies.set("sourcing/workspaces/corrupt.json", "not-json");
    await expect(getSourcingWorkspace("corrupt")).resolves.toBeNull();

    blobBodies.set("sourcing/workspaces/bodyless.json", "ignored");
    vi.mocked(blobGet).mockResolvedValueOnce({ statusCode: 304, stream: null } as never);
    await expect(getSourcingWorkspace("bodyless")).resolves.toBeNull();
  });

  it("propagates unexpected Blob read failures", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-token");
    blobBodies.set("sourcing/workspaces/workspace-1.json", "ignored");
    vi.mocked(blobGet).mockRejectedValueOnce(new Error("Blob service unavailable"));
    await expect(getSourcingWorkspace("workspace-1")).rejects.toThrow("Blob service unavailable");
  });

  it("uses a durable Blob claim to prevent duplicate sends", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-token");

    await expect(claimInquirySend("draft-1")).resolves.toBe(true);
    await expect(claimInquirySend("draft-1")).resolves.toBe(false);
    await releaseInquirySend("draft-1");
    await expect(claimInquirySend("draft-1")).resolves.toBe(true);
  });

  it("recognizes named precondition errors and propagates other claim failures", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-token");
    vi.mocked(blobPut).mockRejectedValueOnce(Object.assign(new Error("Already exists"), { name: "BlobPreconditionFailedError" }));
    await expect(claimInquirySend("draft-named-error")).resolves.toBe(false);

    vi.mocked(blobPut).mockRejectedValueOnce(new Error("Blob service unavailable"));
    await expect(claimInquirySend("draft-service-error")).rejects.toThrow("Blob service unavailable");
  });

  it("fails truthfully instead of creating a broken production link", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    const workspace = createWorkspace({ idea: "A packaged banana bread for grocery stores" });

    expect(sourcingStoreAdapter()).toBe("unavailable");
    await expect(getSourcingWorkspace(workspace.id)).resolves.toBeNull();
    await expect(getWorkspaceByPacketToken("packet-1")).resolves.toBeNull();
    await expect(saveSourcingWorkspace(workspace, null)).rejects.toBeInstanceOf(SourcingStoreUnavailableError);
    await expect(claimInquirySend("draft-1")).rejects.toBeInstanceOf(SourcingStoreUnavailableError);
    await expect(releaseInquirySend("draft-1")).rejects.toBeInstanceOf(SourcingStoreUnavailableError);
  });

  it("returns a JSON 503 when product-plan storage is unavailable", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    const response = await createSourcingWorkspace(new Request("https://www.thelinelist.com/api/sourcing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea: "A packaged banana bread for grocery stores" }),
    }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Product-plan storage is temporarily unavailable. Please try again later.",
    });
  });
});
