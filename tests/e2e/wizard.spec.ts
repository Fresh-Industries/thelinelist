import { expect, test } from "@playwright/test";

test("keeps the Hot Sauce wizard result in sync with the directory URL", async ({ page }) => {
  await page.goto("/find-manufacturers/wizard");

  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Choose the closest product,", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: /Hot sauce/ }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator("#wizard-step-2")).toBeFocused();

  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator("#wizard-step-1")).toBeFocused();
  const headingTop = await page.locator("#wizard-step-1").evaluate((heading) => heading.getBoundingClientRect().top);
  const stickyHeaderBottom = await page.locator(".site-header").evaluate((header) => header.getBoundingClientRect().bottom);
  expect(headingTop).toBeGreaterThanOrEqual(stickyHeaderBottom);

  await page.getByRole("button", { name: "Next", exact: true }).click();

  await page.getByRole("button", { name: /I have my own formula/ }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator("#wizard-step-3")).toBeFocused();

  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator("#wizard-step-4")).toBeFocused();
  await expect(page.locator('input[name="email"], input[name="phone"], input[name="name"]')).toHaveCount(0);

  await page.getByRole("button", { name: "Show matching manufacturers" }).click();
  await expect(page).toHaveURL(/\/find-manufacturers\?category=hot-sauce$/);
  await expect(page.getByRole("heading", { level: 1, name: "Find a manufacturer for your product" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Active filters" })).toContainText("Hot sauce");
  await expect(page.getByRole("heading", { level: 2, name: "1–18 of 20 manufacturers" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Creative Foodworks" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "AceCoPack" })).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  await page.reload();
  await expect(page.getByRole("list", { name: "Active filters" })).toContainText("Hot sauce");
  await expect(page.getByRole("heading", { level: 2, name: "1–18 of 20 manufacturers" })).toBeVisible();

  await page.getByRole("link", { name: "Remove Hot sauce filter" }).click();
  await expect(page).toHaveURL(/\/find-manufacturers$/);
  await expect(page.getByRole("list", { name: "Active filters" })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 2, name: "1–18 of 348 manufacturers" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);

  await page.goBack();
  await expect(page).toHaveURL(/category=hot-sauce/);
  await expect(page.getByRole("list", { name: "Active filters" })).toContainText("Hot sauce");
  await expect(page.getByRole("heading", { level: 2, name: "1–18 of 20 manufacturers" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  await page.goForward();
  await expect(page).toHaveURL(/\/find-manufacturers$/);
  await expect(page.getByRole("list", { name: "Active filters" })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 2, name: "1–18 of 348 manufacturers" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);

  await page.getByRole("combobox", { name: "Where?" }).selectOption("TX");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/\/find-manufacturers\?state=TX$/);
  await expect(page.getByRole("list", { name: "Active filters" })).toContainText("Texas");

  await page.getByRole("link", { name: "Remove Texas filter" }).click();
  await expect(page).toHaveURL(/\/find-manufacturers$/);
  await expect(page.getByRole("list", { name: "Active filters" })).toHaveCount(0);
});

test("uses instant wizard scrolling when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function scrollIntoView(options?: boolean | ScrollIntoViewOptions) {
      (window as Window & { __wizardScrollBehavior?: ScrollBehavior }).__wizardScrollBehavior =
        typeof options === "object" ? options.behavior : undefined;
      return original.call(this, options);
    };
  });
  await page.goto("/find-manufacturers/wizard");
  await page.getByRole("button", { name: /Hot sauce/ }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await expect(page.locator("#wizard-step-2")).toBeFocused();
  await expect.poll(() => page.evaluate(() => (
    window as Window & { __wizardScrollBehavior?: ScrollBehavior }
  ).__wizardScrollBehavior)).toBe("auto");
});
