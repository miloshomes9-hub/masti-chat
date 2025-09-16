const ALLOWED_ORIGINS = ["https://www.musicmasti.com", "https://musicmasti.com"];

function setCors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
}

const SYSTEM_PROMPT = `You are the front-desk AI for Music Masti Magic (Bollywood/Desi Wedding DJ, MC, lighting, LED wall, dhol).
Coverage: Dallas, Austin, Houston (travel nationwide). Typical price ranges: 4-hr DJ+MC $1200–$2000; uplighting $200–$400; LED wall varies; travel fee after 30 miles.
Contact: info@musicmasti.com, phone: (972) 836-6972.

GOAL: Be helpful and concise. Collect leads smoothly, but DO NOT re-ask for info the user already provided.
COLLECT (only if missing): name; email OR phone; event date; city/venue; guest count; budget; interested services (DJ, MC, lighting, LED wall, dhol).
RULES: Infer from history, confirm what you captured, then ask only for missing items (one short line). Never repeat questions already asked. Keep answers brief and friendly.`;

// tiny helper
const matchOne = (re, s) => (s && s.match(re) ? s.match(re)[0] : null);

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Server missing OPENAI_API_KEY" });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const userMessage = ((body && body.message) || "").toString().slice(0, 2000);
    if (!userMessage) return res.status(400).json({ error: "Missing message" });

    // healthcheck
    if (userMessage === "__healthcheck__") return res.status(200).json({ reply: "ok" });

    // merge lead memory (client may send it; if not, we start empty)
    const incoming = body.lead || {};
    const lead = {
      name: incoming.name || null,
      email: incoming.email || null,
      phone: incoming.phone || null,
      date: incoming.date || null,
      city: incoming.city || null,
      guests: incoming.guests || null,
      budget: incoming.budget || null,
      services: incoming.services || null
    };

    // parse this turn for contact
    const emailNow = matchOne(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, userMessage);
    const phoneNow = matchOne(/(?:(?:\+1[\s.-]?)?)\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/, userMessage);
    if (emailNow) lead.email = emailNow;
    if (phoneNow) lead.phone = phoneNow;

    const hasContact = !!(lead.email || lead.phone);

    const required = ["name", "email|phone", "date", "city", "guests", "budget", "services"];
    const missing = [];
    for (const k of required) {
      if (k === "email|phone") {
        if (!hasContact) missing.push("email or phone");
      } else if (!lead[k]) {
        missing.push(k);
      }
    }

    const knownCtx = [
      `Known so far:`,
      `- Name: ${lead.name || "—"}`,
      `- Contact: ${lead.email || lead.phone || "—"}`,
      `- Date: ${lead.date || "—"}`,
      `- City/Venue: ${lead.city || "—"}`,
      `- Guests: ${lead.guests || "—"}`,
      `- Budget: ${lead.budget || "—"}`,
      `- Services: ${lead.services || "—"}`
    ].join("\n");

    const instruction = missing.length
      ? `${knownCtx}\n\nAsk ONLY for these missing items in one short sentence: ${missing.join(", ")}. Do not ask for anything already provided. Be brief and friendly.`
      : `${knownCtx}\n\nAll details captured. Briefly confirm and say we'll follow up by email/phone. Offer contact if needed: info@musicmasti.com, (972) 836-6972.`;

    const oaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "system", content: instruction },
          { role: "user", content: userMessage }
        ],
        temperature: 0.6,
        max_tokens: 350
      })
    });

    if (!oaiRes.ok) {
      const detail = await oaiRes.text();
      return res.status(200).json({
        reply:
          "Thanks! I’m having a brief snag. Could you rephrase that or ask a shorter question? You can also email info@musicmasti.com or call (972) 836-6972.",
        _debug: `OpenAI ${oaiRes.status}: ${detail.slice(0,300)}`
      });
    }

    const data = await oaiRes.json();
    const reply = data?.choices?.[0]?.message?.content || "Thanks! We’ll follow up shortly.";

    const captured = {};
    if (emailNow) captured.email = emailNow;
    if (phoneNow) captured.phone = phoneNow;

    return res.status(200).json({ reply, captured });
  } catch (err) {
    return res.status(200).json({
      reply:
        "Thanks! I’m having a brief snag. Could you rephrase that or ask a shorter question? You can also email info@musicmasti.com or call (972) 836-6972.",
      _debug: (err && err.message) ? err.message.slice(0,300) : String(err).slice(0,300)
    });
  }
};
