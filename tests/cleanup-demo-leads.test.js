import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/cleanup-demo-leads.js";

function response() {
  return {
    statusCode: 200,
    headers: {},
    payload: null,
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.payload = value; return this; }
  };
}

test("retention endpoint rejects methods other than GET", async () => {
  const r = response();
  await handler({ method: "POST", headers: {} }, r);
  assert.equal(r.statusCode, 405);
});

test("retention endpoint fails closed when the cron secret is missing", async () => {
  const previous = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET;
  try {
    const r = response();
    await handler({ method: "GET", headers: {} }, r);
    assert.equal(r.statusCode, 503);
    assert.equal(r.payload.ok, false);
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});

test("retention endpoint rejects an invalid bearer secret before touching the database", async () => {
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "test-only-secret-value";
  try {
    const r = response();
    await handler({ method: "GET", headers: { authorization: "Bearer wrong-secret" } }, r);
    assert.equal(r.statusCode, 401);
    assert.deepEqual(r.payload, { ok: false, error: "Unauthorized" });
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});
