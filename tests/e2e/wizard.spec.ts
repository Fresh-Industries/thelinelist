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

  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator("#wizard-step-3")).toBeFocused();
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
  await expect(page.getByRole("heading", { level: 2, name: "1–18 of 344 manufacturers" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);

  await page.goBack();
  await expect(page).toHaveURL(/category=hot-sauce/);
  await expect(page.getByRole("list", { name: "Active filters" })).toContainText("Hot sauce");
  await expect(page.getByRole("heading", { level: 2, name: "1–18 of 20 manufacturers" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  await page.goForward();
  await expect(page).toHaveURL(/\/find-manufacturers$/);
  await expect(page.getByRole("list", { name: "Active filters" })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 2, name: "1–18 of 344 manufacturers" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);

  await page.getByRole("combobox", { name: "Where?" }).selectOption("TX");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/\/find-manufacturers\?state=TX$/);
  await expect(page.getByRole("list", { name: "Active filters" })).toContainText("Texas");

  await page.getByRole("link", { name: "Remove Texas filter" }).click();
  await expect(page).toHaveURL(/\/find-manufacturers$/);
  await expect(page.getByRole("list", { name: "Active filters" })).toHaveCount(0);
});

test("preserves wizard answers on reload and applies every selected filter", async ({ page }) => {
  await page.goto("/find-manufacturers/wizard?product=energy-drink&utm_source=tiktok&utm_medium=organic&utm_campaign=first-run&utm_content=can&utm_term=energy&privateNote=do-not-forward");
  await expect(page.getByRole("button", { name: /Energy drinks/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Packaging", { exact: true }).selectOption("can");
  await page.getByText("I already know the process I need", { exact: true }).click();
  await page.getByLabel("Known process need").selectOption("cold-fill");

  await page.reload();
  const restoredUrl = new URL(page.url());
  expect(restoredUrl.searchParams.get("utm_source")).toBe("tiktok");
  expect(restoredUrl.searchParams.has("privateNote")).toBe(false);
  await expect(page.locator("#wizard-step-2")).toBeVisible();
  await expect(page.getByLabel("Packaging", { exact: true })).toHaveValue("can");
  await expect(page.getByLabel("Known process need")).toHaveValue("cold-fill");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Location", { exact: true }).selectOption("TX");
  await page.getByLabel("Certification you need").selectOption("sqf");
  await page.getByRole("checkbox", { name: /Only show manufacturers that mention small/ }).check();

  await page.reload();
  await expect(page.locator("#wizard-step-3")).toBeVisible();
  await expect(page.getByLabel("Location", { exact: true })).toHaveValue("TX");
  await expect(page.getByLabel("Certification you need")).toHaveValue("sqf");
  await expect(page.getByRole("checkbox", { name: /Only show manufacturers that mention small/ })).toBeChecked();
  await page.getByRole("button", { name: "Show matching manufacturers" }).click();

  await expect(page).toHaveURL(/\/find-manufacturers\?/);

  const results = new URL(page.url());
  expect(Object.fromEntries(results.searchParams)).toEqual({ category: "energy-drink", process: "cold-fill", smallRun: "1", packaging: "can", certification: "sqf", state: "TX", utm_source: "tiktok", utm_medium: "organic", utm_campaign: "first-run", utm_content: "can", utm_term: "energy" });
  await page.goBack();
  await expect(page.locator("#wizard-step-3")).toBeVisible();
  await expect(page.getByRole("button", { name: "Show matching manufacturers" })).toBeEnabled();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel("Packaging", { exact: true })).toHaveValue("can");
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
