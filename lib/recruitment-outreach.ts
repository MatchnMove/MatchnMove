import { z } from "zod";
import { validBusinessEmail } from "@/lib/prospect-contacts";
import { sendViaSmtp } from "@/lib/email";
import { canMoverAccessLeads } from "@/lib/mover-lead-access";
import { canCleanerAccessLeads } from "@/lib/cleaner-readiness";
import type { PartnerBusinessType } from "@/lib/partner-business";
import { classifyOutreachFailure, mailboxAutomationBlock, opportunityEligible, recordCampaignSent, verifyCampaignSend } from "@/lib/mover-outreach-campaigns";
import { MOVER_TEMPLATE_VERSION, renderMoverOutreachEmail, type MoverTemplateKey } from "@/lib/mover-outreach-templates";
import { SUPPORT_MAILBOX } from "@/lib/partner-inbox-policy";
import {
  RecruitmentActor,
  contactBlockReason,
  renderRecruitmentEmail,
  safeLeadSummary,
  recruitmentLeadSelect,
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
      introduction: z.string().trim().max(1500),
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
  const rendered = message.campaignId ? renderMoverOutreachEmail({
    templateKey: message.templateKey as MoverTemplateKey, companyName: prospect.companyName, contactName: prospect.contactName,
    personalNote: input.introduction, lead: quote ? safeLeadSummary(quote) : null, registrationUrl, unsubscribeUrl,
  }) : renderRecruitmentEmail({
    companyName: prospect.companyName,
    businessType: prospect.businessType,
    introduction: input.introduction,
    lead: quote ? safeLeadSummary(quote) : null,
    registrationUrl,
    unsubscribeUrl,
    sender: config.senderIdentity || "Match 'n Move",
  });
  const result = await tx.outreachMessage.update({
    where: { id: message.id },
    data: { introduction: input.introduction, ...rendered, ...(message.campaignId ? { templateVersion: MOVER_TEMPLATE_VERSION } : {}) },
  });
  await activity(tx, prospect.id, actor.id, "draft_updated", {
    messageId: message.id,
  });
  return result;
}

export async function verifySend(tx: Tx, actor: RecruitmentActor, messageId: string) {
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
        select: { ...recruitmentLeadSelect, recruitmentSharingAllowed: true, sharingConsentAt: true },
      },
    },
  });
  if (!message) fail("Invitation not found.", 404);
  if (message.quoteRequestId && actor.role !== "OWNER" && !user.canViewRecruitmentLeads)
    fail("The owner must enable your lead-summary permission for this invitation.", 403);
  if (!message.campaignId && !message.text.includes(config.senderIdentity))
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
  await verifyCampaignSend(tx, message, prospect);
  if (
    message.quoteRequestId && (!message.quoteRequest?.recruitmentSharingAllowed ||
    !message.quoteRequest.sharingConsentAt)
  )
    fail("Customer permission for this summary is no longer available.");
  if (message.campaignId && message.quoteRequest && !opportunityEligible(message.quoteRequest))
    fail("This moving opportunity is no longer current. Prepare a general invitation instead.");
  if (message.campaignId) {
    const registrationUrl = message.text.match(/Register: (https?:\/\/\S+)/)?.[1];
    const unsubscribeUrl = message.text.match(/Unsubscribe: (https?:\/\/\S+)/)?.[1];
    if (!registrationUrl || !unsubscribeUrl) fail("Refresh this draft's invitation links before sending.");
    const current = renderMoverOutreachEmail({ templateKey: message.templateKey as MoverTemplateKey, companyName: prospect.companyName, contactName: prospect.contactName,
      lead: message.quoteRequest ? safeLeadSummary(message.quoteRequest) : null, personalNote: message.introduction, registrationUrl, unsubscribeUrl });
    if (current.text !== message.text || current.subject !== message.subject) fail("Company or approved summary details changed. Save the draft and review its refreshed preview before sending.", 409);
  }
  if (message.attributionExpiresAt < new Date())
    fail("This draft has expired. Ask the owner to review.");
  return { config, message, prospect: { ...prospect, email: prospect.email } };
}

