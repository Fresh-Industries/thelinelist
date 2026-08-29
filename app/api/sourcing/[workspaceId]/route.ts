import { getPlantBySlug } from "@/lib/directory";
import { getSourcingReadiness, MATCH_SHAPING_FIELDS } from "@/lib/sourcing/readiness";
import { agentUpdateSchema, founderUpdateSchema, packageDesignUpdateSchema, selectionUpdateSchema, undoAgentChangeSchema, workspaceIdSchema } from "@/lib/sourcing/schemas";
import { SourcingWorkspaceConflictError, getSourcingWorkspace, saveSourcingWorkspace, sourcingStoreAdapter } from "@/lib/sourcing/store";
import { getAuthorizedWorkspace } from "@/lib/sourcing/access";
import { applyAgentUpdates, applyFounderFieldUpdate, applyPackageDesignUpdate, invalidateDraftApprovalsForFounderEmailChange, invalidateDraftsForProductChange, touch, undoLastAgentChange } from "@/lib/sourcing/workspace";
import { NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

interface RouteContext { params: Promise<{ workspaceId: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const { workspaceId } = await context.params;
  if (!workspaceIdSchema.safeParse(workspaceId).success) return error("Workspace not found.", 404);
  const authorized = await getAuthorizedWorkspace(workspaceId);
  if (!authorized) return error("Workspace not found.", 404);
  return NextResponse.json({ workspace: authorized.workspace, readiness: getSourcingReadiness(authorized.workspace), storageAdapter: sourcingStoreAdapter(), ownership: authorized.access });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { workspaceId } = await context.params;
  if (!workspaceIdSchema.safeParse(workspaceId).success) return error("Workspace not found.", 404);
  const authorized = await getAuthorizedWorkspace(workspaceId);
  if (!authorized) return error("Workspace not found.", 404);
  const workspace = authorized.workspace;
  const requestContext = await getRequestContext();
  const limited = await rateLimit({ key: `sourcing-update:${requestContext.ipHash}:${workspaceId}`, limit: 120, windowSec: 60 * 60 });
  if (!limited.ok) return error("Workspace update limit reached. Try again later.", 429);
  const body = await request.json().catch(() => null);

  const agent = agentUpdateSchema.safeParse(body);
  const founder = founderUpdateSchema.safeParse(body);
  const selection = selectionUpdateSchema.safeParse(body);
  const packageDesign = packageDesignUpdateSchema.safeParse(body);
  const undo = undoAgentChangeSchema.safeParse(body);
  const requestedRevision = agent.success ? agent.data.revision : founder.success ? founder.data.revision : selection.success ? selection.data.revision : packageDesign.success ? packageDesign.data.revision : undo.success ? undo.data.revision : undefined;
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
  } else if (packageDesign.success) {
    if (packageDesign.data.updatedBy === "agent" && !packageDesign.data.explicitlyStated) return error("The agent can only apply packaging choices the founder explicitly requested.", 400);
    updated = applyPackageDesignUpdate(workspace, packageDesign.data.packageDesign, packageDesign.data.updatedBy);
  } else if (undo.success) {
    if (workspace.lastAgentChange?.id !== undo.data.undoAgentChangeId) return error("That agent change can no longer be undone.", 409);
    updated = undoLastAgentChange(workspace, undo.data.undoAgentChangeId);
  } else {
    return error("Invalid workspace update.", 400);
  }

  const founderEmailChanged = updated.fields.contact_email.value !== workspace.fields.contact_email.value
    || updated.fields.contact_email.status !== workspace.fields.contact_email.status;
  if (founderEmailChanged) {
    updated = invalidateDraftApprovalsForFounderEmailChange(updated);
  }

  const matchRelevantKeys = new Set(["product_name", "product_category", "product_format", "product_type", "product_description", ...MATCH_SHAPING_FIELDS]);
  const changesManufacturerFit = agent.success
    ? agent.data.proposedUpdates.some((update) => matchRelevantKeys.has(update.key))
    : founder.success ? matchRelevantKeys.has(founder.data.fieldUpdate.key)
      : packageDesign.success
        ? true
        : undo.success ? workspace.lastAgentChange?.changedKeys.some((key) => matchRelevantKeys.has(key)) ?? false : false;
  if (changesManufacturerFit) {
    updated = invalidateDraftsForProductChange({
      ...updated,
      matches: [],
      matchesUpdatedAt: null,
      selectedManufacturerSlugs: [],
    });
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
