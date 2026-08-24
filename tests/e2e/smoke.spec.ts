import { expect, test } from "@playwright/test";

const ROUTES = [
  "/",
  "/find-manufacturers",
  "/find-manufacturers/hot-sauce",
  "/manufacturers/thermal-kitchen",
  "/guides/start-hot-sauce",
  "/newsletter",
  "/find-manufacturers/wizard",
] as const;

for (const viewport of [
  { label: "desktop", width: 1440, height: 900 },
  { label: "mobile", width: 390, height: 844 },
]) {
  test.describe(`${viewport.label} route smoke`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of ROUTES) {
      test(`${route} renders without overflow or broken editorial images`, async ({ page }) => {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        const response = await page.goto(route);
        expect(response?.status()).toBeLessThan(400);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
        const images = await page.locator("main img").all();
        for (const image of images) {
          await image.scrollIntoViewIfNeeded();
          await expect.poll(() => image.evaluate((item) => (item as HTMLImageElement).complete && (item as HTMLImageElement).naturalWidth > 0)).toBe(true);
        }
        expect(errors).toEqual([]);
      });
    }
  });
}
