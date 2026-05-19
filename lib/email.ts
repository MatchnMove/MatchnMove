import nodemailer from "nodemailer";
import SMTPPool from "nodemailer/lib/smtp-pool";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { EmailDeliveryStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
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

type EmailKind = "contact_notification" | "mover_verification" | "mover_password_reset" | "review_survey";

type EmailMessage = {
  kind: EmailKind;
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
};

type EmailSendResult = {
  sent: boolean;
  skipped: boolean;
  queued: boolean;
  emailDeliveryId?: string;
  error?: string;
};

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_PROCESS_LIMIT = 50;

function getFirstConfiguredValue(...values: Array<string | undefined>) {
  return values.find((value) => value?.trim())?.trim() ?? "";
}

function getNumberEnv(name: string, fallback: number) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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
    user,
  };
}

function isSmtpConfigured() {
  const config = getSmtpConfig();
  return Boolean(config.host && config.port);
}

function getEffectiveFrom(configuredFrom: string) {
  const smtpUser = process.env.SMTP_USER?.trim() ?? "";
  const forceSmtpUserFrom = process.env.EMAIL_FORCE_SMTP_USER_FROM === "true";
  return forceSmtpUserFrom && smtpUser ? smtpUser : configuredFrom;
}

function getContactNotificationConfig() {
  const to = getFirstConfiguredValue(
    process.env.CONTACT_TO_EMAIL,
    process.env.SUPPORT_EMAIL,
    SITE_EMAILS.support,
  );
  const from = getEffectiveFrom(getFirstConfiguredValue(
    process.env.CONTACT_FROM_EMAIL,
    process.env.INFO_FROM_EMAIL,
    process.env.DEFAULT_FROM_EMAIL,
    SITE_EMAILS.contact,
  ));

  return {
    configured: isSmtpConfigured() && Boolean(to && from),
    to,
    from,
  };
}

function getAuthEmailConfig() {
  const from = getEffectiveFrom(getFirstConfiguredValue(
    process.env.AUTH_FROM_EMAIL,
    process.env.NO_REPLY_FROM_EMAIL,
    process.env.DEFAULT_FROM_EMAIL,
    process.env.CONTACT_FROM_EMAIL,
    SITE_EMAILS.noReply,
  ));

  return {
    configured: isSmtpConfigured() && Boolean(from),
    from,
  };
}

function getReviewEmailConfig() {
  const from = getEffectiveFrom(getFirstConfiguredValue(
    process.env.REVIEW_FROM_EMAIL,
    process.env.FEEDBACK_FROM_EMAIL,
    process.env.DEFAULT_FROM_EMAIL,
    process.env.CONTACT_FROM_EMAIL,
    SITE_EMAILS.feedback,
  ));

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
  if (process.env.EMAIL_SMTP_POOL === "true") {
    const poolOptions: SMTPPool.Options = {
      pool: true,
      host: config.host,
      port: config.port,
      secure: config.secure,
      name: process.env.SMTP_NAME || "matchnmove.co.nz",
      auth: config.auth,
      maxConnections: getNumberEnv("EMAIL_SMTP_MAX_CONNECTIONS", 3),
      maxMessages: getNumberEnv("EMAIL_SMTP_MAX_MESSAGES", 100),
    };

    return nodemailer.createTransport(poolOptions);
  }

  const options: SMTPTransport.Options = {
    host: config.host,
    port: config.port,
    secure: config.secure,
    name: process.env.SMTP_NAME || "matchnmove.co.nz",
    auth: config.auth,
  };

  return nodemailer.createTransport(options);
}

function getRetryDelayMs(attempts: number) {
  const baseMs = getNumberEnv("EMAIL_RETRY_BASE_MS", 60_000);
  const maxMs = getNumberEnv("EMAIL_RETRY_MAX_MS", 30 * 60_000);
  return Math.min(baseMs * 2 ** Math.max(attempts - 1, 0), maxMs);
}

function getMaxAttempts() {
  return getNumberEnv("EMAIL_MAX_ATTEMPTS", DEFAULT_MAX_ATTEMPTS);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown email delivery error.";
}

