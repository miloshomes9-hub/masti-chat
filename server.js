const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
require("dotenv").config();

const app = express();

// (Tighten origins later to only your domain)
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are the front-desk AI for Music Masti Magic.
- Services: Bollywood/Desi Wedding DJ, MC, lighting, LED wall, dhol players.
- Coverage: Dallas, Austin, Houston (travel nationwide).
- Typical price ranges: 4-hr DJ+MC $1200–$2000; uplighting $200–$400; LED wall varies; travel fee after 30 miles.
- Contact: info@musicmasti.com, phone: (___) ___-____.
Be professional, concise, and capture leads (name, email, phone, date, city, guest count, budget).`;

// Health/landing
app.get("/", (req, res) => {
  res.send("Music Masti Magic Chat API is running. Use POST /api/chat");
});

// Diagnostics: confirm env is loaded on Vercel
app.get("/api/ping", (req, res) => {
  res.json({ ok: true, hasKey: Boolean(process.env.OPENAI_API_KEY) });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ error: "Missing 'message'." });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message }
      ],
      temperature: 0.3
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() || "Thanks!";
    res.json({ reply });
  } catch (err) {
    console.error("OpenAI error:", err?.response?.data || err?.message || err);
    res.status(500).send("Server error");
  }
});

const PORT = process.env.PORT || 3001;   // ← declare ONCE

// Export for Vercel (no app.listen in serverless)
module.exports = app;

// Local dev: node server.js
if (require.main === module) {
  app.listen(PORT, () => console.log(`Chat API running on port ${PORT}`));
}const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
require("dotenv").config();

const app = express();

// (You can tighten this later to only your domain)
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are the front-desk AI for Music Masti Magic.
- Services: Bollywood/Desi Wedding DJ, MC, lighting, LED wall, dhol players.
- Coverage: Dallas, Austin, Houston (travel nationwide).
- Typical price ranges: 4-hr DJ+MC $1200–$2000; uplighting $200–$400; LED wall varies; travel fee after 30 miles.
- Contact: info@musicmasti.com, phone: (___) ___-____.
Be professional, concise, and capture leads (name, email, phone, date, city, guest count, budget).`;

// Health/landing (so the root URL isn't 404)
app.get("/", (req, res) => {
  res.send("Music Masti Magic Chat API is running. Use POST /api/chat");
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ error: "Missing 'message'." });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message }
      ],
      temperature: 0.3
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() || "Thanks!";
    res.json({ reply });
  } catch (err) {
    console.error("OpenAI error:", err?.response?.data || err?.message || err);
    res.status(500).send("Server error");
  }
});

const PORT = process.env.PORT || 3001;

// ✅ Vercel needs this export (no app.listen in serverless)
module.exports = app;

// ✅ Local dev still works: `node server.js`
if (require.main === module) {
  app.listen(PORT, () => console.log(`Chat API running on port ${PORT}`));
}pp.post("/api/chat", async (req, res) => {
   try {
      const { message } = req.body;

      const completion = await openai.chat.completions.create({
         model: "gpt-4o-mini",
         messages: [
           { role: "system", content: SYSTEM_PROMPT },
           { role: "user", content: message }
         ]
      });

      res.json({ reply: completion.choices[0].message.content });
   } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error generating reply" });
   }
});

const PORT = process.env.PORT || 3001;

// Export app for Vercel
module.exports = app;

// Only start a local server if run directly
if (require.main === module) {
  app.listen(PORT, () => console.log(`Chat API running on port ${PORT}`));
}const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are the front-desk AI for Music Masti Magic.
- Services: Bollywood/Desi Wedding DJ, MC, lighting, LED wall, dhol players.
- Coverage: Dallas, Austin, Houston (travel nationwide).
- Typical price ranges: 4-hr DJ+MC $1200–$2000; uplighting $200–$400; LED wall varies; travel fee after 30 miles.
- Contact: info@musicmasti.com, phone: (___) ___-____.
Be professional, concise, and capture leads (name, email, phone, date, city, guest count, budget).`;

app.post("/api/chat", async (req, res) => {
  try {
    const userMsg = req.body?.message || "";
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg }
      ],
      temperature: 0.3,
    });
    res.json({ reply: completion.choices[0].message.content.trim() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error generating reply" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Chat API running on port ${PORT}`));
