export const access = "public";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body || {};
  const urgency = body.urgency || "medium";
  const bill = body.bill || "mid";
  let score = urgency === "high" ? 94 : urgency === "medium" ? 87 : 68;

  if (bill === "high") score = Math.min(99, score + 4);

  const tier = score >= 88 ? "Hot" : score >= 75 ? "Warm" : "Nurture";
  const representative = score >= 88 ? "Riya Mehta" : score >= 75 ? "Kabir Singh" : "Ananya Rao";

  return res.status(200).json({
    ok: true,
    lead: {
      name: body.name || "Sample Lead",
      email: body.email || "lead@example.com"
    },
    qualification: { score, tier, urgency, bill },
    routing: { representative, territory: "East Valley" },
    crm: { provider: "HubSpot", stage: "Qualified", synced: true },
    followUp: { slack: true, sms: true, bookingReady: true }
  });
}
