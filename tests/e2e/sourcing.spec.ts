import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import sharp from "sharp";

async function visualVariationRatio(image: Buffer) {
  const rendered = await sharp(image).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const background = [rendered.data[0], rendered.data[1], rendered.data[2]];
  let variedPixels = 0;
  for (let index = 0; index < rendered.data.length; index += rendered.info.channels) {
    const difference = Math.abs(rendered.data[index] - background[0])
      + Math.abs(rendered.data[index + 1] - background[1])
      + Math.abs(rendered.data[index + 2] - background[2]);
    if (difference > 35) variedPixels += 1;
  }
  return variedPixels / (rendered.info.width * rendered.info.height);
}

async function startProduct(page: Page, idea = "A packaged banana bread mini loaf for individual sale in coffee shops") {
  await page.goto("/sourcing");
  await page.getByLabel("What do you want to make?").fill(idea);
  await page.getByRole("button", { name: "Build with your agent" }).click();
  await expect(page).toHaveURL(/\/sourcing\/[A-Za-z0-9_-]+$/, { timeout: 20_000 });
}

async function installWebMcpHarness(page: Page) {
  await page.addInitScript(() => {
    const tools = new Map<string, { execute(input: unknown): Promise<unknown> | unknown }>();
    const context = {
      async registerTool(tool: { name: string; execute(input: unknown): Promise<unknown> | unknown }, options?: { signal?: AbortSignal }) {
        tools.set(tool.name, tool);
        options?.signal?.addEventListener("abort", () => tools.delete(tool.name), { once: true });
      },
    };
    Object.defineProperty(Document.prototype, "modelContext", { configurable: true, get: () => context });
    Object.assign(window, { __webMcpTools: tools });
  });
}

test("single sourcing entry creates the agent-led living document", async ({ page }) => {
  await page.goto("/sourcing");
  await expect(page.getByRole("heading", { name: "Start with the product in your head." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Build with your agent" })).toHaveCount(1);
  for (const starter of ["Drink", "Sauce or condiment", "Baked good", "Snack", "Prepared food", "Something else"]) {
    await expect(page.getByRole("button", { name: starter })).toBeVisible();
  }
  const idea = page.getByLabel("What do you want to make?");
  await page.getByRole("button", { name: "Baked good" }).click();
  await expect(idea).toHaveValue("I want to package a baked good...");
  await expect(idea).toBeFocused();
  await expect(page).toHaveURL(/\/sourcing$/);
  await page.getByRole("button", { name: "Something else" }).click();
  await expect(idea).toHaveValue("I have an idea for a food or beverage product...");
  await expect(page.getByText("Build it myself")).toHaveCount(0);
  await expect(page.getByText("ready-made energy drink demo")).toHaveCount(0);

  await startProduct(page);
  await expect(page.getByText("Product brief", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Packaged banana bread mini loaf" })).toBeVisible();
  await expect(page.getByText("Brand name still open").first()).toBeVisible();
  await expect(page.getByText("Product collaborator", { exact: true }).last()).toBeVisible();
  await expect(page.getByRole("heading", { name: /Do you already have a brand name/ })).toBeVisible();
  await expect(page.getByText("Development workspace")).toHaveCount(0);
  await expect(page.getByText(/local development/i)).toHaveCount(0);
  await expect(page.getByText(/Started from:/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /open ChatGPT/i })).toHaveCount(0);
  await expect(page.locator('a[href*="chatgpt.com"]')).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "A packaged banana bread mini loaf for individual sale in coffee shops" })).toHaveCount(0);
});

test("the collaborator drives one decision and keeps uncertainty open", async ({ page }) => {
  await startProduct(page);
  await page.getByPlaceholder(/Answer naturally/).fill("Not yet");
  await page.getByRole("button", { name: "Add to brief" }).click();
  await expect(page.getByText(/brand name can stay open/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /How will one customer receive/ })).toBeVisible();
  await page.getByPlaceholder(/Answer naturally/).fill("Mini loaf");
  await page.getByRole("button", { name: "Add to brief" }).click();
  await expect(page.getByText(/I added product format to the brief/)).toBeVisible();
  await expect(page.getByRole("heading", { name: /What package are you leaning toward/ })).toBeVisible();
  await page.getByPlaceholder(/Answer naturally/).fill("I'm not sure");
  await page.getByRole("button", { name: "Add to brief" }).click();
  await expect(page.getByText(/That can stay open/)).toBeVisible();
  await expect(page.getByText("Intentionally left open")).toBeVisible();
});

