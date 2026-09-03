import { expect, test, type Locator, type Page } from "@playwright/test";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { decodePDFRawStream, PDFArray, PDFDocument, PDFRawStream } from "pdf-lib";
import { packageDesignHash } from "../../lib/sourcing/workspace";

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

async function extractPdfPageText(bytes: Buffer): Promise<string[]> {
  const document = await PDFDocument.load(bytes);
  return document.getPages().map((page) => {
    const contents = page.node.Contents();
    const refs = contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : [];
    const operators = refs.map((ref) => {
      const stream = document.context.lookup(ref) as PDFRawStream;
      return Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1");
    }).join("\n");
    return [...operators.matchAll(/<([0-9A-F]+)>\s*Tj/gi)]
      .map((match) => Buffer.from(match[1], "hex").toString("latin1"))
      .join("\n");
  });
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

test("PDF export keeps each sourcing label with its first value line", async ({ page }) => {
  await installWebMcpHarness(page);
  await page.goto("/sourcing");
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(1);
  const created = await invokeWebMcp<{ workspace: { id: string } }>(page, "create_sourcing_workspace", {
    mutationId: newMutationId(),
    idea: "I’m starting Lantern Finch Foods and want to make a shelf-stable smoky carrot-habanero hot sauce. I’m pretty early and my notes are messy: probably a 5 oz glass woozy bottle, maybe 50,000 bottles for the first run, made in the Midwest, and I need help finishing the formula. SQF is a must; gluten-free would be nice but organic is not required.",
    initialUpdates: [
      { key: "brand_name", value: "Lantern Finch Foods", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "product_category", value: "Sauce / condiment", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "product_format", value: "5 oz glass woozy bottle", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "product_type", value: "Hot sauce", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "product_description", value: "Shelf-stable smoky carrot-habanero hot sauce", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "formula_status", value: "Early; needs help finishing the formula", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "formulation_assistance", value: "Required", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "manufacturing_process", value: "Shelf-stable acidified hot sauce process", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "packaging_format", value: "5 oz glass woozy bottle", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "packaging_size", value: "5 oz", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "production_volume", value: "30,000 bottles for the first run", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "certifications", value: "SQF required; gluten-free preferred; organic not required", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "preferred_geography", value: "Midwest", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "storage_distribution", value: "Shelf-stable", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "retail_channel", value: "Specialty grocers", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
    ],
  });
  await expect(page).toHaveURL(productBriefPath(created.workspace.id));
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Export PDF" }).click(),
  ]);
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const pages = await extractPdfPageText(readFileSync(downloadPath!));
  expect(pages.join("\n")).toContain("Manufacturer research not run");
  const exportHref = await page.getByRole("link", { name: "Export PDF" }).getAttribute("href");
  expect(new URL(exportHref!, page.url()).searchParams.get("timeZone")).toBeTruthy();
  const agentExport = await invokeWebMcp<{ downloadUrl: string }>(page, "export_product_packet", {});
  expect(new URL(agentExport.downloadUrl).searchParams.get("timeZone")).toBe(new URL(exportHref!, page.url()).searchParams.get("timeZone"));
  const labelPage = pages.findIndex((text) => text.includes("Storage and distribution"));
  expect(labelPage).toBeGreaterThanOrEqual(0);
  const labelOffset = pages[labelPage].indexOf("Storage and distribution");
  expect(pages[labelPage].slice(labelOffset)).toContain("Shelf-stable");
});

test("visible founder answers normalize corrections without repeating resolved questions", async ({ page }) => {
  const persona = "Scratch notes: Maybe call it Northstar Nibbles—actually no, brand is undecided, please do not use that name. I first wrote roasted fava-bean snack, but correction: it is a baked chickpea crisp with rosemary and lemon. 1.5 oz compostable pillow bag if possible. First run 8,000 bags. Cold-chain? No: shelf-stable. Peanut-free is a must. Organic certification is not required. Prefer a Northeast manufacturer, and I need help finalizing the formula. Launch target was 2027-03-15, correction: 2027-04-01.";
  const workspaceId = await startProduct(page, persona);
  const prompt = page.getByRole("heading", { name: /How far along is the recipe/ });
  await expect(prompt).toBeVisible();

  await page.getByPlaceholder(/Answer naturally/).fill("One 1.5 oz single-serve compostable pillow bag per customer—actually, use a recyclable snack bag if compostable film is not production-ready.");
  await page.getByRole("button", { name: "Add to brief" }).click();
  await expect(prompt).toBeVisible();

  await page.getByPlaceholder(/Answer naturally/).fill("It’s a draft kitchen recipe, not tested or scale-ready, and yes, I need formulation assistance.");
  await page.getByRole("button", { name: "Add to brief" }).click();
  await expect(page.getByRole("heading", { name: "Review and save your packaging direction in 3D." })).toBeVisible();
  await expect(page.getByText(/The next useful decision is is/i)).toHaveCount(0);

  const stored = await page.evaluate(async (path) => fetch(path).then((response) => response.json()), workspaceApiPath(workspaceId)) as { workspace: { fields: Record<string, { value: string | null; status: string }>; revision: number; updatedAt: string } };
  expect(stored.workspace.fields).toMatchObject({
    brand_name: { value: null, status: "needs_decision" },
    product_type: { value: "Baked chickpea crisp", status: "confirmed" },
    product_format: { value: "1.5 oz single-serve snack bag", status: "confirmed" },
    packaging_format: { value: "Recyclable Snack Bag", status: "confirmed" },
    packaging_size: { value: "1.5 oz", status: "confirmed" },
    formula_status: { value: "Draft kitchen recipe; not tested or scale-ready", status: "confirmed" },
    formulation_assistance: { value: "Required", status: "confirmed" },
    production_volume: { value: "8,000 bags", status: "confirmed" },
    storage_distribution: { value: "Shelf-stable", status: "confirmed" },
    allergens: { value: "Peanut-free required", status: "confirmed" },
    certifications: { value: "Not required: Organic", status: "confirmed" },
    preferred_geography: { value: "Northeast", status: "confirmed" },
    target_launch_date: { value: "2027-04-01", status: "confirmed" },
  });
  const repeated = await page.evaluate(async (path) => fetch(path).then((response) => response.json()), workspaceApiPath(workspaceId)) as { workspace: { revision: number; updatedAt: string } };
  expect(repeated.workspace).toMatchObject({ revision: stored.workspace.revision, updatedAt: stored.workspace.updatedAt });
});

