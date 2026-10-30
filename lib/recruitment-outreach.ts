import { z } from "zod";
import { validBusinessEmail } from "@/lib/prospect-contacts";
import { sendViaSmtp } from "@/lib/email";
import { canMoverAccessLeads } from "@/lib/mover-lead-access";
import {
  RecruitmentActor,
  contactBlockReason,
  renderRecruitmentEmail,
  safeLeadSummary,
  tokenHash,
} from "@/lib/recruitment-policy";
import {
  Tx,
  activity,
  cancelFollowUps,
  checkActor,
  emailReady,
  fail,
  locked,
  ownedProspect,
  senderAddress,
  settings,
} from "@/lib/recruitment";

export async function editDraft(tx: Tx, actor: RecruitmentActor, raw: unknown) {
  const input = z
    .object({
      id: z.string(),
      introduction: z.string().trim().min(20).max(1500),
      updatedAt: z.string().datetime(),
    })
    .parse(raw);
  const message = await tx.outreachMessage.findUnique({
    where: { id: input.id },
    include: { quoteRequest: true },
  });
  if (!message) fail("Draft not found.", 404);
  const prospect = await ownedProspect(tx, actor, message.prospectId);
  if (!validBusinessEmail(prospect.email)) fail("Business email is missing. Complete manual contact follow-up before sending.");
  const user = await checkActor(tx, actor);
  if (message.quoteRequestId && actor.role !== "OWNER" && !user.canViewRecruitmentLeads)
    fail("Lead summary access has not been authorised.", 403);
  if (
    message.status !== "DRAFT" ||
    message.updatedAt.toISOString() !== input.updatedAt
  )
    fail("This draft changed or has already been approved. Reload it.", 409);
  if (/https?:\/\/|\b\S+@\S+|\+?\d[\d ()-]{6,}\d/i.test(input.introduction))
    fail(
      "Personalisation cannot contain email addresses, phone numbers or external links.",
    );
  const quote = message.quoteRequest;
  if (
    quote && [quote.name, quote.email, quote.phone, quote.fromAddress, quote.toAddress]
      .filter((value) => value.length >= 3)
      .some((value) =>
        input.introduction.toLowerCase().includes(value.toLowerCase()),
      )
  )
    fail("Remove customer identifying information from this introduction.");
  const registrationUrl = message.text.match(/Register: (https?:\/\/\S+)/)?.[1];
  const unsubscribeUrl = message.text.match(
    /Unsubscribe: (https?:\/\/\S+)/,
  )?.[1];
  if (!registrationUrl || !unsubscribeUrl)
    fail("Draft links are unavailable. Ask the owner to review.");
  const config = await settings(tx);
  const rendered = renderRecruitmentEmail({
    companyName: prospect.companyName,
    introduction: input.introduction,
    lead: quote ? safeLeadSummary(quote) : null,
    registrationUrl,
    unsubscribeUrl,
    sender: config.senderIdentity || "Match 'n Move",
  });
  const result = await tx.outreachMessage.update({
    where: { id: message.id },
    data: { introduction: input.introduction, ...rendered },
  });
  await activity(tx, prospect.id, actor.id, "draft_updated", {
    messageId: message.id,
  });
  return result;
}

