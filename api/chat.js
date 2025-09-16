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

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  try {
    // Vercel gives req.body as an object; keep string-safe too
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const userMessage = ((body && body.message) || "").toString().slice(0, 2000);
    if (!userMessage) return res.status(400).json({ error: "Missing message" });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Server missing OPENAI_API_KEY" });

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
          { role: "user", content: userMessage }
        ],
        temperature: 0.6,
        max_tokens: 400
      })
    });

    if (!oaiRes.ok) {
      const text = await oaiRes.text();
      return res.status(500).json({ error: "OpenAI error", status: oaiRes.status, detail: text });
    }

    const data = await oaiRes.json();
    const reply = data?.choices?.[0]?.message?.content || "Sorry, I had trouble responding.";
    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      detail: err?.message || String(err)
    });
  }
};
