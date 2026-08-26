import { expect, test } from "@playwright/test";

async function openDemo(page: import("@playwright/test").Page) {
  await page.goto("/sourcing");
  await page.getByRole("button", { name: "Or explore the ready-made energy drink demo" }).click();
  await expect(page).toHaveURL(/\/sourcing\/[A-Za-z0-9_-]+$/, { timeout: 20_000 });
}

async function installWebMcpHarness(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    const tools = new Map<string, { execute(input: unknown): Promise<unknown> | unknown }>();
    const context = {
      async registerTool(tool: { name: string; execute(input: unknown): Promise<unknown> | unknown }, options?: { signal?: AbortSignal }) {
        tools.set(tool.name, tool);
        options?.signal?.addEventListener("abort", () => tools.delete(tool.name), { once: true });
      },
    };
    Object.defineProperty(Document.prototype, "modelContext", { configurable: true, get: () => context });
    Object.assign(window, { __webMcpTools: tools });
  });
}

test("ChatGPT onboarding creates a personalized prompt while the manual path stays available", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/sourcing");
  await expect(page.getByRole("heading", { name: "Turn your food idea into a plan manufacturers can use." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Use with ChatGPT" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Build it myself" })).toBeVisible();

  await page.getByRole("button", { name: "Use with ChatGPT" }).click();
  const dialog = page.getByRole("dialog", { name: "Build your product plan with ChatGPT" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("What do you want to make?").fill("a packaged banana bread I can sell in grocery stores");
  await dialog.getByRole("button", { name: "Create my starter prompt" }).click();
  const promptDialog = page.getByRole("dialog");
  const prompt = promptDialog.getByLabel("Personalized starter prompt");
  await expect(prompt).toHaveValue(/a packaged banana bread I can sell in grocery stores/);
  await expect(prompt).toHaveValue(/Ask me one simple question at a time/);
  await expect(promptDialog.getByText("this is not a connection indicator", { exact: false })).toBeVisible();

  const popupPromise = page.waitForEvent("popup");
  await promptDialog.getByRole("button", { name: "Copy and continue in ChatGPT" }).click();
  const popup = await popupPromise;
  await popup.close();
  await expect(page).toHaveURL(/\/sourcing\/[A-Za-z0-9_-]+\?chatgpt=ready$/, { timeout: 20_000 });
  await expect(page.getByText("Copied. Paste the prompt into ChatGPT to begin.")).toBeVisible();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain("packaged banana bread");
});

test("manual blank plan asks one question and does not reveal premature matches", async ({ page }) => {
  await page.goto("/sourcing");
  await page.getByRole("button", { name: "Build it myself" }).click();
  await expect(page).toHaveURL(/\/sourcing\/[A-Za-z0-9_-]+$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "What do you want to make?" })).toBeVisible();
  await expect(page.locator(".guided-stage")).toHaveCount(1);
  await expect(page.locator(".match-card")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Matches" })).toBeDisabled();
  await expect(page.locator(".review-details")).not.toHaveAttribute("open", "");
});