async function verifySend(tx: Tx, actor: RecruitmentActor, messageId: string) {
  const user = await checkActor(tx, actor);
  if (
    actor.role !== "OWNER" &&
    !user.canSendRecruitment
  )
    fail(
      "The owner must enable your sending permission.",
      403,
    );
  const config = await settings(tx);
  if (!config.sendingEnabled || !(await emailReady(tx)) || !config.senderIdentity.trim())
    fail(
      "Outreach sending is disabled or sender configuration has not been verified.",
      503,
    );
  const message = await tx.outreachMessage.findUnique({
    where: { id: messageId },
    include: {
      quoteRequest: {
        select: { recruitmentSharingAllowed: true, sharingConsentAt: true },
      },
    },
  });
  if (!message) fail("Invitation not found.", 404);
  if (message.quoteRequestId && actor.role !== "OWNER" && !user.canViewRecruitmentLeads)
    fail("The owner must enable your lead-summary permission for this invitation.", 403);
  if (!message.text.includes(config.senderIdentity))
    fail(
      "Sender details changed. Save the draft again and review the refreshed preview before sending.",
      409,
    );
  const prospect = await ownedProspect(tx, actor, message.prospectId);
  if (!validBusinessEmail(prospect.email)) fail("Business email is missing. Complete manual contact follow-up before sending.");
  const reason = contactBlockReason(
    prospect,
    Boolean(
      await tx.contactSuppression.findUnique({
        where: { email: prospect.email },
      }),
    ),
  );
  if (reason) fail(reason);
  if (
    message.quoteRequestId && (!message.quoteRequest?.recruitmentSharingAllowed ||
    !message.quoteRequest.sharingConsentAt)
  )
    fail("Customer permission for this summary is no longer available.");
  if (message.attributionExpiresAt < new Date())
    fail("This draft has expired. Ask the owner to review.");
  return { config, message, prospect: { ...prospect, email: prospect.email } };
}

export async function approveAndSend(actor: RecruitmentActor, raw: unknown) {
  const input = z
    .object({
      id: z.string(),
      updatedAt: z.string().datetime(),
      confirmed: z.literal(true),
    })
    .parse(raw);
  const delivery = await locked(async (tx) => {
    const { config, message, prospect } = await verifySend(tx, actor, input.id);
    if (
      message.status !== "DRAFT" ||
      message.updatedAt.toISOString() !== input.updatedAt
    )
      fail(
        "This draft changed or sending was already attempted. Reload to view its status.",
        409,
      );
    const today = new Date(Date.now() - 24 * 3600000);
    const recent = await tx.outreachMessage.count({
      where: { adminId: actor.id, approvedAt: { gte: today } },
    });
    if (recent >= config.dailyLimit)
      fail("Your rolling 24-hour send limit has been reached.", 429);
    const duplicateContact = await tx.outreachMessage.findFirst({
      where: { prospectId: prospect.id, approvedAt: { gte: today } },
    });
    if (duplicateContact)
      fail(
        "This company has already had an invitation attempted in the last 24 hours.",
        409,
      );
    const email = await tx.emailDelivery.create({
      data: {
        dedupeKey: `recruitment:${message.id}`,
        kind: "recruitment_invitation",
        recipient: prospect.email,
        from: senderAddress(),
        replyTo: process.env.RECRUITMENT_REPLY_TO || senderAddress(),
        subject: message.subject,
        text: message.text,
        html: message.html,
        status: "SENDING",
        maxAttempts: 1,
        attempts: 1,
      },
    });
    await tx.outreachMessage.update({
      where: { id: message.id },
      data: {
        status: "SENDING",
        adminId: actor.id,
        approvedAt: new Date(),
        emailDeliveryId: email.id,
      },
    });
    await activity(tx, prospect.id, actor.id, "email_approved", {
      messageId: message.id,
    });
    return email;
  });
  try {
    return await locked(async (tx) => {
      const { config, prospect, message } = await verifySend(
        tx,
        actor,
        input.id,
      );
      if (message.status !== "SENDING") fail("Sending was cancelled.", 409);
      // This second, committed claim is never retried automatically, even after an ambiguous SMTP timeout.
      const result = await sendViaSmtp(
        {
          kind: "recruitment_invitation",
          from: delivery.from,
          to: delivery.recipient,
          replyTo: delivery.replyTo || undefined,
          subject: delivery.subject,
          html: delivery.html,
          text: delivery.text,
        },
        delivery.id,
      );
      if (result.rejected?.length && !result.accepted?.length)
        throw new Error("SMTP rejected this recipient.");
      const now = new Date();
      await tx.emailDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "SENT",
          sentAt: now,
          providerMessageId: result.messageId,
        },
      });
      await tx.outreachMessage.update({
        where: { id: input.id },
        data: { status: "SENT", sentAt: now },
      });
      const dueAt = new Date(Date.now() + config.followUpDays * 86400000);
      await tx.moverProspect.update({
        where: { id: prospect.id },
        data: {
          lastContactedAt: now,
          nextFollowUpAt: config.autoTasks ? dueAt : null,
          status:
            prospect.status === "NOT_CONTACTED" ? "CONTACTED" : prospect.status,
          version: { increment: 1 },
        },
      });
      if (config.autoTasks)
        await tx.recruitmentTask.upsert({
          where: { dedupeKey: `follow-up:${input.id}` },
          update: {},
          create: {
            dedupeKey: `follow-up:${input.id}`,
            assignedAdminId: prospect.assignedAdminId,
            prospectId: prospect.id,
            quoteRequestId: message.quoteRequestId,
            title: `Follow up with ${prospect.companyName}`,
            description:
              "Review response and contact permission. Sending another message requires manual approval.",
            dueAt,
          },
        });
      await activity(tx, prospect.id, actor.id, "email_sent", {
        messageId: input.id,
      });
      return { ok: true, status: "SENT" };
    });
  } catch {
    await locked(async (tx) => {
      await tx.emailDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "FAILED",
          lastError:
            "Delivery was not confirmed. Review provider logs before any further contact. Automatic retry is disabled.",
        },
      });
      await tx.outreachMessage.update({
        where: { id: input.id },
        data: {
          status: "NEEDS_REVIEW",
          failedAt: new Date(),
          lastError:
            "Delivery unconfirmed. Owner must review SMTP logs. This message cannot be resent.",
        },
      });
      const message = await tx.outreachMessage.findUniqueOrThrow({
        where: { id: input.id },
      });
      await activity(tx, message.prospectId, actor.id, "send_failed", {
        messageId: input.id,
      });
      await tx.recruitmentTask.upsert({
        where: { dedupeKey: `failed:${input.id}` },
        update: {},
        create: {
          dedupeKey: `failed:${input.id}`,
          title: "Review unconfirmed email delivery",
          assignedAdminId: actor.id,
          prospectId: message.prospectId,
          priority: "HIGH",
          dueAt: new Date(),
        },
      });
    });
    return {
      ok: false,
      status: "NEEDS_REVIEW",
      error:
        "Delivery was not confirmed. Review provider logs; sending again is blocked.",
    };
  }
}

