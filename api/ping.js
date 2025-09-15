module.exports = (req, res) => {
  res.json({ ok: true, hasKey: !!process.env.OPENAI_API_KEY });
};
