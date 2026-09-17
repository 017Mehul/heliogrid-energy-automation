export const access = "public";

function json(res, status, payload) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  return res.status(status).json(payload);
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return json(res, 204, {});
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method not allowed" });

  const body = req.body || {};
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const bill = ["low", "mid", "high"].includes(body.bill) ? body.bill : "mid";
  const urgency = ["low", "medium", "high"].includes(body.urgency) ? body.urgency : "medium";
  const message = String(body.message || "").trim();

  if (!name || !/^\S+@\S+\.\S+$/.test(email)) {
    return json(res, 400, { ok: false, error: "A valid name and email are required." });
  }

  let score = urgency === "high" ? 94 : urgency === "medium" ? 87 : 68;
  if (bill === "high") score = Math.min(99, score + 4);
  if (message.length >= 40) score = Math.min(99, score + 1);

  const tier = score >= 88 ? "Hot" : score >= 75 ? "Warm" : "Nurture";
  const representative = score >= 88 ? "Riya Mehta" : score >= 75 ? "Kabir Singh" : "Ananya Rao";

  return json(res, 200, {
    ok: true,
    mode: "demo",
    lead: { name, email, message },
    qualification: { score, tier, urgency, bill },
    routing: { representative, territory: "East Valley" },
    integrations: {
      crm: { provider: "HubSpot", status: "not_connected" },
      slack: { status: "not_connected" },
      sms: { provider: "Twilio", status: "not_connected" }
    },
    followUp: { bookingReady: true, messagePrepared: true },
    nextStep: "Add provider credentials to enable real CRM, Slack and SMS actions."
  });
}