export async function approveAndSend(actor: RecruitmentActor, raw: unknown, automatic = false) {
  const input = z
    .object({
      id: z.string(),
      updatedAt: z.string().datetime(),
      confirmed: z.literal(true),
    })
    .parse(raw);
  const delivery = await locked(async (tx) => {
    const { config, message, prospect } = await verifySend(tx, actor, input.id);
    if (automatic) {
      if (!config.automaticFollowUpsEnabled || !message.campaignId || message.sequence < 1 || message.sequence > 3)
        fail("Automatic sending is limited to enabled, scheduled mover follow-ups.", 403);
      const blocked = mailboxAutomationBlock(await tx.partnerMailbox.findUnique({ where: { id: "support" } }));
      if (blocked) fail(blocked, 503);
      if (message.sendAttempts >= 3 || (message.retryAt && message.retryAt > new Date())) fail("Retry is not due or its limit was reached.");
    }
    if (
      (message.status !== "DRAFT" && !(automatic && message.status === "RETRY")) ||
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
      where: { prospectId: prospect.id, id: { not: message.id }, approvedAt: { gte: today } },
    });
    if (duplicateContact)
      fail(
        "This company has already had an invitation attempted in the last 24 hours.",
        409,
      );
    const deliveryData = {
        dedupeKey: `recruitment:${message.id}`,
        kind: "recruitment_invitation",
        recipient: prospect.email,
        from: senderAddress(),
        replyTo: process.env.RECRUITMENT_REPLY_TO || SUPPORT_MAILBOX,
        subject: message.subject,
        text: message.text,
        html: message.html,
        status: "SENDING" as const,
        maxAttempts: automatic ? 3 : 1,
        attempts: 1,
      };
    const email = await tx.emailDelivery.upsert({
      where: { dedupeKey: deliveryData.dedupeKey },
      create: deliveryData,
      update: { status: "SENDING", attempts: { increment: 1 }, lastError: null },
    });
    await tx.outreachMessage.update({
      where: { id: message.id },
      data: {
        status: "SENDING",
        adminId: actor.id,
        approvedAt: new Date(),
        emailDeliveryId: email.id,
        sendAttempts: { increment: 1 },
        retryAt: null,
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
      if (automatic) {
        const blocked = mailboxAutomationBlock(await tx.partnerMailbox.findUnique({ where: { id: "support" } }));
        if (blocked) fail(blocked, 503);
      }
      const parent = message.followUpToId ? await tx.outreachMessage.findUnique({ where: { id: message.followUpToId } }) : null;
      const parentDelivery = parent?.emailDeliveryId ? await tx.emailDelivery.findUnique({ where: { id: parent.emailDeliveryId }, select: { providerMessageId: true } }) : null;
      const parentMessageId = parentDelivery?.providerMessageId;
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
          ...(parentMessageId ? { inReplyTo: parentMessageId, references: [parentMessageId] } : {}),
        },
        delivery.id,
      );
      if (result.rejected?.length && !result.accepted?.length)
        throw Object.assign(new Error("SMTP rejected this recipient."), { responseCode: 550 });
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
          nextFollowUpAt: message.campaignId ? null : config.autoTasks ? dueAt : null,
          status:
            prospect.status === "NOT_CONTACTED" ? "CONTACTED" : prospect.status,
          version: { increment: 1 },
        },
      });
      await recordCampaignSent(tx, message, now);
      if (config.autoTasks && !message.campaignId)
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
  } catch (error) {
    let retryScheduled = false;
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
      if (message.campaignId) {
        const classification = classifyOutreachFailure(error);
        const retry = automatic && classification === "RETRYABLE" && message.sendAttempts < 3;
        retryScheduled = retry;
        await tx.outreachMessage.update({ where: { id: message.id }, data: {
          status: retry ? "RETRY" : "NEEDS_REVIEW", retryAt: retry ? new Date(Date.now() + (message.sendAttempts === 1 ? 5 : 15) * 60000) : null,
          lastError: retry ? "Provider declined this attempt temporarily. A bounded retry is scheduled." : `Delivery ${classification.toLowerCase()}; review provider logs before further contact.`,
        } });
        await tx.emailDelivery.update({ where: { id: delivery.id }, data: {
          lastError: retry ? "Temporary SMTP rejection; the campaign worker has a bounded retry scheduled." : `Delivery ${classification.toLowerCase()}; automatic retry is blocked. Review the provider outcome.`,
          ...(retry ? { nextAttemptAt: new Date(Date.now() + (message.sendAttempts === 1 ? 5 : 15) * 60000) } : {}),
        } });
        await tx.outreachCampaign.updateMany({ where: { id: message.campaignId, status: { in: ["ACTIVE", "DRAFT"] } }, data: {
          ...(!retry ? { status: classification === "PERMANENT" ? "STOPPED" : "PAUSED" } : {}),
          reason: retry ? "Temporary provider rejection; retry scheduled." : `Delivery ${classification.toLowerCase()}; owner review required.`,
        } });
        if (classification === "PERMANENT" && [550, 551, 553].includes((error as { responseCode?: number }).responseCode || 0)) {
          const { suppressContact } = await import("@/lib/recruitment");
          const prospect = await tx.moverProspect.findUniqueOrThrow({ where: { id: message.prospectId } });
          if (prospect.email) await suppressContact(tx, prospect.email, "Permanent SMTP recipient failure", "smtp");
        }
      }
      await activity(tx, message.prospectId, actor.id, "send_failed", {
        messageId: input.id,
      });
      if (!retryScheduled) await tx.recruitmentTask.upsert({
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
      status: retryScheduled ? "RETRY" : "NEEDS_REVIEW",
      error:
        retryScheduled ? "A temporary provider rejection has a bounded retry scheduled." : "Delivery was not confirmed. Review provider logs; sending again is blocked.",
    };
  }
}

