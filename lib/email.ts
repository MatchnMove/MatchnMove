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

type EmailTheme = {
  accent: string;
  accentDark: string;
  accentSoft: string;
  accentTint: string;
  background: string;
  eyebrowBackground: string;
  eyebrowText: string;
  button: string;
  buttonShadow: string;
  iconBackground: string;
  iconText: string;
};

type EmailShellInput = {
  theme: EmailTheme;
  preheader: string;
  eyebrow: string;
  title: string;
  intro: string;
  bodyHtml: string;
  cta?: {
    href: string;
    label: string;
  };
  footerNote: string;
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

function getPublicBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://www.matchnmove.co.nz").replace(/\/$/, "");
}

function getLogoUrl() {
  return `${getPublicBaseUrl()}/logo.webp`;
}

function getIconUrl() {
  return `${getPublicBaseUrl()}/icon.svg`;
}

function renderEmailShell(input: EmailShellInput) {
  const ctaHtml = input.cta
    ? `
      <tr>
        <td align="center" style="padding:4px 36px 18px;">
          <a href="${escapeHtml(input.cta.href)}" style="display:inline-block;border-radius:12px;background:${input.theme.button};box-shadow:0 14px 26px ${input.theme.buttonShadow};color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:800;line-height:22px;padding:16px 34px;text-decoration:none;">
            ${escapeHtml(input.cta.label)}&nbsp;&nbsp;&rarr;
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding:0 36px 26px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;">
            <tr>
              <td style="border-top:1px solid #d9e1ea;font-size:1px;line-height:1px;">&nbsp;</td>
              <td align="center" style="color:#728197;font-family:Arial,sans-serif;font-size:13px;line-height:18px;padding:0 14px;width:34px;">or</td>
              <td style="border-top:1px solid #d9e1ea;font-size:1px;line-height:1px;">&nbsp;</td>
            </tr>
          </table>
          <p style="color:#64748b;font-family:Arial,sans-serif;font-size:13px;line-height:21px;margin:18px 0 0;text-align:center;">
            If the button does not work, copy and paste this link into your browser:<br />
            <a href="${escapeHtml(input.cta.href)}" style="color:${input.theme.accentDark};font-weight:700;word-break:break-all;">${escapeHtml(input.cta.href)}</a>
          </p>
        </td>
      </tr>
    `
    : "";

  return `<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(input.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:${input.theme.background};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${escapeHtml(input.preheader)}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${input.theme.background};border-collapse:collapse;width:100%;">
      <tr>
        <td align="center" style="padding:28px 14px;">
          <table role="presentation" width="720" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid #eadfce;border-collapse:separate;border-radius:26px;box-shadow:0 28px 70px rgba(15,23,42,0.14);overflow:hidden;width:100%;max-width:720px;">
            <tr>
              <td style="background:#06214a;background-image:linear-gradient(135deg,#061c3e 0%,#082f5f 58%,#063b68 100%);padding:28px 36px 34px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;">
                  <tr>
                    <td align="left" style="vertical-align:middle;">
                      <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                        <tr>
                          <td style="vertical-align:middle;">
                            <img src="${escapeHtml(getIconUrl())}" width="54" height="54" alt="" style="border:0;border-radius:14px;display:block;height:54px;width:54px;" />
                          </td>
                          <td style="padding-left:14px;vertical-align:middle;">
                            <div style="color:#ffffff;font-family:Arial,sans-serif;font-size:28px;font-weight:800;letter-spacing:-0.5px;line-height:32px;">
                              Match <span style="color:#23c5a7;">'n</span> Move
                            </div>
                            <div style="color:#d9e9f7;font-family:Arial,sans-serif;font-size:14px;font-weight:700;line-height:20px;margin-top:3px;">
                              New Zealand moving marketplace
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td align="right" style="vertical-align:middle;">
                      <div style="color:#2dd4bf;font-family:Arial,sans-serif;font-size:12px;font-weight:800;letter-spacing:2px;line-height:18px;text-transform:uppercase;">
                        Moving made simple
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:#0ea5a4;background-image:linear-gradient(90deg,#0ea5a4 0%,#4fd1a5 36%,#f0b338 72%,#f97316 100%);font-size:1px;line-height:8px;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:34px 36px 10px;">
                <span style="display:inline-block;border-radius:999px;background:${input.theme.eyebrowBackground};color:${input.theme.eyebrowText};font-family:Arial,sans-serif;font-size:12px;font-weight:800;letter-spacing:1.7px;line-height:16px;padding:10px 16px;text-transform:uppercase;">
                  ${escapeHtml(input.eyebrow)}
                </span>
                <h1 style="color:#071d3c;font-family:Arial,sans-serif;font-size:34px;font-weight:900;letter-spacing:-0.7px;line-height:40px;margin:24px 0 14px;">
                  ${escapeHtml(input.title)}
                </h1>
                <p style="color:#50627d;font-family:Arial,sans-serif;font-size:17px;line-height:27px;margin:0 0 22px;">
                  ${escapeHtml(input.intro)}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 36px;">
                ${input.bodyHtml}
              </td>
            </tr>
            ${ctaHtml}
            <tr>
              <td style="padding:0 36px 34px;">
                ${renderSupportBox(input.theme)}
                <p style="color:#64748b;font-family:Arial,sans-serif;font-size:13px;line-height:21px;margin:22px 0 0;">
                  ${escapeHtml(input.footerNote)}
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#fff8ef;padding:28px 36px 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;">
                  <tr>
                    <td style="vertical-align:middle;">
                      <img src="${escapeHtml(getLogoUrl())}" width="188" alt="Match 'n Move" style="border:0;display:block;height:auto;max-width:188px;" />
                    </td>
                    <td align="right" style="color:#334155;font-family:Arial,sans-serif;font-size:14px;line-height:21px;vertical-align:middle;">
                      <strong style="color:#071d3c;">${escapeHtml(SITE_EMAILS.support)}</strong><br />
                      We typically reply within one business day.
                    </td>
                  </tr>
                </table>
                <div style="border-top:1px solid #e7dbc9;color:#64748b;font-family:Arial,sans-serif;font-size:12px;line-height:19px;margin-top:24px;padding-top:18px;text-align:center;">
                  <a href="${escapeHtml(getPublicBaseUrl())}/faq" style="color:#0b315f;text-decoration:none;">Help centre</a>
                  <span style="color:#d97706;"> &nbsp;&bull;&nbsp; </span>
                  <a href="${escapeHtml(getPublicBaseUrl())}/privacy" style="color:#0b315f;text-decoration:none;">Privacy policy</a>
                  <span style="color:#d97706;"> &nbsp;&bull;&nbsp; </span>
                  <a href="${escapeHtml(getPublicBaseUrl())}/terms" style="color:#0b315f;text-decoration:none;">Terms of service</a>
                  <br />
                  &copy; ${new Date().getFullYear()} Match 'n Move. All rights reserved.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderDetailRow(label: string, value: string) {
  return `
    <tr>
      <td style="border-bottom:1px solid #e2e8f0;color:#071d3c;font-family:Arial,sans-serif;font-size:14px;font-weight:800;padding:16px 18px;width:32%;">
        ${escapeHtml(label)}
      </td>
      <td style="border-bottom:1px solid #e2e8f0;color:#4b5d76;font-family:Arial,sans-serif;font-size:15px;line-height:22px;padding:16px 18px;">
        ${escapeHtml(value)}
      </td>
    </tr>
  `;
}

function renderDetailTable(rows: string) {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid #d8e0ea;border-collapse:separate;border-radius:14px;margin:0 0 24px;overflow:hidden;width:100%;">
      ${rows}
    </table>
  `;
}