test("final-competition spread intake and multi-fact follow-up stay faithful in the visible brief", async ({ page }) => {
  const finalPersona = "Please do not call this Meadow Moon; we have not chosen a brand. We are making a refrigerated sesame-free sunflower-seed dip—actually, correction: a shelf-stable roasted red pepper and white bean spread, not refrigerated and not a sunflower-seed dip. I first thought a 10 oz plastic tub, but no: use a 6 oz glass jar. The first run was going to be 4,000 jars; correction, make it 6,500 jars. I thought retort at first, but not retort—use hot fill if a qualified process authority says it is safe. The recipe is a home prototype, not tested or scale-ready, and I need formulation help. Sesame-free and peanut-free are required. SQF is required; organic certification is explicitly not required. Northeast is preferred but flexible. Target launch is 2028-02-29. We want to sell first through farmers markets and regional grocery stores. Storage and distribution must be ambient. We can supply printed labels, but we need the manufacturer to source the jars.";
  const exactWorkspaceId = await startProduct(page, finalPersona);
  await expect(page.getByRole("heading", { level: 1, name: "Roasted red pepper and white bean spread" })).toBeVisible();
  for (const value of [
    "Shelf-stable roasted red pepper and white bean spread",
    "Spread",
    "Glass Jar",
    "6,500 jars",
    "Untested home prototype; not scale-ready",
    "Hot fill only if validated safe by a qualified process authority",
    "Sesame-free and peanut-free required",
  ]) await expect(page.getByText(value, { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "6 oz jar" })).toHaveCount(0);
  const exactStored = await page.evaluate(async (path) => fetch(path).then((response) => response.json()), workspaceApiPath(exactWorkspaceId)) as { workspace: { fields: Record<string, { value: string | null }> } };
  expect(exactStored.workspace.fields.packaging_size.value).toBe("6 oz");
  expect(exactStored.workspace.fields.packaging_sourcing.value).toBe("Founder supplies printed labels; manufacturer sources jars");

  const workspaceId = await startProduct(page, "A shelf-stable roasted red pepper and white bean spread in a 6 oz glass jar. First run 6,500 jars.");
  await expect(page.getByRole("heading", { name: /How far along is the recipe/ })).toBeVisible();
  await page.getByPlaceholder(/Answer naturally/).fill("Still a home prototype, not tested or scale-ready. I need formulation assistance. Also, it must be sesame-free and peanut-free.");
  await page.getByRole("button", { name: "Add to brief" }).click();
  await expect(page.getByText(/recipe readiness, formulation help, and allergen requirements/)).toBeVisible();
  const stored = await page.evaluate(async (path) => fetch(path).then((response) => response.json()), workspaceApiPath(workspaceId)) as { workspace: { fields: Record<string, { value: string | null }>; revision: number } };
  expect(stored.workspace.fields).toMatchObject({
    formula_status: { value: "Untested home prototype; not scale-ready" },
    formulation_assistance: { value: "Required" },
    allergens: { value: "Sesame-free and peanut-free required" },
  });
});

test("visible next action stays on product description when packaging is already confirmed", async ({ page }) => {
  await installWebMcpHarness(page);
  await page.goto("/sourcing");
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(1);
  await invokeWebMcp(page, "create_sourcing_workspace", {
    mutationId: newMutationId(),
    idea: "Fictional packaged food product",
    initialUpdates: [
      { key: "product_type", value: "White bean spread", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "product_format", value: "Spread", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "formula_status", value: "Untested home prototype; not scale-ready", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "storage_distribution", value: "Shelf-stable", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "packaging_format", value: "Glass jar", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "packaging_size", value: "6 oz", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "production_volume", value: "6,500 jars", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
    ],
  });
  await expect(page.getByRole("heading", { name: "In one sentence, what is the product promise, who is it for, and what still needs development?" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Review and save your packaging direction in 3D." })).toHaveCount(0);
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
  expect(firstArtwork.visualSignature).toBe(`sha256:${createHash("sha256").update(firstBytes).digest("hex")}`);

  const refinedArtwork = await invokeWebMcp<{
    artworkUrl: string;
    renderedMotifs: string[];
    visualSignature: string;
    preview: { packagingType: string; finish: string; baseColor: string; dimensions: { width: number; height: number; depth: number } };
    product: { brandName: string; descriptor: string };
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
    product: { brandName: "Bright Current", descriptor: "Carbonated citrus drink" },
  });
  const refinedBytes = Buffer.from(await page.evaluate(async (url) => {
    const bytes = new Uint8Array(await fetch(url).then((response) => response.arrayBuffer()) as ArrayBuffer);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }, refinedArtwork.artworkUrl), "base64");
  expect(refinedArtwork.visualSignature).toBe(`sha256:${createHash("sha256").update(refinedBytes).digest("hex")}`);
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

test("zero-result research requires a visible founder-approved criteria diff and persists the approval", async ({ page }) => {
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
    matchingGuidance: { strictSearchReturnedNoResults: boolean; suggestedRetry: Record<string, unknown>; directAgentRetryAllowed: boolean; founderConfirmationSurface: string };
  }>(page, "match_manufacturers", { requiredRequirements: ["certifications"], resultLimit: 3 });
  expect(strict).toMatchObject({ resultCount: 0, matchingGuidance: { strictSearchReturnedNoResults: true } });
  await expect(page.getByRole("heading", { name: "No evidence-backed possibilities yet" })).toBeVisible();
  expect(strict.matchingGuidance).toMatchObject({ directAgentRetryAllowed: false, founderConfirmationSurface: "Review broader search" });

  let broadeningRequests = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith(`/api/sourcing/${created.workspace.id}/match`)) broadeningRequests += 1;
  });
  const beforeCancel = await page.evaluate(async (path) => fetch(path).then((response) => response.json()), workspaceApiPath(created.workspace.id)) as { workspace: { revision: number } };
  const broadeningOpener = page.getByRole("button", { name: "Review broader search" });
  await broadeningOpener.click();
  const review = page.getByRole("dialog", { name: "Review broader search" });
  await expect(review).toBeVisible();
  expect(await review.evaluate((element) => element.matches(":modal"))).toBe(true);
  await expect(review).toContainText("No manufacturer in the reviewed public information proved every required constraint");
  await expect(review).toContainText("Your product brief, package direction, and founder decisions will not change");
  await expect(review.getByLabel("Exact research criteria change")).toContainText("Required certifications");
  await expect(review.getByLabel("Exact research criteria change")).toContainText("Before");
  await expect(review.getByLabel("Exact research criteria change")).toContainText("After");
  await expect(review.getByLabel("Broader search criteria and safeguards")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(review.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(review.getByLabel("Broader search criteria and safeguards")).toBeFocused();
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 831, height: 912 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport);
    const geometry = await review.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const scroll = element.querySelector(".manufacturer-broadening-scroll");
      const actions = element.querySelector("footer");
      const actionsRect = actions?.getBoundingClientRect();
      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        scrollOverflowY: scroll ? getComputedStyle(scroll).overflowY : null,
        actionsInside: Boolean(actionsRect && actionsRect.top >= rect.top && actionsRect.bottom <= rect.bottom),
        pointOwner: document.elementFromPoint(1, 1)?.closest("dialog") === element,
      };
    });
    expect(geometry.top).toBeGreaterThanOrEqual(0);
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight);
    expect(geometry.scrollOverflowY).toMatch(/auto|scroll/);
    expect(geometry.actionsInside).toBe(true);
    expect(geometry.pointOwner).toBe(true);
    await expect(review.getByRole("heading", { name: "Review broader search" })).toBeVisible();
    await expect(review.getByRole("button", { name: "Confirm broader search" })).toBeVisible();
  }
  await page.keyboard.press("Escape");
  await expect(review).toBeHidden();
  await expect(broadeningOpener).toBeFocused();
  const afterCancel = await page.evaluate(async (path) => fetch(path).then((response) => response.json()), workspaceApiPath(created.workspace.id)) as { workspace: { revision: number } };
  expect(afterCancel.workspace.revision).toBe(beforeCancel.workspace.revision);
  expect(broadeningRequests).toBe(0);

  await page.getByRole("button", { name: "Review broader search" }).click();
  await review.getByRole("button", { name: "Confirm broader search" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Manufacturer possibilities" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^View details for / }).first()).toBeVisible();
  await expect(page.getByText(/Broadened search approved/)).toBeVisible();

  const broadened = await page.evaluate(async (path) => fetch(path).then((response) => response.json()), workspaceApiPath(created.workspace.id)) as {
    workspace: { manufacturerResearch: { candidateCount: number; request: Record<string, unknown>; broadeningApproval: { originalRequest: Record<string, unknown>; broadenedRequest: Record<string, unknown>; approvedBy: string; approvedAt: string; workspaceRevision: number; mutationId: string } }; activity: Array<{ kind: string; details: Record<string, unknown> }> };
  };
  expect(broadened.workspace.manufacturerResearch.candidateCount).toBeGreaterThan(0);
  expect(broadened.workspace.manufacturerResearch.broadeningApproval).toMatchObject({
    approvedBy: "founder",
    originalRequest: { requiredRequirements: ["certifications"] },
    broadenedRequest: { requiredRequirements: [], preferredRequirements: ["certifications"] },
    workspaceRevision: beforeCancel.workspace.revision,
    mutationId: expect.stringMatching(/^[A-Za-z0-9_-]{20,128}$/),
    approvedAt: expect.any(String),
  });
  expect(broadened.workspace.activity[0]).toMatchObject({ kind: "research_broadened", details: { approvedBy: "founder" } });

  await page.reload();
  await expect(page).toHaveURL(manufacturersPath(created.workspace.id));
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(13);
  const persisted = await invokeWebMcp<{ manufacturerCandidates: unknown[]; outreach: { selectedManufacturerSlugs: string[]; drafts: unknown[] } }>(page, "get_sourcing_workspace", {});
  expect(persisted.manufacturerCandidates).toHaveLength(broadened.workspace.manufacturerResearch.candidateCount);
  expect(persisted.outreach).toMatchObject({ selectedManufacturerSlugs: [], drafts: [] });
  await expect(page.getByText(/Broadened search approved/)).toBeVisible();
});

