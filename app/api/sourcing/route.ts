import { SourcingStoreUnavailableError, SourcingWorkspaceConflictError, saveSourcingWorkspace, sourcingStoreAdapter } from "@/lib/sourcing/store";
import { createWorkspace } from "@/lib/sourcing/workspace";
import { NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const context = await getRequestContext();
  const limited = await rateLimit({ key: `sourcing-create:${context.ipHash}`, limit: process.env.NODE_ENV === "development" ? 500 : 20, windowSec: 60 * 60 });
  if (!limited.ok) return NextResponse.json({ error: "Workspace creation limit reached. Try again later." }, { status: 429 });
  const body = await request.json().catch(() => ({})) as { demo?: unknown; idea?: unknown };
  const idea = typeof body.idea === "string" ? body.idea.slice(0, 300) : undefined;
  const workspace = createWorkspace({ demo: body.demo === true, idea });
  try {
    await saveSourcingWorkspace(workspace, null);
  } catch (error) {
    if (error instanceof SourcingStoreUnavailableError) {
      return NextResponse.json(
        { error: "Product-plan storage is temporarily unavailable. Please try again later." },
        { status: 503 },
      );
    }
    if (error instanceof SourcingWorkspaceConflictError) {
      return NextResponse.json({ error: "Product plan creation conflicted with another request. Please try again." }, { status: 409 });
    }
    throw error;
  }
  return NextResponse.json({ workspace, storageAdapter: sourcingStoreAdapter() }, { status: 201 });
}
