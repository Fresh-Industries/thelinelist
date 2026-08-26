import { expect, test } from "@playwright/test";

test.describe("manufacturer directory discovery redesign", () => {
  test("keeps discovery compact, source-backed, and keyboard accessible", async ({ page }) => {
    await page.goto("/find-manufacturers");

    await expect(page.getByRole("heading", { level: 1, name: "Find a manufacturer for your product" })).toBeVisible();
    await expect(page.getByText("Quick picks:")).toBeVisible();
    await expect(page.getByRole("link", { name: "Energy drinks" })).toHaveAttribute("href", /category=energy-drink/);
    await expect(page.getByRole("link", { name: /Try the 4-step matcher/ })).toHaveAttribute("href", "/find-manufacturers/wizard");
    await expect(page.locator(".sponsored-slot")).toHaveCount(0);

    const artyCard = page.locator(".plant-card").filter({ has: page.getByRole("heading", { name: "Arty's Premium Beverages / FLOOID" }) });
    await expect(artyCard).toContainText("Publicly lists: Beverages (bottles and cans); small to medium brand beverage runs");

    const firstCard = page.locator(".plant-card").first();
    await expect(firstCard.locator(".place")).not.toBeEmpty();
    await expect(firstCard.locator(".capability-chips")).toBeVisible();
    await expect(firstCard.locator(".capability-chip-kind").first()).toHaveText(/Product|Process|Package/);
    await expect(firstCard.locator(".plant-card-summary")).toHaveCount(0);
    await expect(firstCard).not.toContainText("Unknown, ask the manufacturer");
    await expect(firstCard.getByRole("link", { name: "View manufacturer", exact: true })).toBeVisible();

    const compare = firstCard.locator(".compare-toggle");
    await expect(compare).toHaveAttribute("aria-pressed", "false");
    await compare.click();
    await expect(compare).toHaveAttribute("aria-pressed", "true");
    await expect(compare).toHaveAccessibleName(/^Remove .* from comparison$/);
    await expect(compare).toContainText("Selected");
    await expect(page.locator(".compare-dock")).toContainText("1 selected");
    await compare.click();
    await expect(compare).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".compare-dock")).toHaveCount(0);

    await page.getByRole("button", { name: "More +" }).click();
    const productSearch = page.getByRole("combobox", { name: "What are you making?" });
    await expect(productSearch).toBeFocused();
    await expect(page.getByRole("listbox", { name: "Product categories" })).toBeVisible();
  });

  test("routes a verified-only URL through filtered results", async ({ page }) => {
    await page.goto("/find-manufacturers?verified=30-days");

    await expect(page).toHaveURL(/verified=30-days/);
    await expect(page.getByRole("link", { name: /Remove Reviewed in latest 30 days filter/ })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("filtered cards prioritize the category that explains the result", async ({ page }) => {
    await page.goto("/find-manufacturers?category=functional-beverages");
    const betterBeverage = page.locator(".plant-card").filter({ has: page.getByRole("heading", { name: "Better Beverage Company" }) });

    await expect(betterBeverage.locator(".capability-chip-product > span:last-child").first()).toHaveText("Wellness drinks & shots");
  });

  test("mobile keeps quick discovery and cards inside the viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/find-manufacturers");

    const layout = await page.evaluate(() => ({
      bodyOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      quickPicksScrollable: (() => {
        const list = document.querySelector<HTMLElement>(".directory-quick-row ul");
        return Boolean(list && list.scrollWidth > list.clientWidth);
      })(),
    }));

    expect(layout.bodyOverflow).toBe(0);
    expect(layout.quickPicksScrollable).toBe(true);

    const firstCard = page.locator(".plant-card").first();
    await firstCard.scrollIntoViewIfNeeded();
    await expect(firstCard.getByRole("button", { name: /^Compare / })).toBeVisible();
    await expect(firstCard.getByRole("link", { name: "View manufacturer", exact: true })).toBeVisible();
  });
});
