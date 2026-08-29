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

  test("applies quick product filters across navigation, reload, and browser history", async ({ page }) => {
    await page.goto("/find-manufacturers");
    const unfilteredHeading = await page.locator("#directory-results-heading").innerText();
    const filteredDocumentRequests: string[] = [];
    page.on("request", (request) => {
      if (request.resourceType() === "document" && request.url().includes("category=bakery")) {
        filteredDocumentRequests.push(request.url());
      }
    });

    await page.getByRole("link", { name: /^Bakery/ }).click();

    await expect(page).toHaveURL(/category=bakery/);
    expect(filteredDocumentRequests).toHaveLength(1);
    await expect(page.getByRole("link", { name: "Remove Bakery filter" })).toBeVisible();
    const filteredHeading = await page.locator("#directory-results-heading").innerText();
    expect(filteredHeading).not.toBe(unfilteredHeading);

    await page.reload();
    await expect(page.locator("#directory-results-heading")).toHaveText(filteredHeading);

    await page.goBack();
    await expect(page.locator("#directory-results-heading")).toHaveText(unfilteredHeading);

    await page.goForward();
    await expect(page.locator("#directory-results-heading")).toHaveText(filteredHeading);
  });

  test("filtered cards prioritize the category that explains the result", async ({ page }) => {
    await page.goto("/find-manufacturers?category=functional-beverages");
    const betterBeverage = page.locator(".plant-card").filter({ has: page.getByRole("heading", { name: "Better Beverage Company" }) });

    await expect(betterBeverage.locator(".capability-chip-product > span:last-child").first()).toHaveText("Wellness drinks & shots");
  });

  test("shows contextual counts and prevents unsupported bakery combinations", async ({ page }) => {
    await page.goto("/find-manufacturers?category=bakery");
    await page.getByText("More filters", { exact: true }).click();

    const process = page.getByLabel("How it is made Process");
    await expect(process.locator('option[value="hpp"]')).toBeDisabled();
    await expect(process.locator('option[value="hpp"]')).toHaveText("HPP (0)");

    const packaging = page.getByLabel("Package type");
    const pouchOption = packaging.locator('option[value="pouch"]');
    const pouchLabel = await pouchOption.innerText();
    const advertisedCount = Number(pouchLabel.match(/\((\d+)\)$/)?.[1]);
    expect(advertisedCount).toBeGreaterThan(0);

    await packaging.selectOption("pouch");
    await page.getByRole("button", { name: "Apply filters" }).click();

    await expect(page).toHaveURL(/category=bakery/);
    await expect(page).toHaveURL(/packaging=pouch/);
    await expect(page.getByRole("link", { name: "Remove Bakery filter" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Remove Pouches or sachets filter" })).toBeVisible();
    await expect(page.locator("#directory-results-heading")).toContainText(`of ${advertisedCount} manufacturers`);
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
