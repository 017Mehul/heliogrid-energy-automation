import assert from "node:assert/strict";

const baseUrl = (process.env.SMOKE_BASE_URL || "https://heliogrid-energy.themglabs.com").replace(/\/$/, "");

async function check(name, run) {
  try {
    await run();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}: ${error.message}`);
    process.exitCode = 1;
  }
}

await check("production homepage and sandbox disclosure", async () => {
  const response = await fetch(baseUrl, { redirect: "error" });
  assert.equal(response.status, 200, `homepage returned HTTP ${response.status}`);
  const html = await response.text();
  assert.match(html, /SANDBOX/i);
  assert.match(html, /Load sample lead/i);
  assert.match(html, /Do not enter real customer or sensitive information/i);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.ok(response.headers.get("content-security-policy"), "CSP header is missing");
});

await check("production app bundle and workflow result UI", async () => {
  const response = await fetch(`${baseUrl}/app.js`, { redirect: "error" });
  assert.equal(response.status, 200, `app.js returned HTTP ${response.status}`);
  const js = await response.text();
  assert.match(js, /workflow-id/);
  assert.match(js, /Clear browser history/);
  assert.match(js, /disabled in sandbox/);
});

await check("API method guard", async () => {
  const response = await fetch(`${baseUrl}/api/process-lead`, { method: "GET", redirect: "error" });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

await check("API preflight", async () => {
  const response = await fetch(`${baseUrl}/api/process-lead`, {
    method: "OPTIONS",
    headers: { Origin: baseUrl, "Access-Control-Request-Method": "POST" },
    redirect: "error"
  });
  assert.equal(response.status, 204);
});

await check("invalid submission rejected before database writes", async () => {
  const response = await fetch(`${baseUrl}/api/process-lead`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: baseUrl },
    body: JSON.stringify({}),
    redirect: "error"
  });
  assert.equal(response.status, 400, `invalid submission returned HTTP ${response.status}`);
  const body = await response.json();
  assert.equal(body.ok, false);
  assert.match(body.error, /name is required/i);
});

await check("honeypot submission rejected before database writes", async () => {
  const response = await fetch(`${baseUrl}/api/process-lead`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: baseUrl },
    body: JSON.stringify({ website: "https://spam.invalid" }),
    redirect: "error"
  });
  assert.equal(response.status, 400, `honeypot submission returned HTTP ${response.status}`);
  const body = await response.json();
  assert.equal(body.ok, false);
  assert.equal(body.error, "Invalid submission.");
});

if (process.exitCode) {
  console.error("Production smoke checks failed.");
} else {
  console.log("All safe production smoke checks passed. No valid lead was submitted.");
}
