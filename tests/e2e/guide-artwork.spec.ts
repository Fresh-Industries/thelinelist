import { expect, test } from "@playwright/test";
import socialImages from "../../lib/seo/social-images.generated.json";

test("public pages expose their own social card to crawlers and serve real image bytes", async ({ request }) => {
  test.setTimeout(120_000);
  for (const [path, image] of Object.entries(socialImages)) {
    const response = await request.get(path, { headers: { "user-agent": "Twitterbot/1.0" } });
    expect(response.ok(), path).toBe(true);
    const html = await response.text();
    const expected = `https://www.thelinelist.com${image.url}`;
    expect(html.match(/<meta property="og:image" content="([^"]+)"/g), path).toEqual([`<meta property="og:image" content="${expected}"`]);
    expect(html, path).toContain(`<meta name="twitter:image" content="${expected}"`);
    const picture = await request.get(image.url);
    expect(picture.ok(), image.url).toBe(true);
    expect(picture.headers()["content-type"], image.url).toContain("image/jpeg");
    expect((await picture.body()).subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
  }
  const legacy = await request.get("/opengraph-image");
  expect(legacy.ok()).toBe(true);
  expect(await legacy.body()).toEqual(await (await request.get(socialImages["/"].url)).body());
});

test("guide cards have distinct, loaded covers and fit the mobile page", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/guides");
  const covers = page.locator(".guide-card-image-link img");
  expect(await covers.count()).toBeGreaterThan(20);
  const sources = await covers.evaluateAll((images) => images.map((image) => image.getAttribute("src")));
  expect(new Set(sources).size).toBe(sources.length);
  for (const cover of await covers.all()) {
    await cover.scrollIntoViewIfNeeded();
    await expect.poll(() => cover.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("new artwork loads on the guide, process lesson and cost worksheet", async ({ page }) => {
  for (const slug of ["dry-blending", "hot-fill", "first-run-costs"]) {
    await page.goto(`/guides/${slug}`);
    const image = page.locator(".guide-hero > img, .standalone-guide-cover img");
    await expect(image).toHaveCount(1);
    await expect(image).toHaveAttribute("alt", /Clay/i);
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), slug).toBe(true);
  }
});
