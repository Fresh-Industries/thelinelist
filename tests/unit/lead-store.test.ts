import { createLeadStore } from "@/lib/leads/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  findFirst: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  databaseConfigured: () => true,
  prisma: {
    leadSubmission: {
      create: database.create,
      update: database.update,
      findFirst: database.findFirst,
    },
  },
}));

function configureResend() {
  vi.stubEnv("EMAIL_PROVIDER", "resend");
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("NOTIFY_FROM_EMAIL", "The Line List <notifications@mail.thelinelist.com>");
  vi.stubEnv("NOTIFY_TO_EMAIL", "owner@example.com");
}

function record(kind: "intro" | "claim" = "intro") {
  return {
    id: `${kind}_123`,
    kind,
    manufacturerSlug: "example-plant",
    manufacturerName: "Example Plant",
    sourceUrl: "https://www.thelinelist.com/manufacturers/example-plant",
    createdAt: "2026-08-29T12:00:00.000Z",
    utm: {},
    payload: kind === "claim"
      ? { workEmail: "claimant@example.com", _lead: { status: "received" } }
      : { email: "founder@example.com", _lead: { status: "received" } },
    fingerprint: `fingerprint_${kind}`,
  };
}

beforeEach(() => {
  database.create.mockReset().mockResolvedValue({});
  database.update.mockReset().mockResolvedValue({});
  database.findFirst.mockReset().mockResolvedValue(null);
  configureResend();
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("durable lead storage", () => {
  it("stores first and keeps success when owner notification fails", async () => {
    const order: string[] = [];
    database.create.mockImplementation(async () => { order.push("stored"); return {}; });
    vi.stubGlobal("fetch", vi.fn(async () => {
      order.push("notified");
      return new Response("Sender domain is not authorized.", { status: 403 });
    }));

    const result = await createLeadStore().save(record());

    expect(order).toEqual(["stored", "notified"]);
    expect(result).toMatchObject({
      ok: true,
      adapter: "postgres",
      notificationState: "failed",
      notificationProvider: "resend",
    });
    expect(database.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "intro_123" },
      data: {
        payload: expect.objectContaining({
          _lead: expect.objectContaining({
            status: "received",
            notification: expect.objectContaining({
              state: "failed",
              provider: "resend",
              errorCode: "DELIVERY_FAILED",
            }),
          }),
        }),
      },
    }));
  });

  it("uses a stable provider idempotency key and the claim work email as reply-to", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "email_123" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await createLeadStore().save(record("claim"));

    expect(result).toMatchObject({ ok: true, adapter: "postgres", notificationState: "sent" });
    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(request.headers).toMatchObject({ "Idempotency-Key": "lead-claim_123" });
    const notification = JSON.parse(String(request.body));
    expect(notification.reply_to).toBe("claimant@example.com");
  });

  it("treats a same-day idempotency conflict as the same stored submission", async () => {
    database.create.mockRejectedValue({ code: "P2002" });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "email_123" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(createLeadStore().save(record())).resolves.toMatchObject({
      ok: true,
      duplicate: true,
      adapter: "postgres",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(database.update).not.toHaveBeenCalled();
  });
});
