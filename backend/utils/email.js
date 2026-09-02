const nodemailer = require("nodemailer");

function buildTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465, // true for port 465, false for 587/others
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

async function sendPasswordResetEmail(toEmail, resetUrl) {
  const transporter = buildTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: toEmail,
    subject: "Reset your CloudVault password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Reset your password</h2>
        <p>We received a request to reset your CloudVault password. This link expires in 1 hour.</p>
        <p><a href="${resetUrl}" style="display:inline-block;background:#c9a227;color:#10161d;padding:10px 18px;text-decoration:none;border-radius:4px;font-weight:600;">Reset password</a></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p style="color:#888;font-size:12px;">If the button doesn't work, copy this link into your browser:<br>${resetUrl}</p>
      </div>
    `,
  });
}

module.exports = { sendPasswordResetEmail };
