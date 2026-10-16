import { Pool } from "pg";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });
  const expected = process.env.MIGRATION_SECRET;
  if (!expected || req.query?.token !== expected) return res.status(404).json({ ok: false });
  if (!process.env.DATABASE_URL) return res.status(503).json({ ok: false, error: "Database not configured" });

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 5000
  });

  try {
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      CREATE TABLE IF NOT EXISTS public.automation_leads (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_id uuid NOT NULL UNIQUE,
        source text NOT NULL DEFAULT 'heliogrid_public_demo',
        mode text NOT NULL CHECK (mode IN ('sandbox','live')),
        name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
        email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254),
        phone text,
        service text NOT NULL CHECK (service IN ('AI Videos','Websites','Apps','UI/UX')),
        budget text NOT NULL CHECK (budget IN ('Under ₹10k','₹10k–₹25k','₹25k–₹50k','₹50k+')),
        timeline text NOT NULL CHECK (timeline IN ('Just exploring','Within 1 month','Within 2 weeks','ASAP')),
        message text CHECK (message IS NULL OR char_length(message) <= 2000),
        score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
        tier text NOT NULL CHECK (tier IN ('Hot','Warm','Nurture')),
        routing jsonb NOT NULL DEFAULT '{}'::jsonb,
        integrations jsonb NOT NULL DEFAULT '{}'::jsonb,
        workflow_status text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS automation_leads_created_at_idx ON public.automation_leads(created_at DESC);
    `);
    const result = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'automation_leads'");
    return res.status(200).json({ ok: result.rowCount === 1, table: result.rows[0]?.table_name ?? null });
  } catch (error) {
    console.error("Temporary schema migration failed", error);
    return res.status(500).json({ ok: false, error: "Migration failed; inspect server logs" });
  } finally {
    await pool.end();
  }
}
