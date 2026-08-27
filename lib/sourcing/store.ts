import { BlobNotFoundError, BlobPreconditionFailedError, del, get, head, put } from "@vercel/blob";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SourcingWorkspace } from "./types";
import { normalizeWorkspace } from "./workspace";

const localStoreDirectory = join(tmpdir(), "thelinelist-sourcing-workspaces");

function read(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function redisReady(): boolean {
  return Boolean(read("UPSTASH_REDIS_REST_URL") && read("UPSTASH_REDIS_REST_TOKEN"));
}

function blobReady(): boolean {
  return Boolean(
    read("BLOB_READ_WRITE_TOKEN") ||
    (read("BLOB_STORE_ID") && (read("VERCEL_OIDC_TOKEN") || read("VERCEL") === "1")),
  );
}

function workspaceKey(id: string): string {
  return `sourcing:workspace:${id}`;
}

function packetKey(token: string): string {
  return `sourcing:packet:${token}`;
}

function blobWorkspacePath(id: string): string {
  return `sourcing/workspaces/${id}.json`;
}

function blobPacketPath(token: string): string {
  return `sourcing/packets/${token}.txt`;
}

function blobSendClaimPath(draftId: string): string {
  return `sourcing/send-claims/${draftId}.lock`;
}

function fileStoreReady(): boolean {
  return process.env.NODE_ENV !== "production";
}

export class SourcingStoreUnavailableError extends Error {
  constructor() {
    super("Persistent sourcing storage is not configured.");
    this.name = "SourcingStoreUnavailableError";
  }
}

export class SourcingWorkspaceConflictError extends Error {
  constructor() {
    super("The workspace changed. Refresh and try again.");
    this.name = "SourcingWorkspaceConflictError";
  }
}

export function sourcingStoreAdapter(): "upstash" | "blob" | "filesystem" | "unavailable" {
  if (redisReady()) return "upstash";
  if (blobReady()) return "blob";
  if (fileStoreReady()) return "filesystem";
  return "unavailable";
}

export function packetIsActive(packet: { expiresAt: string; revokedAt: string | null }): boolean {
  return !packet.revokedAt && Date.parse(packet.expiresAt) > Date.now();
}

export async function getSourcingWorkspace(id: string): Promise<SourcingWorkspace | null> {
  if (redisReady()) {
    const value = await redisCommand<string | null>(["GET", workspaceKey(id)]);
    if (!value) return null;
    try {
      return normalizeWorkspace(JSON.parse(value) as SourcingWorkspace);
    } catch {
      return null;
    }
  }
  if (blobReady()) {
    const value = await readBlob(blobWorkspacePath(id));
    if (!value) return null;
    try {
      return normalizeWorkspace(JSON.parse(value) as SourcingWorkspace);
    } catch {
      return null;
    }
  }
  if (fileStoreReady()) {
    try {
      return normalizeWorkspace(JSON.parse(await readFile(join(localStoreDirectory, `${id}.json`), "utf8")) as SourcingWorkspace);
    } catch {
      return null;
    }
  }
  return null;
}

export async function saveSourcingWorkspace(workspace: SourcingWorkspace, expectedRevision: number | null): Promise<void> {
  if (redisReady()) {
    const saved = await redisCommand<number>([
      "EVAL",
      "local current=redis.call('GET',KEYS[1]); if ARGV[1]=='create' then if current then return 0 end; redis.call('SET',KEYS[1],ARGV[2]); return 1 end; if not current then return 0 end; local decoded=cjson.decode(current); if tonumber(decoded.revision)~=tonumber(ARGV[1]) then return 0 end; redis.call('SET',KEYS[1],ARGV[2]); return 1",
      "1",
      workspaceKey(workspace.id),
      expectedRevision === null ? "create" : String(expectedRevision),
      JSON.stringify(workspace),
    ]);
    if (saved !== 1) throw new SourcingWorkspaceConflictError();
    for (const draft of workspace.outreachDrafts) {
      await redisCommand(["SET", packetKey(draft.packet.token), workspace.id, "EX", String(60 * 60 * 24 * 31)]);
    }
    return;
  }
  if (blobReady()) {
    const pathname = blobWorkspacePath(workspace.id);
    try {
      if (expectedRevision === null) {
        await writeBlob(pathname, JSON.stringify(workspace), false, "application/json");
      } else {
        const current = await readBlobRecord(pathname);
        if (!current) throw new SourcingWorkspaceConflictError();
        let currentRevision: number;
        try {
          currentRevision = (JSON.parse(current.body) as SourcingWorkspace).revision;
        } catch {
          throw new SourcingWorkspaceConflictError();
        }
        if (currentRevision !== expectedRevision) throw new SourcingWorkspaceConflictError();
        await writeBlob(pathname, JSON.stringify(workspace), true, "application/json", current.etag);
      }
    } catch (error) {
      if (error instanceof SourcingWorkspaceConflictError) throw error;
      if (error instanceof BlobPreconditionFailedError || (error instanceof Error && error.name === "BlobPreconditionFailedError")) {
        throw new SourcingWorkspaceConflictError();
      }
      throw error;
    }
    for (const draft of workspace.outreachDrafts) {
      await writeBlob(blobPacketPath(draft.packet.token), workspace.id, true, "text/plain");
    }
    return;
  }
  if (fileStoreReady()) {
    await mkdir(localStoreDirectory, { recursive: true });
    const workspacePath = join(localStoreDirectory, `${workspace.id}.json`);
    try {
      const current = JSON.parse(await readFile(workspacePath, "utf8")) as SourcingWorkspace;
      if (expectedRevision === null || current.revision !== expectedRevision) throw new SourcingWorkspaceConflictError();
    } catch (error) {
      if (error instanceof SourcingWorkspaceConflictError) throw error;
      if (expectedRevision !== null) throw new SourcingWorkspaceConflictError();
    }
    await writeFile(workspacePath, JSON.stringify(workspace), { encoding: "utf8", mode: 0o600 });
    for (const draft of workspace.outreachDrafts) {
      await writeFile(join(localStoreDirectory, `packet-${draft.packet.token}.txt`), workspace.id, { encoding: "utf8", mode: 0o600 });
    }
    return;
  }
  throw new SourcingStoreUnavailableError();
}

export async function getWorkspaceByPacketToken(token: string): Promise<SourcingWorkspace | null> {
  let workspaceId: string | null;
  if (redisReady()) workspaceId = await redisCommand<string | null>(["GET", packetKey(token)]);
  else if (blobReady()) workspaceId = await readBlob(blobPacketPath(token));
  else if (fileStoreReady()) {
    try { workspaceId = (await readFile(join(localStoreDirectory, `packet-${token}.txt`), "utf8")).trim(); }
    catch { workspaceId = null; }
  } else workspaceId = null;
  return workspaceId ? getSourcingWorkspace(workspaceId) : null;
}

export async function claimInquirySend(draftId: string): Promise<boolean> {
  const key = `sourcing:send:${draftId}`;
  if (redisReady()) {
    const result = await redisCommand<string | null>(["SET", key, "claimed", "NX", "EX", String(60 * 60 * 24 * 365)]);
    return result === "OK";
  }
  if (blobReady()) {
    try {
      await writeBlob(blobSendClaimPath(draftId), "claimed", false, "text/plain");
      return true;
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError || (error instanceof Error && error.name === "BlobPreconditionFailedError")) return false;
      throw error;
    }
  }
  if (fileStoreReady()) {
    await mkdir(localStoreDirectory, { recursive: true });
    try {
      await writeFile(join(localStoreDirectory, `${key.replaceAll(":", "-")}.lock`), "claimed", { flag: "wx", mode: 0o600 });
      return true;
    } catch {
      return false;
    }
  }
  throw new SourcingStoreUnavailableError();
}

