const OpenAI = require("openai");

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

// Serverless handler
module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Server missing OPENAI_API_KEY" });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const userMessage = (body.message || "").toString().slice(0, 2000);
    if (!userMessage) return res.status(400).json({ error: "Missing message" });

    const openai = new OpenAI({ apiKey });

    // Use a fast, cost-effective model; adjust if your key restricts models
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage }
      ],
      temperature: 0.6,
      max_tokens: 400
    });

    const reply = completion?.choices?.[0]?.message?.content || "Sorry, I had trouble responding.";
    return res.status(200).json({ reply });
  } catch (err) {
    // Return the error so we can see useful details
    return res.status(500).json({
      error: "Server error",
      detail: err?.message || String(err)
    });
  }
};
