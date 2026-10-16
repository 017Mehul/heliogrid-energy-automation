import { timingSafeEqual } from "node:crypto";

let poolPromise;

function reply(res, status, data) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.status(status).json(data);
}

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  const header = typeof req.headers?.authorization === "string" ? req.headers.authorization : "";
  if (!secret || !header.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

async function getPool() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  if (!poolPromise) {
    poolPromise = import("pg").then(({ Pool }) => new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false },
      max: 1,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000
    }));
  }
  return poolPromise;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return reply(res, 405, { ok: false, error: "Method not allowed" });
  if (!process.env.CRON_SECRET) {
    console.error("Demo retention job is not configured: CRON_SECRET is missing");
    return reply(res, 503, { ok: false, error: "Retention job is not configured." });
  }
  if (!authorized(req)) return reply(res, 401, { ok: false, error: "Unauthorized" });

  try {
    const pool = await getPool();
    const leads = await pool.query(
      "DELETE FROM public.automation_leads WHERE mode = 'sandbox' AND created_at < now() - interval '30 days'"
    );
    const limits = await pool.query(
      "DELETE FROM public.automation_rate_limits WHERE updated_at < now() - interval '7 days'"
    );
    return reply(res, 200, {
      ok: true,
      retentionDays: 30,
      deletedSandboxLeads: leads.rowCount ?? 0,
      deletedRateLimitRows: limits.rowCount ?? 0
    });
  } catch (error) {
    console.error("Demo retention job failed", error);
    return reply(res, 503, { ok: false, error: "Retention cleanup failed; check server logs." });
  }
}
