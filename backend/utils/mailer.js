/* ---------- Mailer ----------
 * Placeholder email sender. No email provider is configured yet, so this
 * just logs the code to the server console (visible in Render's Logs tab)
 * instead of actually emailing it out.
 *
 * To wire up real delivery later, replace the body of sendOtpEmail with a
 * call to your provider — nothing else in the app needs to change, since
 * every caller only does: await sendOtpEmail(user.email, otp).
 *
 * Example with nodemailer + Gmail SMTP:
 *   const nodemailer = require("nodemailer");
 *   const transporter = nodemailer.createTransport({
 *     service: "gmail",
 *     auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
 *   });
 *   await transporter.sendMail({
 *     from: process.env.GMAIL_USER,
 *     to: toEmail,
 *     subject: "Your Vijaya Fabrics password reset code",
 *     text: `Your code is ${otp}. It expires in 10 minutes.`
 *   });
 *
 * Example with Resend or SendGrid: call their HTTP API with fetch() the
 * same way, using an API key from an env var.
 */
async function sendOtpEmail(toEmail, otp) {
  console.log(`[Vijaya Fabrics] Password reset code for ${toEmail}: ${otp} (valid for 10 minutes)`);
}

module.exports = { sendOtpEmail };