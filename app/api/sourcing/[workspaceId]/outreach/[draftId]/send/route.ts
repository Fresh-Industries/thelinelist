import { getPlantBySlug } from "@/lib/directory";
import { getNotifyFromAddress, sendEmail } from "@/lib/notify/email";
import { getRequestContext } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { getAuthorizedWorkspace } from "@/lib/sourcing/access";
import { contactEmailSchema, workspaceIdSchema } from "@/lib/sourcing/schemas";
import { getSourcingWorkspace, SourcingWorkspaceConflictError, saveSourcingWorkspace } from "@/lib/sourcing/store";
import type { ManufacturerInquiry, OutreachDraft, SourcingWorkspace } from "@/lib/sourcing/types";
import { addWorkspaceActivity } from "@/lib/sourcing/workspace";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ workspaceId: string; draftId: string }> }) {
  const { workspaceId, draftId } = await params;
  if (!workspaceIdSchema.safeParse(workspaceId).success) return failure("Workspace not found.", 404);
  const authorized = await getAuthorizedWorkspace(workspaceId);
  if (!authorized) return failure("Workspace not found.", 404);
  const workspace = authorized.workspace;
  const context = await getRequestContext();
  const limited = await rateLimit({ key: `sourcing-send:${context.ipHash}:${workspaceId}`, limit: 12, windowSec: 60 * 60 });
  if (!limited.ok) return failure("Introduction send limit reached. Try again later.", 429);

  const index = workspace.outreachDrafts.findIndex((candidate) => candidate.id === draftId);
  if (index < 0) return failure("Introduction draft not found.", 404);
  const draft = workspace.outreachDrafts[index];
  if (draft.sentAt && draft.deliveryStatus === "sent") return NextResponse.json({ workspace, draft });
  if (!draft.approvedAt || draft.approvedVersion !== draft.version) return failure("Approve this exact introduction before sending it.", 409);
  if (!workspace.selectedManufacturerSlugs.includes(draft.manufacturerSlug)) return failure("This manufacturer is no longer selected. Prepare a current introduction before sending.", 409);
  if (!workspace.matches.some((match) => match.manufacturerSlug === draft.manufacturerSlug)) return failure("This manufacturer is not in the current sourced results. Research and prepare a new introduction before sending.", 409);
  if (workspace.matchesUpdatedAt && Date.parse(draft.createdAt) < Date.parse(workspace.matchesUpdatedAt)) return failure("This introduction is older than the current manufacturer research. Prepare and approve a new version.", 409);

  const plant = getPlantBySlug(draft.manufacturerSlug);
  const candidateRecipient = plant && !plant.introductionsPaused && !plant.needsCurrentOwnershipVerification ? plant.publicEmail?.trim() : null;
  const recipient = contactEmailSchema.safeParse(candidateRecipient).success ? candidateRecipient! : null;
  const founderEmail = workspace.fields.contact_email.status === "confirmed" ? workspace.fields.contact_email.value?.trim() : null;
  if (!recipient) return failure("No current sourced public email is available for this manufacturer.", 409);
  if (!founderEmail) return failure("Add and confirm your contact email before sending this introduction.", 409);
  if (draft.recipientEmail && draft.recipientEmail.toLowerCase() !== recipient.toLowerCase()) return failure("The manufacturer email changed after this draft was prepared. Prepare and approve a new introduction.", 409);
  if (draft.founderCopyEmail && draft.founderCopyEmail.toLowerCase() !== founderEmail.toLowerCase()) return failure("Your contact email changed after approval. Review and approve the introduction again.", 409);

  const result = await sendEmail({
    from: getNotifyFromAddress(),
    to: recipient,
    cc: founderEmail,
    replyTo: founderEmail,
    subject: draft.subject,
    text: draft.body,
    tags: {
      message_type: "manufacturer_intro",
      workspace_id: safeTag(workspace.id),
      manufacturer: safeTag(draft.manufacturerSlug),
    },
    idempotencyKey: `sourcing-intro-${safeTag(workspace.id)}-${safeTag(draft.id)}-v${draft.version}`,
  });

  const timestamp = new Date().toISOString();
  const drafts = [...workspace.outreachDrafts];
  if (!result.ok) {
    drafts[index] = { ...draft, recipientEmail: recipient, founderCopyEmail: founderEmail, deliveryStatus: "failed", deliveryError: deliveryError(result.error), updatedAt: timestamp };
    const updated = addWorkspaceActivity({ ...workspace, outreachDrafts: drafts }, "send_failed", `Introduction delivery failed for ${draft.manufacturerName}.`);
    await persist(updated, workspace.revision);
    return NextResponse.json({ error: "The introduction was not sent. Check the email setup and try again.", workspace: updated, draft: drafts[index] }, { status: 502 });
  }

  const sentDraft: OutreachDraft = { ...draft, recipientEmail: recipient, founderCopyEmail: founderEmail, sentAt: timestamp, deliveryStatus: "sent", deliveryError: null, updatedAt: timestamp };
  drafts[index] = sentDraft;
  const inquiry: ManufacturerInquiry = {
    draftId: draft.id,
    manufacturerSlug: draft.manufacturerSlug,
    manufacturerName: draft.manufacturerName,
    status: "contacted",
    contactedAt: timestamp,
    deliveryMethod: "line_list_introduction",
    deliveredTo: recipient,
    founderCopied: founderEmail,
  };
  const inquiries = workspace.inquiries.some((item) => item.draftId === draft.id) ? workspace.inquiries : [inquiry, ...workspace.inquiries];
  const updated = addWorkspaceActivity({ ...workspace, outreachDrafts: drafts, inquiries }, "sent", `Founder sent the approved introduction to ${draft.manufacturerName}.`);
  const persisted = await persistSentOutcome(workspaceId, updated, workspace.revision, sentDraft, inquiry);
  return NextResponse.json({ workspace: persisted, draft: persisted.outreachDrafts.find((candidate) => candidate.id === inquiry.draftId) ?? sentDraft });
}

