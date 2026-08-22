import { sha256 } from "@/lib/hash";

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  adapter: "upstash" | "memory";
}

interface MemoryBucket {
  count: number;
  resetAt: number;
}

const memoryBuckets = new Map<string, MemoryBucket>();

function read(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function upstashReady(): boolean {
  return Boolean(read("UPSTASH_REDIS_REST_URL") && read("UPSTASH_REDIS_REST_TOKEN"));
}

export async function rateLimit(options: {
  key: string;
  limit: number;
  windowSec: number;
}): Promise<RateLimitResult> {
  const digest = sha256(options.key).slice(0, 32);
  if (upstashReady()) {
    return limitWithUpstash(digest, options.limit, options.windowSec);
  }
  return limitInMemory(digest, options.limit, options.windowSec);
}

async function limitWithUpstash(
  digest: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const url = read("UPSTASH_REDIS_REST_URL").replace(/\/$/, "");
  const key = `rl:${digest}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${read("UPSTASH_REDIS_REST_TOKEN")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, String(windowSec), "NX"],
    ]),
  });

  if (!response.ok) {
    return limitInMemory(digest, limit, windowSec);
  }

  const body = (await response.json()) as { result?: Array<{ result?: number } | number> };
  const first = body.result?.[0];
  const count = typeof first === "number" ? first : first?.result;
  if (typeof count !== "number") {
    return limitInMemory(digest, limit, windowSec);
  }

  return {
    ok: count <= limit,
    remaining: Math.max(0, limit - count),
    adapter: "upstash",
  };
}

function limitInMemory(digest: string, limit: number, windowSec: number): RateLimitResult {
  const now = Date.now();
  const current = memoryBuckets.get(digest);
  if (!current || current.resetAt <= now) {
    memoryBuckets.set(digest, { count: 1, resetAt: now + windowSec * 1000 });
    return { ok: true, remaining: limit - 1, adapter: "memory" };
  }
  current.count += 1;
  return {
    ok: current.count <= limit,
    remaining: Math.max(0, limit - current.count),
    adapter: "memory",
  };
}
