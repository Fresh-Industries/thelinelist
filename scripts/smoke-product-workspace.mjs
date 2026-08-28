const baseUrl = (process.env.WORKSPACE_SMOKE_URL || "http://127.0.0.1:3011").replace(/\/$/, "");
const cookies = new Map();

function rememberCookies(response) {
  const values = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie")].filter(Boolean);
  for (const value of values) {
    const pair = value.split(";", 1)[0];
    const separator = pair.indexOf("=");
    if (separator > 0) cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers);
  if (cookies.size) headers.set("Cookie", [...cookies].map(([name, value]) => `${name}=${value}`).join("; "));
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers, redirect: "manual" });
  rememberCookies(response);
  return response;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const idea = `Workspace smoke banana bread ${Date.now()}`;
const created = await request("/api/sourcing", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ idea }),
});
if (created.status !== 201) throw new Error(`Expected guest workspace 201, received ${created.status}: ${await created.text()}`);
const createdBody = await created.json();
const workspaceId = createdBody.workspace?.id;
assert(workspaceId, "Workspace creation did not return an ID.");
assert(cookies.has("tll_guest_workspace"), "Workspace creation did not set the HttpOnly guest credential cookie.");

const guestRead = await request(`/api/sourcing/${workspaceId}`);
assert(guestRead.status === 200, `Guest could not read the workspace: ${guestRead.status}`);

const email = `workspace-smoke-${Date.now()}@example.com`;
const signup = await request("/api/auth/sign-up/email", {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: baseUrl },
  body: JSON.stringify({ name: "Workspace Smoke", email, password: "workspace-smoke-password-2026" }),
});
if (!signup.ok) throw new Error(`Better Auth signup failed (${signup.status}): ${await signup.text()}`);

const claim = await request(`/api/sourcing/${workspaceId}/claim`, {
  method: "POST",
  headers: { Origin: baseUrl },
});
if (claim.status !== 200) throw new Error(`Workspace claim failed (${claim.status}): ${await claim.text()}`);

const claimedRead = await request(`/api/sourcing/${workspaceId}`);
assert(claimedRead.status === 200, `Authenticated owner could not read claimed workspace: ${claimedRead.status}`);
const claimedBody = await claimedRead.json();
assert(claimedBody.ownership === "user", `Expected user ownership after claim, received ${claimedBody.ownership}.`);

const products = await request("/products");
assert(products.status === 200, `Products page failed (${products.status}).`);
assert((await products.text()).includes(idea), "Claimed product did not appear on /products.");

console.log(`Workspace smoke passed for ${workspaceId}.`);
