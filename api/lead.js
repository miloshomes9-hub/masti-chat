const nodemailer = require("nodemailer");

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

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const {
      name = "",
      email = "",
      phone = "",
      date = "",
      city = "",
      guests = "",
      budget = "",
      message = "",
      source = "chat-widget"
    } = body;

    // Basic guard: require at least one contact
    if (!email && !phone) {
      return res.status(400).json({ ok: false, error: "Provide email or phone" });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.BREVO_HOST || "smtp-relay.brevo.com",
      port: Number(process.env.BREVO_PORT || 587),
      secure: false,
      auth: {
        user: process.env.BREVO_USER,
        pass: process.env.BREVO_PASS
      }
    });

    const to = process.env.LEAD_TO || "info@musicmasti.com";
    const from = process.env.LEAD_FROM || "leads@musicmasti.com";

    const subject = `New Chat Lead: ${name || email || phone}`;
    const text =
`New DJ inquiry from the chatbot

Name:   ${name}
Email:  ${email}
Phone:  ${phone}
Date:   ${date}
City:   ${city}
Guests: ${guests}
Budget: ${budget}

Message:
${message}

Source: ${source}
Timestamp: ${new Date().toISOString()}`;

    await transporter.sendMail({
      from,
      to,
      subject,
      text
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Lead email error:", err?.response?.data || err?.message || err);
    return res.status(500).json({ ok: false, error: "Email send failed" });
  }
};
