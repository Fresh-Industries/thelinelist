import { expect, test } from "@playwright/test";

test.describe("lead form validation", () => {
  test("introduction steps validate before advancing and do not submit early", async ({ page }) => {
    let posts = 0;
    page.on("request", (request) => {
      if (request.method() === "POST") posts += 1;
    });

    await page.goto("/find-manufacturers/request-intro?manufacturer=acecopack");

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("group", { name: "What are you making?" })).toBeVisible();
    await expect(page.locator("[name=product]")).toBeFocused();

    await page.locator("[name=product]").fill("Sparkling tea");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.locator("[name=packSize]").fill("12 oz can");
    await page.locator("[name=qty]").fill("100 cases");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByRole("group", { name: "Where should we follow up?" })).toBeVisible();
    await expect(page.locator("[name=name]")).toBeVisible();
    expect(posts).toBe(0);
  });

  test("introduction server errors identify and focus the exact field without clearing answers", async ({ page }) => {
    await page.goto("/find-manufacturers/request-intro?manufacturer=acecopack");

    await page.locator("[name=product]").fill("   ");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.locator("[name=packSize]").fill("12 oz can");
    await page.locator("[name=qty]").fill("100 cases");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.locator("[name=name]").fill("Local test");
    await page.locator("[name=email]").fill("local-test@example.com");
    await page.locator("[name=launchDate]").fill("Flexible");
    await page.getByRole("button", { name: "Request introduction" }).click();

    await expect(page.locator(".form-banner")).toContainText("Tell us what you want to make.");
    await expect(page.getByRole("group", { name: "What are you making?" })).toBeVisible();
    await expect(page.locator("[name=product]")).toBeFocused();
    await expect(page.locator("[name=product]")).toHaveValue("   ");
  });

  test("claim links preselect the plant and native validation identifies missing fields", async ({ page }) => {
    let posts = 0;
    page.on("request", (request) => {
      if (request.method() === "POST") posts += 1;
    });

    await page.goto("/claim-submit?manufacturer=acecopack");

    await expect(page.getByRole("textbox", { name: "Company / plant name Required" })).toHaveValue("AceCoPack");
    await expect(page.locator("[name=manufacturerSlug]")).toHaveValue("acecopack");
    await expect(page.locator("[name=manufacturerName]")).toHaveValue("AceCoPack");
    await page.getByRole("button", { name: "Submit claim for review" }).click();
    await expect(page.locator("[name=contactName]")).toBeFocused();
    expect(posts).toBe(0);
  });

  test("claim server errors are specific and preserve completed fields", async ({ page }) => {
    await page.goto("/claim-submit?manufacturer=acecopack");

    await page.locator("[name=contactName]").fill("   ");
    await page.locator("[name=workEmail]").fill("local-claim@example.com");
    await page.locator("[name=role]").fill("Plant manager");
    await page.getByRole("button", { name: "Submit claim for review" }).click();

    await expect(page.locator(".form-banner")).toContainText("Enter a contact name.");
    await expect(page.locator("[name=contactName]")).toBeFocused();
    await expect(page.locator("[name=workEmail]")).toHaveValue("local-claim@example.com");
    await expect(page.locator("[name=role]")).toHaveValue("Plant manager");
  });

  test("claim errors reveal fields inside optional details", async ({ page }) => {
    await page.goto("/claim-submit?manufacturer=acecopack");

    await page.locator("[name=contactName]").fill("Local test");
    await page.locator("[name=workEmail]").fill("local-details@example.com");
    await page.locator("[name=role]").fill("Plant manager");
    await page.getByText("More plant detail (optional)").click();
    await page.locator("[name=operationType]").fill("x".repeat(201));
    await page.getByText("More plant detail (optional)").click();
    await page.getByRole("button", { name: "Submit claim for review" }).click();

    await expect(page.locator(".form-banner")).toContainText("Keep this answer to 200 characters or fewer.");
    await expect(page.locator("details.form-more")).toHaveAttribute("open", "");
    await expect(page.locator("[name=operationType]")).toBeFocused();
  });
});