async function sendViaSmtp(message: EmailMessage) {
  const transporter = getTransporter();
  return transporter.sendMail({
    from: message.from,
    to: message.to,
    replyTo: message.replyTo,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}

async function queueAndTrySend(message: EmailMessage, configured: boolean): Promise<EmailSendResult> {
  if (!configured) {
    return { sent: false, skipped: true, queued: false };
  }

  const emailDelivery = await prisma.emailDelivery.create({
    data: {
      kind: message.kind,
      recipient: message.to,
      from: message.from,
      replyTo: message.replyTo,
      subject: message.subject,
      text: message.text,
      html: message.html,
      maxAttempts: getMaxAttempts(),
    },
  });

  const deliveryResult = await deliverQueuedEmail(emailDelivery.id);

  return {
    sent: deliveryResult.sent,
    skipped: false,
    queued: !deliveryResult.sent,
    emailDeliveryId: emailDelivery.id,
    error: deliveryResult.error,
  };
}

export async function deliverQueuedEmail(emailDeliveryId: string) {
  const current = await prisma.emailDelivery.findUnique({
    where: { id: emailDeliveryId },
  });

  if (!current || current.status === EmailDeliveryStatus.SENT) {
    return { sent: Boolean(current?.status === EmailDeliveryStatus.SENT), skipped: true as const };
  }

  if (current.attempts >= current.maxAttempts) {
    return { sent: false, skipped: true as const, error: current.lastError ?? "Maximum attempts reached." };
  }

  const claim = await prisma.emailDelivery.updateMany({
    where: {
      id: current.id,
      status: current.status,
      attempts: current.attempts,
    },
    data: {
      status: EmailDeliveryStatus.SENDING,
      attempts: { increment: 1 },
      lastError: null,
    },
  });

  if (claim.count !== 1) {
    return { sent: false, skipped: true as const, error: "Email delivery was already claimed." };
  }

  const claimed = await prisma.emailDelivery.findUniqueOrThrow({
    where: { id: current.id },
  });

  try {
    const providerResult = await sendViaSmtp({
      kind: claimed.kind as EmailKind,
      from: claimed.from,
      to: claimed.recipient,
      replyTo: claimed.replyTo ?? undefined,
      subject: claimed.subject,
      text: claimed.text,
      html: claimed.html,
    });

    await prisma.emailDelivery.update({
      where: { id: claimed.id },
      data: {
        status: EmailDeliveryStatus.SENT,
        sentAt: new Date(),
        providerMessageId: providerResult.messageId,
        lastError: null,
      },
    });

    return { sent: true, skipped: false as const, messageId: providerResult.messageId };
  } catch (error) {
    const attempts = claimed.attempts;
    const exhausted = attempts >= claimed.maxAttempts;
    const message = getErrorMessage(error);

    await prisma.emailDelivery.update({
      where: { id: claimed.id },
      data: {
        status: exhausted ? EmailDeliveryStatus.FAILED : EmailDeliveryStatus.QUEUED,
        lastError: message,
        nextAttemptAt: new Date(Date.now() + getRetryDelayMs(attempts)),
      },
    });

    return { sent: false, skipped: false as const, error: message };
  }
}

export async function processEmailQueue(limit = DEFAULT_PROCESS_LIMIT) {
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 250);
  const now = new Date();
  const staleSendingMs = getNumberEnv("EMAIL_SENDING_STALE_MS", 10 * 60_000);
  await prisma.emailDelivery.updateMany({
    where: {
      status: EmailDeliveryStatus.SENDING,
      attempts: {
        lt: getMaxAttempts(),
      },
      updatedAt: {
        lt: new Date(Date.now() - staleSendingMs),
      },
    },
    data: {
      status: EmailDeliveryStatus.QUEUED,
      nextAttemptAt: now,
      lastError: "Recovered from a stale sending attempt.",
    },
  });

  const candidates = await prisma.emailDelivery.findMany({
    where: {
      status: {
        in: [EmailDeliveryStatus.QUEUED, EmailDeliveryStatus.FAILED],
      },
      attempts: {
        lt: getMaxAttempts(),
      },
      nextAttemptAt: {
        lte: now,
      },
    },
    orderBy: [
      { nextAttemptAt: "asc" },
      { createdAt: "asc" },
    ],
    take: safeLimit,
  });

  const results = [];
  for (const candidate of candidates) {
    const result = await deliverQueuedEmail(candidate.id);
    results.push({
      id: candidate.id,
      kind: candidate.kind,
      recipient: candidate.recipient,
      sent: result.sent,
      skipped: result.skipped,
      error: result.error,
    });
  }

  return {
    processed: results.length,
    sent: results.filter((result) => result.sent).length,
    failed: results.filter((result) => result.error && !result.sent).length,
    results,
  };
}

export async function sendContactNotification(input: ContactEmailInput) {
  const config = getContactNotificationConfig();
  const message: EmailMessage = {
    kind: "contact_notification",
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
  };

  return queueAndTrySend(message, config.configured);
}

export async function sendMoverVerificationEmail(input: MoverAuthEmailInput) {
  const config = getAuthEmailConfig();
  if (!input.verificationUrl) {
    return { sent: false, skipped: true as const, queued: false };
  }

  const friendlyName = input.name?.trim() || "there";
  const message: EmailMessage = {
    kind: "mover_verification",
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
      "If you did not create this account, you can ignore this email.",
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
  };

  return queueAndTrySend(message, config.configured);
}

export async function sendMoverPasswordResetEmail(input: MoverAuthEmailInput) {
  const config = getAuthEmailConfig();
  if (!input.resetUrl) {
    return { sent: false, skipped: true as const, queued: false };
  }

  const friendlyName = input.name?.trim() || "there";
  const message: EmailMessage = {
    kind: "mover_password_reset",
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
      "If you did not request this, you can ignore this email.",
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
  };

  return queueAndTrySend(message, config.configured);
}

export async function sendReviewSurveyEmail(input: ReviewSurveyEmailInput) {
  const config = getReviewEmailConfig();
  const friendlyName = input.customerName?.trim() || "there";
  const expiryLabel = new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(input.expiresAt);

  const message: EmailMessage = {
    kind: "review_survey",
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
  };

  return queueAndTrySend(message, config.configured);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
