import { expect, test } from "@playwright/test";

async function hideDevOverlay(page: import("@playwright/test").Page) {
  await page.locator("nextjs-portal").evaluateAll((nodes) => nodes.forEach((node) => node.remove()));
}

test("capture production product workspace", async ({ page }) => {
  test.skip(process.env.UPDATE_SOURCING_SCREENSHOTS !== "1", "Set UPDATE_SOURCING_SCREENSHOTS=1 to refresh documentation screenshots.");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/sourcing");
  await expect(page.getByRole("heading", { name: "Start with the product in your head." })).toBeVisible();
  await hideDevOverlay(page);
  await page.screenshot({ path: "docs/screenshots/sourcing-landing-desktop.png", fullPage: false });

  await page.getByLabel("What do you want to make?").fill("A packaged banana bread mini loaf for coffee shops");
  await page.getByRole("button", { name: "Start my product" }).click();
  await expect(page).toHaveURL(/\/sourcing\/[A-Za-z0-9_-]+$/);
  await hideDevOverlay(page);
  await page.screenshot({ path: "docs/screenshots/sourcing-living-document-desktop.png", fullPage: false });

  await page.getByRole("button", { name: "Open 3D workbench" }).click();
  await expect(page.getByRole("dialog", { name: "Make the package direction tangible." })).toBeVisible();
  await hideDevOverlay(page);
  await page.screenshot({ path: "docs/screenshots/sourcing-package-workbench.png", fullPage: false });

  const mobile = await page.context().newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto("/sourcing");
  await hideDevOverlay(mobile);
  await mobile.screenshot({ path: "docs/screenshots/sourcing-landing-mobile.png", fullPage: false });
  const geometry = await mobile.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }));
  expect(geometry.document).toBeLessThanOrEqual(geometry.viewport);
});
