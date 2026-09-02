import { expect, test, type Locator, type Page } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
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

async function visualDifferenceRatio(left: Buffer, right: Buffer) {
  const [first, second] = await Promise.all([
    sharp(left).removeAlpha().resize(250, 300).raw().toBuffer(),
    sharp(right).removeAlpha().resize(250, 300).raw().toBuffer(),
  ]);
  let different = 0;
  for (let index = 0; index < first.length; index += 3) {
    const delta = Math.abs(first[index] - second[index])
      + Math.abs(first[index + 1] - second[index + 1])
      + Math.abs(first[index + 2] - second[index + 2]);
    if (delta > 45) different += 1;
  }
  return different / (first.length / 3);
}

function newMutationId() {
  return randomBytes(32).toString("base64url");
}

async function waitFor3dPreview(dialog: Locator) {
  const canvas = dialog.locator('.package-canvas [aria-label^="Interactive 3D"] canvas');
  await expect(canvas).toBeVisible({ timeout: 15_000 });
  await expect.poll(async () => visualVariationRatio(await canvas.screenshot()), { timeout: 15_000 }).toBeGreaterThan(0.02);
}

function workspaceIdFromUrl(page: Page) {
  const match = new URL(page.url()).pathname.match(/^\/sourcing\/([^/]+)/);
  if (!match) throw new Error(`Expected a sourcing workspace URL, received ${page.url()}`);
  return match[1];
}

function productBriefPath(workspaceId: string) {
  return `/sourcing/${workspaceId}`;
}

function manufacturersPath(workspaceId: string) {
  return `${productBriefPath(workspaceId)}/manufacturers`;
}

function workspaceApiPath(workspaceId: string, suffix = "") {
  return `/api/sourcing/${workspaceId}${suffix}`;
}