export async function claimRegistrationAttribution(
  tx: Tx,
  token: string | undefined,
  userId: string,
  email: string,
  moverCompanyId: string,
) {
  if (!token) return;
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(724619833)::text`;
  const message = await tx.outreachMessage.findUnique({
    where: { attributionHash: tokenHash(token) },
    include: { prospect: true },
  });
  if (
    !message ||
    message.status !== "SENT" ||
    message.attributionConsumedAt ||
    message.attributionExpiresAt < new Date() ||
    message.prospect.email !== email ||
    message.prospect.moverCompanyId
  )
    return;
  // Attribution credits a newly created account only; the token never signs a user in or claims an existing company.
  const company = await tx.moverCompany.findFirst({
    where: { id: moverCompanyId, userId },
  });
  if (!company) return;
  await tx.outreachMessage.update({
    where: { id: message.id },
    data: { attributionConsumedAt: new Date() },
  });
  await tx.moverProspect.update({
    where: { id: message.prospectId },
    data: {
      status: "REGISTRATION_STARTED",
      moverCompanyId,
      recruitedById: message.adminId,
      nextFollowUpAt: null,
      version: { increment: 1 },
    },
  });
  await cancelFollowUps(tx, message.prospectId);
  const config = await settings(tx);
  if (config.autoTasks)
    await tx.recruitmentTask.upsert({
      where: { dedupeKey: `registration:${message.id}` },
      update: {},
      create: {
        dedupeKey: `registration:${message.id}`,
        title: "Assist with email verification and registration",
        prospectId: message.prospectId,
        assignedAdminId: message.prospect.assignedAdminId,
        dueAt: new Date(Date.now() + config.followUpDays * 86400000),
      },
    });
  await activity(
    tx,
    message.prospectId,
    message.adminId,
    "registration_started",
    { moverCompanyId },
  );
}

export async function syncRecruitmentOutcomes(moverCompanyId?: string) {
  return locked(async (tx) => {
    const uncertain = await tx.outreachMessage.findMany({
      where: {
        status: "SENDING",
        updatedAt: { lt: new Date(Date.now() - 10 * 60000) },
      },
      include: { prospect: { select: { assignedAdminId: true } } },
      take: 25,
    });
    for (const message of uncertain) {
      await tx.outreachMessage.update({
        where: { id: message.id },
        data: {
          status: "NEEDS_REVIEW",
          failedAt: new Date(),
          lastError:
            "Sending was interrupted. Review provider logs; automatic retry is disabled.",
        },
      });
      if (message.emailDeliveryId)
        await tx.emailDelivery.update({
          where: { id: message.emailDeliveryId },
          data: {
            status: "FAILED",
            lastError:
              "Interrupted recruitment send; manual reconciliation required.",
          },
        });
      await tx.recruitmentTask.upsert({
        where: { dedupeKey: `failed:${message.id}` },
        update: {},
        create: {
          dedupeKey: `failed:${message.id}`,
          title: "Review interrupted email delivery",
          assignedAdminId: message.prospect.assignedAdminId,
          prospectId: message.prospectId,
          priority: "HIGH",
          dueAt: new Date(),
        },
      });
      await activity(tx, message.prospectId, null, "send_interrupted", {
        messageId: message.id,
      });
    }
    const due = await tx.moverProspect.findMany({
      where: {
        status: "CONTACTED",
        nextFollowUpAt: { lte: new Date() },
        respondedAt: null,
      },
      select: { id: true },
      take: 50,
    });
    for (const prospect of due) {
      await tx.moverProspect.update({
        where: { id: prospect.id },
        data: { status: "FOLLOW_UP_REQUIRED", version: { increment: 1 } },
      });
      await activity(tx, prospect.id, null, "follow_up_due");
    }
    const prospects = await tx.moverProspect.findMany({
      where: { moverCompanyId: moverCompanyId || { not: null } },
      take: 50,
      orderBy: { updatedAt: "asc" },
      include: {
        moverCompany: {
          include: {
            user: {
              select: { emailVerifiedAt: true, email: true, role: true },
            },
            leads: {
              where: { payment: { status: "SUCCEEDED", amount: { gt: 0 } } },
              select: { purchasedAt: true },
              take: 1,
              orderBy: { purchasedAt: "asc" },
            },
          },
        },
      },
    });
    for (const prospect of prospects) {
      const mover = prospect.moverCompany;
      if (!mover) continue;
      const registered = mover.user.emailVerifiedAt;
      const active = canMoverAccessLeads(mover);
      const paid = mover.leads[0]?.purchasedAt;
      const registeredAt = prospect.registeredAt || registered;
      const activatedAt = prospect.activatedAt || (active ? new Date() : null);
      const firstPaidLeadAt = prospect.firstPaidLeadAt || paid || null;
      const status =
        prospect.status === "DO_NOT_CONTACT"
          ? prospect.status
          : activatedAt
            ? "ACTIVE_MOVER"
            : registeredAt
              ? "REGISTERED"
              : prospect.status;
      await tx.moverProspect.update({
        where: { id: prospect.id },
        data: {
          registeredAt,
          activatedAt,
          firstPaidLeadAt,
          status,
          ...(registeredAt ? { nextFollowUpAt: null } : {}),
        },
      });
      if (!prospect.registeredAt && registeredAt) {
        await cancelFollowUps(tx, prospect.id);
        await activity(
          tx,
          prospect.id,
          prospect.recruitedById,
          "registration_completed",
        );
      }
      if (!prospect.activatedAt && activatedAt)
        await activity(
          tx,
          prospect.id,
          prospect.recruitedById,
          "mover_activated",
        );
      if (!prospect.firstPaidLeadAt && paid)
        await activity(
          tx,
          prospect.id,
          prospect.recruitedById,
          "first_paid_lead",
        );
    }
    return { checked: prospects.length };
  });
}
