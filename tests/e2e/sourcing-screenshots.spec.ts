import { expect, test } from "@playwright/test";

async function hideDevOverlay(page: import("@playwright/test").Page) {
  await page.locator("nextjs-portal").evaluateAll((nodes) => nodes.forEach((node) => node.remove()));
}

test("capture redesigned sourcing experience", async ({ page }) => {
  test.skip(process.env.UPDATE_SOURCING_SCREENSHOTS !== "1", "Set UPDATE_SOURCING_SCREENSHOTS=1 to refresh documentation screenshots.");

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/sourcing");
  await expect(page.getByRole("heading", { name: "Turn your food idea into a plan manufacturers can use." })).toBeVisible();
  await hideDevOverlay(page);
  await page.screenshot({ path: "docs/screenshots/sourcing-landing-desktop.png", fullPage: false });

  await page.getByRole("button", { name: "Use with ChatGPT" }).click();
  const onboarding = page.getByRole("dialog");
  await onboarding.getByLabel("What do you want to make?").fill("A healthier energy drink in 12 oz cans");
  await hideDevOverlay(page);
  await page.screenshot({ path: "docs/screenshots/sourcing-chatgpt-onboarding.png", fullPage: false });
  await onboarding.getByRole("button", { name: "Close ChatGPT onboarding" }).click();

  await page.getByRole("button", { name: "Or explore the ready-made energy drink demo" }).click();
  await expect(page).toHaveURL(/\/sourcing\/[A-Za-z0-9_-]+$/, { timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Yes, keep this" })).toBeVisible();
  await hideDevOverlay(page);
  await page.screenshot({ path: "docs/screenshots/sourcing-guided-question-desktop.png", fullPage: false });
  await page.locator(".plan-summary").screenshot({ path: "docs/screenshots/sourcing-product-plan-summary.png" });

  await page.getByRole("button", { name: "Yes, keep this" }).click();
  await page.getByRole("button", { name: "Find my best matches" }).click();
  await expect(page.locator(".match-card")).toHaveCount(3);
  await hideDevOverlay(page);
  await page.screenshot({ path: "docs/screenshots/sourcing-matches-desktop.png", fullPage: false });

  await page.locator(".match-card").first().getByRole("button", { name: "Add to shortlist" }).click();
  await page.getByRole("button", { name: "Draft my introduction" }).click();
  await expect(page.getByRole("heading", { name: "What the manufacturer will see" })).toBeVisible();
  await hideDevOverlay(page);
  await page.screenshot({ path: "docs/screenshots/sourcing-outreach-approval.png", fullPage: false });

  const packetHref = await page.getByRole("link", { name: /Preview product brief/ }).getAttribute("href");
  const packet = await page.context().newPage();
  await packet.setViewportSize({ width: 1120, height: 1000 });
  await packet.goto(packetHref!);
  await expect(packet.getByRole("heading", { name: /Product brief for/ })).toBeVisible();
  await hideDevOverlay(packet);
  await packet.screenshot({ path: "docs/screenshots/sourcing-product-brief.png", fullPage: false });

  const mobile = await page.context().newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto("/sourcing");
  await hideDevOverlay(mobile);
  await mobile.screenshot({ path: "docs/screenshots/sourcing-landing-mobile.png", fullPage: false });
  await mobile.getByRole("button", { name: "Or explore the ready-made energy drink demo" }).click();
  await expect(mobile.getByRole("button", { name: "Yes, keep this" })).toBeVisible();
  await hideDevOverlay(mobile);
  await mobile.screenshot({ path: "docs/screenshots/sourcing-guided-question-mobile.png", fullPage: false });
  const mobileGeometry = await mobile.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }));
  expect(mobileGeometry.document).toBeLessThanOrEqual(mobileGeometry.viewport);

  await packet.setViewportSize({ width: 390, height: 844 });
  await packet.screenshot({ path: "docs/screenshots/sourcing-product-brief-mobile.png", fullPage: false });
  const packetGeometry = await packet.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }));
  expect(packetGeometry.document).toBeLessThanOrEqual(packetGeometry.viewport);
});
