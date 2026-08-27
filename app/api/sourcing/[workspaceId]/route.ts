import { getPlantBySlug } from "@/lib/directory";
import { matchManufacturers } from "@/lib/sourcing/matching";
import { hasMinimumMatchingInfo } from "@/lib/sourcing/readiness";
import { agentUpdateSchema, founderUpdateSchema, selectionUpdateSchema, workspaceIdSchema } from "@/lib/sourcing/schemas";
import { SourcingWorkspaceConflictError, getSourcingWorkspace, saveSourcingWorkspace, sourcingStoreAdapter } from "@/lib/sourcing/store";
import { applyAgentUpdates, applyFounderFieldUpdate, touch } from "@/lib/sourcing/workspace";
import { NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

interface RouteContext { params: Promise<{ workspaceId: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const { workspaceId } = await context.params;
  if (!workspaceIdSchema.safeParse(workspaceId).success) return error("Workspace not found.", 404);
  const workspace = await getSourcingWorkspace(workspaceId);
  if (!workspace) return error("Workspace not found.", 404);
  return NextResponse.json({ workspace, storageAdapter: sourcingStoreAdapter() });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { workspaceId } = await context.params;
  if (!workspaceIdSchema.safeParse(workspaceId).success) return error("Workspace not found.", 404);
  const workspace = await getSourcingWorkspace(workspaceId);
  if (!workspace) return error("Workspace not found.", 404);
  const requestContext = await getRequestContext();
  const limited = await rateLimit({ key: `sourcing-update:${requestContext.ipHash}:${workspaceId}`, limit: 120, windowSec: 60 * 60 });
  if (!limited.ok) return error("Workspace update limit reached. Try again later.", 429);
  const body = await request.json().catch(() => null);

  const agent = agentUpdateSchema.safeParse(body);
  const founder = founderUpdateSchema.safeParse(body);
  const selection = selectionUpdateSchema.safeParse(body);
  const requestedRevision = agent.success ? agent.data.revision : founder.success ? founder.data.revision : selection.success ? selection.data.revision : undefined;
  if (requestedRevision && requestedRevision !== workspace.revision) {
    return NextResponse.json({ error: "The workspace changed. Refresh and try again.", workspace }, { status: 409 });
  }

  let updated;
  if (agent.success) {
    updated = applyAgentUpdates(workspace, agent.data.proposedUpdates);
  } else if (founder.success) {
    updated = applyFounderFieldUpdate(workspace, founder.data.fieldUpdate);
  } else if (selection.success) {
    const valid = selection.data.selectedManufacturerSlugs.filter((slug) => getPlantBySlug(slug));
    updated = touch({ ...workspace, selectedManufacturerSlugs: [...new Set(valid)] });
  } else {
    return error("Invalid workspace update.", 400);
  }

  if (agent.success || founder.success) {
    updated = {
      ...updated,
      matches: hasMinimumMatchingInfo(updated) ? matchManufacturers(updated, { resultLimit: 3 }) : [],
      matchesUpdatedAt: hasMinimumMatchingInfo(updated) ? new Date().toISOString() : null,
    };
  }
  try {
    await saveSourcingWorkspace(updated, workspace.revision);
  } catch (error) {
    if (error instanceof SourcingWorkspaceConflictError) {
      const current = await getSourcingWorkspace(workspaceId);
      return NextResponse.json({ error: error.message, workspace: current ?? workspace }, { status: 409 });
    }
    throw error;
  }
  return NextResponse.json({ workspace: updated });
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
