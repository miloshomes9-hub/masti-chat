const ALLOWED_ORIGINS = ["https://www.musicmasti.com", "https://musicmasti.com"];

function setCors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
}

module.exports = (req, res) => {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  res.json({ ok: true, hasKey: !!process.env.OPENAI_API_KEY });
};
