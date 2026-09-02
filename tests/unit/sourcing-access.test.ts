import { NextResponse } from "next/server";
import { createGuestCredential, guestWorkspaceCookieName, setGuestWorkspaceCookie } from "@/lib/sourcing/access";
import { describe, expect, it } from "vitest";

describe("guest sourcing workspace credentials", () => {
  it("keeps a separate durable cookie for every workspace", () => {
    const first = createGuestCredential("workspace-one-1234567890", "mutation-one-12345678901234567890");
    const second = createGuestCredential("workspace-two-1234567890", "mutation-two-12345678901234567890");
    const response = NextResponse.json({ ok: true });

    setGuestWorkspaceCookie(response, first);
    setGuestWorkspaceCookie(response, second);

    expect(response.cookies.get(guestWorkspaceCookieName(first.workspaceId))?.value).toBe(first.token);
    expect(response.cookies.get(guestWorkspaceCookieName(second.workspaceId))?.value).toBe(second.token);
    expect(guestWorkspaceCookieName(first.workspaceId)).not.toBe(guestWorkspaceCookieName(second.workspaceId));
  });

  it("derives the same retry credential for the same creation mutation", () => {
    const first = createGuestCredential("workspace-retry-123456789", "retry-mutation-12345678901234567890");
    const replay = createGuestCredential("workspace-retry-123456789", "retry-mutation-12345678901234567890");
    expect(replay.token).toBe(first.token);
    expect(replay.tokenHash).toBe(first.tokenHash);
  });
});
