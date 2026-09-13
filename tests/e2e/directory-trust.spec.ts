import { expect, test } from "@playwright/test";

test("small-run program labels retain own-product restrictions and source evidence", async ({ page }) => {
  await page.goto("/manufacturers/food-for-thought");
  const signal = page.locator(".profile-small-run-signal");
  await expect(signal).toContainText("1,200 units per product");
  await expect(signal).not.toContainText("240");
  const sourceAnchor = await signal.getByRole("link", { name: /^See source/ }).first().getAttribute("href");
  expect(sourceAnchor).toMatch(/^#source-\d+$/);
  await expect(page.locator(sourceAnchor!).locator('a[href="https://foodforthought.net/pages/build-your-brand-with-us"]')).toBeVisible();
  await page.goto("/manufacturers/blackberry-patch");
  await expect(signal).toContainText("own formulas with custom labels");
  await expect(signal).toContainText("10 cases");
  await page.goto("/find-manufacturers?state=GA&smallRun=1");
  const blackberry = page.locator(".plant-card").filter({ has: page.getByRole("heading", { name: "Blackberry Patch" }) });
  await expect(blackberry.locator(".small-run-signal")).toContainText("Small-batch private label listed");
  await page.goto("/find-manufacturers?state=CO&smallRun=1");
  await expect(page.locator(".plant-card").filter({ has: page.getByRole("heading", { name: "Boulder Sausage" }) })).toHaveCount(0);
});

test("directory separates a published minimum from small-run suitability", async ({ page }) => {
  const cap = page.locator(".plant-card").filter({ has: page.getByRole("heading", { name: /Create-A-Pack/ }) });
  await page.goto("/find-manufacturers?state=WI&moq=disclosed");
  await expect(cap).toHaveCount(1);
  await expect(cap.locator(".small-run-signal")).toHaveCount(0);
  await page.goto("/find-manufacturers?state=WI&smallRun=1");
  await expect(cap).toHaveCount(0);
  await page.goto("/find-manufacturers?state=WI&process=cold-fill");
  await expect(page.locator(".plant-card").filter({ has: page.getByRole("heading", { name: /Croix Valley/ }) })).toHaveCount(0);
});

test("hot-sauce discovery and profiles retain reviewed evidence and contact uncertainty", async ({ page }) => {
  await page.goto("/find-manufacturers?state=TX&category=hot-sauce");
  const heritage = page.locator(".plant-card").filter({ has: page.getByRole("heading", { name: "Heritage Family Specialty Foods" }) });
  await expect(heritage).toHaveCount(1);
  await heritage.getByRole("link", { name: "View manufacturer", exact: true }).click();
  await expect(page).toHaveURL(/manufacturers\/heritage-family-specialty-foods$/);
  await expect(page.locator(".company-facts")).toContainText(/hot sauce/i);
  await expect(page.locator(".company-facts")).toContainText("Existing phone remains an older public claim");
  await expect(page.locator(".company-facts")).toContainText("no supplier confirmation");
  await page.goto("/manufacturers/croix-valley-foods");
  await expect(page.locator(".company-facts")).toContainText("715-800-6328");
  await expect(page.locator(".company-facts")).toContainText("612-756-4985");
  await expect(page.locator(".company-facts")).toContainText("confirm the preferred production contact");
});
