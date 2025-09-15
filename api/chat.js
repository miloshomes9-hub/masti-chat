const { OpenAI } = require("openai");

const ALLOWED_ORIGINS = ["https://www.musicmasti.com", "https://musicmasti.com"];

function setCors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
}

const SYSTEM_PROMPT = `You are the front-desk AI for Music Masti Magic.
- Services: Bollywood/Desi Wedding DJ, MC, lighting, LED wall, dhol players.
- Coverage: Dallas, Austin, Houston (travel nationwide).
- Typical price ranges: 4-hr DJ+MC $1200–$2000; uplighting $200–$400; LED wall varies; travel fee after 30 miles.
- Contact: info@musicmasti.com, phone: (972)836-6972.
Be professional, concise, and capture leads (name, email, phone, date, city, guest count, budget).`;

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end(); // preflight

  try {
    if (req.method !== "POST") return res.status(405).end("Method Not Allowed");
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ error: "Missing 'message'." });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message }
      ],
      temperature: 0.3
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() || "Thanks!";
    res.setHeader("Content-Type", "application/json");
    return res.status(200).end(JSON.stringify({ reply }));
  } catch (err) {
    console.error("OpenAI error:", err?.response?.data || err?.message || err);
    res.status(500).json({ error: "Server error" });
  }
};
