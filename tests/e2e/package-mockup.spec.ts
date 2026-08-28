import { expect, test } from "@playwright/test";
import path from "node:path";
import sharp from "sharp";

async function imageDifferenceRatio(first: Buffer, second: Buffer) {
  const [firstImage, secondImage] = await Promise.all([
    sharp(first).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(second).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);

  expect(secondImage.info.width).toBe(firstImage.info.width);
  expect(secondImage.info.height).toBe(firstImage.info.height);

  let changedPixels = 0;
  for (let index = 0; index < firstImage.data.length; index += 4) {
    if (
      Math.abs(firstImage.data[index] - secondImage.data[index]) > 12 ||
      Math.abs(firstImage.data[index + 1] - secondImage.data[index + 1]) > 12 ||
      Math.abs(firstImage.data[index + 2] - secondImage.data[index + 2]) > 12 ||
      Math.abs(firstImage.data[index + 3] - secondImage.data[index + 3]) > 12
    ) {
      changedPixels += 1;
    }
  }

  return changedPixels / (firstImage.info.width * firstImage.info.height);
}

async function tomatoSurfaceRatio(image: Buffer) {
  const rendered = await sharp(image).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let tomatoPixels = 0;

  for (let index = 0; index < rendered.data.length; index += rendered.info.channels) {
    const red = rendered.data[index];
    const green = rendered.data[index + 1];
    const blue = rendered.data[index + 2];
    if (red > 145 && red - green > 35 && red - blue > 25) tomatoPixels += 1;
  }

  return tomatoPixels / (rendered.info.width * rendered.info.height);
}

test("package lab keeps shared artwork and per-package placement while switching formats", async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  const consoleErrors: string[] = [];
  const threeDeprecationWarnings: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
    if (message.type() === "warning" && message.text().startsWith("THREE.") && message.text().includes("deprecated")) {
      threeDeprecationWarnings.push(message.text());
    }
  });

  await page.goto("/labs/package-mockup");

  const pouchModelResponse = await page.request.get("/models/packaging/stand-up-pouch.glb");
  expect(pouchModelResponse.ok()).toBe(true);
  expect(pouchModelResponse.headers()["content-type"]).toContain("model/gltf-binary");

  await expect(page.getByRole("heading", { level: 1, name: "Package Mockup Lab" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Slim Can" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[aria-label="Interactive 3D slim can package preview"]')).toBeVisible();
  const canvas = page.locator("canvas");
  await canvas.evaluate((element) => {
    (window as typeof window & { packageLabCanvas?: HTMLCanvasElement }).packageLabCanvas = element as HTMLCanvasElement;
  });
  const beforeRotation = await canvas.screenshot();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("3D preview canvas did not have a visible bounding box");
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.48);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.42, box.y + box.height * 0.48, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(350);
  const afterRotation = await canvas.screenshot();
  expect(Buffer.compare(beforeRotation, afterRotation)).not.toBe(0);
  await expect(page.getByText("Showing: Line List demo artwork")).toBeVisible();

  await page.getByRole("button", { name: "Tomato package color" }).click();
  await expect(page.getByText("#EF5A47")).toBeVisible();

  const sizeSlider = page.getByRole("slider", { name: "Logo size" });
  await sizeSlider.fill("0.85");
  await expect(page.getByText("85%", { exact: true })).toBeVisible();

  await page.locator("#package-artwork").setInputFiles(path.join(process.cwd(), "public/brand/line-list-mark.png"));
  await expect(page.getByText("Showing: line-list-mark.png")).toBeVisible();

  await page.getByRole("button", { name: "Bottle", exact: true }).click();
  await expect(page.getByRole("button", { name: "Bottle", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { level: 2, name: "Beverage bottle" })).toBeVisible();
  await expect(page.locator('[aria-label="Interactive 3D bottle package preview"]')).toBeVisible();
  await expect(page.getByText("Showing: line-list-mark.png")).toBeVisible();
  await expect(page.getByRole("button", { name: "Colored" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Bottle color value")).toHaveText("#EF5A47");
  await expect(page.getByLabel("Label color value")).toHaveText("#F2E8D5");
  await expect(page.getByText("108%", { exact: true })).toBeVisible();
  expect(
    await canvas.evaluate(
      (element) => element === (window as typeof window & { packageLabCanvas?: HTMLCanvasElement }).packageLabCanvas,
    ),
  ).toBe(true);

  const beforeClearFinish = await canvas.screenshot();
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page.getByRole("button", { name: "Clear" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("group", { name: "Bottle color" })).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByRole("button", { name: "Tomato bottle color" })).toBeDisabled();
  await page.waitForTimeout(350);
  const clearFinish = await canvas.screenshot();
  expect(Buffer.compare(beforeClearFinish, clearFinish)).not.toBe(0);

  await page.getByRole("button", { name: "Colored" }).click();
  await page.waitForTimeout(350);
  expect(await imageDifferenceRatio(beforeClearFinish, await canvas.screenshot())).toBeLessThan(0.005);

  await page.getByRole("button", { name: "Clear" }).click();
  await page.getByRole("button", { name: "Blush label color" }).click();
  await expect(page.getByLabel("Label color value")).toHaveText("#F7D8D3");

  await sizeSlider.fill("1.1");
  await page.getByRole("slider", { name: "Logo vertical position" }).fill("0.1");
  await expect(page.getByText("110%", { exact: true })).toBeVisible();
  const beforeBottleRotation = await canvas.screenshot();
  const bottleBox = await canvas.boundingBox();
  if (!bottleBox) throw new Error("Bottle preview canvas did not have a visible bounding box");
  await page.mouse.move(bottleBox.x + bottleBox.width * 0.68, bottleBox.y + bottleBox.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(bottleBox.x + bottleBox.width * 0.4, bottleBox.y + bottleBox.height * 0.5, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(350);
  expect(Buffer.compare(beforeBottleRotation, await canvas.screenshot())).not.toBe(0);

  await page.getByRole("button", { name: "Slim Can" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Slim aluminum can" })).toBeVisible();
  await expect(page.getByText("85%", { exact: true })).toBeVisible();
  await expect(page.getByText("Showing: line-list-mark.png")).toBeVisible();
  expect(
    await canvas.evaluate(
      (element) => element === (window as typeof window & { packageLabCanvas?: HTMLCanvasElement }).packageLabCanvas,
    ),
  ).toBe(true);

  await page.getByRole("button", { name: "Bottle", exact: true }).click();
  await expect(page.getByRole("button", { name: "Clear" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Label color value")).toHaveText("#F7D8D3");
  await page.getByRole("button", { name: "Colored" }).click();
  await expect(page.getByRole("button", { name: "Tomato bottle color" })).toBeEnabled();
  await expect(page.getByLabel("Bottle color value")).toHaveText("#EF5A47");

  await page.getByRole("button", { name: "Jar", exact: true }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Glass food jar" })).toBeVisible();
  await expect(page.locator('[aria-label="Interactive 3D jar package preview"]')).toBeVisible();
  await expect(page.getByText("Showing: line-list-mark.png")).toBeVisible();
  await expect(page.getByRole("group", { name: "Jar finish" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Colored" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Jar color value")).toHaveText("#EF5A47");
  await expect(page.getByLabel("Label color value")).toHaveText("#F7D8D3");
  await expect(page.getByText("102%", { exact: true })).toBeVisible();

  await page.waitForTimeout(350);
  const beforeClearJar = await canvas.screenshot();
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page.getByRole("button", { name: "Clear" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("group", { name: "Jar color" })).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByRole("button", { name: "Tomato jar color" })).toBeDisabled();
  await page.waitForTimeout(350);
  const clearJar = await canvas.screenshot();
  expect(await imageDifferenceRatio(beforeClearJar, clearJar)).toBeGreaterThan(0.08);

  await page.getByRole("button", { name: "Colored" }).click();
  await page.waitForTimeout(350);
  expect(await imageDifferenceRatio(beforeClearJar, await canvas.screenshot())).toBeLessThan(0.025);

  await sizeSlider.fill("0.9");
  await page.getByRole("slider", { name: "Logo horizontal position" }).fill("0.12");
  await expect(page.getByText("90%", { exact: true })).toBeVisible();
  const beforeJarRotation = await canvas.screenshot();
  const jarBox = await canvas.boundingBox();
  if (!jarBox) throw new Error("Jar preview canvas did not have a visible bounding box");
  await page.mouse.move(jarBox.x + jarBox.width * 0.68, jarBox.y + jarBox.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(jarBox.x + jarBox.width * 0.42, jarBox.y + jarBox.height * 0.5, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(350);
  expect(Buffer.compare(beforeJarRotation, await canvas.screenshot())).not.toBe(0);

  await page.getByRole("button", { name: "Pouch", exact: true }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Stand-up pouch" })).toBeVisible();
  await expect(page.locator('[aria-label="Interactive 3D pouch package preview"]')).toBeVisible();
  await expect(page.getByText("Showing: line-list-mark.png")).toBeVisible();
  await expect(page.getByLabel("Pouch color value")).toHaveText("#EF5A47");
  await expect(page.getByRole("group", { name: "Label color" })).toHaveCount(0);
  await expect(page.getByText("124%", { exact: true })).toBeVisible();
  await sizeSlider.fill("1.1");
  await page.getByRole("slider", { name: "Logo vertical position" }).fill("0.2");
  await expect(page.getByText("110%", { exact: true })).toBeVisible();
  const beforePouchRotation = await canvas.screenshot();
  const pouchBox = await canvas.boundingBox();
  if (!pouchBox) throw new Error("Pouch preview canvas did not have a visible bounding box");
  await page.mouse.move(pouchBox.x + pouchBox.width * 0.68, pouchBox.y + pouchBox.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(pouchBox.x + pouchBox.width * 0.4, pouchBox.y + pouchBox.height * 0.5, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(350);
  expect(Buffer.compare(beforePouchRotation, await canvas.screenshot())).not.toBe(0);

  for (let view = 0; view < 8; view += 1) {
    await page.mouse.move(pouchBox.x + pouchBox.width * 0.72, pouchBox.y + pouchBox.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(pouchBox.x + pouchBox.width * 0.48, pouchBox.y + pouchBox.height * 0.5, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(220);
    expect(await tomatoSurfaceRatio(await canvas.screenshot())).toBeGreaterThan(0.04);
  }

  await page.getByRole("button", { name: "Jar", exact: true }).click();
  await expect(page.getByText("90%", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Pouch", exact: true }).click();
  await expect(page.getByText("110%", { exact: true })).toBeVisible();
  expect(
    await canvas.evaluate(
      (element) => element === (window as typeof window & { packageLabCanvas?: HTMLCanvasElement }).packageLabCanvas,
    ),
  ).toBe(true);

  await page.getByRole("button", { name: "Reset mockup" }).click();
  await expect(page.getByRole("button", { name: "Slim Can" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Showing: Line List demo artwork")).toBeVisible();
  await expect(page.getByText("#25B7B8")).toBeVisible();
  await expect(page.getByText("135%", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Bottle", exact: true }).click();
  await expect(page.getByRole("button", { name: "Colored" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Label color value")).toHaveText("#F2E8D5");
  expect(errors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(threeDeprecationWarnings).toEqual([]);
});

test("package lab stacks controls before the preview without mobile overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/labs/package-mockup");

  const controls = page.locator(".package-lab-controls");
  const preview = page.locator(".package-lab-preview");
  await expect(controls).toBeVisible();
  await expect(preview).toBeVisible();

  const positions = await Promise.all([
    controls.evaluate((element) => element.getBoundingClientRect().top),
    preview.evaluate((element) => element.getBoundingClientRect().top),
  ]);
  expect(positions[0]).toBeLessThan(positions[1]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

  await page.getByRole("button", { name: "Bottle", exact: true }).click();
  await expect(page.locator('[aria-label="Interactive 3D bottle package preview"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

  await page.getByRole("button", { name: "Jar", exact: true }).click();
  await expect(page.locator('[aria-label="Interactive 3D jar package preview"]')).toBeVisible();
  await page.getByRole("button", { name: "Pouch", exact: true }).click();
  await expect(page.locator('[aria-label="Interactive 3D pouch package preview"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
