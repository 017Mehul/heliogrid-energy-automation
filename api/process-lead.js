export const access = "public";

function json(res, status, payload) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", process.env.APP_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  return res.status(status).json(payload);
}

function safe(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[char]);
}

function firstLast(name) {
  const parts = String(name).trim().split(/\s+/);
  return { firstname: parts.shift() || "", lastname: parts.join(" ") };
}

async function sendWebhook(lead) {
  const url = process.env.AUTOMATION_WEBHOOK_URL;
  if (!url) return { provider: "Webhook", status: "not_configured" };
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lead)
  });
  if (!response.ok) throw new Error(`Webhook returned HTTP ${response.status}`);
  return { provider: "Webhook", status: "sent" };
}

async function sendSlack(lead) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return { provider: "Slack", status: "not_configured" };
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: {
      text: `🚨 New ${lead.qualification.tier} MG Labs Co. lead — ${lead.lead.name}`,
      blocks: [
        { type: "header", text: { type: "plain_text", text: `New ${lead.qualification.tier} lead` } },
        { type: "section", fields: [
          { type: "mrkdwn", text: `*Name*\n${lead.lead.name}` },
          { type: "mrkdwn", text: `*Email*\n${lead.lead.email}` },
          { type: "mrkdwn", text: `*Service*\n${lead.lead.service}` },
          { type: "mrkdwn", text: `*Score*\n${lead.qualification.score}/100` }
        ] }
      ]
    }
  });
  if (!response.ok) throw new Error(`Slack returned HTTP ${response.status}`);
  return { provider: "Slack", status: "sent" };
}

async function sendEmail(lead) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_NOTIFY_EMAIL;
  const from = process.env.LEAD_FROM_EMAIL;
  if (!key || !to || !from) return { provider: "Email", status: "not_configured" };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `[${lead.qualification.tier}] New MG Labs Co. lead — ${lead.lead.name}`,
      html: `
        <h2>New MG Labs Co. portfolio lead</h2>
        <p><strong>${safe(lead.lead.name)}</strong> submitted an inquiry.</p>
        <p><strong>Email:</strong> ${safe(lead.lead.email)}<br>
        <strong>Phone:</strong> ${safe(lead.lead.phone || "Not provided")}<br>
        <strong>Service:</strong> ${safe(lead.lead.service)}<br>
        <strong>Budget:</strong> ${safe(lead.lead.budget)}<br>
        <strong>Timeline:</strong> ${safe(lead.lead.timeline)}<br>
        <strong>Score:</strong> ${lead.qualification.score}/100<br>
        <strong>Priority:</strong> ${safe(lead.qualification.tier)}</p>
        <p><strong>Message</strong><br>${safe(lead.lead.message || "No message")}</p>
      `
    })
  });
  if (!response.ok) throw new Error(`Email failed: ${(await response.text()).slice(0, 160)}`);
  const data = await response.json();
  return { provider: "Email", status: "sent", id: data.id };
}

async function syncHubSpot(lead) {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) return { provider: "HubSpot", status: "not_configured" };

  const { firstname, lastname } = firstLast(lead.lead.name);
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const searchResponse = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
    method: "POST",
    headers,
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: lead.lead.email }] }],
      properties: ["email", "firstname", "lastname", "phone"]
    })
  });
  if (!searchResponse.ok) throw new Error(`HubSpot search returned HTTP ${searchResponse.status}`);

  const search = await searchResponse.json();
  const properties = {
    email: lead.lead.email,
    firstname,
    lastname,
    ...(lead.lead.phone ? { phone: lead.lead.phone } : {})
  };

  if (search.results?.[0]?.id) {
    const id = search.results[0].id;
    const updateResponse = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ properties })
    });
    if (!updateResponse.ok) throw new Error(`HubSpot update returned HTTP ${updateResponse.status}`);
    return { provider: "HubSpot", status: "updated", id };
  }

  const createResponse = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
    method: "POST",
    headers,
    body: JSON.stringify({ properties })
  });
  if (!createResponse.ok) throw new Error(`HubSpot create returned HTTP ${createResponse.status}`);
  const created = await createResponse.json();
  return { provider: "HubSpot", status: "created", id: created.id };
}

async function runIntegration(name, fn) {
  try {
    return await fn();
  } catch (error) {
    return { provider: name, status: "failed", error: error instanceof Error ? error.message : "Integration failed" };
  }
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return json(res, 204, {});
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method not allowed" });

  const body = req.body || {};
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const phone = String(body.phone || "").trim();
  const service = ["AI Videos", "Websites", "Apps", "UI/UX"].includes(body.service) ? body.service : "Websites";
  const budget = ["Under ₹10k", "₹10k–₹25k", "₹25k–₹50k", "₹50k+"].includes(body.budget) ? body.budget : "₹10k–₹25k";
  const timeline = ["Just exploring", "Within 1 month", "Within 2 weeks", "ASAP"].includes(body.timeline) ? body.timeline : "Within 1 month";
  const message = String(body.message || "").trim();

  if (!name || !/^\S+@\S+\.\S+$/.test(email)) {
    return json(res, 400, { ok: false, error: "A valid name and email are required." });
  }

  const budgetScore = { "Under ₹10k": 12, "₹10k–₹25k": 22, "₹25k–₹50k": 30, "₹50k+": 36 }[budget];
  const timelineScore = { "Just exploring": 8, "Within 1 month": 18, "Within 2 weeks": 25, "ASAP": 30 }[timeline];
  const serviceScore = { "AI Videos": 18, "Websites": 16, "Apps": 16, "UI/UX": 14 }[service];
  const messageScore = message.length >= 60 ? 12 : message.length >= 25 ? 7 : 3;
  const score = Math.min(99, budgetScore + timelineScore + serviceScore + messageScore);
  const tier = score >= 72 ? "Hot" : score >= 52 ? "Warm" : "Nurture";

  const workflowId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const lead = {
    workflowId,
    createdAt,
    source: "mglabsco_portfolio",
    lead: { name, email, phone, service, budget, timeline, message },
    qualification: { score, tier },
    routing: { representative: "MG Labs Co. — New Business", queue: "portfolio-leads" }
  };

  const integrations = {
    webhook: await runIntegration("Webhook", () => sendWebhook(lead)),
    crm: await runIntegration("HubSpot", () => syncHubSpot(lead)),
    slack: await runIntegration("Slack", () => sendSlack(lead)),
    email: await runIntegration("Email", () => sendEmail(lead))
  };

  const liveStatuses = Object.values(integrations).filter((item) => item.status !== "not_configured");
  const failed = liveStatuses.filter((item) => item.status === "failed");
  const successful = liveStatuses.filter((item) => !["failed", "not_configured"].includes(item.status));

  return json(res, 200, {
    ok: true,
    mode: "live",
    workflowId,
    createdAt,
    lead: lead.lead,
    qualification: lead.qualification,
    routing: lead.routing,
    integrations,
    automation: {
      status: failed.length ? (successful.length ? "partial" : "failed") : (successful.length ? "completed" : "backend_only"),
      configuredIntegrations: liveStatuses.length,
      successfulIntegrations: successful.length
    },
    followUp: { bookingReady: Boolean(process.env.BOOKING_URL), bookingUrl: process.env.BOOKING_URL || null }
  });
}
