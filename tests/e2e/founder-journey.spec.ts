import { expect, test, type Page } from "@playwright/test";

async function startPlan(page: Page, idea: string) {
  const input = page.getByLabel("What do you want to make?", { exact: true });
  await expect(input).toBeAttached();
  if (!await input.isVisible()) await page.locator("details.manual-start > summary").click();
  await input.fill(idea);
  await page.getByRole("radio", { name: /Just an idea/ }).check();
  await page.getByRole("button", { name: "Create my product plan" }).click();
}

test("a founder can begin on home, save a guide checklist, and apply an honest decision to the same plan", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Start my food or drink brand" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Start your food or drink brand.");
  await startPlan(page, "A roasted pepper hot sauce for local specialty shops");
  await expect(page).toHaveURL(/\/sourcing\/[A-Za-z0-9_-]+$/);
  const id = new URL(page.url()).pathname.split("/")[2];
  const api = `/api/sourcing/${id}`;
  const original = (await (await page.request.get(api)).json()).workspace;
  expect(original.preparation.stage).toBe("idea");
  await page.getByRole("link", { name: "Open the guide for this stage" }).click();
  const check = page.locator(".interactive-checklist input").first();
  await expect(check).toBeVisible();
  await check.check();
  await page.getByRole("button", { name: "Save checklist to my plan" }).click();
  await expect(page.getByRole("status")).toContainText("Checklist saved");
  const saved = (await (await page.request.get(api)).json()).workspace;
  expect(saved.fields).toEqual(original.fields);
  expect(saved.preparation.checklists["test-food-business-idea"]).toHaveLength(1);
  expect(saved.outreachDrafts).toHaveLength(0);
  await page.reload();
  await expect(check).toBeChecked();
  await page.getByText("Add a decision to my product plan", { exact: true }).click();
  await page.getByLabel("Where do you want to try selling first?").fill("Local specialty stores; buyer conversations are still open");
  await page.getByRole("button", { name: "Save my answer" }).click();
  await expect(page.getByRole("status")).toContainText("Your answer is saved");
  expect((await (await page.request.get(api)).json()).workspace.fields.retail_channel.value).toBe("Local specialty stores; buyer conversations are still open");
  await page.getByRole("button", { name: "I’m not sure yet", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("decision is open");
  expect((await (await page.request.get(api)).json()).workspace.fields.retail_channel).toMatchObject({ value: null, status: "needs_decision" });
  await page.goto(`/sourcing/${id}`);
  await expect(page.getByRole("heading", { name: "Your saved checklists" })).toBeVisible();
});

