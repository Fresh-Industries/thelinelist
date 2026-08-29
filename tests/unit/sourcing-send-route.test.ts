import type { OutreachDraft, SourcingWorkspace } from "@/lib/sourcing/types";
import { createWorkspace } from "@/lib/sourcing/workspace";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthorizedWorkspace: vi.fn(),
  getPlantBySlug: vi.fn(),
  rateLimit: vi.fn(),
  getRequestContext: vi.fn(),
  saveSourcingWorkspace: vi.fn(),
  getSourcingWorkspace: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/sourcing/access", () => ({ getAuthorizedWorkspace: mocks.getAuthorizedWorkspace }));
vi.mock("@/lib/directory", () => ({ getPlantBySlug: mocks.getPlantBySlug }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: mocks.rateLimit }));
vi.mock("@/lib/request", () => ({ getRequestContext: mocks.getRequestContext }));
vi.mock("@/lib/sourcing/store", () => ({
  SourcingWorkspaceConflictError: class SourcingWorkspaceConflictError extends Error {},
  getSourcingWorkspace: mocks.getSourcingWorkspace,
  saveSourcingWorkspace: mocks.saveSourcingWorkspace,
}));
vi.mock("@/lib/notify/email", () => ({
  getNotifyFromAddress: () => "The Line List <notifications@mail.thelinelist.com>",
  sendEmail: mocks.sendEmail,
}));

import { POST } from "@/app/api/sourcing/[workspaceId]/outreach/[draftId]/send/route";

describe("founder-controlled manufacturer introduction delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rateLimit.mockResolvedValue({ ok: true });
    mocks.getRequestContext.mockResolvedValue({ ipHash: "test-ip" });
    mocks.getPlantBySlug.mockReturnValue({
      slug: "example-manufacturer",
      name: "Example Manufacturer",
      publicEmail: "hello@example-manufacturer.com",
      introductionsPaused: false,
      needsCurrentOwnershipVerification: false,
    });
    mocks.sendEmail.mockResolvedValue({ ok: true, provider: "resend" });
    mocks.saveSourcingWorkspace.mockResolvedValue(undefined);
    mocks.getSourcingWorkspace.mockResolvedValue(null);
  });

  it("sends only an approved exact version, copies the founder, and records contact", async () => {
    const workspace = approvedWorkspace();
    mocks.getAuthorizedWorkspace.mockResolvedValue({ workspace, access: "user" });

    const response = await POST(new Request("http://localhost/send", { method: "POST" }), {
      params: Promise.resolve({ workspaceId: workspace.id, draftId: workspace.outreachDrafts[0].id }),
    });
    const body = await response.json() as { workspace: SourcingWorkspace };

    expect(response.status).toBe(200);
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "hello@example-manufacturer.com",
      cc: "founder@example.com",
      replyTo: "founder@example.com",
      subject: "Introduction: Mya's × Example Manufacturer",
      text: "Exact founder-approved introduction.",
      idempotencyKey: expect.stringContaining("sourcing-intro-"),
    }));
    expect(body.workspace.outreachDrafts[0]).toMatchObject({ deliveryStatus: "sent", deliveryError: null });
    expect(body.workspace.inquiries[0]).toMatchObject({
      manufacturerSlug: "example-manufacturer",
      deliveredTo: "hello@example-manufacturer.com",
      founderCopied: "founder@example.com",
    });
    expect(mocks.saveSourcingWorkspace).toHaveBeenCalledOnce();
  });

  it("does not call email delivery before the founder approves the exact version", async () => {
    const workspace = approvedWorkspace();
    workspace.outreachDrafts[0] = { ...workspace.outreachDrafts[0], approvedVersion: null, approvedAt: null, deliveryStatus: "draft" };
    mocks.getAuthorizedWorkspace.mockResolvedValue({ workspace, access: "user" });

    const response = await POST(new Request("http://localhost/send", { method: "POST" }), {
      params: Promise.resolve({ workspaceId: workspace.id, draftId: workspace.outreachDrafts[0].id }),
    });

    expect(response.status).toBe(409);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.saveSourcingWorkspace).not.toHaveBeenCalled();
  });

  it("records a failed provider attempt without claiming the manufacturer was contacted", async () => {
    const workspace = approvedWorkspace();
    mocks.getAuthorizedWorkspace.mockResolvedValue({ workspace, access: "user" });
    mocks.sendEmail.mockResolvedValue({ ok: false, provider: "resend", error: "Sender domain is not authorized." });

    const response = await POST(new Request("http://localhost/send", { method: "POST" }), {
      params: Promise.resolve({ workspaceId: workspace.id, draftId: workspace.outreachDrafts[0].id }),
    });
    const body = await response.json() as { workspace: SourcingWorkspace; error: string };

    expect(response.status).toBe(502);
    expect(body.workspace.outreachDrafts[0]).toMatchObject({ deliveryStatus: "failed", sentAt: null });
    expect(body.workspace.inquiries).toHaveLength(0);
    expect(body.error).toContain("was not sent");
    expect(mocks.saveSourcingWorkspace).toHaveBeenCalledOnce();
  });

  it("reconciles a successful provider delivery after a concurrent workspace change", async () => {
    const workspace = approvedWorkspace();
    const concurrent = { ...workspace, revision: workspace.revision + 1, updatedAt: new Date().toISOString() };
    mocks.getAuthorizedWorkspace.mockResolvedValue({ workspace, access: "user" });
    const storeModule = await import("@/lib/sourcing/store");
    mocks.saveSourcingWorkspace.mockReset();
    mocks.saveSourcingWorkspace
      .mockRejectedValueOnce(new storeModule.SourcingWorkspaceConflictError())
      .mockResolvedValueOnce(undefined);
    mocks.getSourcingWorkspace.mockResolvedValue(concurrent);

    const response = await POST(new Request("http://localhost/send", { method: "POST" }), {
      params: Promise.resolve({ workspaceId: workspace.id, draftId: workspace.outreachDrafts[0].id }),
    });
    const body = await response.json() as { workspace: SourcingWorkspace };

    expect(response.status).toBe(200);
    expect(mocks.sendEmail).toHaveBeenCalledOnce();
    expect(mocks.saveSourcingWorkspace).toHaveBeenCalledTimes(2);
    expect(body.workspace.outreachDrafts[0].deliveryStatus).toBe("sent");
    expect(body.workspace.inquiries).toHaveLength(1);
  });
});

