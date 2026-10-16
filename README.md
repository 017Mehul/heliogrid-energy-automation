# HelioGrid Energy — Public Lead Automation Demo

A public portfolio demo using HTML/CSS/JavaScript, a Vercel serverless API and Render PostgreSQL.

## Sandbox behavior
- Anyone can submit a clearly labelled test lead.
- The API validates input, applies deterministic rules-based qualification, assigns a queue, persists the workflow record and returns a workflow ID.
- Safe defaults are `DEMO_MODE=true` and `ENABLE_REAL_INTEGRATIONS=false`. HubSpot, Slack, email and generic webhooks do not run in sandbox mode.
- External integrations run only when explicitly enabled and credentials are configured. This may send real messages or create/update CRM contacts.
- Qualification is rules-based, not an AI model. Do not submit sensitive or real customer data.

## Deploy on Vercel + Render PostgreSQL
1. Create a PostgreSQL database in Render and copy its **External Database URL** for a Vercel-hosted API. Keep the URL private.
2. Run `migrations/001_create_automation_leads.sql` against that database using Render's PSQL command or a PostgreSQL client.
3. Set `DATABASE_URL` in Vercel server environment variables. Do not put it in frontend code or commit it.
4. Set `PGSSLMODE=require`, `DEMO_MODE=true`, `ENABLE_REAL_INTEGRATIONS=false`, and `APP_ORIGIN` to the exact public website origin.
5. Deploy this branch to a Vercel Preview deployment and test it before merging.
6. Enable integrations only after testing dedicated provider accounts, by setting `ENABLE_REAL_INTEGRATIONS=true` and configuring the relevant credentials.

The API fails closed if the database is missing or a lead cannot be saved. It never reports success for an unsaved lead. The app's visible recent-activity panel remains browser-local and is not a shared database dashboard.

## Local checks
Requires Node.js 20+ and dependencies installed with `npm install`.
```bash
npm test
npm run check
```
Use Vercel CLI for local serverless API testing; a static file server will not serve `/api/process-lead`.

## Database security
The database is accessed only from the server-side API using a private connection string. The public endpoint does not list or expose other visitors' leads.

## Known limitations
Add edge rate limiting and bot protection before broad promotion. Integrations run synchronously; move them to a durable queue if volume grows. The current row stores final workflow state, not independently durable per-step events.