async function persist(workspace: SourcingWorkspace, expectedRevision: number) {
  try {
    await saveSourcingWorkspace(workspace, expectedRevision);
  } catch (error) {
    if (error instanceof SourcingWorkspaceConflictError) throw error;
    throw error;
  }
}

async function persistSentOutcome(
  workspaceId: string,
  initial: SourcingWorkspace,
  initialExpectedRevision: number,
  sentDraft: OutreachDraft,
  inquiry: ManufacturerInquiry,
): Promise<SourcingWorkspace> {
  let candidate = initial;
  let expectedRevision = initialExpectedRevision;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await saveSourcingWorkspace(candidate, expectedRevision);
      return candidate;
    } catch (error) {
      if (!(error instanceof SourcingWorkspaceConflictError)) throw error;
      const current = await getSourcingWorkspace(workspaceId);
      if (!current) throw error;
      const alreadyRecorded = current.inquiries.find((item) => item.draftId === inquiry.draftId);
      if (alreadyRecorded) return current;

      const drafts = [...current.outreachDrafts];
      const currentIndex = drafts.findIndex((item) => item.id === sentDraft.id);
      let recordedDraft = sentDraft;
      if (currentIndex >= 0 && sameDraftVersion(drafts[currentIndex], sentDraft)) {
        drafts[currentIndex] = { ...drafts[currentIndex], ...sentDraft };
      } else {
        const snapshotId = `${sentDraft.id}-sent-v${sentDraft.version}`;
        recordedDraft = { ...sentDraft, id: snapshotId };
        if (!drafts.some((item) => item.id === snapshotId)) drafts.push(recordedDraft);
      }
      const recordedInquiry = { ...inquiry, draftId: recordedDraft.id };
      const inquiries = current.inquiries.some((item) => item.draftId === recordedInquiry.draftId)
        ? current.inquiries
        : [recordedInquiry, ...current.inquiries];
      candidate = addWorkspaceActivity({ ...current, outreachDrafts: drafts, inquiries }, "sent", `Founder sent the approved introduction to ${sentDraft.manufacturerName}.`);
      expectedRevision = current.revision;
    }
  }
  throw new SourcingWorkspaceConflictError();
}

function sameDraftVersion(current: OutreachDraft, sent: OutreachDraft): boolean {
  return current.version === sent.version && current.subject === sent.subject && current.body === sent.body;
}

function safeTag(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 200);
}

function deliveryError(message?: string): string {
  return (message || "Email delivery failed.").replace(/Bearer\s+\S+/gi, "Bearer [redacted]").slice(0, 300);
}

function failure(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
