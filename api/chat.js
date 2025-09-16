// api/chat.js  (CommonJS, Vercel Serverless Function)

// ---- CORS ----
const ALLOWED_ORIGINS = [
  "https://www.musicmasti.com",
  "https://musicmasti.com",
];

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

// ---- Prompt ----
const SYSTEM_PROMPT = `You are the front-desk AI for Music Masti Magic (Bollywood/Desi Wedding DJ, MC, lighting, LED wall, dhol).

Positioning & Specialties:
- We specialize in fusion and mixed-culture weddings: South Asian × American/Western, interfaith, and luxury multi-day events (sangeet, baraat, ceremony, reception).
- We also handle American weddings, corporate events, and multicultural celebrations.
- Comfortable curating music for blended audiences (Bollywood, Punjabi, Gujarati, South Indian, plus Top 40, EDM, Hip-Hop, Latin).

Coverage & Pricing:
- Coverage: Dallas, Austin, Houston (travel nationwide).
- Typical price ranges: 4-hr DJ+MC $1500–$2000; uplighting $250–$500; LED wall varies; travel fee after 30 miles.
- Contact: info@musicmasti.com, phone: (972) 836-6972.

Team:
- DJ Manish (Manesh Lilani): Lead DJ/MC with 15+ years of experience; expert in fusion weddings and American/South Asian mixed crowds; high-energy MC and crowd engagement.
- Notable performances: alongside Hrithik Roshan, Nargis Fakhri, Sushmita Sen, Shankar-Ehsaan-Loy, Anupam Kher, Daisy Shah, Farhan Akhtar, Fawad Khan, Kartik Aaryan, and others.

GOAL:
Be helpful, warm, and concise. Provide accurate info based on the facts above. If a user asks for something not covered here, respond briefly and offer to follow up via email/phone.

LEAD CAPTURE (only if missing):
Collect: name; email OR phone; event date; city/venue; guest count; budget; interested services (DJ, MC, lighting, LED wall, dhol).

RULES:
- Never re-ask for details the user already gave; confirm what’s known and ask ONLY for missing items (one short line).
- Keep answers brief and friendly; emphasize our fusion/mixed-wedding expertise when relevant.
- If unsure, say we’ll confirm by email/phone and provide: info@musicmasti.com, (972) 836-6972.`;

// ---- Helper: parse JSON body safely ----
function getJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try {
    return req.body ? JSON.parse(req.body) : {};
  } catch {
    return {};
  }
}

// ---- Handler (CommonJS export) ----
module.exports = async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const body = getJsonBody(req);
  const userMessage = (body && body.message) ? String(body.message) : "";

  // Healthcheck
  if (userMessage === "__healthcheck__") {
    return res.status(200).json({ reply: "ok" });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText);
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || "Sorry, I had trouble responding.";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Chat API error:", err?.message || err);
    return res.status(500).json({
      error: "Server error",
      detail: err?.message || String(err),
    });
  }
};
