import { matchManufacturers } from "@/lib/sourcing/matching";
import { getSourcingReadiness, hasMinimumMatchingInfo } from "@/lib/sourcing/readiness";
import { matchRequestSchema, workspaceIdSchema } from "@/lib/sourcing/schemas";
import { SourcingWorkspaceConflictError, saveSourcingWorkspace } from "@/lib/sourcing/store";
import { addWorkspaceActivity } from "@/lib/sourcing/workspace";
import { NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { getAuthorizedWorkspace } from "@/lib/sourcing/access";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  if (!workspaceIdSchema.safeParse(workspaceId).success) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  const authorized = await getAuthorizedWorkspace(workspaceId);
  if (!authorized) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  const workspace = authorized.workspace;
  const context = await getRequestContext();
  const limited = await rateLimit({ key: `sourcing-match:${context.ipHash}:${workspaceId}`, limit: 60, windowSec: 60 * 60 });
  if (!limited.ok) return NextResponse.json({ error: "Matching limit reached. Try again later." }, { status: 429 });
  const parsed = matchRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid matching request." }, { status: 400 });
  if (!hasMinimumMatchingInfo(workspace)) {
    return NextResponse.json({ error: "Your plan needs a little more detail before a useful manufacturer search.", workspace, readiness: getSourcingReadiness(workspace), matches: [] }, { status: 409 });
  }
  const matches = matchManufacturers(workspace, parsed.data);
  const updated = addWorkspaceActivity({
    ...workspace,
    matches,
    selectedManufacturerSlugs: [],
    matchesUpdatedAt: new Date().toISOString(),
  }, "matched", `${matches.length} evidence-backed manufacturer match${matches.length === 1 ? "" : "es"} prepared.`);
  try {
    await saveSourcingWorkspace(updated, workspace.revision);
  } catch (error) {
    if (error instanceof SourcingWorkspaceConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    throw error;
  }
  return NextResponse.json({ workspace: updated, readiness: getSourcingReadiness(updated), matches });
}
