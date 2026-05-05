import nodemailer from "nodemailer";
import { SITE_EMAILS } from "@/lib/site-emails";

type ContactEmailInput = {
  name: string;
  email: string;
  message: string;
};

type MoverAuthEmailInput = {
  email: string;
  name?: string | null;
  verificationUrl?: string;
  resetUrl?: string;
};

type ReviewSurveyEmailInput = {
  email: string;
  customerName?: string | null;
  moverCompanyName: string;
  reviewUrl: string;
  moveRoute: string;
  expiresAt: Date;
};

function getFirstConfiguredValue(...values: Array<string | undefined>) {
  return values.find((value) => value?.trim())?.trim() ?? "";
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim() ?? "";
  const port = Number(process.env.SMTP_PORT ?? "0");
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const user = process.env.SMTP_USER?.trim() ?? "";
  const pass = process.env.SMTP_PASS?.trim() ?? "";

  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : 0,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  };
}

function isSmtpConfigured() {
  const config = getSmtpConfig();
  return Boolean(config.host && config.port);
}

function getContactNotificationConfig() {
  const to = getFirstConfiguredValue(
    process.env.CONTACT_TO_EMAIL,
    process.env.SUPPORT_EMAIL,
    SITE_EMAILS.support,
  );
  const from = getFirstConfiguredValue(
    process.env.CONTACT_FROM_EMAIL,
    process.env.INFO_FROM_EMAIL,
    process.env.DEFAULT_FROM_EMAIL,
    SITE_EMAILS.info,
  );

  return {
    configured: isSmtpConfigured() && Boolean(to && from),
    to,
    from,
  };
}

function getAuthEmailConfig() {
  const from = getFirstConfiguredValue(
    process.env.AUTH_FROM_EMAIL,
    process.env.NO_REPLY_FROM_EMAIL,
    process.env.DEFAULT_FROM_EMAIL,
    process.env.CONTACT_FROM_EMAIL,
    SITE_EMAILS.noReply,
  );

  return {
    configured: isSmtpConfigured() && Boolean(from),
    from,
  };
}

function getReviewEmailConfig() {
  const from = getFirstConfiguredValue(
    process.env.REVIEW_FROM_EMAIL,
    process.env.FEEDBACK_FROM_EMAIL,
    process.env.DEFAULT_FROM_EMAIL,
    process.env.CONTACT_FROM_EMAIL,
    SITE_EMAILS.feedback,
  );

  return {
    configured: isSmtpConfigured() && Boolean(from),
    from,
  };
}

export function getContactEmailConfig() {
  return getContactNotificationConfig();
}

function getTransporter() {
  const config = getSmtpConfig();

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });
}