test("brand identity updates the document without duplicating the product identity", async ({ page }) => {
  const originalIdea = "I want to make a packaged sauce that is really spicy and sell it in grocery stores.";
  await startProduct(page, originalIdea);
  await expect(page.getByRole("heading", { level: 1, name: "Packaged sauce" })).toBeVisible();
  await page.getByPlaceholder(/Answer naturally/).fill("Fireline Foods");
  await page.getByRole("button", { name: "Add to brief" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Fireline Foods" })).toBeVisible();
  await expect(page.locator(".document-identity").getByText("Packaged sauce", { exact: true })).toBeVisible();
  await expect(page.locator(".product-anchor")).toHaveCount(0);
  await expect(page.locator(".document-identity").getByText("Fireline Foods", { exact: true })).toHaveCount(1);
  await expect(page.locator(".document-identity").getByText("Packaged sauce", { exact: true })).toHaveCount(1);

  await page.getByRole("button", { name: "Edit brand name: Fireline Foods" }).click();
  await page.getByRole("textbox", { name: "Brand name" }).fill("Fireline Kitchen");
  await page.getByRole("button", { name: "Save brand" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Fireline Kitchen" })).toBeVisible();

  const stored = await page.evaluate(async () => fetch(location.pathname.replace("/sourcing/", "/api/sourcing/")).then((response) => response.json())) as { workspace: { originalIdea: string; fields: { brand_name: { value: string }; product_type: { value: string } } } };
  expect(stored.workspace.originalIdea).toBe(originalIdea);
  expect(stored.workspace.fields.brand_name.value).toBe("Fireline Kitchen");
  expect(stored.workspace.fields.product_type.value).toBe("Packaged sauce");
});

test("the focused package workbench uses all four production 3D models and writes back", async ({ page }) => {
  await startProduct(page);
  await page.getByRole("button", { name: "Open 3D workbench" }).click();
  const dialog = page.getByRole("dialog", { name: "Make the package direction tangible." });
  await expect(dialog).toBeVisible();
  for (const label of ["Slim Can", "Bottle", "Jar", "Bag / pouch"]) {
    await expect(dialog.getByRole("button", { name: label })).toBeVisible();
  }
  await dialog.getByRole("button", { name: "Bag / pouch" }).click();
  await dialog.locator('input[type="file"]').setInputFiles(path.join(process.cwd(), "public/brand/line-list-mark.png"));
  await dialog.getByLabel("Logo size").fill("1.1");
  await dialog.getByRole("button", { name: "Use this package direction" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Bag / pouch · dimensions still open").first()).toBeVisible();
  const preview = page.locator(".package-direction-preview");
  await expect(preview).toHaveAttribute("data-packaging-type", "stand-up-pouch");
  await expect(preview).toHaveAttribute("data-base-color", "#b64d2c");
  await expect(preview).toHaveAttribute("data-artwork-state", "applied");
  await expect(page.getByText("Terracotta · custom artwork added")).toBeVisible();
  await expect(page.getByText(/line-list-mark\.png/i)).toHaveCount(0);
  const previewCanvas = preview.locator("canvas");
  await expect(previewCanvas).toBeVisible({ timeout: 15_000 });
  const previewResolution = await previewCanvas.evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    return {
      pixelWidth: canvas.width,
      pixelHeight: canvas.height,
      displayWidth: canvas.getBoundingClientRect().width,
      displayHeight: canvas.getBoundingClientRect().height,
    };
  });
  expect(previewResolution.pixelWidth / previewResolution.displayWidth).toBeGreaterThanOrEqual(1.45);
  expect(previewResolution.pixelHeight / previewResolution.displayHeight).toBeGreaterThanOrEqual(1.45);
  await expect.poll(async () => visualVariationRatio(await previewCanvas.screenshot()), { timeout: 15_000 }).toBeGreaterThan(0.05);
  await expect(page.locator(".package-glyph")).toHaveCount(0);
  await page.getByRole("button", { name: "Refine saved package direction in 3D" }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Bag / pouch" })).toHaveClass(/selected/);
  await expect(dialog.getByLabel("Package color")).toHaveValue("#b64d2c");
  await expect(dialog.getByLabel("Logo size")).toHaveValue("1.1");
});

test("five WebMCP tools share canonical state and expose no send action", async ({ page }) => {
  await installWebMcpHarness(page);
  await startProduct(page, "A sparkling beverage in slim cans");
  const invoke = async (name: string, input: Record<string, unknown>) => page.evaluate(async ({ name, input }) => {
    const tools = (window as unknown as { __webMcpTools: Map<string, { execute(value: unknown): Promise<unknown> | unknown }> }).__webMcpTools;
    const tool = tools.get(name);
    if (!tool) throw new Error(`Missing tool: ${name}`);
    return tool.execute(input);
  }, { name, input });

  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(5);
  const current = await invoke("get_sourcing_workspace", {}) as { canonicalPlan: { schemaVersion: number; originalIdea: string }; product: { brandName: string | null; descriptor: string }; externalContactRequiresFounderAction: boolean };
  expect(current.canonicalPlan.schemaVersion).toBe(2);
  expect(current.canonicalPlan.originalIdea).toBe("A sparkling beverage in slim cans");
  expect(current.product).toMatchObject({ brandName: null, descriptor: "Sparkling beverage" });
  expect(current.externalContactRequiresFounderAction).toBe(true);
  await invoke("update_sourcing_workspace", { proposedUpdates: [{ key: "product_type", value: "Sparkling beverage", status: "confirmed", explicitlyStated: true, suggestedSharing: true }] });
  await expect(page.getByText("Sparkling beverage", { exact: true }).first()).toBeVisible();
  const hasSendTool = await page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.has("send_manufacturer_inquiry"));
  expect(hasSendTool).toBe(false);
});

test("multiple manufacturers receive separate reviewable drafts", async ({ page }) => {
  await startProduct(page, "A healthier sparkling energy drink in 12 oz cans");
  await page.evaluate(async () => {
    const workspaceId = location.pathname.split("/").pop();
    const current = await fetch(`/api/sourcing/${workspaceId}`).then((response) => response.json());
    await fetch(`/api/sourcing/${workspaceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revision: current.workspace.revision, proposedUpdates: [
        { key: "brand_name", value: "Fresh Energy", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
        { key: "product_type", value: "Sparkling energy drink", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
        { key: "product_format", value: "12 oz drink", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
        { key: "packaging_format", value: "12 oz slim can", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
        { key: "storage_distribution", value: "Shelf stable", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
        { key: "production_volume", value: "1,000 to 5,000 units", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
        { key: "formula_status", value: "Tested recipe", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
        { key: "carbonation", value: "Carbonated", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      ] }),
    });
    location.reload();
  });
  await expect(page.getByRole("button", { name: "Find evidence-backed manufacturers" })).toBeVisible();
  await page.getByRole("button", { name: "Find evidence-backed manufacturers" }).click();
  const rows = page.locator(".match-row");
  await expect(rows.first()).toBeVisible();
  const count = await rows.count();
  expect(count).toBeGreaterThanOrEqual(2);
  await rows.nth(0).getByRole("button", { name: "Select" }).click();
  await rows.nth(1).getByRole("button", { name: "Select" }).click();
  await page.getByRole("button", { name: "Prepare 2 introductions" }).click();
  await expect(page.locator(".introduction-card")).toHaveCount(2);
  await expect(page.getByText("Nothing has been sent")).toBeVisible();
});

test("mobile keeps the living document inside the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startProduct(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const geometry = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }));
  expect(geometry.document).toBeLessThanOrEqual(geometry.viewport);
});
