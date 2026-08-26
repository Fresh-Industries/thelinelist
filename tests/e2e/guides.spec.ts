import { expect, test } from "@playwright/test";

test.describe("beginner hot-sauce guide", () => {
  for (const viewport of [
    { label: "desktop", width: 1440, height: 900 },
    { label: "mobile", width: 390, height: 844 },
  ]) {
    test(`${viewport.label} presents a clear path without page overflow`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/guides/start-hot-sauce");

      await expect(page).toHaveTitle(/How to Start a Hot Sauce Brand/);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        "https://www.thelinelist.com/guides/start-hot-sauce",
      );
      await expect(page.getByRole("heading", { level: 1, name: "How to start a hot sauce brand" })).toBeVisible();
      await expect(page.getByRole("heading", { level: 2, name: "Who this is for" })).toBeVisible();
      await expect(page.locator(".guide-steps > li")).toHaveCount(7);
      await expect(page.getByRole("img", { name: "Six steps to prepare a hot sauce brand for manufacturing" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Find hot sauce manufacturers" })).toHaveAttribute(
        "href",
        /\/find-manufacturers\/hot-sauce/,
      );

      const directAnswer = await page.locator(".direct-answer p").last().innerText();
      expect(directAnswer.trim().split(/\s+/)).toHaveLength(53);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

      const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
      const parsed = schemas.map((schema) => JSON.parse(schema));
      expect(parsed.find((schema) => schema["@type"] === "Article")?.dateModified).toBe("2026-08-25");
      expect(parsed.find((schema) => schema["@type"] === "FAQPage")?.mainEntity).toHaveLength(5);
    });
  }
});

test("Drive-backed foundation guide has a direct answer, sources, and directory next step", async ({ page }) => {
  await page.goto("/guides/co-packer-vs-private-label");
  await expect(page.getByRole("heading", { level: 1, name: "Co-packer vs. private label: what is the difference?" })).toBeVisible();
  await expect(page.locator(".guide-hero .direct-answer")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Where can you verify this?" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Match your product to manufacturers" })).toHaveAttribute("href", "/find-manufacturers/wizard");
  await expect(page.locator("body")).not.toContainText(/\[S\d+\]/);
});
