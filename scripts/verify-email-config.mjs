import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    if (!key || process.env[key] !== undefined) continue;

    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

loadDotEnv(path.join(process.cwd(), ".env"));

const host = process.env.SMTP_HOST?.trim();
const port = Number(process.env.SMTP_PORT ?? "0");
const secure = process.env.SMTP_SECURE === "true" || port === 465;
const user = process.env.SMTP_USER?.trim();
const pass = process.env.SMTP_PASS?.trim();
const from = process.env.CONTACT_FROM_EMAIL || process.env.DEFAULT_FROM_EMAIL || user;
const to = process.env.TEST_EMAIL || process.env.CONTACT_TO_EMAIL;

if (!host || !Number.isFinite(port) || port <= 0) {
  console.error("SMTP_HOST and SMTP_PORT must be set before email can send.");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: user && pass ? { user, pass } : undefined,
});

console.log(`Checking SMTP connection to ${host}:${port} (${secure ? "secure" : "starttls"})...`);

try {
  await transporter.verify();
  console.log("SMTP connection verified.");

  if (process.env.SEND_TEST_EMAIL === "true") {
    if (!from || !to) {
      throw new Error("CONTACT_FROM_EMAIL and TEST_EMAIL or CONTACT_TO_EMAIL are required to send a test email.");
    }

    const result = await transporter.sendMail({
      from,
      to,
      subject: "Match 'n Move email test",
      text: "Your Match 'n Move app can send email through the configured Google Workspace SMTP route.",
    });

    console.log(`Test email queued: ${result.messageId}`);
  }
} catch (error) {
  console.error("SMTP verification failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
