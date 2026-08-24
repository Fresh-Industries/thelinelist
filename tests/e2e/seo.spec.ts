import { expect, test } from "@playwright/test";

test("redirects the apex host directly to the canonical host and preserves the request", async ({ request }) => {
  const response = await request.get("/some/path?category=hot-sauce", {
    headers: { host: "thelinelist.com" },
    maxRedirects: 0,
  });

  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe("https://www.thelinelist.com/some/path?category=hot-sauce");
});

test("filtered directory URLs use the directory canonical and stay noindex", async ({ page }) => {
  await page.goto("/find-manufacturers?category=hot-sauce&packaging=bottle");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://www.thelinelist.com/find-manufacturers");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("static directory pagination exposes normal profile and page links", async ({ page }) => {
  await page.goto("/find-manufacturers");
  await expect(page.locator('a[href^="/manufacturers/"]')).toHaveCount(60);
  await expect(page.getByRole("link", { name: "Next →" })).toHaveAttribute("href", "/find-manufacturers/page/2");
  const schema = await page.locator('script[type="application/ld+json"]').allTextContents();
  const collection = schema.map((value) => JSON.parse(value)).find((value) => value["@type"] === "CollectionPage");
  expect(collection.mainEntity.numberOfItems).toBe(30);
  expect(collection.mainEntity.itemListElement[0].position).toBe(1);
  expect(collection.mainEntity.itemListElement[29].position).toBe(30);
});