test("manual hot-sauce intake preserves stated facts and shows granular real-record evidence", async ({ page }) => {
  await installWebMcpHarness(page);
  const idea = "I want to make a tomato-free smoky carrot hot sauce in a 5 oz glass woozy bottle. I have a finished kitchen recipe, but it needs process-authority review and shelf-life review. I want about 10,000 bottles, prefer Texas or nearby, it should be shelf-stable, and organic certification is not required.";
  const workspaceId = await startProduct(page, idea);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(13);

  const stored = await page.evaluate(async (path) => fetch(path).then((response) => response.json()), workspaceApiPath(workspaceId)) as {
    workspace: { originalIdea: string; fields: Record<string, { value: string | null; status: string; updatedBy: string; sourceSpans: Array<{ start: number; end: number; text: string }>; validationStatus: string }> };
  };
  expect(stored.workspace.originalIdea).toBe(idea);
  expect(stored.workspace.fields).toMatchObject({
    product_type: { value: "Hot sauce", status: "confirmed", updatedBy: "founder" },
    packaging_size: { value: "5 oz", status: "confirmed", updatedBy: "founder" },
    packaging_format: { value: "Glass Woozy Bottle", status: "confirmed", updatedBy: "founder" },
    production_volume: { value: "About 10,000 bottles", status: "confirmed", updatedBy: "founder" },
    preferred_geography: { value: "Texas or nearby", status: "confirmed", updatedBy: "founder" },
    storage_distribution: { value: "Shelf-stable", status: "confirmed", updatedBy: "founder" },
    formula_status: { value: "Finished kitchen recipe", status: "confirmed", updatedBy: "founder" },
    certifications: { value: "Not required: Organic", status: "confirmed", updatedBy: "founder", validationStatus: "not_required" },
  });
  for (const key of ["product_type", "packaging_size", "packaging_format", "production_volume", "preferred_geography", "storage_distribution", "formula_status", "certifications"]) {
    for (const span of stored.workspace.fields[key].sourceSpans) expect(idea.slice(span.start, span.end)).toBe(span.text);
  }
  expect(stored.workspace.fields.brand_name.value).toBeNull();

  await page.getByRole("button", { name: "Refine in 3D" }).click();
  const woozyDialog = page.getByRole("dialog", { name: "Make the package direction tangible." });
  await expect(woozyDialog.locator(".package-geometry-notice")).toContainText("Generic bottle geometry: the exact woozy shape is not available in this 3D model");
  await woozyDialog.getByRole("button", { name: "Close packaging workbench" }).click();

  const preferred = await invokeWebMcp<{ manufacturerCandidates: Array<{ manufacturerSlug: string }> }>(page, "match_manufacturers", {
    preferredRequirements: ["product_type", "packaging_format", "packaging_size", "production_volume", "preferred_geography", "storage_distribution"],
    resultLimit: 3,
  });
  expect(preferred.manufacturerCandidates.map((candidate) => candidate.manufacturerSlug)).toEqual([
    "heritage-family-specialty-foods",
    "the-spice-guy",
    "creative-foodworks",
  ]);
  await page.getByRole("button", { name: "View details for Heritage Family Specialty Foods" }).click();
  const heritageSupported = page.getByRole("heading", { name: "Supported by sources" }).locator("..");
  const heritageUnknowns = page.getByRole("heading", { name: "Not publicly confirmed" }).locator("..");
  await expect(heritageSupported.getByRole("listitem").filter({ hasText: /explicitly names hot sauce/i })).toBeVisible();
  await expect(heritageSupported.getByRole("listitem").filter({ hasText: /includes 5 oz within a 5–32 oz glass range/i })).toBeVisible();
  await expect(heritageUnknowns.getByRole("listitem").filter({ hasText: /exact glass woozy-bottle construction is not publicly established/i })).toBeVisible();

  await page.getByRole("button", { name: "View details for The Spice Guy — Sauce Pack" }).click();
  const spiceSupported = page.getByRole("heading", { name: "Supported by sources" }).locator("..");
  const spiceUnknowns = page.getByRole("heading", { name: "Not publicly confirmed" }).locator("..");
  await expect(spiceSupported.getByRole("listitem").filter({ hasText: /explicitly names hot sauce/i })).toBeVisible();
  await expect(spiceSupported.getByRole("listitem").filter({ hasText: /explicitly names woozy bottles/i })).toBeVisible();
  await expect(spiceUnknowns.getByRole("listitem").filter({ hasText: /does not publicly establish the container material as glass/i })).toBeVisible();

  const strict = await invokeWebMcp<{ manufacturerCandidates: Array<{ manufacturerSlug: string }> }>(page, "match_manufacturers", {
    requiredRequirements: ["product_type"],
    preferredRequirements: ["packaging_format", "packaging_size", "production_volume", "preferred_geography", "storage_distribution"],
    resultLimit: 3,
  });
  expect(strict.manufacturerCandidates.map((candidate) => candidate.manufacturerSlug)).toEqual([
    "heritage-family-specialty-foods",
    "the-spice-guy",
    "creative-foodworks",
  ]);
  await page.getByRole("button", { name: "View details for Creative Foodworks" }).click();
  const conflicts = page.getByRole("heading", { name: "Possible conflicts" }).locator("..");
  await expect(conflicts.getByRole("listitem")).toHaveCount(2);
  await expect(conflicts).toContainText("5 oz is outside the published 8–32 oz range");
  await expect(conflicts).toContainText("below the published 1,000-gallon minimum");
  await page.locator("details.manufacturer-source-review > summary").click();
  await expect(page.locator(".manufacturer-source-line").filter({ hasText: /Reviewed Aug 25, 2026/ }).first()).toBeVisible();

  const requiredSize = await invokeWebMcp<{ manufacturerCandidates: Array<{ manufacturerSlug: string }> }>(page, "match_manufacturers", {
    requiredRequirements: ["product_type", "packaging_size"],
    resultLimit: 3,
  });
  expect(requiredSize.manufacturerCandidates.map((candidate) => candidate.manufacturerSlug)).not.toContain("creative-foodworks");
  const requiredVolume = await invokeWebMcp<{ manufacturerCandidates: Array<{ manufacturerSlug: string }> }>(page, "match_manufacturers", {
    requiredRequirements: ["product_type", "production_volume"],
    resultLimit: 3,
  });
  expect(requiredVolume.manufacturerCandidates.map((candidate) => candidate.manufacturerSlug)).not.toContain("creative-foodworks");
});

