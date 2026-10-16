# HelioGrid Energy — Public Lead Automation Demo

A public portfolio demo using HTML/CSS/JavaScript, a Vercel serverless API and Supabase Postgres.

## Sandbox behavior
- Anyone can submit a clearly labelled test lead.
- The API validates input, applies transparent deterministic rules-based qualification, assigns a queue, persists the workflow record and returns a workflow ID.
- Safe defaults are `DEMO_MODE=true` and `ENABLE_REAL_INTEGRATIONS=false`. HubSpot, Slack, email and generic webhooks do not run in sandbox mode.
- External integrations run only when explicitly enabled and credentials are configured. This may send real messages or create/update CRM contacts.
- Qualification is rules-based, not an AI model. Do not submit sensitive or real customer data.

## Deploy on Vercel + Supabase
1. Create a Supabase project.
2. Run `supabase/migrations/20261016000000_create_automation_leads.sql` in the Supabase SQL Editor.
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel server environment variables. Never expose the service-role key to the browser or commit it.
4. Set `DEMO_MODE=true`, `ENABLE_REAL_INTEGRATIONS=false`, and `APP_ORIGIN` to the exact public website origin.
5. Deploy this branch to a Vercel Preview deployment and test it before merging.
6. Enable integrations only after testing dedicated provider accounts, by setting `ENABLE_REAL_INTEGRATIONS=true` and configuring the relevant credentials.

The API fails closed if Supabase is missing or a lead cannot be saved. It never reports success for an unsaved lead.

## Local checks
Requires Node.js 20+.
```bash
npm test
npm run check
```
Use Vercel CLI for local serverless API testing; a static file server will not serve `/api/process-lead`.

## Database security
The migration enables RLS and revokes table access from `anon` and `authenticated`. Writes use the server-only service-role key. No public endpoint lists other visitors' leads.

## Known limitations
Add edge rate limiting and bot protection before broad promotion. Integrations run synchronously; move them to a durable queue if volume grows. The current row stores final workflow state, not independently durable per-step events.
