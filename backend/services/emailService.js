function isEmailEnabled() {
  //Read .env variables. I did this, since you can then easily enable/disable emails
  const enabled =
    (process.env.ENABLE_EMAILS || "").trim().toLowerCase() === "true";
  const hasKey = Boolean(process.env.BREVO_API_KEY);
  const hasSender = Boolean(process.env.BREVO_SENDER);
  return enabled && hasKey && hasSender;
}
//Function that sends an email
async function sendEmail({ to, subject, html, text }) {
  if (!isEmailEnabled()) {
    console.log("[Email] Skipped (feature off or missing env).", {
      ENABLE_EMAILS: process.env.ENABLE_EMAILS,
      hasKey: !!process.env.BREVO_API_KEY,
      hasSender: !!process.env.BREVO_SENDER,
    });
    return { ok: true, skipped: true, reason: "disabled" };
  }

  if (!to) {
    console.log("[Email] Skipped (no recipient).");
    return { ok: true, skipped: true, reason: "no-recipient" };
  }

  if (!subject) subject = "(no subject)";

  if (!html && !text) text = "(empty message)";

  //Collect data into payload, and then sent to BREVO in the correct format
  const payload = {
    sender: { email: process.env.BREVO_SENDER },
    to: [{ email: to }],
    subject,
    ...(html ? { htmlContent: html } : {}),
    ...(text ? { textContent: text } : {}),
  };

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      console.log("[Email] Sent", {
        status: res.status,
        messageId: data.messageId,
      });
      return { ok: true, status: res.status, data };
    } else {
      console.error("[Email] Brevo error", { status: res.status, data });
      return { ok: false, status: res.status, error: data };
    }
  } catch (err) {
    console.error("[Email] Network/Runtime error:", err.message);
    return { ok: false, error: err.message };
  }
}

function sendEmailAsync(args) {
  sendEmail(args).catch((e) => console.error("[Email] Async send failed:", e));
}

module.exports = {
  sendEmail,
  sendEmailAsync,
  isEmailEnabled,
};
