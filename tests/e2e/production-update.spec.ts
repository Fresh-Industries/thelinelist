import { expect, test } from "@playwright/test";

test.describe("production manufacturer update", () => {
  test("shares the sourced small-run signal filter and combines it with state", async ({ page }) => {
    await page.goto("/find-manufacturers?smallRun=1&state=TX");

    await expect(page).toHaveURL(/smallRun=1/);
    await expect(page.getByRole("link", { name: /Remove Small-run signal listed filter/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Remove Texas filter/ })).toBeVisible();
    await expect(page.getByLabel("Publicly lists a small-run signal")).toBeChecked();

    const cards = page.locator(".plant-card");
    expect(await cards.count()).toBeGreaterThan(0);
    await expect(cards.locator(".small-run-signal")).toHaveCount(await cards.count());
    await expect(page.getByRole("heading", { name: "Amigos Canning Co. (Amigos Foods)" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Consolidated Mills Inc." })).toBeVisible();
  });

  test("shows sourced evidence on a small-run profile without a friendliness claim", async ({ page }) => {
    await page.goto("/manufacturers/consolidated-mills-inc");

    const signal = page.locator(".profile-small-run-signal");
    await expect(signal).toContainText("Small-run signal listed");
    await expect(signal).toContainText("small-batch production runs for test items");
    await expect(signal).toContainText("Confirm the current minimum");
    await expect(signal).not.toContainText(/beginner-friendly|small-run friendly/i);
  });

  test("manufacturer page states the paid-placement and review boundaries", async ({ page }) => {
    await page.goto("/for-manufacturers");

    await expect(page.getByRole("heading", { level: 1, name: "Keep your public profile useful and accurate" })).toBeVisible();
    await expect(page.getByText("Paid placements are always labeled.")).toBeVisible();
    await expect(page.getByText(/Payment never improves organic A–Z directory ranking/)).toBeVisible();
    await expect(page.getByRole("note").getByText(/featured placement is not an endorsement/)).toBeVisible();
    await expect(page.getByText(/Profile claims are never auto-approved/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Claim, correct, or submit a profile" })).toHaveAttribute("href", "/claim-submit");
  });

  test("keeps the newsletter signup live without inventing an archive", async ({ page }) => {
    await page.goto("/newsletter");

    await expect(page.getByRole("button", { name: /subscribe/i })).toBeVisible();
    await expect(page.getByText(/latest issue|issue archive|subscriber count|open rate/i)).toHaveCount(0);
  });
});
