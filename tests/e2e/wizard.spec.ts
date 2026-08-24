import { expect, test } from "@playwright/test";

test("completes four steps and opens manufacturer results without contact information", async ({ page }) => {
  await page.goto("/find-manufacturers/wizard");

  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Choose the closest product,", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: /Hot sauce/ }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator("#wizard-step-2")).toBeFocused();

  await page.getByRole("button", { name: /I have my own formula/ }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator("#wizard-step-3")).toBeFocused();

  await page.getByLabel("Packaging").selectOption("bottle");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator("#wizard-step-4")).toBeFocused();
  await expect(page.locator('input[name="email"], input[name="phone"], input[name="name"]')).toHaveCount(0);

  await page.getByRole("button", { name: "Show matching manufacturers" }).click();
  await page.waitForURL(/\/find-manufacturers\?category=hot-sauce&packaging=bottle/);
  await expect(page.getByRole("heading", { level: 1, name: "Find a manufacturer for your product" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});
