module.exports = async (req, res) => {
  return res.status(200).json({ ok: true, ts: Date.now() });
};
