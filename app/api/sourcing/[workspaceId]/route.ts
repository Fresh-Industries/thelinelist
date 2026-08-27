import { getPlantBySlug } from "@/lib/directory";
import { getSourcingReadiness, MATCH_SHAPING_FIELDS } from "@/lib/sourcing/readiness";
import { agentUpdateSchema, founderUpdateSchema, selectionUpdateSchema, workspaceIdSchema } from "@/lib/sourcing/schemas";
import { SourcingWorkspaceConflictError, getSourcingWorkspace, saveSourcingWorkspace, sourcingStoreAdapter } from "@/lib/sourcing/store";
import { applyAgentUpdates, applyFounderFieldUpdate, invalidateDraftApprovalsForFounderEmailChange, touch } from "@/lib/sourcing/workspace";
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
  return NextResponse.json({ workspace, readiness: getSourcingReadiness(workspace), storageAdapter: sourcingStoreAdapter() });
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

  const founderEmailChanged = updated.fields.contact_email.value !== workspace.fields.contact_email.value
    || updated.fields.contact_email.status !== workspace.fields.contact_email.status;
  if (founderEmailChanged) {
    updated = invalidateDraftApprovalsForFounderEmailChange(updated);
  }

  const matchRelevantKeys = new Set(["product_type", "product_description", ...MATCH_SHAPING_FIELDS]);
  const changesManufacturerFit = agent.success
    ? agent.data.proposedUpdates.some((update) => matchRelevantKeys.has(update.key))
    : founder.success ? matchRelevantKeys.has(founder.data.fieldUpdate.key) : false;
  if (changesManufacturerFit) {
    updated = {
      ...updated,
      matches: [],
      matchesUpdatedAt: null,
      selectedManufacturerSlugs: [],
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
  return NextResponse.json({ workspace: updated, readiness: getSourcingReadiness(updated) });
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
