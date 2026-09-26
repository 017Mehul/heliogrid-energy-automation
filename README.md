# HelioGrid Energy — AI Lead Automation

A live portfolio automation for capturing, qualifying, routing, notifying, and handing off inbound leads.

The workflow accepts a real web lead, scores it, routes it, and can trigger real HubSpot, Slack, email, webhook, and booking actions from a Vercel serverless function.

## Live Demo

- **Production:** https://heliogrid-energy.themglabs.com
- **Vercel:** https://heliogrid-energy-automation.vercel.app

## What it does

- Responsive, case-study style landing page
- Real lead intake form\n- Serverless qualification and routing\n- Real external actions when environment variables are configured
- Serverless lead-processing API
- Deterministic lead qualification and scoring
- Hot / Warm / Nurture classification
- Automatic representative routing
- Step-by-step workflow activity timeline
- API error handling and retry state
- Browser-persisted recent lead history for the portfolio UI
- Live automation telemetry
- Appointment handoff state
- HubSpot contact sync\n- Slack notifications\n- Resend email notifications\n- n8n / Make / Zapier-compatible webhook\n- Live booking handoff

## Architecture

```text
┌──────────────────────┐
│   Lead Intake UI     │
│ HTML + CSS + JS      │
└──────────┬───────────┘
           │ POST /api/process-lead
           ▼
┌──────────────────────┐
│ Vercel Serverless API│
│ Validation           │
│ Qualification        │
│ Scoring              │
│ Routing              │
└──────────┬───────────┘
           │ JSON response
           ▼
┌──────────────────────┐
│   Automation UI      │
│ Timeline + Result    │
│ Telemetry + History  │
└──────────┬───────────┘
           │ integration-ready
           ▼
┌──────────────────────────────────┐
│ CRM · Slack · SMS · Calendar     │
│ External credentials required   │
└──────────────────────────────────┘
```

## Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Node.js serverless function
- **Hosting:** Vercel
- **Persistence:** Browser localStorage for demo history
- **API:** REST-style JSON endpoint

No frontend framework or build step is required.

## Project Structure

```text
.
├── index.html              # Main portfolio experience
├── app.js                  # Interactive frontend workflow
├── api/
│   └── process-lead.js     # Lead qualification API
├── README.md
└── .gitignore
```

## Run locally

Because the project uses a Vercel serverless function, run it with the Vercel CLI for the closest local environment:

```bash
npm install -g vercel
vercel dev
```

Then open the local URL shown by Vercel.

For the static UI only, a simple server also works:

```bash
npx serve .
```

The static server will not provide the `/api/process-lead` serverless endpoint.

## Environment variables\n\nSee `.env.example`. At minimum, configure `RESEND_API_KEY`, `LEAD_NOTIFY_EMAIL`, and `LEAD_FROM_EMAIL` for a real email notification workflow. Add HubSpot, Slack, a generic automation webhook, and a booking URL as needed.\n\n## API

### POST `/api/process-lead`

Example request:

```json
{
  "name": "Alex Sharma",
  "email": "alex@example.com",
  "bill": "high",
  "urgency": "high",
  "message": "Interested in a rooftop solar consultation."
}
```

The API returns a structured response containing:

- qualification score
- lead tier
- routing representative
- integration status
- workflow metadata

## Integration status

The UI is designed around real-world CRM and notification handoffs, but external services are intentionally not hard-coded into the demo.

**HubSpot, Slack, SMS and calendar actions require their respective credentials/webhooks and are not represented as live external actions unless configured.**

This keeps the public portfolio project safe to deploy without exposing secrets.

## Security

- Never commit API keys, OAuth tokens, webhook secrets or private credentials.
- Store production secrets in Vercel Environment Variables.
- Treat all submitted lead information as demo data unless a production privacy/security review has been completed.
- Do not place server-side credentials in `app.js` or `index.html`.

## Portfolio context

This project is presented as an automation case study rather than a real HelioGrid customer system. The data, company identity and workflow examples are for demonstration purposes.

---

Built as a full-stack automation portfolio project by **Mehul Gupta**.
