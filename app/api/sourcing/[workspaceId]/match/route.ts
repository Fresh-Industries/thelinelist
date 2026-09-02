import { matchManufacturers } from "@/lib/sourcing/matching";
import { getSourcingReadiness, hasMinimumMatchingInfo } from "@/lib/sourcing/readiness";
import { matchRequestSchema, workspaceIdSchema } from "@/lib/sourcing/schemas";
import { SourcingWorkspaceConflictError, getSourcingWorkspace, saveSourcingWorkspace } from "@/lib/sourcing/store";
import { applyManufacturerResearch, getCurrentManufacturerResearch } from "@/lib/sourcing/workspace";
import type { ManufacturerResearchBroadeningApproval, ManufacturerResearchRequest, SourcingWorkspace } from "@/lib/sourcing/types";
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
  if (!parsed.success) {
    const detail = parsed.error.issues[0];
    const field = detail?.path.length ? ` for ${detail.path.join(".")}` : "";
    return NextResponse.json({ error: `Invalid matching request${field}: ${detail?.message ?? "check the supplied filters"}.` }, { status: 400 });
  }
  if (!hasMinimumMatchingInfo(workspace)) {
    return NextResponse.json({ error: "Your plan needs a little more detail before a useful manufacturer search.", workspace, readiness: getSourcingReadiness(workspace), matches: [] }, { status: 409 });
  }
  const researchRequest = normalizeResearchRequest({
    geographyPreference: parsed.data.geographyPreference ?? null,
    resultLimit: parsed.data.resultLimit,
    requiredRequirements: parsed.data.requiredRequirements ?? [],
    preferredRequirements: parsed.data.preferredRequirements ?? [],
  });
  const requestedApproval = parsed.data.founderBroadeningApproval;
  const existingApproval = workspace.manufacturerResearch?.broadeningApproval;
  if (requestedApproval && existingApproval?.mutationId === requestedApproval.mutationId) {
    const sameReplay = sameRequest(existingApproval.originalRequest, normalizeResearchRequest(requestedApproval.originalRequest))
      && sameRequest(existingApproval.broadenedRequest, normalizeResearchRequest(requestedApproval.broadenedRequest))
      && sameRequest(existingApproval.broadenedRequest, researchRequest);
    if (!sameReplay) return NextResponse.json({ error: "That broadening mutation ID was already used for different criteria." }, { status: 409 });
    return researchResponse(workspace, "replayed");
  }

  let broadeningApproval: ManufacturerResearchBroadeningApproval | null = null;
  if (requestedApproval) {
    const currentResearch = getCurrentManufacturerResearch(workspace);
    const originalRequest = normalizeResearchRequest(requestedApproval.originalRequest);
    const broadenedRequest = normalizeResearchRequest(requestedApproval.broadenedRequest);
    if (!currentResearch || currentResearch.candidateCount !== 0 || !sameRequest(currentResearch.request, originalRequest)) {
      return NextResponse.json({ error: "The original zero-result criteria changed. Review the current search before approving broader criteria." }, { status: 409 });
    }
    if (!sameRequest(broadenedRequest, researchRequest) || !isFounderApprovedBroadening(originalRequest, broadenedRequest)) {
      return NextResponse.json({ error: "The broader search must run exactly the displayed, founder-approved criteria." }, { status: 400 });
    }
    broadeningApproval = {
      originalRequest,
      broadenedRequest,
      approvedBy: "founder",
      approvedAt: new Date().toISOString(),
      workspaceRevision: workspace.revision,
      mutationId: requestedApproval.mutationId,
    };
  } else {
    const currentResearch = getCurrentManufacturerResearch(workspace);
    if (currentResearch?.candidateCount === 0 && removesRequiredCriteria(currentResearch.request, researchRequest)) {
      return NextResponse.json({ error: "Review the exact broader criteria in the workspace and ask the founder to confirm them before researching again." }, { status: 409 });
    }
  }

  const matches = matchManufacturers(workspace, {
    ...researchRequest,
    geographyPreference: researchRequest.geographyPreference ?? undefined,
  });
  const updated = applyManufacturerResearch(workspace, researchRequest, matches, broadeningApproval);
  try {
    await saveSourcingWorkspace(updated, workspace.revision);
  } catch (error) {
    if (error instanceof SourcingWorkspaceConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    throw error;
  }
  const persisted = await getSourcingWorkspace(workspaceId);
  const research = persisted ? getCurrentManufacturerResearch(persisted) : null;
  if (!persisted || !research) {
    return NextResponse.json({ error: "Manufacturer research was not persisted consistently. Read the current workspace before retrying." }, { status: 409 });
  }
  return researchResponse(persisted, "persisted");
}

function researchResponse(workspace: SourcingWorkspace, outcome: "persisted" | "replayed") {
  const research = getCurrentManufacturerResearch(workspace);
  if (!research) return NextResponse.json({ error: "Manufacturer research is not current." }, { status: 409 });
  return NextResponse.json({
    workspace,
    readiness: getSourcingReadiness(workspace),
    matches: research.candidates,
    manufacturerResearch: research,
    receipt: {
      authoritative: true,
      mutation: "match_manufacturers",
      outcome,
      workspaceId: workspace.id,
      revision: workspace.revision,
      researchId: research.id,
      planFingerprint: research.planFingerprint,
      resultCount: research.candidateCount,
    },
  });
}

function normalizeResearchRequest(request: {
  geographyPreference?: string | null;
  resultLimit?: number;
  requiredRequirements?: string[];
  preferredRequirements?: string[];
}): ManufacturerResearchRequest {
  return {
    geographyPreference: request.geographyPreference?.trim() || null,
    resultLimit: request.resultLimit ?? 3,
    requiredRequirements: [...new Set(request.requiredRequirements ?? [])].sort() as ManufacturerResearchRequest["requiredRequirements"],
    preferredRequirements: [...new Set(request.preferredRequirements ?? [])].sort() as ManufacturerResearchRequest["preferredRequirements"],
  };
}

function sameRequest(left: ManufacturerResearchRequest, right: ManufacturerResearchRequest): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isFounderApprovedBroadening(original: ManufacturerResearchRequest, broadened: ManufacturerResearchRequest): boolean {
  if (original.resultLimit !== broadened.resultLimit || original.geographyPreference !== broadened.geographyPreference) return false;
  const originalRequired = new Set(original.requiredRequirements);
  const broadenedRequired = new Set(broadened.requiredRequirements);
  const broadenedPreferred = new Set(broadened.preferredRequirements);
  const removed = [...originalRequired].filter((key) => !broadenedRequired.has(key));
  return removed.length > 0
    && [...broadenedRequired].every((key) => originalRequired.has(key))
    && removed.every((key) => broadenedPreferred.has(key))
    && original.preferredRequirements.every((key) => broadenedPreferred.has(key));
}

function removesRequiredCriteria(original: ManufacturerResearchRequest, next: ManufacturerResearchRequest): boolean {
  const nextRequired = new Set(next.requiredRequirements);
  return original.requiredRequirements.some((key) => !nextRequired.has(key));
}