test("realistic acidified hot-sauce brief ranks exact reviewed evidence and preserves founder controls", async ({ page }) => {
  await installWebMcpHarness(page);
  await page.goto("/sourcing");
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(1);
  const created = await invokeWebMcp<{ workspace: { id: string } }>(page, "create_sourcing_workspace", {
    mutationId: newMutationId(),
    idea: "Fictional Ember Orchard smoked peach habanero hot sauce in a 5 fl oz glass woozy bottle, acidified and shelf-stable hot-filled, with a 5,000-bottle first run and Midwest preferred.",
    initialUpdates: [
      { key: "product_type", value: "Hot sauce", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "manufacturing_process", value: "Acidified, shelf-stable hot-fill", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "storage_distribution", value: "Shelf-stable", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "packaging_format", value: "5 fl oz glass woozy bottle", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "packaging_size", value: "5 oz", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "production_volume", value: "5,000 bottles", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "formulation_assistance", value: "Process-authority and acidified-food help needed", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "preferred_geography", value: "Midwest", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
    ],
  });
  await expect(page).toHaveURL(productBriefPath(created.workspace.id), { timeout: 20_000 });
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size), { timeout: 20_000 }).toBe(13);

  const matched = await invokeWebMcp<{
    manufacturerCandidates: Array<{ manufacturerSlug: string }>;
    receipt: { planFingerprint: string; researchId: string };
  }>(page, "match_manufacturers", {
    requiredRequirements: ["product_type", "manufacturing_process", "storage_distribution"],
    preferredRequirements: ["packaging_format", "packaging_size", "production_volume", "formulation_assistance", "preferred_geography"],
    resultLimit: 3,
  });
  expect(matched.manufacturerCandidates.map((candidate) => candidate.manufacturerSlug)).toEqual(["the-spice-guy", "creative-foodworks"]);
  await expect(page).toHaveURL(manufacturersPath(created.workspace.id));

  await page.getByRole("button", { name: "View details for The Spice Guy — Sauce Pack" }).click();
  const spiceSupported = page.getByRole("heading", { name: "Supported by sources" }).locator("..");
  const spiceConflicts = page.getByRole("heading", { name: "Possible conflicts" }).locator("..");
  await expect(spiceSupported).toContainText("acidified processing is publicly listed");
  await expect(spiceSupported).toContainText("hot fill is publicly listed");
  await expect(spiceSupported).toContainText("explicitly names woozy bottles");
  await expect(spiceSupported).toContainText("explicitly includes 5 oz");
  await expect(spiceSupported).toContainText("Formulation or product-development help is publicly listed");
  await expect(spiceSupported).toContainText("Published information supports Shelf-stable");
  await expect(spiceConflicts.getByRole("listitem")).toHaveCount(1);
  await expect(spiceConflicts).toContainText("outside the Midwest preference");
  await page.locator("details.manufacturer-source-review > summary").click();
  await expect(page.locator('details.manufacturer-source-review a[href="https://saucecopackers.com/"]').first()).toBeVisible();
  await expect(page.locator('details.manufacturer-source-review a[href="https://saucecopackers.com/faq"]').first()).toBeVisible();

  await page.getByRole("button", { name: "View details for Creative Foodworks" }).click();
  const creativeSupported = page.getByRole("heading", { name: "Supported by sources" }).locator("..");
  const creativeConflicts = page.getByRole("heading", { name: "Possible conflicts" }).locator("..");
  await expect(creativeSupported).toContainText("Formulation or product-development help is publicly listed");
  await expect(creativeConflicts).toContainText("5 oz is outside the published 8–32 oz");
  await expect(creativeConflicts).toContainText("about 195.3 gallons");
  await expect(creativeConflicts).toContainText("outside the Midwest preference");
  const creativeSourceReview = page.locator("details.manufacturer-source-review");
  if (!await creativeSourceReview.evaluate((element) => (element as HTMLDetailsElement).open)) {
    await creativeSourceReview.locator("summary").click();
  }
  await expect(creativeSourceReview.locator('a[href="https://creativefw.com/capabilities/"]').first()).toBeVisible();
  await expect(creativeSourceReview.locator('a[href="https://creativefw.com/products/hot-sauces"]').first()).toBeVisible();

  const audit = await invokeWebMcp<{
    researchFingerprint: string;
    selectionCount: number;
    drafts: unknown[];
    nothingWasSent: boolean;
    packageDirectionSaved: boolean;
  }>(page, "audit_outreach_readiness", {});
  expect(audit).toMatchObject({
    researchFingerprint: matched.receipt.planFingerprint,
    selectionCount: 0,
    drafts: [],
    nothingWasSent: true,
    packageDirectionSaved: false,
  });
});

