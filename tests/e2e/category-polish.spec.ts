import { expect, test } from "@playwright/test";

test("category jump link smoothly moves focus below the sticky header", async ({ page }) => {
  await page.addInitScript(() => {
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function scrollIntoView(options?: boolean | ScrollIntoViewOptions) {
      (window as Window & { __categoryScrollBehavior?: ScrollBehavior }).__categoryScrollBehavior =
        typeof options === "object" ? options.behavior : undefined;
      return original.call(this, options);
    };
  });
  await page.goto("/find-manufacturers/hot-sauce");

  await page.getByRole("link", { name: "Jump to manufacturers" }).click();

  const heading = page.locator("#manufacturer-results-heading");
  await expect(heading).toBeFocused();
  await expect.poll(() => page.evaluate(() => (
    window as Window & { __categoryScrollBehavior?: ScrollBehavior }
  ).__categoryScrollBehavior)).toBe("smooth");
  await expect.poll(async () => {
    const headingTop = await heading.evaluate((element) => element.getBoundingClientRect().top);
    const headerBottom = await page.locator(".site-header").evaluate((element) => element.getBoundingClientRect().bottom);
    return headingTop >= headerBottom && headingTop < headerBottom + 160;
  }).toBe(true);
});

test("category jump link uses instant scrolling for reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function scrollIntoView(options?: boolean | ScrollIntoViewOptions) {
      (window as Window & { __categoryScrollBehavior?: ScrollBehavior }).__categoryScrollBehavior =
        typeof options === "object" ? options.behavior : undefined;
      return original.call(this, options);
    };
  });
  await page.goto("/find-manufacturers/hot-sauce");

  await page.getByRole("link", { name: "Jump to manufacturers" }).click();

  await expect(page.locator("#manufacturer-results-heading")).toBeFocused();
  await expect.poll(() => page.evaluate(() => (
    window as Window & { __categoryScrollBehavior?: ScrollBehavior }
  ).__categoryScrollBehavior)).toBe("auto");
});

test("compound certification claims render without duplicate React keys", async ({ page }) => {
  const duplicateKeyErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("same key")) {
      duplicateKeyErrors.push(message.text());
    }
  });

  await page.goto("/find-manufacturers/dry-coffee-tea");
  await expect(page.getByRole("heading", { name: "Complete CoPack (Kcupcopack)" })).toBeVisible();
  expect(duplicateKeyErrors).toEqual([]);
});

test("category cards expose the comparison dock after selection", async ({ page }) => {
  await page.goto("/find-manufacturers/hot-sauce");
  const cards = page.locator(".plant-card");

  await cards.nth(0).getByRole("button", { name: /^Compare / }).click();
  await expect(page.locator(".compare-dock")).toContainText("1 selected");
  await cards.nth(1).getByRole("button", { name: /^Compare / }).click();
  await expect(page.locator(".compare-dock").getByRole("link", { name: "Compare now" })).toBeVisible();
});

test("category cards prioritize the product label that explains the match", async ({ page }) => {
  await page.goto("/find-manufacturers/functional-beverages");
  const betterBeverage = page.locator(".plant-card").filter({ has: page.getByRole("heading", { name: "Better Beverage Company" }) });

  await expect(betterBeverage.locator(".capability-chip-product > span:last-child").first()).toHaveText("Wellness drinks & shots");
});