test("an unsaved guide checklist survives starting a plan and returns to the same lesson", async ({ page }) => {
  await page.goto("/guides/start-hot-sauce");
  await page.locator(".interactive-checklist input").first().check();
  await page.getByRole("link", { name: /Start a plan to save this checklist/ }).click();
  await startPlan(page, "My first hot sauce idea");
  await expect(page).toHaveURL(/\/guides\/start-hot-sauce#checklist$/);
  await expect(page.locator(".interactive-checklist input").first()).toBeChecked();
  await page.getByRole("button", { name: "Save checklist to my plan" }).click();
  await expect(page.getByRole("status")).toContainText("Checklist saved");
  await page.reload();
  await expect(page.locator(".interactive-checklist input").first()).toBeChecked();
});

test("the worksheet preserves unknown costs, recalculates scenarios, and saves privately after onboarding", async ({ page }) => {
  await page.goto("/guides/first-run-costs");
  await page.getByLabel("Finished units for this run").fill("1000");
  await page.locator("#cost-ingredients").fill("0.5");
  await expect(page.getByTestId("run-cost-total")).toHaveText("$500.00");
  await expect(page.getByText("Subtotal of entered costs", { exact: true })).toBeVisible();
  await expect(page.locator(".cost-results p").filter({ hasText: "Not included yet:" })).toContainText("Freight");
  for (const [key, amount] of Object.entries({ packaging: ".6", manufacturing: ".4", setup: "300", freight: "200", storage: "0", other: "0" })) await page.locator(`#cost-${key}`).fill(amount);
  await expect(page.getByTestId("run-cost-total")).toHaveText("$2,000.00");
  await expect(page.getByTestId("run-cost-unit")).toHaveText("$2.00");
  await page.getByLabel("Finished units for this run").fill("2000");
  await expect(page.getByTestId("run-cost-total")).toHaveText("$3,500.00");
  await expect(page.getByTestId("run-cost-unit")).toHaveText("$1.75");
  await page.getByLabel("Quote sources and assumptions").fill("Private founder learning test: one month of storage");
  await page.getByRole("link", { name: /Start a plan to save these costs/ }).click();
  await startPlan(page, "A packaged snack idea");
  await expect(page).toHaveURL(/\/guides\/first-run-costs#checklist$/);
  await expect(page.getByTestId("run-cost-total")).toHaveText("$3,500.00");
  await page.getByRole("button", { name: "Save cost worksheet to my plan" }).click();
  await expect(page.getByRole("status")).toContainText("saved privately");
  await page.reload();
  await expect(page.getByLabel("Quote sources and assumptions")).toHaveValue("Private founder learning test: one month of storage");
  await expect(page.getByLabel("Finished units for this run")).toHaveValue("2000");
  const href = await page.locator(".cost-save a").first().getAttribute("href");
  await page.goto(href!);
  await expect(page.locator(".founder-learning")).toContainText("$3,500.00");
  const id = new URL(page.url()).pathname.split("/")[2];
  const workspace = (await (await page.request.get(`/api/sourcing/${id}`)).json()).workspace;
  expect(workspace.fields.production_volume.value).toBeNull();
  expect(workspace.inquiries).toHaveLength(0);
});

test("a stale guide write retains the local draft and requires another explicit save", async ({ page }) => {
  await page.goto("/sourcing");
  await startPlan(page, "A spicy snack idea");
  await expect(page).toHaveURL(/\/sourcing\/[A-Za-z0-9_-]+$/);
  const id = new URL(page.url()).pathname.split("/")[2];
  await page.goto("/guides/test-food-business-idea");
  await page.locator(".interactive-checklist input").first().check();
  const api = `/api/sourcing/${id}`;
  const previous = (await (await page.request.get(api)).json()).workspace;
  const changed = await page.request.patch(api, { data: { revision: previous.revision, preparationUpdate: { stage: "testing" } } });
  expect(changed.ok()).toBeTruthy();
  await page.getByRole("button", { name: "Save checklist to my plan" }).click();
  await expect(page.locator(".guide-plan-checklist").getByRole("alert")).toContainText("Your plan changed in another view");
  await expect(page.locator(".interactive-checklist input").first()).toBeChecked();
  expect((await (await page.request.get(api)).json()).workspace.preparation.checklists["test-food-business-idea"]).toBeUndefined();
  await page.getByRole("button", { name: "Save checklist to my plan" }).click();
  await expect(page.getByRole("status")).toContainText("Checklist saved");
});

test("directory service intent survives search, reload, and browser navigation", async ({ page }) => {
  await page.goto("/find-manufacturers");
  await page.getByLabel("What kind of help do you need?").selectOption("kitchen");
  await page.getByRole("button", { name: "Search", exact: true }).first().click();
  await expect(page).toHaveURL(/help=kitchen/);
  await expect(page.locator(".plant-card").first()).toBeVisible();
  const kitchens = await page.locator(".plant-card h2").allTextContents();
  await expect(page.locator(".plant-card-operation")).toHaveCount(kitchens.length);
  await page.reload();
  await expect(page.getByLabel("What kind of help do you need?")).toHaveValue("kitchen");
  await page.getByLabel("What kind of help do you need?").selectOption("production");
  await page.getByRole("button", { name: "Search", exact: true }).first().click();
  await expect(page).toHaveURL(/help=production/);
  await expect(page.locator(".plant-card").first()).toBeVisible();
  await expect(page.locator(".plant-card-operation")).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await page.goBack();
  await expect(page.getByLabel("What kind of help do you need?")).toHaveValue("kitchen");
  await expect(page.locator(".plant-card h2")).toHaveText(kitchens);
  await page.goForward();
  await expect(page.getByLabel("What kind of help do you need?")).toHaveValue("production");
});

for (const slug of ["test-food-business-idea", "food-product-development", "manufacturer-inquiry-examples", "first-run-costs"]) {
  test(`the ${slug} resource has public metadata and a usable mobile layout`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto(`/guides/${slug}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://www.thelinelist.com/guides/${slug}`);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.+/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    expect(await page.locator('script[type="application/ld+json"]').count()).toBeGreaterThan(0);
    if (slug === "manufacturer-inquiry-examples") await expect(page.getByText("Fictional examples for learning.", { exact: true })).toBeVisible();
  });
}

test("switching the active product during a save never loads the previous product into the new editor", async ({ page }) => {
  const first = (await (await page.request.post("/api/sourcing", { data: { idea: "First product sauce" } })).json()).workspace;
  const second = (await (await page.request.post("/api/sourcing", { data: { idea: "Second product drink" } })).json()).workspace;
  await page.goto(`/sourcing/${first.id}`);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("the-line-list:active-plan:v1"))).toBe(first.id);
  await page.goto("/guides/first-run-costs");
  await page.getByLabel("Finished units for this run").fill("111");
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route(`**/api/sourcing/${first.id}`, async (route) => {
    if (route.request().method() !== "PATCH") return route.continue();
    const response = await route.fetch();
    await held;
    await route.fulfill({ response });
  });
  const requestStarted = page.waitForRequest((request) => request.method() === "PATCH" && request.url().endsWith(first.id));
  await page.getByRole("button", { name: "Save cost worksheet to my plan" }).click();
  await requestStarted;
  await page.evaluate((id) => {
    localStorage.setItem("the-line-list:active-plan:v1", id);
    window.dispatchEvent(new StorageEvent("storage", { key: "the-line-list:active-plan:v1", newValue: id }));
  }, second.id);
  await expect(page.locator(".cost-save a")).toHaveAttribute("href", `/sourcing/${second.id}`);
  release();
  await expect(page.getByRole("button", { name: "Save cost worksheet to my plan" })).toBeEnabled();
  await expect(page.locator(".cost-save a")).toHaveAttribute("href", `/sourcing/${second.id}`);
  await expect(page.getByLabel("Finished units for this run")).toHaveValue("");
  const savedFirst = (await (await page.request.get(`/api/sourcing/${first.id}`)).json()).workspace;
  const unchangedSecond = (await (await page.request.get(`/api/sourcing/${second.id}`)).json()).workspace;
  expect(savedFirst.preparation.costWorksheet.quantity).toBe(111);
  expect(unchangedSecond.preparation.costWorksheet).toBeNull();
});
