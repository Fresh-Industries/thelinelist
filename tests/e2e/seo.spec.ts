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
  await expect(page.locator(".plant-card")).toHaveCount(18);
  await expect(page.getByRole("link", { name: "Next →" })).toHaveAttribute("href", "/find-manufacturers/page/2");
  const schema = await page.locator('script[type="application/ld+json"]').allTextContents();
  const collection = schema.map((value) => JSON.parse(value)).find((value) => value["@type"] === "CollectionPage");
  expect(collection.mainEntity.numberOfItems).toBe(17);
  expect(collection.mainEntity.itemListElement[0].position).toBe(1);
  expect(collection.mainEntity.itemListElement[16].position).toBe(17);
  expect(collection.mainEntity.itemListElement.map((item: { url: string }) => item.url)).not.toContain(
    "https://www.thelinelist.com/manufacturers/alpenrose-dairy-smith-brothers-farm",
  );

  await page.goto("/find-manufacturers/page/2");
  const pageTwoSchemas = await page.locator('script[type="application/ld+json"]').allTextContents();
  const pageTwoCollection = pageTwoSchemas.map((value) => JSON.parse(value)).find((value) => value["@type"] === "CollectionPage");
  expect(pageTwoCollection.mainEntity.itemListElement[0].position).toBe(18);
});

test("robots stays minimal and uses the canonical sitemap", async ({ request }) => {
  const response = await request.get("/robots.txt");
  expect(response.ok()).toBe(true);
  const body = await response.text();
  expect(body).toContain("User-Agent: *");
  expect(body).toContain("Allow: /");
  expect(body).toContain("Sitemap: https://www.thelinelist.com/sitemap.xml");
  expect(body).not.toMatch(/^Host:/m);
});

test("legacy company profiles redirect to the canonical manufacturer URL", async ({ request }) => {
  const response = await request.get("/copackers/innomark", { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe("/manufacturers/innomark");
});

test("a one-result category uses singular result copy", async ({ page }) => {
  await page.goto("/find-manufacturers/prepared-refrigerated-foods");
  await expect(page.getByRole("heading", { level: 2, name: /^1 manufacturer that/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Boulder Organic Foods (Bolder Foods)" })).toBeVisible();
});

test("ownership-review profiles are noindex and cannot accept contact-help requests", async ({ page }) => {
  await page.goto("/manufacturers/alpenrose-dairy-smith-brothers-farm");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator(".listing-evidence-review")).toHaveText("Needs current ownership verification");
  await expect(page.getByRole("link", { name: "Request help contacting this manufacturer" })).toHaveCount(0);

  await page.goto("/find-manufacturers/request-intro?manufacturer=alpenrose-dairy-smith-brothers-farm");
  await expect(page.getByText("Contact help is paused for this profile.")).toBeVisible();
  await expect(page.locator("form")).toHaveCount(0);
});

test("manufacturer schema keeps the profile canonical and the official site in sameAs", async ({ page }) => {
  await page.goto("/manufacturers/innomark");
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
  const profile = scripts.map((value) => JSON.parse(value)).find((value) => value["@type"] === "ProfilePage");
  expect(profile.url).toBe("https://www.thelinelist.com/manufacturers/innomark");
  expect(profile.mainEntity.url).toBe("https://www.thelinelist.com/manufacturers/innomark");
  expect(profile.mainEntity.sameAs).toEqual(["https://innomarkinc.com/"]);
});