export async function sendContactNotification(input: ContactEmailInput) {
  const config = getContactNotificationConfig();
  if (!config.configured) {
    return { sent: false, skipped: true as const };
  }

  const transporter = getTransporter();

  await transporter.sendMail({
    from: config.from,
    to: config.to,
    replyTo: input.email,
    subject: `New Match 'n Move contact message from ${input.name}`,
    text: [
      "A new contact form submission was received.",
      "",
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      "",
      "Message:",
      input.message,
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2 style="margin-bottom:16px;">New Match 'n Move contact message</h2>
        <p><strong>Name:</strong> ${escapeHtml(input.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(input.email)}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(input.message).replace(/\n/g, "<br />")}</p>
      </div>
    `,
  });

  return { sent: true, skipped: false as const };
}

export async function sendMoverVerificationEmail(input: MoverAuthEmailInput) {
  const config = getAuthEmailConfig();
  if (!config.configured || !input.verificationUrl) {
    return { sent: false, skipped: true as const };
  }

  const transporter = getTransporter();
  const friendlyName = input.name?.trim() || "there";

  await transporter.sendMail({
    from: config.from,
    to: input.email,
    subject: "Verify your Match 'n Move mover account",
    text: [
      `Hi ${friendlyName},`,
      "",
      "Welcome to Match 'n Move. Please verify your email address to secure your mover account.",
      "",
      input.verificationUrl,
      "",
      "If you did not create this account, you can ignore this email."
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2>Verify your Match &apos;n Move mover account</h2>
        <p>Hi ${escapeHtml(friendlyName)},</p>
        <p>Welcome to Match &apos;n Move. Please verify your email address to secure your mover account.</p>
        <p style="margin:24px 0;">
          <a href="${escapeHtml(input.verificationUrl)}" style="display:inline-block;padding:12px 20px;border-radius:14px;background:#5f6ee8;color:#ffffff;text-decoration:none;font-weight:600;">
            Verify email
          </a>
        </p>
        <p>If the button doesn&apos;t work, use this link:</p>
        <p><a href="${escapeHtml(input.verificationUrl)}">${escapeHtml(input.verificationUrl)}</a></p>
        <p>If you did not create this account, you can ignore this email.</p>
      </div>
    `,
  });

  return { sent: true, skipped: false as const };
}

export async function sendMoverPasswordResetEmail(input: MoverAuthEmailInput) {
  const config = getAuthEmailConfig();
  if (!config.configured || !input.resetUrl) {
    return { sent: false, skipped: true as const };
  }

  const transporter = getTransporter();
  const friendlyName = input.name?.trim() || "there";

  await transporter.sendMail({
    from: config.from,
    to: input.email,
    subject: "Reset your Match 'n Move password",
    text: [
      `Hi ${friendlyName},`,
      "",
      "We received a request to reset your Match 'n Move password.",
      "",
      input.resetUrl,
      "",
      "If you did not request this, you can ignore this email."
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2>Reset your Match &apos;n Move password</h2>
        <p>Hi ${escapeHtml(friendlyName)},</p>
        <p>We received a request to reset your Match &apos;n Move password.</p>
        <p style="margin:24px 0;">
          <a href="${escapeHtml(input.resetUrl)}" style="display:inline-block;padding:12px 20px;border-radius:14px;background:#de7a3a;color:#ffffff;text-decoration:none;font-weight:600;">
            Reset password
          </a>
        </p>
        <p>If the button doesn&apos;t work, use this link:</p>
        <p><a href="${escapeHtml(input.resetUrl)}">${escapeHtml(input.resetUrl)}</a></p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `,
  });

  return { sent: true, skipped: false as const };
}

export async function sendReviewSurveyEmail(input: ReviewSurveyEmailInput) {
  const config = getReviewEmailConfig();
  if (!config.configured) {
    return { sent: false, skipped: true as const };
  }

  const transporter = getTransporter();
  const friendlyName = input.customerName?.trim() || "there";
  const expiryLabel = new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(input.expiresAt);

  await transporter.sendMail({
    from: config.from,
    to: input.email,
    subject: `How was your move with ${input.moverCompanyName}?`,
    text: [
      `Hi ${friendlyName},`,
      "",
      `Thanks for booking ${input.moverCompanyName} through Match 'n Move for your ${input.moveRoute} move.`,
      "We'd love your verified customer review.",
      "",
      input.reviewUrl,
      "",
      `This secure review link expires on ${expiryLabel} and can only be used once.`,
      "If you've already shared feedback, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;background:#f8fafc;padding:24px;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:24px;padding:32px;border:1px solid #e2e8f0;">
          <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:#e0f2fe;color:#075985;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">
            Verified customer review
          </div>
          <h2 style="margin:20px 0 12px;font-size:30px;line-height:1.1;">How was your move with ${escapeHtml(input.moverCompanyName)}?</h2>
          <p>Hi ${escapeHtml(friendlyName)},</p>
          <p>Thanks for booking <strong>${escapeHtml(input.moverCompanyName)}</strong> through Match &apos;n Move for your ${escapeHtml(input.moveRoute)} move.</p>
          <p>Your review helps keep ratings honest and gives future customers trustworthy feedback from real completed jobs.</p>
          <p style="margin:28px 0;">
            <a href="${escapeHtml(input.reviewUrl)}" style="display:inline-block;padding:14px 22px;border-radius:16px;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:700;">
              Leave your review
            </a>
          </p>
          <p style="margin-bottom:0;">This secure link expires on <strong>${escapeHtml(expiryLabel)}</strong> and can only be used once.</p>
          <p style="margin-top:12px;">If the button doesn&apos;t work, use this link:</p>
          <p><a href="${escapeHtml(input.reviewUrl)}">${escapeHtml(input.reviewUrl)}</a></p>
        </div>
      </div>
    `,
  });

  return { sent: true, skipped: false as const };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
