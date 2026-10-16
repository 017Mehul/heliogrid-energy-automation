# HelioGrid Energy — Public Lead Automation Demo

A public portfolio demo using HTML/CSS/JavaScript, a Vercel serverless API and Render PostgreSQL.

**Live demo:** https://heliogrid-energy.themglabs.com

## Sandbox behavior
- Anyone can submit a clearly labelled test lead.
- The API validates input, applies deterministic rules-based qualification, assigns a queue, persists the workflow record and returns a workflow ID.
- Safe defaults are `DEMO_MODE=true` and `ENABLE_REAL_INTEGRATIONS=false`. HubSpot, Slack, email and generic webhooks do not run in sandbox mode.
- Qualification is rules-based, not an AI model. Use fictional contact details only; do not submit sensitive or real customer data.
- The visible recent-activity panel is browser-local, not a shared database dashboard. Clearing browser history does not delete database records.

## Architecture and deploy
1. Vercel hosts the static site and serverless API; Render PostgreSQL stores workflow records.
2. Set `DATABASE_URL` and `PGSSLMODE=require` as server-side Vercel environment variables. Never put the database URL in frontend code or commit it.
3. Set `DEMO_MODE=true`, `ENABLE_REAL_INTEGRATIONS=false`, and `APP_ORIGIN` to the exact public website origin.
4. Set a long random `CRON_SECRET` in the Vercel **Production** environment. It protects the daily retention job in `api/cleanup-demo-leads.js`.
5. Deploy to a Preview environment and run the checks before promoting to production.

## Safeguards
- Server-side validation, same-origin checks, a honeypot, and database-backed rate limiting (10 accepted attempts per client IP hash per 15-minute window).
- Rate-limit storage contains a SHA-256 IP hash, not the raw client IP.
- Vercel security headers include CSP, frame denial, MIME-sniffing protection, a strict referrer policy and restricted browser permissions.
- The daily Vercel Cron job deletes sandbox leads older than **30 days** and rate-limit rows older than **7 days**. It requires `CRON_SECRET`; if the secret is missing, the endpoint fails closed.
- GitHub Actions runs unit tests and syntax checks on changes, plus safe production smoke checks every six hours. Smoke checks verify the page, static app bundle, method guard, preflight, invalid-input rejection and honeypot rejection. They do **not** submit a valid lead or create database records.
- The public API does not provide an endpoint to list or read other visitors' leads.

## Local checks
Requires Node.js 20+ and dependencies installed with `npm install`.

```bash
npm test
npm run check
npm run smoke:production
```

The production smoke test is read-only with respect to lead data. It intentionally does not submit a valid lead. A full valid submission should be performed manually when needed, then checked in the database without exposing visitor data.

## Database and operations notes
- Render currently uses a free PostgreSQL instance with no high availability. Confirm the database expiration/retention details in Render and migrate or upgrade before the displayed free-instance expiry date (**15 November 2026**) if the demo must remain available.
- The database network allowlist currently permits all source IPs because Vercel serverless egress is not configured with a fixed IP in this setup. TLS and database credentials still apply, but this is broader than ideal; use static egress/private networking or a managed connection approach before handling real customer data.
- Review backups/recovery options and test restoration before relying on this for business-critical leads.
- External integrations are intentionally off by default. Only enable them after configuring dedicated test accounts and reviewing the real side effects.
- If this becomes a real lead-capture service, publish a privacy notice and obtain appropriate consent. The 30-day sandbox retention job is not a substitute for a complete legal/privacy review.
- At higher volume, move synchronous integrations to a durable queue and record independently durable per-step events.

## License and portfolio note
This repository demonstrates a test workflow and operational safeguards. It does not claim business outcomes, conversion lifts, or that external actions occur while sandbox mode is enabled.