export async function releaseInquirySend(draftId: string): Promise<void> {
  const key = `sourcing:send:${draftId}`;
  if (redisReady()) {
    await redisCommand(["DEL", key]);
    return;
  }
  if (blobReady()) {
    await del(blobSendClaimPath(draftId));
    return;
  }
  if (fileStoreReady()) {
    await unlink(join(localStoreDirectory, `${key.replaceAll(":", "-")}.lock`)).catch(() => undefined);
    return;
  }
  throw new SourcingStoreUnavailableError();
}

async function readBlob(pathname: string): Promise<string | null> {
  return (await readBlobRecord(pathname))?.body ?? null;
}

async function readBlobRecord(pathname: string): Promise<{ body: string; etag: string } | null> {
  try {
    // Private Blob downloads can expose a weak HTTP ETag (W/"..."). Conditional
    // writes require the strong Blob ETag returned by the metadata API.
    const metadata = await head(pathname);
    const result = await get(pathname, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    return { body: await new Response(result.stream).text(), etag: metadata.etag };
  } catch (error) {
    if (error instanceof BlobNotFoundError || (error instanceof Error && error.name === "BlobNotFoundError")) return null;
    throw error;
  }
}

async function writeBlob(pathname: string, body: string, allowOverwrite: boolean, contentType: string, ifMatch?: string): Promise<void> {
  await put(pathname, body, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite,
    cacheControlMaxAge: 60,
    contentType,
    ...(ifMatch ? { ifMatch } : {}),
  });
}

async function redisCommand<T = unknown>(command: Array<string>): Promise<T> {
  const url = read("UPSTASH_REDIS_REST_URL").replace(/\/$/, "");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${read("UPSTASH_REDIS_REST_TOKEN")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([command]),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Sourcing store HTTP ${response.status}`);
  const payload = await response.json() as { result?: Array<{ result?: T } | T> };
  const first = payload.result?.[0];
  return (typeof first === "object" && first !== null && "result" in first ? first.result : first) as T;
}