function renderNoteBox(content: string, theme: EmailTheme) {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${theme.accentTint};border:1px solid ${theme.accentSoft};border-collapse:separate;border-radius:14px;margin:0 0 26px;width:100%;">
      <tr>
        <td style="padding:18px 20px;width:52px;vertical-align:top;">
          <div style="background:${theme.iconBackground};border-radius:999px;color:${theme.iconText};font-family:Arial,sans-serif;font-size:22px;font-weight:900;line-height:46px;text-align:center;width:46px;">!</div>
        </td>
        <td style="color:#173355;font-family:Arial,sans-serif;font-size:16px;line-height:25px;padding:18px 20px 18px 0;vertical-align:middle;">
          ${content}
        </td>
      </tr>
    </table>
  `;
}

function renderSupportBox(theme: EmailTheme) {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0fbf7;border:1px solid #d7f0e8;border-collapse:separate;border-radius:14px;margin:0;width:100%;">
      <tr>
        <td style="padding:18px 20px;width:54px;vertical-align:middle;">
          <div style="background:#d7f7ec;border-radius:999px;color:#0f766e;font-family:Arial,sans-serif;font-size:20px;font-weight:900;line-height:44px;text-align:center;width:44px;">?</div>
        </td>
        <td style="color:#475569;font-family:Arial,sans-serif;font-size:14px;line-height:21px;padding:18px 0;vertical-align:middle;">
          <strong style="color:#071d3c;font-size:16px;">Need help?</strong><br />
          Our support team is here if you have any questions.
        </td>
        <td align="right" style="padding:18px 20px;vertical-align:middle;">
          <a href="mailto:${escapeHtml(SITE_EMAILS.support)}" style="color:${theme.accentDark};font-family:Arial,sans-serif;font-size:14px;font-weight:800;text-decoration:none;">Contact support &rarr;</a>
        </td>
      </tr>
    </table>
  `;
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

  if (!configured) {
    await prisma.emailDelivery.update({
      where: { id: emailDelivery.id },
      data: {
        status: EmailDeliveryStatus.FAILED,
        lastError: "SMTP email is not configured. Check SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS.",
      },
    });

    return {
      sent: false,
      skipped: true,
      queued: true,
      emailDeliveryId: emailDelivery.id,
      error: "SMTP email is not configured.",
    };
  }

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

export async function getEmailDiagnostics(limit = 10) {
  const smtp = getSmtpConfig();
  const [statusCounts, recentDeliveries] = await Promise.all([
    prisma.emailDelivery.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),
    prisma.emailDelivery.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: Math.min(Math.max(Math.floor(limit), 1), 50),
      select: {
        id: true,
        kind: true,
        recipient: true,
        from: true,
        subject: true,
        status: true,
        attempts: true,
        maxAttempts: true,
        lastError: true,
        sentAt: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    smtp: {
      configured: isSmtpConfigured(),
      host: smtp.host || null,
      port: smtp.port || null,
      secure: smtp.secure,
      hasAuthUser: Boolean(smtp.user),
      hasAuthPassword: Boolean(process.env.SMTP_PASS?.trim()),
      smtpName: process.env.SMTP_NAME || "matchnmove.co.nz",
      forceSmtpUserFrom: process.env.EMAIL_FORCE_SMTP_USER_FROM === "true",
      contactFrom: getContactNotificationConfig().from || null,
      authFrom: getAuthEmailConfig().from || null,
      reviewFrom: getReviewEmailConfig().from || null,
    },
    queue: {
      counts: Object.fromEntries(statusCounts.map((item) => [item.status, item._count._all])),
      recentDeliveries,
    },
  };
}

export async function sendContactNotification(input: ContactEmailInput) {
  const config = getContactNotificationConfig();
  const theme: EmailTheme = {
    accent: "#0284c7",
    accentDark: "#0369a1",
    accentSoft: "#bae6fd",
    accentTint: "#f0f9ff",
    background: "#fff7ed",
    eyebrowBackground: "#fff1e6",
    eyebrowText: "#c2410c",
    button: "#ea580c",
    buttonShadow: "rgba(234,88,12,0.28)",
    iconBackground: "#ffedd5",
    iconText: "#ea580c",
  };
  const subject = `New Match 'n Move contact message from ${input.name}`;
  const bodyHtml = `
    ${renderDetailTable(`
      ${renderDetailRow("Name", input.name)}
      ${renderDetailRow("Email", input.email)}
    `)}
    ${renderNoteBox(`<strong style="color:#071d3c;">Message received</strong><br />${escapeHtml(input.message).replace(/\n/g, "<br />")}`, theme)}
  `;
  const message: EmailMessage = {
    kind: "contact_notification",
    from: config.from,
    to: config.to,
    replyTo: input.email,
    subject,
    text: [
      "A new contact form submission was received.",
      "",
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      "",
      "Message:",
      input.message,
    ].join("\n"),
    html: renderEmailShell({
      theme,
      preheader: `New contact message from ${input.name}.`,
      eyebrow: "Contact request",
      title: "New message for Match 'n Move",
      intro: "A visitor submitted the contact form. Reply directly to the customer using the email address below.",
      bodyHtml,
      footerNote: "This notification was generated from the Match 'n Move contact page.",
    }),
  };

  return queueAndTrySend(message, config.configured);
}

export async function sendMoverVerificationEmail(input: MoverAuthEmailInput) {
  const config = getAuthEmailConfig();
  if (!input.verificationUrl) {
    return { sent: false, skipped: true as const, queued: false };
  }

  const theme: EmailTheme = {
    accent: "#14b8a6",
    accentDark: "#0f766e",
    accentSoft: "#bceee6",
    accentTint: "#f0fdfa",
    background: "#fff7ed",
    eyebrowBackground: "#e9fbf6",
    eyebrowText: "#0f766e",
    button: "#0f766e",
    buttonShadow: "rgba(15,118,110,0.28)",
    iconBackground: "#ccfbf1",
    iconText: "#0f766e",
  };
  const friendlyName = input.name?.trim() || "there";
  const subject = "Verify your Match 'n Move mover account";
  const bodyHtml = `
    ${renderNoteBox(
      "Your mover account is almost ready. Confirming your email helps keep your dashboard, quote leads, and customer messages protected.",
      theme,
    )}
    ${renderDetailTable(`
      ${renderDetailRow("Account", input.email)}
      ${renderDetailRow("Link expires", "48 hours")}
    `)}
  `;
  const message: EmailMessage = {
    kind: "mover_verification",
    from: config.from,
    to: input.email,
    subject,
    text: [
      `Hi ${friendlyName},`,
      "",
      "Welcome to Match 'n Move. Please verify your email address to secure your mover account.",
      "",
      input.verificationUrl,
      "",
      "If you did not create this account, you can ignore this email.",
    ].join("\n"),
    html: renderEmailShell({
      theme,
      preheader: "Verify your mover account to finish setting up your Match 'n Move dashboard.",
      eyebrow: "Mover verification",
      title: `Welcome, ${friendlyName}`,
      intro: "Please verify your email address so we can keep your mover account secure and ready for customer leads.",
      bodyHtml,
      cta: {
        href: input.verificationUrl,
        label: "Verify email",
      },
      footerNote: "If you did not create a Match 'n Move mover account, you can safely ignore this email.",
    }),
  };

  return queueAndTrySend(message, config.configured);
}

export async function sendMoverPasswordResetEmail(input: MoverAuthEmailInput) {
  const config = getAuthEmailConfig();
  if (!input.resetUrl) {
    return { sent: false, skipped: true as const, queued: false };
  }

  const theme: EmailTheme = {
    accent: "#f97316",
    accentDark: "#c2410c",
    accentSoft: "#fed7aa",
    accentTint: "#fff7ed",
    background: "#fff7ed",
    eyebrowBackground: "#fff1e6",
    eyebrowText: "#c2410c",
    button: "#ea580c",
    buttonShadow: "rgba(234,88,12,0.30)",
    iconBackground: "#ffedd5",
    iconText: "#ea580c",
  };
  const friendlyName = input.name?.trim() || "there";
  const subject = "Reset your Match 'n Move password";
  const bodyHtml = `
    ${renderNoteBox(
      "Use the secure link below to choose a new password. For your protection, this reset link is short lived.",
      theme,
    )}
    ${renderDetailTable(`
      ${renderDetailRow("Account", input.email)}
      ${renderDetailRow("Link expires", "2 hours")}
    `)}
  `;
  const message: EmailMessage = {
    kind: "mover_password_reset",
    from: config.from,
    to: input.email,
    subject,
    text: [
      `Hi ${friendlyName},`,
      "",
      "We received a request to reset your Match 'n Move password.",
      "",
      input.resetUrl,
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: renderEmailShell({
      theme,
      preheader: "Use this secure link to reset your Match 'n Move mover password.",
      eyebrow: "Account recovery",
      title: "Reset your mover password",
      intro: `Hi ${friendlyName}, we received a request to reset the password for your Match 'n Move mover account.`,
      bodyHtml,
      cta: {
        href: input.resetUrl,
        label: "Reset password",
      },
      footerNote: "If you did not request a password reset, no action is needed and your current password remains unchanged.",
    }),
  };

  return queueAndTrySend(message, config.configured);
}

export async function sendReviewSurveyEmail(input: ReviewSurveyEmailInput) {
  const config = getReviewEmailConfig();
  const theme: EmailTheme = {
    accent: "#22c55e",
    accentDark: "#047857",
    accentSoft: "#bbf7d0",
    accentTint: "#f0fdf4",
    background: "#fff7ed",
    eyebrowBackground: "#e8f8ef",
    eyebrowText: "#047857",
    button: "#047857",
    buttonShadow: "rgba(4,120,87,0.28)",
    iconBackground: "#dcfce7",
    iconText: "#047857",
  };
  const friendlyName = input.customerName?.trim() || "there";
  const expiryLabel = new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(input.expiresAt);
  const subject = `How was your move with ${input.moverCompanyName}?`;
  const bodyHtml = `
    ${renderNoteBox(
      `Your review is connected to a completed ${escapeHtml(input.moveRoute)} move, so future customers can trust that the feedback came from a real job.`,
      theme,
    )}
    ${renderDetailTable(`
      ${renderDetailRow("Mover", input.moverCompanyName)}
      ${renderDetailRow("Move", input.moveRoute)}
      ${renderDetailRow("Link expires", expiryLabel)}
    `)}
  `;

  const message: EmailMessage = {
    kind: "review_survey",
    from: config.from,
    to: input.email,
    subject,
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
    html: renderEmailShell({
      theme,
      preheader: `Share a verified review for your ${input.moveRoute} move with ${input.moverCompanyName}.`,
      eyebrow: "Verified customer review",
      title: `How was ${input.moverCompanyName}?`,
      intro: `Hi ${friendlyName}, thanks for booking through Match 'n Move. Your feedback helps keep mover ratings honest and useful.`,
      bodyHtml,
      cta: {
        href: input.reviewUrl,
        label: "Leave your review",
      },
      footerNote: "This secure review link can only be used once. If you have already shared feedback, you can ignore this email.",
    }),
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
