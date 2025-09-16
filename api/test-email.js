const nodemailer = require("nodemailer");

module.exports = async (req, res) => {
  try {
    const host = process.env.BREVO_HOST || "smtp-relay.brevo.com";
    const port = Number(process.env.BREVO_PORT || 587);
    const user = process.env.BREVO_USER;
    const pass = process.env.BREVO_PASS;
    const to = (req.query.to || process.env.LEAD_TO || "").trim();
    const from = (process.env.LEAD_FROM || user || "").trim();

    if (!user || !pass) return res.status(500).json({ ok:false, error:"Missing BREVO_USER or BREVO_PASS" });
    if (!to) return res.status(400).json({ ok:false, error:"Missing recipient: set LEAD_TO or ?to=" });
    if (!from) return res.status(500).json({ ok:false, error:"Missing LEAD_FROM and BREVO_USER" });

    const transporter = nodemailer.createTransport({
      host, port, secure: false,
      auth: { user, pass }
    });

    // Check credentials / connection first
    await transporter.verify();

    const info = await transporter.sendMail({
      from,
      to,
      subject: "Test email from masti-chat /api/test-email",
      text: "If you received this, Brevo SMTP is configured correctly.",
      html: "<p>If you received this, Brevo SMTP is configured correctly.</p>"
    });

    res.json({
      ok: true,
      messageId: info.messageId || null,
      accepted: info.accepted || [],
      rejected: info.rejected || [],
      envelope: info.envelope || null
    });
  } catch (err) {
    console.error("test-email error:", err?.message || err);
    res.status(500).json({ ok:false, error: String(err?.message || err) });
  }
};