test("founder moves through one guided stage at a time to an approved private brief", async ({ page }) => {
  await openDemo(page);
  await expect(page.getByRole("heading", { level: 1, name: "Healthier energy drink" })).toBeVisible();
  await expect(page.getByText("Carbonated", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Suggested", { exact: true }).first()).toBeVisible();
  await expect(page.locator(".match-card")).toHaveCount(0);
  await expect(page.locator(".guided-stage")).toHaveCount(1);

  await page.getByRole("button", { name: "Yes, keep this" }).click();
  await expect(page.getByText("Your plan is ready enough to start looking for manufacturers.")).toBeVisible();
  await page.getByRole("button", { name: "Find my best matches" }).click();
  await expect(page.getByRole("heading", { name: "Here are the strongest possible matches based on what we know." })).toBeVisible();
  await expect(page.locator(".match-card")).toHaveCount(3);
  await expect(page.getByRole("heading", { name: /Got it/ })).toHaveCount(0);

  const firstMatch = page.locator(".match-card").first();
  await firstMatch.getByText("Why this match?").click();
  await expect(firstMatch.getByText("Missing information is not treated as a “no.”")).toBeVisible();
  await firstMatch.getByRole("button", { name: "Add to shortlist" }).click();
  await expect(page.getByRole("heading", { name: /Let’s prepare your introduction/ })).toBeVisible();
  await page.getByRole("button", { name: "Draft my introduction" }).click();
  await expect(page.getByRole("heading", { name: "What the manufacturer will see" })).toBeVisible();
  await expect(page.getByText("Budget", { exact: true }).last()).toBeVisible();

  const packetLink = page.getByRole("link", { name: /Preview product brief/ });
  const packetHref = await packetLink.getAttribute("href");
  expect(packetHref).toMatch(/^\/packet\//);
  const packetPage = await page.context().newPage();
  await packetPage.goto(packetHref!);
  await expect(packetPage.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(packetPage.getByRole("heading", { name: /Product brief for/ })).toBeVisible();
  await expect(packetPage.getByText("About $15,000")).toHaveCount(0);
  await packetPage.close();

  await page.getByRole("button", { name: "Approve introduction" }).click();
  await expect(page.getByText("This exact message and product brief are approved.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Introduction approved" })).toBeDisabled();
});

test("all five WebMCP tools share visible state and sending rejects an unapproved version", async ({ page }) => {
  await installWebMcpHarness(page);
  await openDemo(page);
  const workspaceId = page.url().split("/").pop()!;
  const invoke = async (name: string, input: Record<string, unknown>) => page.evaluate(async ({ name, input }) => {
    const tools = (window as unknown as { __webMcpTools: Map<string, { execute(value: unknown): Promise<unknown> | unknown }> }).__webMcpTools;
    const tool = tools.get(name);
    if (!tool) throw new Error(`Missing tool: ${name}`);
    return tool.execute(input);
  }, { name, input });

  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(5);
  await page.getByRole("button", { name: "Yes, keep this" }).click();
  const afterFounderDecision = await invoke("get_sourcing_workspace", { workspaceId }) as { workspace: { fields: { carbonation: { status: string; updatedBy: string } } } };
  expect(afterFounderDecision.workspace.fields.carbonation).toMatchObject({ status: "confirmed", updatedBy: "founder" });
  await invoke("update_sourcing_workspace", { workspaceId, proposedUpdates: [
    { key: "product_description", value: "A lower-sugar energy drink for afternoon focus", explicitlyStated: true, source: "Founder statement", suggestedSharing: true },
    { key: "formula_status", value: "I have a recipe, but it needs work", explicitlyStated: true, source: "Founder statement", suggestedSharing: true },
  ] });
  await expect(page.getByText("A lower-sugar energy drink for afternoon focus").first()).toBeVisible();
  await expect(page.getByText(/ChatGPT added 2 details/)).toBeVisible();

  const matched = await invoke("match_manufacturers", { workspaceId, resultLimit: 10 }) as { matches: Array<{ manufacturerSlug: string }> };
  expect(matched.matches.length).toBeGreaterThan(0);
  expect(matched.matches.length).toBeLessThanOrEqual(3);
  await expect(page.locator(".match-card")).toHaveCount(matched.matches.length);

  const prepared = await invoke("prepare_manufacturer_outreach", { workspaceId, selectedManufacturerIds: [matched.matches[0].manufacturerSlug] }) as { drafts: Array<{ id: string }> };
  expect(prepared.drafts).toHaveLength(1);
  await expect(page.getByRole("heading", { name: "What the manufacturer will see" })).toBeVisible();
  await expect(invoke("send_manufacturer_inquiry", { workspaceId, outreachDraftId: prepared.drafts[0].id, approvedContentVersion: 1 })).rejects.toThrow(/approved/i);
});

test("mobile keeps the current action and collapsible plan inside the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDemo(page);
  await expect(page.getByRole("button", { name: "Yes, keep this" })).toBeVisible();
  await expect(page.getByText("My product plan", { exact: true })).toBeVisible();
  const geometry = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }));
  expect(geometry.document).toBeLessThanOrEqual(geometry.viewport);
  await page.getByRole("button", { name: "Yes, keep this" }).click();
  await expect(page.getByRole("button", { name: "Find my best matches" })).toBeVisible();
});