async function startProduct(page: Page, idea = "A packaged banana bread mini loaf for individual sale in coffee shops", navigate = true) {
  if (navigate) await page.goto("/sourcing");
  const manualStart = page.locator("details.manual-start");
  const ideaInput = page.getByLabel("What do you want to make?");
  const webMcpAvailable = await page.evaluate(() => Boolean(document.modelContext ?? navigator.modelContext));
  if (webMcpAvailable) await expect(page.getByText("Agent connected", { exact: true })).toBeVisible();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (!(await ideaInput.isVisible())) await manualStart.locator("summary").click();
    try {
      await ideaInput.fill(idea, { timeout: 2_000 });
      break;
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
  const submit = manualStart.locator('button[type="submit"]');
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (!(await submit.isVisible())) await manualStart.locator("summary").click();
    try {
      await submit.click({ timeout: 2_000 });
      break;
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
  await expect(page).toHaveURL(/\/sourcing\/[A-Za-z0-9_-]+$/, { timeout: 20_000 });
  return workspaceIdFromUrl(page);
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

async function installSynchronousWebMcpHarness(page: Page) {
  await page.addInitScript(() => {
    const tools = new Map<string, { execute(input: unknown): Promise<unknown> | unknown }>();
    const context = {
      registerTool(tool: { name: string; execute(input: unknown): Promise<unknown> | unknown }, options?: { signal?: AbortSignal }) {
        tools.set(tool.name, tool);
        options?.signal?.addEventListener("abort", () => tools.delete(tool.name), { once: true });
      },
    };
    Object.defineProperty(Document.prototype, "modelContext", { configurable: true, get: () => context });
    Object.assign(window, { __webMcpTools: tools });
  });
}

async function invokeWebMcp<T>(page: Page, name: string, input: Record<string, unknown>): Promise<T> {
  const toolInput = name === "create_sourcing_workspace" && !input.mutationId
    ? { ...input, mutationId: newMutationId() }
    : input;
  return page.evaluate(async ({ toolName, toolInput }) => {
    const tools = (window as unknown as { __webMcpTools: Map<string, { execute(value: unknown): Promise<unknown> | unknown }> }).__webMcpTools;
    const tool = tools.get(toolName);
    if (!tool) throw new Error(`Missing tool: ${toolName}`);
    return tool.execute(toolInput);
  }, { toolName: name, toolInput }) as Promise<T>;
}

test("keeps the sourcing entry usable when WebMCP registers synchronously", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await installSynchronousWebMcpHarness(page);

  await page.goto("/sourcing");

  await expect(page.getByRole("heading", { name: "Tell your agent what you want to make." })).toBeVisible();
  await expect(page.getByText("Agent connected", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(1);
  expect(pageErrors).toEqual([]);
});

test("workspace creation returns an authoritative idempotent receipt and guest workspaces do not revoke each other", async ({ page }) => {
  await installWebMcpHarness(page);
  const firstMutationId = newMutationId();
  const secondMutationId = newMutationId();
  const firstIdea = "Fictional test workspace for a citrus sparkling drink";

  await page.goto("/sourcing");
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(1);
  const first = await invokeWebMcp<{
    created: boolean;
    receipt: { authoritative: boolean; outcome: string; currentWorkspaceId: string; workspaceUrl: string };
    workspace: { id: string };
  }>(page, "create_sourcing_workspace", { idea: firstIdea, mutationId: firstMutationId });
  expect(first).toMatchObject({
    created: true,
    receipt: {
      authoritative: true,
      outcome: "created",
      currentWorkspaceId: first.workspace.id,
      workspaceUrl: productBriefPath(first.workspace.id),
    },
  });
  await expect(page).toHaveURL(productBriefPath(first.workspace.id));

  await page.goto("/sourcing");
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(1);
  const second = await invokeWebMcp<{
    receipt: { authoritative: boolean; currentWorkspaceId: string };
    workspace: { id: string };
  }>(page, "create_sourcing_workspace", {
    idea: "Fictional second workspace for a shelf-stable chickpea snack",
    mutationId: secondMutationId,
  });
  expect(second.receipt).toMatchObject({ authoritative: true, currentWorkspaceId: second.workspace.id });
  expect(second.workspace.id).not.toBe(first.workspace.id);
  await expect(page).toHaveURL(productBriefPath(second.workspace.id));

  for (const workspaceId of [first.workspace.id, second.workspace.id]) {
    await page.goto(productBriefPath(workspaceId));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(productBriefPath(workspaceId));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }

  await page.goto("/sourcing");
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(1);
  const replay = await invokeWebMcp<{
    created: boolean;
    receipt: { authoritative: boolean; outcome: string; currentWorkspaceId: string };
    workspace: { id: string };
  }>(page, "create_sourcing_workspace", { idea: firstIdea, mutationId: firstMutationId });
  expect(replay).toMatchObject({
    created: false,
    receipt: { authoritative: true, outcome: "replayed", currentWorkspaceId: first.workspace.id },
    workspace: { id: first.workspace.id },
  });
  await expect(page).toHaveURL(productBriefPath(first.workspace.id));
});

test("single sourcing entry creates the agent-led living document", async ({ page }) => {
  await page.goto("/sourcing");
  await expect(page.getByRole("heading", { name: "Tell your agent what you want to make." })).toBeVisible();
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

  const workspaceId = await startProduct(page);
  await expect(page.getByText("First Run · Product brief", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Packaged banana bread mini loaf" })).toBeVisible();
  await expect(page.getByText("Brand name still open").first()).toBeVisible();
  await expect(page.getByText("Product collaborator", { exact: true }).last()).toBeVisible();
  await expect(page.getByRole("heading", { name: /How should one customer buy and eat/ })).toBeVisible();
  const exported = await page.evaluate(async (exportPath) => {
    const response = await fetch(exportPath);
    const bytes = new Uint8Array(await response.arrayBuffer());
    return { contentType: response.headers.get("content-type"), signature: String.fromCharCode(...bytes.slice(0, 4)), byteLength: bytes.byteLength };
  }, workspaceApiPath(workspaceId, "/export"));
  expect(exported).toMatchObject({ contentType: "application/pdf", signature: "%PDF" });
  expect(exported.byteLength).toBeGreaterThan(500);
  await expect(page.getByText("Development workspace")).toHaveCount(0);
  await expect(page.getByText(/local development/i)).toHaveCount(0);
  await expect(page.getByText(/Started from:/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /open ChatGPT/i })).toHaveCount(0);
  await expect(page.locator('a[href*="chatgpt.com"]')).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "A packaged banana bread mini loaf for individual sale in coffee shops" })).toHaveCount(0);
});

test("the collaborator drives one decision and keeps uncertainty open", async ({ page }) => {
  const workspaceId = await startProduct(page);
  await page.getByPlaceholder(/Answer naturally/).fill("Mini loaf");
  await page.getByRole("button", { name: "Add to brief" }).click();
  await expect(page.getByText(/I added product format to the brief/)).toBeVisible();
  await expect(page.getByRole("heading", { name: /shelf-stable, refrigerated, or frozen/ })).toBeVisible();
  await page.getByPlaceholder(/Answer naturally/).fill("I'm not sure");
  await page.getByRole("button", { name: "Add to brief" }).click();
  await expect(page.getByText(/That can stay open/)).toBeVisible();
  const openStorage = await page.evaluate(async (apiPath) => fetch(apiPath).then((response) => response.json()), workspaceApiPath(workspaceId)) as { workspace: { fields: { storage_distribution: { status: string; value: string | null } } } };
  expect(openStorage.workspace.fields.storage_distribution).toMatchObject({ status: "needs_decision", value: "I'm not sure" });
});

test("brand identity updates the document without duplicating the product identity", async ({ page }) => {
  const originalIdea = "I want to make a packaged sauce that is really spicy and sell it in grocery stores.";
  const workspaceId = await startProduct(page, originalIdea);
  await expect(page.getByRole("heading", { level: 1, name: "Packaged sauce" })).toBeVisible();
  await page.getByRole("button", { name: "Add brand name" }).click();
  await page.getByRole("textbox", { name: "Brand name" }).fill("Fireline Foods");
  await page.getByRole("button", { name: "Save brand" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Fireline Foods" })).toBeVisible();
  await expect(page.locator(".document-identity").getByText("Packaged sauce", { exact: true })).toBeVisible();
  await expect(page.locator(".product-anchor")).toHaveCount(0);
  await expect(page.locator(".document-identity").getByText("Fireline Foods", { exact: true })).toHaveCount(1);
  await expect(page.locator(".document-identity").getByText("Packaged sauce", { exact: true })).toHaveCount(1);

  await page.getByRole("button", { name: "Edit brand name: Fireline Foods" }).click();
  await page.getByRole("textbox", { name: "Brand name" }).fill("Fireline Kitchen");
  await page.getByRole("button", { name: "Save brand" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Fireline Kitchen" })).toBeVisible();

  const stored = await page.evaluate(async (apiPath) => fetch(apiPath).then((response) => response.json()), workspaceApiPath(workspaceId)) as { workspace: { originalIdea: string; fields: { brand_name: { value: string }; product_type: { value: string } } } };
  expect(stored.workspace.originalIdea).toBe(originalIdea);
  expect(stored.workspace.fields.brand_name.value).toBe("Fireline Kitchen");
  expect(stored.workspace.fields.product_type.value).toBe("Packaged sauce");
});

test("the focused package workbench includes the bakery model, exact copy, and a real viewing window", async ({ page }) => {
  const workspaceId = await startProduct(page);
  await page.getByRole("button", { name: "Open 3D workbench" }).click();
  const dialog = page.getByRole("dialog", { name: "Make the package direction tangible." });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Bakery bag + window" })).toBeVisible();
  await dialog.getByRole("button", { name: "More package types (4)" }).click();
  for (const label of ["Slim Can", "Bottle", "Jar", "Bag / pouch"]) {
    await expect(dialog.getByRole("button", { name: label })).toBeVisible();
  }
  await dialog.getByRole("button", { name: "Bakery bag + window" }).click();
  await dialog.getByRole("textbox", { name: "Brand text" }).fill("Mya's");
  await dialog.getByRole("textbox", { name: "Product text" }).fill("Banana Bread");
  await dialog.getByLabel("Window size").fill("0.5");
  await dialog.getByLabel("Front copy size").fill("1.08");
  await waitFor3dPreview(dialog);
  await dialog.getByRole("button", { name: "Use this package direction" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Kraft-style bakery bag · dimensions still open").first()).toBeVisible();
  const savedPackage = await page.evaluate(async (apiPath) => fetch(apiPath).then((response) => response.json()), workspaceApiPath(workspaceId)) as { workspace: { packageDesign: { previewAssetId: string | null; frontText: { brand: string; product: string }; windowScale: number } } };
  expect(savedPackage.workspace.packageDesign).toMatchObject({
    previewAssetId: expect.stringMatching(/^[0-9a-f-]{36}$/i),
    frontText: { brand: "Mya's", product: "Banana Bread" },
    windowScale: 0.5,
  });
  const exportedWithPackage = await page.evaluate(async (exportPath) => {
    const response = await fetch(exportPath);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const marker = new TextEncoder().encode("/Subtype /Image");
    const includesImage = bytes.some((_, index) => marker.every((value, offset) => bytes[index + offset] === value));
    return { byteLength: bytes.byteLength, includesImage };
  }, workspaceApiPath(workspaceId, "/export"));
  expect(exportedWithPackage.byteLength).toBeGreaterThan(20_000);
  expect(exportedWithPackage.includesImage).toBe(true);
  const preview = page.locator(".package-direction-preview");
  await expect(preview).toHaveAttribute("data-packaging-type", "bakery-bag");
  await expect(preview).toHaveAttribute("data-base-color", "#b98a5f");
  await expect(preview).toHaveAttribute("data-artwork-state", "none");
  await expect(page.getByText(/clear viewing window · front copy set for Mya's/i)).toBeVisible();
  const previewCanvas = preview.locator("canvas");
  await expect(previewCanvas).toBeVisible({ timeout: 15_000 });
  await expect.poll(async () => previewCanvas.evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    return canvas.width / canvas.getBoundingClientRect().width;
  }), { timeout: 15_000 }).toBeGreaterThanOrEqual(1.45);
  await expect.poll(async () => previewCanvas.evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    return canvas.height / canvas.getBoundingClientRect().height;
  }), { timeout: 15_000 }).toBeGreaterThanOrEqual(1.45);
  await expect.poll(async () => visualVariationRatio(await previewCanvas.screenshot()), { timeout: 15_000 }).toBeGreaterThan(0.05);
  await expect(page.locator(".package-glyph")).toHaveCount(0);
  await page.getByRole("button", { name: "Refine saved package direction in 3D" }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Bakery bag + window" })).toHaveClass(/selected/);
  await expect(dialog.getByLabel("Package color")).toHaveValue("#b98a5f");
  await expect(dialog.getByRole("textbox", { name: "Brand text" })).toHaveValue("Mya's");
  await expect(dialog.getByRole("textbox", { name: "Product text" })).toHaveValue("Banana Bread");
  await expect(dialog.getByLabel("Window size")).toHaveValue("0.5");
  await expect(dialog.getByLabel("Front copy size")).toHaveValue("1.08");
});

test("landing and workspace WebMCP tools share canonical state and expose no send action", async ({ page }) => {
  await installWebMcpHarness(page);
  await page.goto("/sourcing");
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(1);
  expect(await page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.has("create_sourcing_workspace"))).toBe(true);
  const workspaceId = await startProduct(page, "A sparkling beverage in slim cans", false);
  const invoke = async (name: string, input: Record<string, unknown>) => page.evaluate(async ({ name, input }) => {
    const tools = (window as unknown as { __webMcpTools: Map<string, { execute(value: unknown): Promise<unknown> | unknown }> }).__webMcpTools;
    const tool = tools.get(name);
    if (!tool) throw new Error(`Missing tool: ${name}`);
    return tool.execute(input);
  }, { name, input });

  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(13);
  const workspaceNavigation = page.getByRole("navigation", { name: "Product workspace" });
  await expect(workspaceNavigation.getByRole("link", { name: "Product brief" })).toHaveAttribute("aria-current", "page");
  await expect(workspaceNavigation.getByRole("link", { name: "Manufacturers" })).not.toHaveAttribute("aria-current");
  const current = await invoke("get_sourcing_workspace", {}) as { workspace: { originalIdea: string; fields?: unknown }; canonicalPlan?: unknown; product: { brandName: string | null; descriptor: string }; stage: { percent?: number }; creative: { status: string; nextQuestion: { key: string } | null; workflow: string[] }; availableActions: string[]; outreach: { externalContactRequiresFounderAction: boolean; agentSendAvailable: boolean } };
  expect(current.workspace.originalIdea).toBe("A sparkling beverage in slim cans");
  expect(current.canonicalPlan).toBeUndefined();
  expect(current.workspace.fields).toBeUndefined();
  expect(current.stage.percent).toBeUndefined();
  expect(current.product).toMatchObject({ brandName: null, descriptor: "Sparkling beverage" });
  expect(current.creative).toMatchObject({ status: "waiting_for_package_direction", nextQuestion: null });
  expect(current.creative.workflow).toContain("generate_package_artwork");
  expect(current.availableActions).not.toContain("generate_package_artwork");
  expect(current.availableActions).not.toContain("stage_package_artwork");
  expect(current.availableActions).toContain("audit_outreach_readiness");
  expect(current.outreach).toMatchObject({ externalContactRequiresFounderAction: true, agentSendAvailable: false });
  const preview = await invoke("preview_package_design", { packagingType: "bottle", baseColor: "#f2e8d5", labelColor: "#b64d2c" }) as { committed: boolean; previewOpened: boolean };
  expect(preview).toMatchObject({ committed: false, previewOpened: true });
  await expect(page.getByRole("dialog", { name: "Review what your agent changed." })).toBeVisible();
  expect((await invoke("get_package_design", {}) as { packaging: { direction: unknown } }).packaging.direction).toBeNull();
  await page.getByRole("button", { name: "Close packaging workbench" }).click();

  const refinement = await invoke("refine_package_design_in_3d", {
    explicitlyStated: true,
    packageDesign: {
      packagingType: "bottle",
      finish: "colored",
      baseColor: "#173f35",
      labelColor: "#f2e8d5",
      artworkId: null,
      logoAspect: 1,
      logoScale: 1,
      logoPosition: { x: 0, y: 0 },
      dimensions: { width: null, height: null, depth: null },
      summary: "Bottle · dimensions still open",
    },
  }) as { committed: boolean; previewOpened: boolean };
  expect(refinement).toMatchObject({ committed: false, previewOpened: true });
  await expect(page.getByRole("dialog", { name: "Review what your agent changed." })).toBeVisible();
  await expect(page.getByText("Agent preview · live in 3D")).toBeVisible();
  expect((await invoke("get_package_design", {}) as { packaging: { direction: unknown } }).packaging.direction).toBeNull();
  await page.getByRole("button", { name: "Close packaging workbench" }).click();

  const artworkBase64 = readFileSync(path.join(process.cwd(), "public/brand/line-list-mark.png")).toString("base64");
  const artwork = await invoke("stage_package_artwork", { fileName: "agent-generated-mark.png", contentType: "image/png", base64Data: artworkBase64 }) as { committed: boolean; previewOpened: boolean; product: { artwork: { fileName: string } } };
  expect(artwork).toMatchObject({ committed: false, previewOpened: true, product: { artwork: { fileName: "agent-generated-mark.png" } } });
  expect((await invoke("get_package_design", {}) as { packaging: { direction: unknown } }).packaging.direction).toBeNull();
  await page.getByRole("button", { name: "Close packaging workbench" }).click();
  await invoke("update_sourcing_workspace", { proposedUpdates: [
    { key: "product_type", value: "Sparkling beverage", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
    { key: "packaging_format", value: "Slim can", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
  ] });
  await expect(page.getByText("Sparkling beverage", { exact: true }).first()).toBeVisible();
  await expect(page.locator(".agent-change-review")).toContainText("Latest agent update · 2 changes");
  const matched = await invoke("match_manufacturers", { resultLimit: 2 }) as { manufacturerCandidates: Array<{ manufacturerSlug: string }>; outreach: { selectedManufacturerSlugs: string[]; drafts: unknown[] }; resultCount: number; resultsShown: boolean };
  expect(matched.outreach.selectedManufacturerSlugs).toEqual([]);
  expect(matched.outreach.drafts).toEqual([]);
  expect(matched).toMatchObject({ resultCount: matched.manufacturerCandidates.length, resultsShown: true });
  await expect(page).toHaveURL(manufacturersPath(workspaceId));
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(13);
  await expect(page.getByRole("dialog", { name: "Review what your agent changed." })).toHaveCount(0);
  await expect(workspaceNavigation.getByRole("link", { name: "Manufacturers" })).toHaveAttribute("aria-current", "page");
  await expect(workspaceNavigation.getByRole("link", { name: "Product brief" })).not.toHaveAttribute("aria-current");
  const resultsHeading = page.locator("#manufacturer-possibilities-heading");
  await expect(page.getByRole("heading", { level: 1, name: "Manufacturer possibilities" })).toHaveCount(1);
  await expect(resultsHeading).toHaveRole("heading");
  await expect(resultsHeading).toBeVisible();
  await expect(resultsHeading).toBeFocused();
  await expect(page.getByRole("list", { name: "Introduction approval steps" })).toContainText("Agent prepares drafts");
  await expect(page.getByRole("list", { name: "Introduction approval steps" })).toContainText("You review and approve");
  await expect(page.getByRole("list", { name: "Introduction approval steps" })).toContainText("You confirm Send now");
  await expect(page.getByText(/Finish 0 manufacturer-brief decisions/)).toHaveCount(0);
  expect(await resultsHeading.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("none");
  expect(await resultsHeading.evaluate((element) => getComputedStyle(element).boxShadow)).toBe("none");
  await expect(page.locator(".sourcing-manufacturers-view")).not.toHaveAttribute("tabindex");
  const focusedResults = await resultsHeading.boundingBox();
  expect(focusedResults?.y).toBeGreaterThanOrEqual(0);
  expect(focusedResults?.y).toBeLessThan(240);
  const guardedDraft = await page.evaluate(async (manufacturerSlug) => {
    const tools = (window as unknown as { __webMcpTools: Map<string, { execute(value: unknown): Promise<unknown> | unknown }> }).__webMcpTools;
    try {
      await tools.get("prepare_manufacturer_outreach")!.execute({ selectedManufacturerIds: [manufacturerSlug] });
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  }, matched.manufacturerCandidates[0].manufacturerSlug);
  expect(guardedDraft).toContain("founder must select");
  const routeBeforePackagePreview = page.url();
  await invoke("preview_package_design", { baseColor: "#f2e8d5" });
  await expect(page).toHaveURL(routeBeforePackagePreview);
  await expect(page.getByRole("dialog", { name: "Review what your agent changed." })).toBeVisible();
  await page.getByRole("button", { name: "Close packaging workbench" }).click();
  const hasSendTool = await page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.has("send_manufacturer_inquiry"));
  expect(hasSendTool).toBe(false);
  for (const tool of ["get_package_design", "preview_package_design", "generate_package_artwork", "stage_package_artwork", "refine_package_design_in_3d", "undo_last_agent_change", "export_product_packet", "audit_outreach_readiness"]) {
    expect(await page.evaluate((name) => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.has(name), tool)).toBe(true);
  }
});

test("artwork generation preserves an explicitly staged slim can, honors motifs, and survives save, navigation, and reload", async ({ page }) => {
  await installWebMcpHarness(page);
  await page.goto("/sourcing");
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(1);
  const created = await invokeWebMcp<{
    receipt: { authoritative: boolean; currentWorkspaceId: string };
    workspace: { id: string };
  }>(page, "create_sourcing_workspace", {
    mutationId: newMutationId(),
    idea: "Fictional Bright Current carbonated citrus drink in a 12 oz slim can",
    initialUpdates: [
      { key: "brand_name", value: "Bright Current", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "product_category", value: "Beverage", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "product_type", value: "Carbonated citrus drink", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "product_format", value: "Ready-to-drink liquid", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "packaging_format", value: "12 oz slim can", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "packaging_size", value: "12 oz", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "carbonation", value: "Carbonated", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
    ],
  });
  expect(created.receipt).toMatchObject({ authoritative: true, currentWorkspaceId: created.workspace.id });
  await expect(page).toHaveURL(productBriefPath(created.workspace.id));
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(13);

  const staged = await invokeWebMcp<{
    committed: boolean;
    preview: { packagingType: string; finish: string; baseColor: string; dimensions: { width: number; height: number; depth: number } };
  }>(page, "refine_package_design_in_3d", {
    explicitlyStated: true,
    packageDesign: {
      packagingType: "slim-can",
      finish: "colored",
      baseColor: "#25b7b8",
      labelColor: "#f2e8d5",
      artworkId: null,
      logoAspect: 1,
      logoScale: 0.9,
      logoPosition: { x: 0.08, y: -0.06 },
      dimensions: { width: 2.25, height: 6.2, depth: 2.25 },
      summary: "Slim can · 2.25 × 6.2 × 2.25 working dimensions",
    },
  });
  expect(staged).toMatchObject({
    committed: false,
    preview: {
      packagingType: "slim-can",
      finish: "colored",
      baseColor: "#25b7b8",
      dimensions: { width: 2.25, height: 6.2, depth: 2.25 },
    },
  });
  const dialog = page.getByRole("dialog", { name: "Review what your agent changed." });
  await expect(dialog).toBeVisible();
  await waitFor3dPreview(dialog);
  await expect(dialog.getByText(/aluminum specification/i)).toBeVisible();
  await expect(dialog.getByText(/kraft-style surface|window construction/i)).toHaveCount(0);
  await expect(dialog.getByText(/WebGL support/i)).toHaveCount(0);

  const firstArtwork = await invokeWebMcp<{
    artworkUrl: string;
    renderedMotifs: string[];
    visualSignature: string;
    receipt: { authoritative: boolean; currentWorkspaceId: string };
    preview: { packagingType: string; finish: string; baseColor: string; dimensions: { width: number; height: number; depth: number } };
    product: { brandName: string; descriptor: string };
  }>(page, "generate_package_artwork", {
    artDirection: "A bold citrus wheel, sparkling bubbles, and angular lightning arcs",
    style: "modern-premium",
    accentColor: "#f3a51f",
    founderApproved: true,
  });
  expect(firstArtwork).toMatchObject({
    renderedMotifs: ["citrus", "bubbles", "lightning"],
    receipt: { authoritative: true, currentWorkspaceId: created.workspace.id },
    preview: {
      packagingType: "slim-can",
      finish: "colored",
      baseColor: "#25b7b8",
      dimensions: { width: 2.25, height: 6.2, depth: 2.25 },
    },
    product: { brandName: "Bright Current", descriptor: "Carbonated citrus drink" },
  });
  const firstBytes = Buffer.from(await page.evaluate(async (url) => {
    const bytes = new Uint8Array(await fetch(url).then((response) => response.arrayBuffer()) as ArrayBuffer);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }, firstArtwork.artworkUrl), "base64");

  const refinedArtwork = await invokeWebMcp<{
    artworkUrl: string;
    renderedMotifs: string[];
    visualSignature: string;
    preview: { packagingType: string; finish: string; baseColor: string; dimensions: { width: number; height: number; depth: number } };
  }>(page, "generate_package_artwork", {
    artDirection: "Make the lightning dramatically larger and diagonal, move the citrus wheel left, and keep sparkling bubbles around it",
    style: "modern-premium",
    accentColor: "#f3a51f",
    founderApproved: true,
  });
  expect(refinedArtwork.visualSignature).not.toBe(firstArtwork.visualSignature);
  expect(refinedArtwork).toMatchObject({
    renderedMotifs: ["citrus", "bubbles", "lightning"],
    preview: {
      packagingType: "slim-can",
      finish: "colored",
      baseColor: "#25b7b8",
      dimensions: { width: 2.25, height: 6.2, depth: 2.25 },
    },
  });
  const refinedBytes = Buffer.from(await page.evaluate(async (url) => {
    const bytes = new Uint8Array(await fetch(url).then((response) => response.arrayBuffer()) as ArrayBuffer);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }, refinedArtwork.artworkUrl), "base64");
  expect(await visualDifferenceRatio(firstBytes, refinedBytes)).toBeGreaterThan(0.03);

  await waitFor3dPreview(dialog);
  await dialog.getByRole("button", { name: "Use this package direction" }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "Refine saved package direction in 3D" })).toHaveAttribute("data-packaging-type", "slim-can");
  await expect(page.getByText("Slim can · 2.25 × 6.2 × 2.25 working dimensions").first()).toBeVisible();
  await page.getByRole("navigation", { name: "Product workspace" }).getByRole("link", { name: "Manufacturers" }).click();
  await expect(page).toHaveURL(manufacturersPath(created.workspace.id));
  await page.reload();
  await expect(page).toHaveURL(manufacturersPath(created.workspace.id));
  await page.getByRole("navigation", { name: "Product workspace" }).getByRole("link", { name: "Product brief" }).click();
  await expect(page.getByRole("button", { name: "Refine saved package direction in 3D" })).toHaveAttribute("data-packaging-type", "slim-can");
});

test("WebMCP-only acceptance keeps categories coherent, rejects unsupported geography without mutation, and preserves human gates", async ({ page }) => {
  await installWebMcpHarness(page);
  const categoryCases = [
    { label: "Baked good", product: "Banana bread mini loaf", category: "bakery", firstPackage: "flow-wrap" },
    { label: "Packaged bakery / quick bread", product: "Wrapped blueberry loaf", category: "bakery", firstPackage: "flow-wrap" },
    { label: "Beverage", product: "Sparkling citrus beverage", category: "beverage", firstPackage: "standard-can" },
    { label: "Sauce / condiment", product: "Chili lime hot sauce", category: "sauce", firstPackage: "glass-sauce-bottle" },
    { label: "Snack", product: "Crunchy chickpea snack", category: "snack", firstPackage: "flow-wrap-bar" },
    { label: "Frozen food", product: "Frozen vegetable grain bowl", category: "frozen", firstPackage: "frozen-bag" },
    { label: "Food", product: "Prepared grain meal", category: "food", firstPackage: "pouch" },
  ] as const;

  for (const testCase of categoryCases) {
    await page.goto("/sourcing");
    await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(1);
    const created = await invokeWebMcp<{
      workspace: { id: string };
      product: { category: string };
      packaging: { options: Array<{ id: string }> };
    }>(page, "create_sourcing_workspace", {
      idea: `I want to make ${testCase.product}`,
      initialUpdates: [
        { key: "product_category", value: testCase.label, status: "confirmed", explicitlyStated: true, suggestedSharing: true },
        { key: "product_type", value: testCase.product, status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      ],
    });
    await expect(page).toHaveURL(productBriefPath(created.workspace.id));
    expect(created.product.category, testCase.label).toBe(testCase.category);
    expect(created.packaging.options[0]?.id, testCase.label).toBe(testCase.firstPackage);
  }

  await page.goto("/sourcing");
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(1);
  const unfamiliar = await invokeWebMcp<{
    workspace: { id: string };
    product: { category: string };
    packaging: { options: Array<{ id: string }> };
  }>(page, "create_sourcing_workspace", {
    idea: "A banana bread concept for grocery shelves",
    initialUpdates: [
      { key: "product_category", value: "Emerging CPG concept", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "product_type", value: "Banana bread", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
    ],
  });
  await expect(page).toHaveURL(productBriefPath(unfamiliar.workspace.id));
  expect(unfamiliar.product.category).toBe("bakery");
  expect(unfamiliar.packaging.options[0]?.id).toBe("flow-wrap");

  await page.goto("/sourcing");
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(1);
  const snack = await invokeWebMcp<{ workspace: { id: string; revision: number } }>(page, "create_sourcing_workspace", {
    idea: "A honey chili crunchy chickpea snack in a pouch",
    initialUpdates: [
      { key: "brand_name", value: "Bright Bite", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "product_category", value: "Snack", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "product_type", value: "Honey chili crunchy chickpea snack", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "product_format", value: "Single-serve crunchy snack", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "packaging_format", value: "Stand-up pouch", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
    ],
  });
  await expect(page).toHaveURL(productBriefPath(snack.workspace.id));
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(13);

  const before = await invokeWebMcp<{ workspace: { revision: number }; manufacturerCandidates: unknown[] }>(page, "get_sourcing_workspace", {});
  const routeBefore = page.url();
  const rejected = await invokeWebMcp<{
    matchingAttempted: boolean;
    resultsShown: boolean;
    matchingGuidance: { geographyInputNeedsClarification: boolean };
  }>(page, "match_manufacturers", { geographyPreference: "Upper Lakes corridor", resultLimit: 3 });
  expect(rejected).toMatchObject({ matchingAttempted: false, resultsShown: false, matchingGuidance: { geographyInputNeedsClarification: true } });
  await expect(page).toHaveURL(routeBefore);
  const afterRejected = await invokeWebMcp<{ workspace: { revision: number }; manufacturerCandidates: unknown[] }>(page, "get_sourcing_workspace", {});
  expect(afterRejected.workspace.revision).toBe(before.workspace.revision);
  expect(afterRejected.manufacturerCandidates).toEqual(before.manufacturerCandidates);

  const zeroResult = await invokeWebMcp<{
    resultCount: number;
    resultsShown: boolean;
    manufacturerCandidates: unknown[];
  }>(page, "match_manufacturers", { requiredRequirements: ["product_type"], resultLimit: 3 });
  expect(zeroResult).toMatchObject({ resultCount: 0, resultsShown: true, manufacturerCandidates: [] });
  await expect(page).toHaveURL(manufacturersPath(snack.workspace.id));
  await expect(page.getByRole("heading", { name: "No evidence-backed possibilities yet" })).toBeVisible();
  await expect(page.getByText("We did not add weaker manufacturers just to fill the list.")).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(manufacturersPath(snack.workspace.id));
  await expect(page.getByRole("heading", { name: "No evidence-backed possibilities yet" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(13);

  const auditBeforeArtwork = await invokeWebMcp<{
    candidateCount: number;
    selectionCount: number;
    matchingCurrent: boolean;
    externalContactRequiresFounderAction: boolean;
    agentApprovalAvailable: boolean;
    agentSendAvailable: boolean;
    gates: Array<{ owner: string; step: string; status: string }>;
  }>(page, "audit_outreach_readiness", {});
  expect(auditBeforeArtwork).toMatchObject({
    candidateCount: 0,
    selectionCount: 0,
    matchingCurrent: true,
    externalContactRequiresFounderAction: true,
    agentApprovalAvailable: false,
    agentSendAvailable: false,
  });
  expect(auditBeforeArtwork.gates).toContainEqual(expect.objectContaining({ owner: "founder", step: "select_manufacturers", status: "blocked" }));
  expect(auditBeforeArtwork.gates).toContainEqual(expect.objectContaining({ owner: "founder", step: "confirm_send_now" }));

  const artwork = await invokeWebMcp<{
    artworkUrl: string;
    committed: boolean;
    previewOpened: boolean;
    preview: { packagingType: string; artworkId: string; logoScale: number; logoPosition: { x: number; y: number } };
  }>(page, "generate_package_artwork", {
    artDirection: "Warm handmade retail label with chickpea, honey, and chili ingredient motifs",
    style: "warm-handmade",
    founderApproved: true,
  });
  expect(artwork).toMatchObject({
    committed: false,
    previewOpened: true,
    preview: { packagingType: "stand-up-pouch", artworkId: expect.any(String), logoPosition: { x: 0, y: 0 } },
  });
  expect(artwork.preview.logoScale).toBeGreaterThanOrEqual(0.8);
  await expect(page.getByRole("dialog", { name: "Review what your agent changed." })).toBeVisible();
  const encodedArtwork = await page.evaluate(async (url) => {
    const response = await fetch(url);
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return { contentType: response.headers.get("content-type"), base64: btoa(binary) };
  }, artwork.artworkUrl);
  expect(encodedArtwork.contentType).toBe("image/png");
  const artworkBuffer = Buffer.from(encodedArtwork.base64, "base64");
  const artworkMetadata = await sharp(artworkBuffer).metadata();
  expect(artworkMetadata).toMatchObject({ width: 1000, height: 1200 });
  expect(await visualVariationRatio(artworkBuffer)).toBeGreaterThan(0.12);
  const packageState = await invokeWebMcp<{ packaging: { saved: boolean; direction: unknown } }>(page, "get_package_design", {});
  expect(packageState.packaging).toMatchObject({ saved: false, direction: null });

  const toolNames = await page.evaluate(() => [...(window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.keys()]);
  expect(toolNames.filter((name) => /(?:^|_)(?:select|approve|send)(?:_|$)/.test(name))).toEqual([]);
});

test("WebMCP-only broadened discovery visibly returns evidence-backed possibilities and persists them", async ({ page }) => {
  await installWebMcpHarness(page);
  await page.goto("/sourcing");
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(1);
  const created = await invokeWebMcp<{ workspace: { id: string } }>(page, "create_sourcing_workspace", {
    mutationId: newMutationId(),
    idea: "Fictional packaged shelf-stable snack food in a pouch",
    initialUpdates: [
      { key: "brand_name", value: "Broad Horizon", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "product_category", value: "Snack", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "product_type", value: "Snack foods", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "product_format", value: "Packaged shelf-stable snack", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "packaging_format", value: "Stand-up pouch", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "certifications", value: "Fictional Moon-certified facility required", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
    ],
  });
  await expect(page).toHaveURL(productBriefPath(created.workspace.id));
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(13);

  const strict = await invokeWebMcp<{
    resultCount: number;
    matchingGuidance: { strictSearchReturnedNoResults: boolean; suggestedRetry: Record<string, unknown> };
  }>(page, "match_manufacturers", { requiredRequirements: ["certifications"], resultLimit: 3 });
  expect(strict).toMatchObject({ resultCount: 0, matchingGuidance: { strictSearchReturnedNoResults: true } });
  await expect(page.getByRole("heading", { name: "No evidence-backed possibilities yet" })).toBeVisible();

  const broadened = await invokeWebMcp<{
    resultCount: number;
    matchingGuidance: { strictSearchReturnedNoResults: boolean };
    manufacturerCandidates: Array<{ manufacturerSlug: string }>;
    outreach: { selectedManufacturerSlugs: string[]; drafts: unknown[] };
    receipt: { authoritative: boolean; currentWorkspaceId: string };
  }>(page, "match_manufacturers", strict.matchingGuidance.suggestedRetry);
  expect(broadened.resultCount).toBeGreaterThan(0);
  expect(broadened.resultCount).toBe(broadened.manufacturerCandidates.length);
  expect(broadened.matchingGuidance.strictSearchReturnedNoResults).toBe(false);
  expect(broadened.outreach).toMatchObject({ selectedManufacturerSlugs: [], drafts: [] });
  expect(broadened.receipt).toMatchObject({ authoritative: true, currentWorkspaceId: created.workspace.id });
  await expect(page.getByRole("heading", { level: 1, name: "Manufacturer possibilities" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^View details for / }).first()).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(manufacturersPath(created.workspace.id));
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(13);
  const persisted = await invokeWebMcp<{ manufacturerCandidates: unknown[]; outreach: { selectedManufacturerSlugs: string[]; drafts: unknown[] } }>(page, "get_sourcing_workspace", {});
  expect(persisted.manufacturerCandidates).toHaveLength(broadened.resultCount);
  expect(persisted.outreach).toMatchObject({ selectedManufacturerSlugs: [], drafts: [] });
});

test("product brief and manufacturers are separate history-safe views", async ({ page }) => {
  await installWebMcpHarness(page);
  const workspaceId = await startProduct(page);
  const workspaceNavigation = page.getByRole("navigation", { name: "Product workspace" });

  await expect(page).toHaveURL(productBriefPath(workspaceId));
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(workspaceNavigation.getByRole("link", { name: "Product brief" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Manufacturer possibilities" })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(13);

  await page.getByPlaceholder(/Answer naturally/).fill("Mini loaf");
  await page.getByRole("button", { name: "Add to brief" }).click();
  await expect(page.getByRole("button", { name: "Research manufacturers now" })).toBeVisible();
  await page.getByRole("button", { name: "Research manufacturers now" }).click();
  await expect(page).toHaveURL(manufacturersPath(workspaceId));
  await expect(page.getByRole("heading", { level: 1, name: "Manufacturer possibilities" })).toHaveCount(1);
  await expect(workspaceNavigation.getByRole("link", { name: "Manufacturers" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("region", { name: "Manufacturer possibilities" })).toBeVisible();

  const firstChoice = page.getByRole("button", { name: /^View details for / }).first();
  const firstName = (await firstChoice.getAttribute("aria-label"))!.replace("View details for ", "");
  const selectFirst = page.getByRole("button", { name: `Select ${firstName}`, exact: true });
  await expect(selectFirst).toHaveAttribute("aria-pressed", "false");
  await selectFirst.click();
  await expect(page.getByRole("button", { name: `Remove ${firstName} from selected manufacturers`, exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("status").filter({ hasText: "1 selected" })).toBeVisible();

  await workspaceNavigation.getByRole("link", { name: "Product brief" }).click();
  await expect(page).toHaveURL(productBriefPath(workspaceId));
  await expect(workspaceNavigation.getByRole("link", { name: "Product brief" })).toHaveAttribute("aria-current", "page");
  await page.goBack();
  await expect(page).toHaveURL(manufacturersPath(workspaceId));
  await expect(page.getByRole("button", { name: `Remove ${firstName} from selected manufacturers`, exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByRole("status").filter({ hasText: "1 selected" })).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(productBriefPath(workspaceId));
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(13);
});

test("multiple manufacturers receive separate reviewable drafts", async ({ page }) => {
  const workspaceId = await startProduct(page, "A healthier sparkling energy drink in 12 oz cans");
  await page.evaluate(async (apiPath) => {
    const current = await fetch(apiPath).then((response) => response.json());
    await fetch(apiPath, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revision: current.workspace.revision, proposedUpdates: [
        { key: "brand_name", value: "Fresh Energy", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
        { key: "product_type", value: "Sparkling energy drink", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
        { key: "product_description", value: "A shelf-stable sparkling energy drink in a single-serve 12 oz slim can; final commercial formulation and production validation remain with qualified partners.", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
        { key: "product_format", value: "12 oz drink", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
        { key: "packaging_format", value: "12 oz slim can", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
        { key: "packaging_size", value: "12 oz", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
        { key: "storage_distribution", value: "Shelf stable", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
        { key: "production_volume", value: "1,000 to 5,000 units", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
        { key: "formula_status", value: "Tested recipe", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
        { key: "carbonation", value: "Carbonated", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
        { key: "contact_email", value: "founder@example.com", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      ] }),
    });
  }, workspaceApiPath(workspaceId));
  await page.reload();
  await expect(page.getByRole("button", { name: "Refine packaging in 3D" })).toBeVisible();
  await page.getByRole("button", { name: "Refine packaging in 3D" }).click();
  const packageDialog = page.getByRole("dialog", { name: "Make the package direction tangible." });
  await expect(packageDialog).toBeVisible();
  await waitFor3dPreview(packageDialog);
  await packageDialog.getByRole("button", { name: "Use this package direction" }).click();
  await expect(page.getByRole("button", { name: "Find evidence-backed manufacturers" })).toBeVisible();
  await page.getByRole("button", { name: "Find evidence-backed manufacturers" }).click();
  await expect(page).toHaveURL(manufacturersPath(workspaceId));
  const manufacturerChoices = page.getByRole("button", { name: /^View details for / });
  await expect(manufacturerChoices.first()).toBeVisible();
  const count = await manufacturerChoices.count();
  expect(count).toBeGreaterThanOrEqual(2);
  const firstName = (await manufacturerChoices.nth(0).getAttribute("aria-label"))!.replace("View details for ", "");
  const secondName = (await manufacturerChoices.nth(1).getAttribute("aria-label"))!.replace("View details for ", "");
  await page.getByRole("button", { name: `Select ${firstName}`, exact: true }).click();
  await manufacturerChoices.nth(1).click();
  await page.getByRole("button", { name: `Select ${secondName}`, exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "2 selected" })).toBeVisible();
  await page.getByRole("button", { name: "Prepare 2 introductions" }).click();
  await expect(page.locator(".introduction-card")).toHaveCount(2);
  await expect(page.getByText("Draft · not sent", { exact: true })).toHaveCount(2);
  const firstDraft = page.locator(".introduction-card").first();
  await firstDraft.getByRole("button", { name: "Approve this introduction" }).click();
  await expect(firstDraft.getByRole("button", { name: "Send introduction" })).toBeVisible();
  await firstDraft.getByRole("button", { name: "Send introduction" }).click();
  await expect(firstDraft.getByRole("button", { name: "Send now" })).toBeVisible();
  await expect(firstDraft.getByText(/This will email .* now/)).toBeVisible();
});

test("mobile keeps both workspace views inside the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const workspaceId = await startProduct(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const briefGeometry = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }));
  expect(briefGeometry.document).toBeLessThanOrEqual(briefGeometry.viewport);

  await page.getByPlaceholder(/Answer naturally/).fill("Mini loaf");
  await page.getByRole("button", { name: "Add to brief" }).click();
  await expect(page.getByRole("button", { name: "Research manufacturers now" })).toBeVisible();
  await page.getByRole("button", { name: "Research manufacturers now" }).click();
  await expect(page).toHaveURL(manufacturersPath(workspaceId));
  await expect(page.getByRole("navigation", { name: "Product workspace" }).getByRole("link", { name: "Manufacturers" })).toHaveAttribute("aria-current", "page");
  const manufacturerGeometry = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }));
  expect(manufacturerGeometry.document).toBeLessThanOrEqual(manufacturerGeometry.viewport);

  await page.getByRole("button", { name: /^View details for / }).first().click();
  await expect(page.getByRole("button", { name: "All possibilities" })).toBeVisible();
  const detailGeometry = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }));
  expect(detailGeometry.document).toBeLessThanOrEqual(detailGeometry.viewport);
});
