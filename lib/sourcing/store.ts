import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SourcingWorkspace } from "./types";

const memoryWorkspaces = new Map<string, SourcingWorkspace>();
const memoryPacketIndex = new Map<string, string>();
const memorySendClaims = new Set<string>();
const localStoreDirectory = join(tmpdir(), "thelinelist-sourcing-workspaces");

function read(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function redisReady(): boolean {
  return Boolean(read("UPSTASH_REDIS_REST_URL") && read("UPSTASH_REDIS_REST_TOKEN"));
}

function workspaceKey(id: string): string {
  return `sourcing:workspace:${id}`;
}

function packetKey(token: string): string {
  return `sourcing:packet:${token}`;
}

function fileStoreReady(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function sourcingStoreAdapter(): "upstash" | "filesystem" | "memory" {
  return redisReady() ? "upstash" : fileStoreReady() ? "filesystem" : "memory";
}

export function packetIsActive(packet: { expiresAt: string; revokedAt: string | null }): boolean {
  return !packet.revokedAt && Date.parse(packet.expiresAt) > Date.now();
}

export async function getSourcingWorkspace(id: string): Promise<SourcingWorkspace | null> {
  if (!redisReady() && fileStoreReady()) {
    try {
      return JSON.parse(await readFile(join(localStoreDirectory, `${id}.json`), "utf8")) as SourcingWorkspace;
    } catch {
      return null;
    }
  }
  if (!redisReady()) return structuredClone(memoryWorkspaces.get(id) ?? null);
  const value = await redisCommand<string | null>(["GET", workspaceKey(id)]);
  if (!value) return null;
  try {
    return JSON.parse(value) as SourcingWorkspace;
  } catch {
    return null;
  }
}

export async function saveSourcingWorkspace(workspace: SourcingWorkspace): Promise<void> {
  if (!redisReady() && fileStoreReady()) {
    await mkdir(localStoreDirectory, { recursive: true });
    await writeFile(join(localStoreDirectory, `${workspace.id}.json`), JSON.stringify(workspace), { encoding: "utf8", mode: 0o600 });
    for (const draft of workspace.outreachDrafts) {
      await writeFile(join(localStoreDirectory, `packet-${draft.packet.token}.txt`), workspace.id, { encoding: "utf8", mode: 0o600 });
    }
    return;
  }
  if (!redisReady()) {
    memoryWorkspaces.set(workspace.id, structuredClone(workspace));
    for (const draft of workspace.outreachDrafts) {
      memoryPacketIndex.set(draft.packet.token, workspace.id);
    }
    return;
  }

  await redisCommand(["SET", workspaceKey(workspace.id), JSON.stringify(workspace)]);
  for (const draft of workspace.outreachDrafts) {
    await redisCommand(["SET", packetKey(draft.packet.token), workspace.id, "EX", String(60 * 60 * 24 * 31)]);
  }
}

export async function getWorkspaceByPacketToken(token: string): Promise<SourcingWorkspace | null> {
  let workspaceId: string | null;
  if (redisReady()) workspaceId = await redisCommand<string | null>(["GET", packetKey(token)]);
  else if (fileStoreReady()) {
    try { workspaceId = (await readFile(join(localStoreDirectory, `packet-${token}.txt`), "utf8")).trim(); }
    catch { workspaceId = null; }
  } else workspaceId = memoryPacketIndex.get(token) ?? null;
  return workspaceId ? getSourcingWorkspace(workspaceId) : null;
}

export async function claimInquirySend(draftId: string): Promise<boolean> {
  const key = `sourcing:send:${draftId}`;
  if (!redisReady() && fileStoreReady()) {
    await mkdir(localStoreDirectory, { recursive: true });
    try {
      await writeFile(join(localStoreDirectory, `${key.replaceAll(":", "-")}.lock`), "claimed", { flag: "wx", mode: 0o600 });
      return true;
    } catch {
      return false;
    }
  }
  if (!redisReady()) {
    if (memorySendClaims.has(key)) return false;
    memorySendClaims.add(key);
    return true;
  }
  const result = await redisCommand<string | null>(["SET", key, "claimed", "NX", "EX", String(60 * 60 * 24 * 365)]);
  return result === "OK";
}

export async function releaseInquirySend(draftId: string): Promise<void> {
  const key = `sourcing:send:${draftId}`;
  if (!redisReady() && fileStoreReady()) {
    await unlink(join(localStoreDirectory, `${key.replaceAll(":", "-")}.lock`)).catch(() => undefined);
    return;
  }
  if (!redisReady()) {
    memorySendClaims.delete(key);
    return;
  }
  await redisCommand(["DEL", key]);
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
