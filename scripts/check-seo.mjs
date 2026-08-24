import { spawn } from "node:child_process";

const BASE_URL = process.env.SEO_CHECK_BASE_URL ?? "http://127.0.0.1:3100";
const SITE_URL = "https://www.thelinelist.com";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function allStrings(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(allStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(allStrings);
  return [];
}

async function waitForServer(server) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`SEO check server exited with code ${server.exitCode}.`);
    try {
      const response = await fetch(`${BASE_URL}/sitemap.xml`);
      if (response.ok) return;
    } catch {
      // The production server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${BASE_URL}.`);
}

let server = null;
if (!process.env.SEO_CHECK_BASE_URL) {
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3100"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });
  await waitForServer(server);
}

try {

const sitemapResponse = await fetch(`${BASE_URL}/sitemap.xml`);
assert(sitemapResponse.status === 200, `Sitemap returned ${sitemapResponse.status}.`);
const sitemapXml = await sitemapResponse.text();
const urls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assert(urls.length > 0, "Sitemap has no URLs.");
assert(urls.every((url) => !url.endsWith("/")), "Sitemap contains a trailing-slash URL.");

let checked = 0;
for (let index = 0; index < urls.length; index += 12) {
  await Promise.all(urls.slice(index, index + 12).map(async (url) => {
    const path = new URL(url).pathname;
    const response = await fetch(`${BASE_URL}${path}`, { redirect: "manual" });
    assert(response.status === 200, `${path} returned ${response.status} instead of a direct 200.`);
    const html = await response.text();
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1];
    assert(canonical === url, `${path} canonical ${canonical ?? "missing"} does not match ${url}.`);

    for (const match of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) {
      const schema = JSON.parse(match[1]);
      const trailingUrls = allStrings(schema).filter((value) => value.startsWith(SITE_URL) && value.endsWith("/"));
      assert(trailingUrls.length === 0, `${path} has trailing-slash structured-data URLs: ${trailingUrls.join(", ")}.`);
    }
    checked += 1;
  }));
}

const directoryResponse = await fetch(`${BASE_URL}/find-manufacturers`, { redirect: "manual" });
const directoryCache = directoryResponse.headers.get("cache-control") ?? "";
assert(!/private|no-store/i.test(directoryCache), `Unfiltered directory is not safely cached: ${directoryCache}.`);

const filteredResponse = await fetch(`${BASE_URL}/find-manufacturers?category=hot-sauce`, { redirect: "manual" });
const filteredHtml = await filteredResponse.text();
assert(filteredResponse.status === 200, `Filtered directory returned ${filteredResponse.status}.`);
assert(filteredHtml.includes('href="https://www.thelinelist.com/find-manufacturers"'), "Filtered directory canonical is missing.");
assert(/<meta name="robots" content="[^"]*noindex/i.test(filteredHtml), "Filtered directory is missing noindex.");

console.log(`Checked ${checked} sitemap URLs: direct 200, exact canonical, valid JSON-LD, and no trailing slash.`);
console.log(`Unfiltered directory cache header: ${directoryCache}`);
console.log("Filtered directory: canonical /find-manufacturers and noindex confirmed.");
} finally {
  if (server && server.exitCode === null) {
    const exited = new Promise((resolve) => server.once("exit", resolve));
    server.kill("SIGTERM");
    await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 2_000))]);
  }
}