function approvedWorkspace(): SourcingWorkspace {
  const workspace = createWorkspace({ idea: "Packaged banana bread for grocery stores" });
  workspace.fields.brand_name = { ...workspace.fields.brand_name, value: "Mya's", status: "confirmed" };
  workspace.fields.contact_email = { ...workspace.fields.contact_email, value: "founder@example.com", status: "confirmed" };
  workspace.selectedManufacturerSlugs = ["example-manufacturer"];
  const now = new Date().toISOString();
  workspace.matches = [{
    manufacturerSlug: "example-manufacturer",
    manufacturerName: "Example Manufacturer",
    location: "United States",
    fitExplanation: "Public information supports an introductory conversation.",
    supportedMatches: [],
    possibleConflicts: [],
    unknowns: [],
    evidence: [],
    requirementsUsed: [],
    introductionAvailable: true,
    deliveryMethod: "line_list_introduction",
    lastReviewed: now,
  }];
  const draft: OutreachDraft = {
    id: "draft-approved-123",
    manufacturerSlug: "example-manufacturer",
    manufacturerName: "Example Manufacturer",
    subject: "Introduction: Mya's × Example Manufacturer",
    body: "Exact founder-approved introduction.",
    questions: [],
    includedFieldKeys: ["brand_name", "product_type", "contact_email"],
    excludedFieldKeys: [],
    warnings: [],
    packet: {
      token: "packet-token",
      manufacturerSlug: "example-manufacturer",
      manufacturerName: "Example Manufacturer",
      includedFieldKeys: ["brand_name", "product_type", "contact_email"],
      fieldValues: { brand_name: "Mya's", product_type: "Packaged banana bread", contact_email: "founder@example.com" },
      questions: [],
      createdAt: now,
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      revokedAt: null,
    },
    availableDeliveryMethod: "line_list_introduction",
    demoRecipient: null,
    recipientEmail: "hello@example-manufacturer.com",
    founderCopyEmail: "founder@example.com",
    version: 2,
    approvedVersion: 2,
    approvedAt: now,
    sentAt: null,
    deliveryStatus: "approved",
    deliveryError: null,
    humanSendTokenHash: null,
    humanSendTokenExpiresAt: null,
    createdAt: now,
    updatedAt: now,
  };
  return { ...workspace, outreachDrafts: [draft] };
}
