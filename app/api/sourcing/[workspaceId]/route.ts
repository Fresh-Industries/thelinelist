import { getSourcingReadiness, MATCH_SHAPING_FIELDS } from "@/lib/sourcing/readiness";
import { agentUpdateSchema, founderUpdateSchema, packageDesignCommitSchema, packageDesignStageSchema, selectionUpdateSchema, undoAgentChangeSchema, workspaceIdSchema } from "@/lib/sourcing/schemas";
import { SourcingWorkspaceConflictError, getSourcingWorkspace, saveSourcingWorkspace, sourcingStoreAdapter } from "@/lib/sourcing/store";
import { getAuthorizedWorkspace } from "@/lib/sourcing/access";
import { applyAgentUpdates, applyFounderFieldUpdate, commitStagedPackageDesign, getCurrentManufacturerResearch, invalidateDraftApprovalsForFounderEmailChange, invalidateDraftsForProductChange, invalidateManufacturerResearch, packageDesignHash, stagePackageDesign, touch, undoLastAgentChange } from "@/lib/sourcing/workspace";
import { NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import type { SourcingWorkspace } from "@/lib/sourcing/types";

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
  const packageStage = packageDesignStageSchema.safeParse(body);
  const packageCommit = packageDesignCommitSchema.safeParse(body);
  const undo = undoAgentChangeSchema.safeParse(body);
  if (packageStage.success && workspace.stagedPackageDesign?.id === packageStage.data.stagePackageDesign.stageId) {
    if (workspace.stagedPackageDesign.designHash !== packageDesignHash(packageStage.data.stagePackageDesign.packageDesign)) {
      return error("That package stage ID was already used for a different design.", 409);
    }
    return NextResponse.json({
      workspace,
      readiness: getSourcingReadiness(workspace),
      receipt: packageReceipt("stage_package_design", "replayed", workspace, packageStage.data.stagePackageDesign.stageId),
    });
  }
  if (packageCommit.success && workspace.packageCommit?.id === packageCommit.data.founderPackageCommit.commitId) {
    if (workspace.packageCommit.stagedPackageId !== packageCommit.data.founderPackageCommit.stagedPackageId) {
      return error("That package commit ID was already used for a different staged design.", 409);
    }
    return NextResponse.json({
      workspace,
      readiness: getSourcingReadiness(workspace),
      receipt: packageReceipt("commit_package_design", "replayed", workspace, workspace.packageCommit.stagedPackageId, workspace.packageCommit.id),
    });
  }
  const requestedRevision = agent.success ? agent.data.revision : founder.success ? founder.data.revision : selection.success ? selection.data.revision : packageStage.success ? packageStage.data.revision : packageCommit.success ? packageCommit.data.revision : undo.success ? undo.data.revision : undefined;
  if (requestedRevision && requestedRevision !== workspace.revision) {
    return NextResponse.json({ error: "The workspace changed. Refresh and try again.", workspace }, { status: 409 });
  }

  let updated: SourcingWorkspace;
  if (agent.success) {
    updated = applyAgentUpdates(workspace, agent.data.proposedUpdates);
  } else if (founder.success) {
    updated = applyFounderFieldUpdate(workspace, founder.data.fieldUpdate);
  } else if (selection.success) {
    const currentResearch = getCurrentManufacturerResearch(workspace);
    if (!currentResearch) return NextResponse.json({ error: "Research the current product plan before selecting manufacturers.", workspace }, { status: 409 });
    const currentMatchSlugs = new Set(currentResearch.candidates.map((match) => match.manufacturerSlug));
    const requested = [...new Set(selection.data.selectedManufacturerSlugs)];
    if (requested.some((slug) => !currentMatchSlugs.has(slug))) {
      return NextResponse.json({ error: "Select manufacturers only from the current research results.", workspace }, { status: 409 });
    }
    updated = touch({ ...workspace, selectedManufacturerSlugs: requested });
  } else if (packageStage.success) {
    updated = stagePackageDesign(workspace, packageStage.data.stagePackageDesign);
  } else if (packageCommit.success) {
    try {
      updated = commitStagedPackageDesign(workspace, packageCommit.data.founderPackageCommit);
    } catch (cause) {
      return error(cause instanceof Error ? cause.message : "The package direction could not be committed.", 409);
    }
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
  const changesManufacturerFit = packageCommit.success || [...matchRelevantKeys].some((key) => {
    const fieldKey = key as keyof typeof workspace.fields;
    const before = workspace.fields[fieldKey];
    const after = updated.fields[fieldKey];
    return before.value !== after.value || before.status !== after.status || before.validationStatus !== after.validationStatus;
  });
  if (changesManufacturerFit) {
    updated = invalidateDraftsForProductChange(invalidateManufacturerResearch(updated));
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
  const receipt = packageStage.success
    ? packageReceipt("stage_package_design", "staged", updated, packageStage.data.stagePackageDesign.stageId)
    : packageCommit.success
      ? packageReceipt("commit_package_design", "committed", updated, packageCommit.data.founderPackageCommit.stagedPackageId, packageCommit.data.founderPackageCommit.commitId)
      : undefined;
  return NextResponse.json({ workspace: updated, readiness: getSourcingReadiness(updated), ...(receipt ? { receipt } : {}) });
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function packageReceipt(
  mutation: "stage_package_design" | "commit_package_design",
  outcome: "staged" | "committed" | "replayed",
  workspace: { id: string; revision: number },
  stagedPackageId: string,
  commitId?: string,
) {
  return {
    authoritative: true as const,
    mutation,
    outcome,
    workspaceId: workspace.id,
    revision: workspace.revision,
    stageId: stagedPackageId,
    stagedPackageId,
    ...(commitId ? { commitId } : {}),
    committed: mutation === "commit_package_design",
  };
}