test("geometry-only agent previews remain labeled placeholders until explicit art direction survives reload", async ({ page }) => {
  test.setTimeout(90_000);
  await installWebMcpHarness(page);
  await page.goto("/sourcing");
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(1);
  const created = await invokeWebMcp<{ workspace: { id: string } }>(page, "create_sourcing_workspace", {
    mutationId: newMutationId(),
    idea: "Fictional Ember Seed roasted chickpea snack in a stand-up pouch",
    initialUpdates: [
      { key: "brand_name", value: "Ember Seed", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "product_type", value: "Roasted chickpea snack", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "packaging_format", value: "Stand-up pouch", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
    ],
  });
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size), { timeout: 20_000 }).toBe(13);

  await invokeWebMcp(page, "match_manufacturers", { resultLimit: 3 });
  await expect(page).toHaveURL(manufacturersPath(created.workspace.id));
  await page.getByRole("navigation", { name: "Product workspace" }).getByRole("link", { name: "Product brief" }).click();
  await expect(page).toHaveURL(productBriefPath(created.workspace.id));
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size), { timeout: 20_000 }).toBe(13);
  const beforeOpen = await page.evaluate(async (apiPath) => fetch(apiPath).then((response) => response.json()), workspaceApiPath(created.workspace.id)) as {
    workspace: {
      revision: number;
      packageDesign: unknown;
      stagedPackageDesign: unknown;
      manufacturerResearch: unknown;
      matches: unknown;
      selectedManufacturerSlugs: string[];
      outreachDrafts: unknown[];
    };
  };
  const matchingBeforeStage = {
    manufacturerResearch: beforeOpen.workspace.manufacturerResearch,
    matches: beforeOpen.workspace.matches,
    selectedManufacturerSlugs: beforeOpen.workspace.selectedManufacturerSlugs,
    outreachDrafts: beforeOpen.workspace.outreachDrafts,
  };
  expect(beforeOpen.workspace).toMatchObject({ packageDesign: null, stagedPackageDesign: null, selectedManufacturerSlugs: [], outreachDrafts: [] });

  await page.getByRole("button", { name: "Refine in 3D" }).click();
  const untouchedDialog = page.getByRole("dialog", { name: "Make the package direction tangible." });
  await expect(untouchedDialog.getByText("Placeholder styling - visual direction has not been discussed", { exact: true })).toBeVisible();
  await page.waitForTimeout(350);
  const afterUntouchedOpen = await page.evaluate(async (apiPath) => fetch(apiPath).then((response) => response.json()), workspaceApiPath(created.workspace.id)) as { workspace: { revision: number; packageDesign: unknown; stagedPackageDesign: unknown } };
  expect(afterUntouchedOpen.workspace).toEqual({
    ...afterUntouchedOpen.workspace,
    revision: beforeOpen.workspace.revision,
    packageDesign: null,
    stagedPackageDesign: null,
  });

  const geometryStageId = newMutationId();
  const placeholder = await invokeWebMcp<{ committed: boolean; preview: { placeholder: boolean; source: string } }>(page, "preview_package_design", {
    stageId: geometryStageId,
    packagingType: "stand-up-pouch",
  });
  expect(placeholder).toMatchObject({ committed: false, preview: { placeholder: true, source: "system_defaults" } });
  const dialog = page.getByRole("dialog", { name: "Review what your agent changed." });
  await expect(dialog.getByText("Placeholder styling - visual direction has not been discussed", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Close packaging workbench" }).click();

  const stagedBefore = await page.evaluate(async (path) => fetch(path).then((response) => response.json()), workspaceApiPath(created.workspace.id)) as {
    workspace: {
      packageDesign: unknown;
      packageCommit: unknown;
      stagedPackageDesign: { id: string; design: { placeholder: boolean; source: string } };
      manufacturerResearch: unknown;
      matches: unknown;
      selectedManufacturerSlugs: string[];
      outreachDrafts: unknown[];
    };
  };
  expect(stagedBefore.workspace).toMatchObject({ packageDesign: null, packageCommit: null, stagedPackageDesign: { id: geometryStageId, design: { placeholder: true, source: "system_defaults" } } });
  expect({
    manufacturerResearch: stagedBefore.workspace.manufacturerResearch,
    matches: stagedBefore.workspace.matches,
    selectedManufacturerSlugs: stagedBefore.workspace.selectedManufacturerSlugs,
    outreachDrafts: stagedBefore.workspace.outreachDrafts,
  }).toEqual(matchingBeforeStage);
  const stagedActionState = await invokeWebMcp<{ packaging: { saved: boolean; direction: unknown; stagedDirection: { id: string } } }>(page, "get_sourcing_workspace", {});
  expect(stagedActionState.packaging).toMatchObject({ saved: false, direction: null, stagedDirection: { id: geometryStageId } });

  await page.reload();
  await page.getByRole("button", { name: "Refine in 3D" }).click();
  await expect(page.getByText("Placeholder styling - visual direction has not been discussed", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close packaging workbench" }).click();
  const workspaceNavigation = page.getByRole("navigation", { name: "Product workspace" });
  await workspaceNavigation.getByRole("link", { name: "Manufacturers" }).click();
  await expect(page).toHaveURL(manufacturersPath(created.workspace.id));
  const stagedOnManufacturers = await invokeWebMcp<{ packaging: { saved: boolean; stagedDirection: { design: { placeholder: boolean; source: string } } } }>(page, "get_sourcing_workspace", {});
  expect(stagedOnManufacturers.packaging).toMatchObject({ saved: false, stagedDirection: { design: { placeholder: true, source: "system_defaults" } } });
  await page.goBack();
  await expect(page).toHaveURL(productBriefPath(created.workspace.id));
  await page.getByRole("button", { name: "Refine in 3D" }).click();
  await expect(page.getByText("Placeholder styling - visual direction has not been discussed", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close packaging workbench" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size), { timeout: 20_000 }).toBe(13);

  const artwork = await invokeWebMcp<{ committed: boolean; preview: { placeholder: boolean; source: string; artworkId: string } }>(page, "generate_package_artwork", {
    stageId: newMutationId(),
    artDirection: "Warm ember-orange chickpea illustration with a simple cream wordmark",
    style: "warm-handmade",
    founderApproved: true,
  });
  expect(artwork).toMatchObject({ committed: false, preview: { placeholder: false, source: "agent_direction", artworkId: expect.any(String) } });
  await expect(page.getByText("Placeholder styling - visual direction has not been discussed", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Close packaging workbench" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Refine in 3D" }).click();
  await expect(page.getByText("Placeholder styling - visual direction has not been discussed", { exact: true })).toHaveCount(0);
  const stagedAfter = await page.evaluate(async (path) => fetch(path).then((response) => response.json()), workspaceApiPath(created.workspace.id)) as { workspace: { packageDesign: unknown; stagedPackageDesign: { design: { placeholder: boolean; source: string; artworkId: string } } } };
  expect(stagedAfter.workspace).toMatchObject({ packageDesign: null, stagedPackageDesign: { design: { placeholder: false, source: "agent_direction", artworkId: expect.any(String) } } });

  const founderDialog = page.getByRole("dialog");
  await founderDialog.getByLabel("Package color").fill("#173f35");
  await expect.poll(async () => {
    const current = await page.evaluate(async (apiPath) => fetch(apiPath).then((response) => response.json()), workspaceApiPath(created.workspace.id)) as { workspace: { stagedPackageDesign: { design: { source: string; baseColor: string } } | null } };
    return current.workspace.stagedPackageDesign?.design;
  }).toMatchObject({ source: "founder_direction", baseColor: "#173f35" });
  await waitFor3dPreview(founderDialog);
  await founderDialog.getByRole("button", { name: "Use this package direction" }).click();
  await expect(founderDialog).toHaveCount(0);

  const committed = await page.evaluate(async (apiPath) => fetch(apiPath).then((response) => response.json()), workspaceApiPath(created.workspace.id)) as {
    workspace: {
      packageDesign: Parameters<typeof packageDesignHash>[0];
      stagedPackageDesign: unknown;
      packageCommit: { actor: string; channel: string; designHash: string; stagedPackageId: string };
    };
  };
  expect(committed.workspace).toMatchObject({
    stagedPackageDesign: null,
    packageDesign: { placeholder: false, source: "founder_direction", baseColor: "#173f35", previewAssetId: expect.any(String) },
    packageCommit: { actor: "founder", channel: "workspace_ui", stagedPackageId: expect.any(String) },
  });
  expect(committed.workspace.packageCommit.designHash).toBe(packageDesignHash(committed.workspace.packageDesign));
});

test("two WebMCP journeys keep staged founder state, research, and stale handles workspace-scoped", async ({ page }) => {
  await installWebMcpHarness(page);
  await page.goto("/sourcing");
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(1);

  const strict = await invokeWebMcp<{ workspace: { id: string } }>(page, "create_sourcing_workspace", {
    mutationId: newMutationId(),
    idea: "Fictional Northstar chickpea snack with a shelf-stable goal in a resealable pouch",
    initialUpdates: [
      { key: "brand_name", value: "Northstar", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "product_type", value: "Crunchy chickpea snack", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "product_format", value: "Single-serve crunchy snack", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "packaging_format", value: "Resealable stand-up pouch", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "storage_distribution", value: "Shelf-stable goal", status: "proposed", explicitlyStated: false, reason: "Requires qualified process and shelf-life validation." },
      { key: "certifications", value: "Fictional Lunar-certified facility required", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
    ],
  });
  await expect(page).toHaveURL(productBriefPath(strict.workspace.id));
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(13);

  const stageId = newMutationId();
  const stagedDesign = {
    packagingType: "stand-up-pouch",
    finish: "colored",
    baseColor: "#173f35",
    labelColor: "#f2e8d5",
    artworkId: null,
    previewAssetId: null,
    frontText: null,
    windowScale: 0,
    closure: { style: "resealable zipper", color: "#173f35" },
    logoAspect: 1,
    logoScale: 0.84,
    logoPosition: { x: -0.12, y: 0.09 },
    dimensions: { width: 140, height: 210, depth: 65 },
    summary: "Stand-up pouch · 140 × 210 × 65 working dimensions",
  };
  const staged = await invokeWebMcp<{
    committed: boolean;
    packaging: { saved: boolean; direction: unknown; stagedDirection: { id: string; design: typeof stagedDesign } };
  }>(page, "refine_package_design_in_3d", { packageDesign: stagedDesign, stageId, explicitlyStated: true });
  expect(staged).toMatchObject({ committed: false, packaging: { saved: false, direction: null } });
  expect(staged.packaging.stagedDirection).toMatchObject({ id: stageId, design: stagedDesign });
  await page.getByRole("button", { name: "Close packaging workbench" }).click();

  await page.getByRole("navigation", { name: "Product workspace" }).getByRole("link", { name: "Manufacturers" }).click();
  await expect(page).toHaveURL(manufacturersPath(strict.workspace.id));
  const stagedOnChildRoute = await invokeWebMcp<{
    packaging: { saved: boolean; stagedDirection: { design: typeof stagedDesign } };
    requirements: { proposed: Array<{ key: string }>; needsValidation: Array<{ key: string }> };
  }>(page, "get_sourcing_workspace", {});
  expect(stagedOnChildRoute.packaging).toMatchObject({ saved: false, stagedDirection: { design: stagedDesign } });
  expect(stagedOnChildRoute.requirements.proposed).toContainEqual(expect.objectContaining({ key: "storage_distribution" }));
  expect(stagedOnChildRoute.requirements.needsValidation).toContainEqual(expect.objectContaining({ key: "storage_distribution" }));

  const zero = await invokeWebMcp<{
    resultCount: number;
    manufacturerCandidates: unknown[];
    receipt: { authoritative: boolean; researchId: string; resultCount: number };
  }>(page, "match_manufacturers", { requiredRequirements: ["certifications"], resultLimit: 3 });
  expect(zero).toMatchObject({ resultCount: 0, manufacturerCandidates: [], receipt: { authoritative: true, resultCount: 0 } });
  expect(zero.receipt.researchId).toEqual(expect.any(String));
  await expect(page.getByRole("heading", { name: "No evidence-backed possibilities yet" })).toBeVisible();
  await page.reload();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(13);
  const strictReloaded = await invokeWebMcp<{
    workspace: { originalIdea: string };
    packaging: { saved: boolean; stagedDirection: { design: typeof stagedDesign } };
    manufacturerCandidates: unknown[];
  }>(page, "get_sourcing_workspace", {});
  expect(strictReloaded.workspace.originalIdea).toContain("Northstar chickpea snack");
  expect(strictReloaded.packaging).toMatchObject({ saved: false, stagedDirection: { design: stagedDesign } });
  expect(strictReloaded.manufacturerCandidates).toEqual([]);

  await page.goto("/sourcing");
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(1);
  const successful = await invokeWebMcp<{ workspace: { id: string } }>(page, "create_sourcing_workspace", {
    mutationId: newMutationId(),
    idea: "Fictional Daybreak sparkling citrus drink in a slim can",
    initialUpdates: [
      { key: "brand_name", value: "Daybreak", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "product_type", value: "Sparkling citrus beverage", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "product_format", value: "Ready-to-drink liquid", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "packaging_format", value: "12 oz slim can", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "carbonation", value: "Carbonated", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
    ],
  });
  await expect(page).toHaveURL(productBriefPath(successful.workspace.id));
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(13);
  const matched = await invokeWebMcp<{
    resultCount: number;
    manufacturerCandidates: Array<{ manufacturerSlug: string }>;
    receipt: { authoritative: boolean; resultCount: number };
  }>(page, "match_manufacturers", { resultLimit: 2 });
  expect(matched.resultCount).toBeGreaterThan(0);
  expect(matched.resultCount).toBe(matched.manufacturerCandidates.length);
  expect(matched.receipt).toMatchObject({ authoritative: true, resultCount: matched.resultCount });
  await expect(page.getByRole("button", { name: /^View details for / }).first()).toBeVisible();
  await page.reload();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(13);
  const successReloaded = await invokeWebMcp<{
    workspace: { originalIdea: string };
    packaging: { stagedDirection: unknown };
    manufacturerCandidates: Array<{ manufacturerSlug: string }>;
  }>(page, "get_sourcing_workspace", {});
  expect(successReloaded.workspace.originalIdea).toContain("Daybreak sparkling citrus drink");
  expect(successReloaded.packaging.stagedDirection).toBeNull();
  expect(successReloaded.manufacturerCandidates).toEqual(matched.manufacturerCandidates);

  const cookies = await page.context().cookies();
  expect(cookies.map((cookie) => cookie.name)).toEqual(expect.arrayContaining([
    `tll_guest_workspace_${strict.workspace.id}`,
    `tll_guest_workspace_${successful.workspace.id}`,
  ]));

  await page.goto(productBriefPath(strict.workspace.id));
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(13);
  const successBeforeStaleCall = await page.evaluate(async (path) => fetch(path).then((response) => response.json()), workspaceApiPath(successful.workspace.id)) as { workspace: { revision: number } };
  const staleMessage = await page.evaluate(async ({ otherWorkspaceId, currentWorkspaceId }) => {
    const tools = (window as unknown as { __webMcpTools: Map<string, { execute(value: unknown): Promise<unknown> | unknown }> }).__webMcpTools;
    const oldTool = tools.get("update_sourcing_workspace")!;
    window.history.pushState({}, "", `/sourcing/${otherWorkspaceId}`);
    try {
      await oldTool.execute({ proposedUpdates: [{ key: "production_volume", value: "Should not persist", status: "proposed", explicitlyStated: false }] });
      return "unexpected success";
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    } finally {
      window.history.pushState({}, "", `/sourcing/${currentWorkspaceId}`);
    }
  }, { otherWorkspaceId: successful.workspace.id, currentWorkspaceId: strict.workspace.id });
  expect(staleMessage).toContain(`stale for workspace ${strict.workspace.id}`);
  const successAfterStaleCall = await page.evaluate(async (path) => fetch(path).then((response) => response.json()), workspaceApiPath(successful.workspace.id)) as { workspace: { revision: number } };
  expect(successAfterStaleCall.workspace.revision).toBe(successBeforeStaleCall.workspace.revision);

  const beforeCommit = await page.evaluate(async (path) => fetch(path).then((response) => response.json()), workspaceApiPath(strict.workspace.id)) as { workspace: { fields: unknown } };
  await invokeWebMcp(page, "refine_package_design_in_3d", { packageDesign: stagedDesign, stageId, explicitlyStated: true });
  const dialog = page.getByRole("dialog", { name: "Review what your agent changed." });
  await expect(dialog).toBeVisible();
  await waitFor3dPreview(dialog);
  await dialog.getByRole("button", { name: "Use this package direction" }).click();
  await expect(dialog).toHaveCount(0);
  const committed = await invokeWebMcp<{
    packaging: { saved: boolean; direction: typeof stagedDesign; stagedDirection: null; commitment: { actor: string; channel: string; stagedPackageId: string } };
    requirements: { proposed: Array<{ key: string }> };
  }>(page, "get_package_design", {});
  const afterCommit = await page.evaluate(async (path) => fetch(path).then((response) => response.json()), workspaceApiPath(strict.workspace.id)) as { workspace: { fields: unknown } };
  expect(committed.packaging).toMatchObject({
    saved: true,
    direction: { ...stagedDesign, previewAssetId: expect.any(String) },
    stagedDirection: null,
    commitment: { actor: "founder", channel: "workspace_ui", stagedPackageId: expect.any(String) },
  });
  expect(committed.packaging.direction.previewAssetId).toEqual(expect.any(String));
  expect(afterCommit.workspace.fields).toEqual(beforeCommit.workspace.fields);
  expect(committed.requirements.proposed).toContainEqual(expect.objectContaining({ key: "storage_distribution" }));
});

test("competitive beverage sourcing stays evidence-specific, deterministic, and founder-safe", async ({ page }) => {
  test.setTimeout(90_000);
  await installWebMcpHarness(page);
  await page.goto("/sourcing");
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size)).toBe(1);

  const idea = "Juniper Kite is a fictional shelf-stable, non-alcoholic sparkling tart-cherry and basil drink in a single-serve 12 fl oz slim can. A bench formula exists but needs scale-up help. The first run is 25,000 cans, Midwest manufacturing is preferred but not required, organic certification is explicitly not required, printed-can sourcing help is preferred, and the target launch is 2027-04-15.";
  const created = await invokeWebMcp<{ workspace: { id: string } }>(page, "create_sourcing_workspace", {
    mutationId: newMutationId(),
    idea,
    initialUpdates: [
      { key: "product_category", value: "Beverage", status: "proposed", explicitlyStated: false, source: "Agent category inference" },
      { key: "product_type", value: "Sparkling tart-cherry and basil drink", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "product_format", value: "Single-serve 12 fl oz slim can", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "packaging_format", value: "Slim can", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "packaging_size", value: "12 fluid ounces", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "carbonation", value: "Carbonated", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "formulation_assistance", value: "Scale-up help needed", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "production_volume", value: "25,000 cans", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "preferred_geography", value: "Midwest", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "storage_distribution", value: "Shelf-stable", status: "confirmed", explicitlyStated: true, suggestedSharing: true },
      { key: "certifications", value: "Organic certification is not required", status: "confirmed", explicitlyStated: true, suggestedSharing: false },
    ],
  });
  await expect(page).toHaveURL(productBriefPath(created.workspace.id));
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size), { timeout: 20_000 }).toBe(13);
  await expect(page.getByRole("heading", { name: "In one sentence, what should the drink do for the customer, who is it for, and what formula work is still open?" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Review and save your packaging direction in 3D." })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "What package are you leaning toward? You can compare supported options in the 3D workbench before saving one." })).toHaveCount(0);

  const stageId = newMutationId();
  await invokeWebMcp(page, "preview_package_design", { stageId, packagingType: "slim-can" });
  await page.getByRole("button", { name: "Close packaging workbench" }).click();
  const beforeResearch = await page.evaluate(async (apiPath) => fetch(apiPath).then((response) => response.json()), workspaceApiPath(created.workspace.id)) as {
    workspace: {
      fields: Record<string, { value: string; status: string; explicitlyStated: boolean; source: string | null }>;
      stagedPackageDesign: { id: string; design: { placeholder: boolean; source: string } };
      packageDesign: unknown;
      packageCommit: unknown;
      selectedManufacturerSlugs: string[];
      outreachDrafts: unknown[];
      inquiries: unknown[];
    };
  };
  expect(beforeResearch.workspace.fields.product_category).toMatchObject({ value: "Beverage", status: "proposed", explicitlyStated: false, source: "Agent category inference" });
  expect(beforeResearch.workspace.fields.certifications).toMatchObject({ status: "confirmed", explicitlyStated: true });
  expect(beforeResearch.workspace.stagedPackageDesign).toMatchObject({ id: stageId, design: { placeholder: true, source: "system_defaults" } });

  const matchInput = {
    preferredRequirements: ["product_type", "packaging_format", "packaging_size", "carbonation", "formulation_assistance", "preferred_geography", "production_volume", "storage_distribution"],
    resultLimit: 3,
  };
  const first = await invokeWebMcp<{
    manufacturerCandidates: Array<{
      manufacturerSlug: string;
      supported: string[];
      notPubliclyConfirmed: string[];
      evidence: Array<{ requirementKey: string; claim: string; status: string; sourceUrl: string | null }>;
      reasonTrace: Array<{ requirementKey: string; priority: string; outcome: string }>;
    }>;
    receipt: { planFingerprint: string; researchId: string };
  }>(page, "match_manufacturers", matchInput);
  expect(first.manufacturerCandidates.map((candidate) => candidate.manufacturerSlug)).toEqual([
    "prospectors-specialty-beverage",
    "better-beverage-company",
    "swift-cider",
  ]);
  for (const candidate of first.manufacturerCandidates) {
    expect(candidate.supported).toContain("Reviewed product information supports the broader beverage category.");
    expect(candidate.supported.join(" ")).not.toContain("Sparkling tart-cherry and basil drink");
    expect(candidate.notPubliclyConfirmed).toContain("Exact capability for Sparkling tart-cherry and basil drink is not publicly established by the reviewed product source.");
    expect(candidate.reasonTrace).toContainEqual(expect.objectContaining({ requirementKey: "product_type", priority: "preferred", outcome: "broad_support" }));
    expect(candidate.reasonTrace.some((item) => item.requirementKey === "certifications")).toBe(false);
    expect(candidate.evidence
      .filter((item) => ["verified", "publicly_listed", "conflicting"].includes(item.status))
      .every((item) => item.sourceUrl !== null)).toBe(true);
  }
  expect(first.manufacturerCandidates[0].supported).toContain("Reviewed packaging explicitly includes sleek cans, treated as equivalent to the requested slim-can construction.");
  expect(first.manufacturerCandidates[0].evidence.find((item) => item.requirementKey === "packaging_format")?.sourceUrl).toBe("https://www.drinkprospectors.com/private-label");
  expect(first.manufacturerCandidates[1].notPubliclyConfirmed).toContain("Exact slim-can construction is not publicly established by the reviewed packaging source.");
  expect(first.manufacturerCandidates[1].evidence.find((item) => item.requirementKey === "packaging_format" && /broader package family/i.test(item.claim))?.sourceUrl).toBe("https://betterbeveragecompany.com/capabilities/");
  expect(first.manufacturerCandidates[2].supported).toContain("25,000 cans meets the published approximate minimum of 9,600 cans (about 400 cases × 24 cans per case).");
  expect(first.manufacturerCandidates[2].evidence.find((item) => item.requirementKey === "production_volume")?.sourceUrl).toBe("https://www.swiftcider.com/copacking");

  await expect(page).toHaveURL(manufacturersPath(created.workspace.id));
  await page.getByRole("button", { name: "View details for Prospectors Specialty Beverage" }).click();
  await expect(page.getByRole("list", { name: "Requirement trace" })).toContainText("Product");
  await expect(page.getByRole("list", { name: "Requirement trace" })).toContainText("preferred · broad support");
  await expect(page.getByRole("heading", { name: "Supported by sources" }).locator("..")).toContainText("broader beverage category");
  await expect(page.getByRole("heading", { name: "Not publicly confirmed" }).locator("..")).toContainText("Exact capability for Sparkling tart-cherry and basil drink");
  await page.locator("details.manufacturer-source-review > summary").click();
  await expect(page.locator('details.manufacturer-source-review a[href="https://www.drinkprospectors.com/private-label"]').first()).toBeVisible();

  const second = await invokeWebMcp<typeof first>(page, "match_manufacturers", matchInput);
  expect(second.manufacturerCandidates).toEqual(first.manufacturerCandidates);
  expect(second.receipt.planFingerprint).toBe(first.receipt.planFingerprint);
  expect(second.receipt.researchId).not.toBe(first.receipt.researchId);
  const afterResearch = await page.evaluate(async (apiPath) => fetch(apiPath).then((response) => response.json()), workspaceApiPath(created.workspace.id)) as typeof beforeResearch;
  expect(afterResearch.workspace.fields).toEqual(beforeResearch.workspace.fields);
  expect(afterResearch.workspace).toMatchObject({
    stagedPackageDesign: beforeResearch.workspace.stagedPackageDesign,
    packageDesign: null,
    packageCommit: null,
    selectedManufacturerSlugs: [],
    outreachDrafts: [],
    inquiries: [],
  });

  await page.getByRole("navigation", { name: "Product workspace" }).getByRole("link", { name: "Product brief" }).click();
  await expect(page).toHaveURL(productBriefPath(created.workspace.id));
  await page.goBack();
  await expect(page).toHaveURL(manufacturersPath(created.workspace.id));
  await page.reload();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __webMcpTools: Map<string, unknown> }).__webMcpTools.size), { timeout: 20_000 }).toBe(13);
  const persisted = await invokeWebMcp<{ packaging: { saved: boolean; stagedDirection: { id: string; design: { placeholder: boolean; source: string } } }; manufacturerCandidates: typeof first.manufacturerCandidates }>(page, "get_sourcing_workspace", {});
  expect(persisted.packaging).toMatchObject({ saved: false, stagedDirection: { id: stageId, design: { placeholder: true, source: "system_defaults" } } });
  expect(persisted.manufacturerCandidates).toEqual(second.manufacturerCandidates);
  await page.goForward();
  await expect(page).toHaveURL(productBriefPath(created.workspace.id));

  const audit = await invokeWebMcp<{ selectionCount: number; drafts: unknown[]; nothingWasSent: boolean; packageDirectionSaved: boolean }>(page, "audit_outreach_readiness", {});
  expect(audit).toMatchObject({ selectionCount: 0, drafts: [], nothingWasSent: true, packageDirectionSaved: false });
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
  await expect(page.getByRole("link", { name: "Export PDF" })).toBeVisible();
  const briefGeometry = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }));
  expect(briefGeometry.document).toBeLessThanOrEqual(briefGeometry.viewport);

  await page.getByPlaceholder(/Answer naturally/).fill("Mini loaf");
  await page.getByRole("button", { name: "Add to brief" }).click();
  await expect(page.getByRole("button", { name: "Research manufacturers now" })).toBeVisible();
  await page.getByRole("button", { name: "Research manufacturers now" }).click();
  await expect(page).toHaveURL(manufacturersPath(workspaceId));
  await expect(page.getByRole("link", { name: "Export PDF" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Product workspace" }).getByRole("link", { name: "Manufacturers" })).toHaveAttribute("aria-current", "page");
  const manufacturerGeometry = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }));
  expect(manufacturerGeometry.document).toBeLessThanOrEqual(manufacturerGeometry.viewport);

  await page.getByRole("button", { name: /^View details for / }).first().click();
  await expect(page.getByRole("button", { name: "All possibilities" })).toBeVisible();
  const detailGeometry = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }));
  expect(detailGeometry.document).toBeLessThanOrEqual(detailGeometry.viewport);
});
