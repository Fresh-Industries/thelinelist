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
