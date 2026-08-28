import { createLeadStore } from "@/lib/leads/store";
import {
  getNotifyFromAddress,
  leadSaveFailureMessage,
  sendEmail,
} from "@/lib/notify/email";
import { subscribeNewsletter } from "@/lib/newsletter/subscribe";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function configureResend() {
  vi.stubEnv("EMAIL_PROVIDER", "resend");
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("NOTIFY_FROM_EMAIL", "The Line List <notifications@mail.thelinelist.com>");
  vi.stubEnv("NOTIFY_TO_EMAIL", "owner@example.com");
}

describe("owner email notifications", () => {
  it("sends Resend requests with the configured addresses", async () => {
    configureResend();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "email_123" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendEmail({
      to: "owner@example.com",
      subject: "Test notification",
      text: "Test body",
    });

    expect(result).toEqual({ ok: true, provider: "resend" });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(request.headers).toMatchObject({ "User-Agent": "TheLineList/1.0" });
    expect(JSON.parse(String(request.body))).toMatchObject({
      from: "The Line List <notifications@mail.thelinelist.com>",
      to: ["owner@example.com"],
      subject: "Test notification",
    });
  });

  it("uses the verified Resend sender when the deployment has no sender override", () => {
    configureResend();
    vi.stubEnv("NOTIFY_FROM_EMAIL", "");

    expect(getNotifyFromAddress()).toBe(
      "The Line List <notifications@mail.thelinelist.com>",
    );
  });

  it("preserves an explicit Resend sender", () => {
    configureResend();
    vi.stubEnv("NOTIFY_FROM_EMAIL", "The Line List <hello@thelinelist.com>");

    expect(getNotifyFromAddress()).toBe(
      "The Line List <hello@thelinelist.com>",
    );
  });

  it("preserves an explicit Postmark sender", () => {
    vi.stubEnv("EMAIL_PROVIDER", "postmark");
    vi.stubEnv("POSTMARK_SERVER_TOKEN", "postmark_test");
    vi.stubEnv("NOTIFY_FROM_EMAIL", "The Line List <hello@thelinelist.com>");

    expect(getNotifyFromAddress()).toBe(
      "The Line List <hello@thelinelist.com>",
    );
  });

  it("preserves the existing Postmark default when no sender is configured", () => {
    vi.stubEnv("EMAIL_PROVIDER", "postmark");
    vi.stubEnv("POSTMARK_SERVER_TOKEN", "postmark_test");
    vi.stubEnv("NOTIFY_FROM_EMAIL", "");

    expect(getNotifyFromAddress()).toBe(
      "The Line List <hello@thelinelist.com>",
    );
  });

  it("turns Resend network failures into an actionable result", async () => {
    configureResend();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection reset")));

    await expect(
      sendEmail({ to: "owner@example.com", subject: "Test", text: "Test" }),
    ).resolves.toEqual({
      ok: false,
      provider: "resend",
      error: "connection reset",
    });
  });

  it("emails the owner after a successful newsletter subscription", async () => {
    configureResend();
    vi.stubEnv("NEWSLETTER_PROVIDER", "beehiiv");
    vi.stubEnv("BEEHIIV_API_KEY", "beehiiv_test");
    vi.stubEnv("BEEHIIV_PUBLICATION_ID", "publication_test");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 201 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "email_123" }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(subscribeNewsletter("reader@example.com")).resolves.toEqual({
      ok: true,
      provider: "beehiiv",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const notification = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(notification).toMatchObject({
      to: ["owner@example.com"],
      subject: "The Line List: New newsletter subscriber",
      reply_to: "reader@example.com",
    });
  });

  it("does not report newsletter success when its owner email fails", async () => {
    configureResend();
    vi.stubEnv("NEWSLETTER_PROVIDER", "beehiiv");
    vi.stubEnv("BEEHIIV_API_KEY", "beehiiv_test");
    vi.stubEnv("BEEHIIV_PUBLICATION_ID", "publication_test");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status: 201 }))
        .mockResolvedValueOnce(
          new Response("Sender domain is not authorized.", { status: 403 }),
        ),
    );

    const result = await subscribeNewsletter("reader@example.com");

    expect(result.ok).toBe(false);
    expect(result.error).toContain("owner notification failed");
    expect(result.error).toContain("Sender domain is not authorized");
  });

  it("does not report an email-archived lead as successful when its owner email fails", async () => {
    configureResend();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Sender domain is not authorized.", { status: 403 })),
    );

    const result = await createLeadStore().save({
      id: "lead_123",
      kind: "intro",
      manufacturerSlug: "example-plant",
      manufacturerName: "Example Plant",
      sourceUrl: "https://www.thelinelist.com/manufacturers/example-plant",
      createdAt: "2026-08-24T12:00:00.000Z",
      utm: {},
      payload: { email: "reader@example.com" },
      fingerprint: "fingerprint_123",
    });

    expect(result).toMatchObject({
      ok: false,
      adapter: "email-archive",
      id: "lead_123",
    });
    expect(result.error).toContain("Owner notification failed via resend");
    expect(leadSaveFailureMessage(result.error)).toContain("LL-EMAIL-02");
  });

  it("classifies provider configuration errors as delivery failures", () => {
    expect(
      leadSaveFailureMessage(
        "Owner notification failed via resend: sender domain is not configured.",
      ),
    ).toContain("LL-EMAIL-02");
  });

  it("classifies a missing provider after blob storage as a configuration error", () => {
    expect(
      leadSaveFailureMessage(
        "Owner notification failed via none: No email provider configured.",
      ),
    ).toContain("LL-EMAIL-01");
  });

  it("does not fall back to a false success when email is the only lead store", async () => {
    configureResend();
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("Sender domain is not authorized.", { status: 403 }),
      ),
    );

    const result = await createLeadStore().save({
      id: "lead_email_only_123",
      kind: "intro",
      manufacturerSlug: "example-plant",
      manufacturerName: "Example Plant",
      sourceUrl: "https://www.thelinelist.com/manufacturers/example-plant",
      createdAt: "2026-08-24T12:00:00.000Z",
      utm: {},
      payload: { email: "reader@example.com" },
      fingerprint: "fingerprint_email_only_123",
    });

    expect(result).toMatchObject({
      ok: false,
      adapter: "email-archive",
      id: "lead_email_only_123",
    });
    expect(result.error).toContain("Owner notification failed via resend");
  });

  it("does not report lead success when owner email is not configured", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("POSTMARK_SERVER_TOKEN", "");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await createLeadStore().save({
      id: "lead_unconfigured_123",
      kind: "intro",
      manufacturerSlug: "example-plant",
      manufacturerName: "Example Plant",
      sourceUrl: "https://www.thelinelist.com/manufacturers/example-plant",
      createdAt: "2026-08-24T12:00:00.000Z",
      utm: {},
      payload: { email: "reader@example.com" },
      fingerprint: "fingerprint_unconfigured_123",
    });

    expect(result).toMatchObject({
      ok: false,
      adapter: "memory",
      id: "lead_unconfigured_123",
      error: "Owner email notifications are not configured.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(leadSaveFailureMessage(result.error)).toContain("LL-EMAIL-01");
  });

  it("uses the claim work email as the owner notification reply-to address", async () => {
    configureResend();
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "email_123" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await createLeadStore().save({
      id: "claim_123",
      kind: "claim",
      manufacturerSlug: "example-plant",
      manufacturerName: "Example Plant",
      sourceUrl: "https://www.thelinelist.com/manufacturers/example-plant",
      createdAt: "2026-08-24T12:00:00.000Z",
      utm: {},
      payload: { workEmail: "claimant@example.com" },
      fingerprint: "fingerprint_claim_123",
    });

    expect(result).toMatchObject({ ok: true, adapter: "email-archive" });
    const notification = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(notification.reply_to).toBe("claimant@example.com");
  });
});
