import { expect, test } from "@playwright/test";

test.describe("manufacturer comparison", () => {
  test("persists a two-manufacturer shortlist and compares only public facts", async ({ page }) => {
    await page.goto("/find-manufacturers");
    const cards = page.locator(".plant-card");
    await cards.nth(0).getByRole("button", { name: /^Compare / }).click();
    await expect(page.locator(".compare-dock")).toContainText("Select one more to compare.");
    await expect(page.locator(".compare-dock").getByRole("link", { name: "Compare now" })).toHaveCount(0);
    await cards.nth(1).getByRole("button", { name: /^Compare / }).click();

    await expect(page.locator(".compare-dock")).toContainText("2 selected");
    await page.locator(".compare-dock").getByRole("link", { name: "Compare now" }).click();

    await expect(page).toHaveURL(/\/find-manufacturers\/compare\?plants=/);
    await expect(page.getByRole("heading", { level: 1, name: "Compare manufacturers" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Your shortlist" })).toBeVisible();
    await expect(page.locator(".compare-table thead th")).toHaveCount(3);
    await expect(page.getByRole("rowheader", { name: "Published minimum" })).toBeVisible();
    await expect(page.getByRole("rowheader", { name: "Regulatory and quality" })).toBeVisible();
    await expect(page.locator(".compare-dock")).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

    const firstManufacturer = await page.locator(".compare-shortlist li strong").first().textContent();
    await page.getByRole("button", { name: `Remove ${firstManufacturer}` }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Add one more manufacturer" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Your shortlist" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Your shortlist" })).toBeFocused();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("the-line-list:comparison:v1") ?? "[]").length)).toBe(1);

    await page.getByRole("button", { name: "Clear shortlist" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Select at least two manufacturers" })).toBeFocused();
  });

  test("mobile keeps scrolling inside the comparison and shows one complete manufacturer column", async ({ page }) => {
    const slugs = ["portland-bottling-company", "better-beverage-company"];
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript((selected) => {
      localStorage.setItem("the-line-list:comparison:v1", JSON.stringify(selected));
    }, slugs);
    await page.goto(`/find-manufacturers/compare?plants=${encodeURIComponent(slugs.join(","))}`);

    await expect(page.getByRole("row", { name: /Manufacturing capabilities/ })).toContainText("Custom fermentation");
    await expect(page.getByRole("row", { name: /Manufacturing capabilities/ })).toContainText("pasteurization");

    const layout = await page.evaluate(() => {
      const wrap = document.querySelector<HTMLElement>(".compare-table-wrap")!;
      const firstManufacturer = document.querySelector<HTMLElement>(".compare-table thead th:nth-child(2)")!;
      return {
        bodyOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        columnRight: firstManufacturer.getBoundingClientRect().right,
        wrapRight: wrap.getBoundingClientRect().right,
        internalOverflow: wrap.scrollWidth - wrap.clientWidth,
      };
    });

    expect(layout.bodyOverflow).toBe(0);
    expect(layout.columnRight).toBeLessThanOrEqual(layout.wrapRight + 1);
    expect(layout.internalOverflow).toBeGreaterThan(0);
    await expect(page.locator(".compare-dock")).toHaveCount(0);
  });

  test("keeps comparison usable when browser storage writes are blocked", async ({ page }) => {
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => { throw new DOMException("Storage blocked", "SecurityError"); };
    });
    await page.goto("/find-manufacturers");
    const compare = page.locator(".plant-card").first().locator(".compare-toggle");

    await compare.click();
    await expect(compare).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".compare-dock")).toContainText("1 selected");
  });

  test("preserves rapid sequential shortlist removals", async ({ page }) => {
    const slugs = ["portland-bottling-company", "better-beverage-company", "arty-s-premium-beverages-flooid"];
    await page.goto(`/find-manufacturers/compare?plants=${encodeURIComponent(slugs.join(","))}`);

    const removeButtons = page.locator(".compare-shortlist li button");
    await removeButtons.nth(0).click();
    await removeButtons.nth(0).click();

    await expect(page.locator(".compare-shortlist li")).toHaveCount(1);
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("the-line-list:comparison:v1") ?? "[]"))).toEqual([slugs[2]]);
    await expect(page).toHaveURL(new RegExp(`plants=${slugs[2]}`));
  });

  test("distinguishes directory-reported source checks from verified profiles", async ({ page }) => {
    await page.goto("/find-manufacturers/compare?plants=foremother-foods-llc-picaflor,portland-bottling-company");

    const evidenceRow = page.getByRole("row", { name: /Evidence checked/ });
    await expect(evidenceRow).toContainText("Public sources checked");
    await expect(evidenceRow).toContainText("Verified");
  });
});
