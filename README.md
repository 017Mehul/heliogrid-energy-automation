# HelioGrid Energy — AI Lead Automation

A production-style portfolio case study for a solar lead qualification and routing workflow.

The project demonstrates how an inbound residential-solar lead can move from capture → qualification → routing → CRM/notification handoff → appointment readiness through a single automated pipeline.

## Live Demo

- **Production:** https://heliogrid-energy.themglabs.com
- **Vercel:** https://heliogrid-energy-automation.vercel.app

## What it demonstrates

- Responsive, case-study style landing page
- Interactive lead intake form
- Serverless lead-processing API
- Deterministic lead qualification and scoring
- Hot / Warm / Nurture classification
- Automatic representative routing
- Step-by-step workflow activity timeline
- API error handling and retry state
- Browser-persisted recent lead history
- Live automation telemetry
- Appointment handoff state
- Integration-ready architecture for CRM, Slack and SMS

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

## API

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