export async function claimRegistrationAttribution(
  tx: Tx,
  token: string | undefined,
  userId: string,
  email: string,
  companyId: string,
  businessType: PartnerBusinessType = "MOVING",
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
    message.prospect.moverCompanyId ||
    message.prospect.cleanerCompanyId ||
    message.prospect.businessType !== businessType
  )
    return;
  // Attribution credits a newly created account only; the token never signs a user in or claims an existing company.
  const company = businessType === "CLEANING"
    ? await tx.cleanerCompany.findFirst({ where: { id: companyId, userId } })
    : await tx.moverCompany.findFirst({ where: { id: companyId, userId } });
  if (!company) return;
  await tx.outreachMessage.update({
    where: { id: message.id },
    data: { attributionConsumedAt: new Date() },
  });
  await tx.moverProspect.update({
    where: { id: message.prospectId },
    data: {
      status: "REGISTRATION_STARTED",
      ...(businessType === "CLEANING" ? { cleanerCompanyId: companyId } : { moverCompanyId: companyId }),
      recruitedById: message.adminId,
      nextFollowUpAt: null,
      version: { increment: 1 },
    },
  });
  await cancelFollowUps(tx, message.prospectId);
  await tx.partnerConversation.updateMany({
    where: { prospectId: message.prospectId },
    data: businessType === "CLEANING" ? { cleanerCompanyId: companyId } : { moverCompanyId: companyId },
  });
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
    { ...(businessType === "CLEANING" ? { cleanerCompanyId: companyId } : { moverCompanyId: companyId }), businessType },
  );
}

export async function syncRecruitmentOutcomes(companyId?: string, businessType: PartnerBusinessType = "MOVING") {
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
      if (message.campaignId) await tx.outreachCampaign.updateMany({ where: { id: message.campaignId, status: { in: ["DRAFT", "ACTIVE", "REVIEW_DUE"] } }, data: { status: "PAUSED", reason: "Delivery was interrupted; verify the provider outcome before any further contact." } });
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
      where: companyId
        ? businessType === "CLEANING" ? { cleanerCompanyId: companyId } : { moverCompanyId: companyId }
        : { OR: [{ moverCompanyId: { not: null } }, { cleanerCompanyId: { not: null } }] },
      take: 50,
      orderBy: { updatedAt: "asc" },
      include: {
        cleanerCompany: {
          include: {
            user: { select: { emailVerifiedAt: true } },
            purchases: {
              where: { status: "PAID", amount: { gt: 0 } },
              select: { purchasedAt: true },
              take: 1,
              orderBy: { purchasedAt: "asc" },
            },
          },
        },
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
      const cleaner = prospect.cleanerCompany;
      if (!mover && !cleaner) continue;
      const registered = cleaner ? cleaner.user.emailVerifiedAt : mover!.user.emailVerifiedAt;
      const active = cleaner ? Boolean(registered) && canCleanerAccessLeads(cleaner) : canMoverAccessLeads(mover!);
      const paid = cleaner ? cleaner.purchases[0]?.purchasedAt : mover!.leads[0]?.purchasedAt;
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
          cleaner ? "cleaner_activated" : "mover_activated",
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
