import assert from "node:assert/strict";
import test from "node:test";
import { createServer, Socket } from "node:net";
import { randomBytes } from "node:crypto";
import { prisma } from "../lib/db";
import {
  audit,
  checkActor,
  locked,
  ownedProspect,
  prepareDraft,
  saveProspect,
  setProspectStatus,
  suppressContact,
} from "../lib/recruitment";
import {
  activateTeamInvitation,
  createTeamInvitation,
  updateTeamUser,
} from "../lib/recruitment-team";
import {
  approveAndSend,
  claimRegistrationAttribution,
  editDraft,
  syncRecruitmentOutcomes,
} from "../lib/recruitment-outreach";
import { recruitmentMetrics } from "../lib/recruitment-reporting";
import { secureToken, tokenHash } from "../lib/recruitment-policy";
import { hashPassword, verifyPassword } from "../lib/password";
import { deliverQueuedEmail, processEmailQueue } from "../lib/email";

const databaseUrl = process.env.RECRUITMENT_TEST_DATABASE_URL;
test(
  "recruitment integration against disposable PostgreSQL only",
  { skip: !databaseUrl, timeout: 120000 },
  async (t) => {
    const url = new URL(databaseUrl!);
    assert.ok(
      ["127.0.0.1", "localhost"].includes(url.hostname),
      "Integration tests require an explicitly local database",
    );
    assert.ok(
      url.pathname.endsWith("_test"),
      "Integration database name must end in _test",
    );
    assert.equal(process.env.DATABASE_URL, databaseUrl);
    const tag = randomBytes(5).toString("hex");
    const passwordHash = await hashPassword(secureToken());
    const ownerUser = await prisma.user.create({
      data: {
        name: "Validation owner",
        email: `owner-${tag}@validation.invalid`,
        passwordHash,
        emailVerifiedAt: new Date(),
        role: "ADMIN",
        adminRole: "OWNER",
      },
    });
    const owner = {
      id: ownerUser.id,
      role: "OWNER" as const,
      canSend: true,
      canViewLeads: true,
    };
    const carliToken = secureToken();
    const tiaanToken = secureToken();
    const emails = {
      carli: `carli-${tag}@validation.invalid`,
      tiaan: `tiaan-${tag}@validation.invalid`,
    };
    let carliId = "";
    let tiaanId = "";
    await t.test(
      "Carli and Tiaan receive separate single-use invitations and choose their own credentials",
      async () => {
        for (const [name, email, token] of [
          ["Carli", emails.carli, carliToken],
          ["Tiaan", emails.tiaan, tiaanToken],
        ]) {
          const invitation = await locked((tx) =>
            createTeamInvitation(tx, owner, { name, email }),
          );
          assert.equal(invitation.tokenHash, null);
          assert.equal(invitation.sentAt, null);
          await prisma.adminInvitation.update({
            where: { id: invitation.id },
            data: {
              tokenHash: tokenHash(token),
              expiresAt: new Date(Date.now() + 600000),
            },
          });
          await locked((tx) => activateTeamInvitation(tx, token, passwordHash));
          await assert.rejects(
            locked((tx) => activateTeamInvitation(tx, token, passwordHash)),
            /invalid or expired/,
          );
        }
        const carli = await prisma.user.findUniqueOrThrow({
          where: { email: emails.carli },
        });
        const tiaan = await prisma.user.findUniqueOrThrow({
          where: { email: emails.tiaan },
        });
        carliId = carli.id;
        tiaanId = tiaan.id;
        assert.notEqual(carliId, tiaanId);
        assert.equal(carli.adminRole, "RECRUITMENT_ADMIN");
        assert.equal(carli.canSendRecruitment, false);
        assert.equal(carli.canViewRecruitmentLeads, true);
      },
    );
    const carli = {
      id: carliId,
      role: "RECRUITMENT_ADMIN" as const,
      canSend: false,
      canViewLeads: true,
    };
    const tiaan = { ...carli, id: tiaanId };
    const quote = await prisma.quoteRequest.create({
      data: {
        name: "Private Customer",
        email: "private@validation.invalid",
        phone: "0219876543",
        fromAddress: "21 Private Street",
        fromCity: "Albany",
        fromRegion: "Auckland",
        fromPostcode: "0632",
        fromCountry: "NZ",
        toAddress: "7 Secret Lane",
        toCity: "Hamilton",
        toRegion: "Waikato",
        toPostcode: "3200",
        toCountry: "NZ",
        fromPropertyType: "House",
        toPropertyType: "House",
        bedrooms: "3",
        recruitmentSharingAllowed: true,
        sharingConsentAt: new Date(),
        consentVersion: "2026-10-recruitment-v2",
      },
    });
    const prospectInput = {
      companyName: `Validation Movers ${tag}`,
      email: `mover-${tag}@validation.invalid`,
      emailAvailability: "PUBLIC",
      phoneAvailability: "NOT_PUBLIC",
      serviceAreas: ["Auckland", "Waikato"],
      serviceTypes: ["HOUSEHOLD"],
      longDistance: true,
      consentBasis: "EXPRESS",
      consentEvidence: "Disposable test fixture: explicit permission",
    };
    const prospect = await locked((tx) =>
      saveProspect(tx, carli, prospectInput),
    );
    assert.ok(prospect.email);
    await t.test(
      "assigned admins can edit their records; both directions of cross-admin access are denied",
      async () => {
        assert.equal(
          (await locked((tx) => ownedProspect(tx, carli, prospect.id))).id,
          prospect.id,
        );
        await assert.rejects(
          locked((tx) => ownedProspect(tx, tiaan, prospect.id)),
          /not found/,
        );
        const other = await locked((tx) =>
          saveProspect(tx, tiaan, {
            ...prospectInput,
            companyName: `Other Movers ${tag}`,
            email: `other-${tag}@validation.invalid`,
          }),
        );
        await assert.rejects(
          locked((tx) => ownedProspect(tx, carli, other.id)),
          /not found/,
        );
        assert.equal(
          (await locked((tx) => ownedProspect(tx, owner, other.id))).id,
          other.id,
        );
        await assert.rejects(
          locked((tx) =>
            saveProspect(tx, tiaan, prospectInput, prospect.id, 0),
          ),
          /not found/,
        );
      },
    );
    await t.test(
      "duplicate email and company creation are serialized and reviewed",
      async () => {
        await assert.rejects(
          locked((tx) =>
            saveProspect(tx, tiaan, {
              ...prospectInput,
              email: prospectInput.email.toUpperCase(),
            }),
          ),
          /already belongs/,
        );
        await assert.rejects(
          locked((tx) =>
            saveProspect(tx, carli, {
              ...prospectInput,
              email: `duplicate-${tag}@validation.invalid`,
            }),
          ),
          /Owner review/,
        );
        const results = await Promise.allSettled(
          [1, 2].map(() =>
            locked((tx) =>
              saveProspect(tx, carli, {
                ...prospectInput,
                companyName: `Concurrent ${tag}`,
                email: `concurrent-${tag}@validation.invalid`,
              }),
            ),
          ),
        );
        assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      },
    );
    let draft = await locked((tx) =>
      prepareDraft(tx, carli, prospect.id, quote.id),
    );
    await t.test(
      "draft generation is idempotent, privacy-safe, editable and rejects stale updates",
      async () => {
        const duplicate = await locked((tx) =>
          prepareDraft(tx, carli, prospect.id, quote.id),
        );
        assert.equal(draft.id, duplicate.id);
        for (const privateValue of [
          quote.name,
          quote.email,
          quote.phone,
          quote.fromAddress,
          quote.toAddress,
        ])
          assert.equal(
            draft.html.includes(privateValue) ||
              draft.text.includes(privateValue),
            false,
          );
        const updated = await locked((tx) =>
          editDraft(tx, carli, {
            id: draft.id,
            introduction:
              "We would love to welcome your moving company to Match 'n Move.",
            updatedAt: draft.updatedAt.toISOString(),
          }),
        );
        await assert.rejects(
          locked((tx) =>
            editDraft(tx, carli, {
              id: draft.id,
              introduction: "A stale update should fail validation.",
              updatedAt: draft.updatedAt.toISOString(),
            }),
          ),
          /changed/,
        );
        draft = updated;
        await assert.rejects(
          locked((tx) =>
            editDraft(tx, carli, {
              id: draft.id,
              introduction: `Please call ${quote.phone} about this job.`,
              updatedAt: draft.updatedAt.toISOString(),
            }),
          ),
          /phone/,
        );
      },
    );
    await t.test(
      "unapproved sending, private leads and unknown permission are blocked",
      async () => {
        await assert.rejects(
          approveAndSend(carli, {
            id: draft.id,
            updatedAt: draft.updatedAt.toISOString(),
            confirmed: true,
          }),
          /enable your sending/,
        );
        const privateLead = await prisma.quoteRequest.create({
          data: {
            ...quote,
            id: undefined,
            inventory: undefined,
            transcriptRaw: undefined,
            transcriptFields: undefined,
            recruitmentSharingAllowed: false,
          },
        });
        await assert.rejects(
          locked((tx) => prepareDraft(tx, carli, prospect.id, privateLead.id)),
          /authorised lead/,
        );
        const unknown = await locked((tx) =>
          saveProspect(tx, carli, {
            ...prospectInput,
            companyName: `Unknown ${tag}`,
            email: `unknown-${tag}@validation.invalid`,
            consentBasis: "UNKNOWN",
            consentEvidence: "",
          }),
        );
        await assert.rejects(
          locked((tx) => prepareDraft(tx, carli, unknown.id, quote.id)),
          /permission basis/,
        );
      },
    );

    const accepted: string[] = [];
    const sockets = new Set<Socket>();
    let rejectRecipients = false;
    const smtp = createServer((socket) => {
      sockets.add(socket);
      socket.on("close", () => sockets.delete(socket));
      socket.write("220 localhost validation SMTP\r\n");
      let buffer = "";
      let dataMode = false;
      socket.on("data", (chunk) => {
        buffer += chunk.toString();
        while (buffer.includes("\r\n")) {
          if (dataMode) {
            const end = buffer.indexOf("\r\n.\r\n");
            if (end < 0) return;
            accepted.push(buffer.slice(0, end));
            buffer = buffer.slice(end + 5);
            dataMode = false;
            socket.write("250 accepted locally\r\n");
            continue;
          }
          const index = buffer.indexOf("\r\n");
          const command = buffer.slice(0, index);
          buffer = buffer.slice(index + 2);
          if (command.startsWith("EHLO"))
            socket.write("250-localhost\r\n250 AUTH PLAIN\r\n");
          else if (command.startsWith("AUTH"))
            socket.write("235 authenticated\r\n");
          else if (command.startsWith("RCPT") && rejectRecipients)
            socket.write("550 validation rejection\r\n");
          else if (command === "DATA") {
            dataMode = true;
            socket.write("354 end with dot\r\n");
          } else if (command === "QUIT") {
            socket.end("221 bye\r\n");
          } else socket.write("250 ok\r\n");
        }
      });
    });
    await new Promise<void>((resolve) => smtp.listen(0, "127.0.0.1", resolve));
    const address = smtp.address();
    assert.ok(address && typeof address === "object");
    Object.assign(process.env, {
      SMTP_HOST: "127.0.0.1",
      SMTP_PORT: String(address.port),
      SMTP_USER: "local-validation",
      SMTP_PASS: secureToken(),
      SMTP_SECURE: "false",
      SMTP_REQUIRE_TLS: "false",
      EMAIL_SMTP_POOL: "false",
      RECRUITMENT_FROM_EMAIL: "recruitment@validation.invalid",
      RECRUITMENT_EMAIL_VERIFIED: "true",
      NEXTAUTH_URL: "http://localhost:3319",
    });
    t.after(async () => {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve) => smtp.close(() => resolve()));
      await prisma.$disconnect();
    });
    await prisma.recruitmentSetting.upsert({
      where: { key: "outreach" },
      create: {
        key: "outreach",
        value: {
          sendingEnabled: true,
          senderIdentity: `Match 'n Move validation only ${tag}`,
        },
      },
      update: {
        value: {
          sendingEnabled: true,
          senderIdentity: `Match 'n Move validation only ${tag}`,
        },
      },
    });
    await locked((tx) =>
      updateTeamUser(tx, owner, {
        id: carli.id,
        role: "RECRUITMENT_ADMIN",
        disabled: false,
        canSend: true,
        canViewLeads: true,
      }),
    );
    await assert.rejects(
      approveAndSend(carli, {
        id: draft.id,
        updatedAt: draft.updatedAt.toISOString(),
        confirmed: true,
      }),
      /Sender details changed/,
    );
    draft = await locked((tx) =>
      editDraft(tx, carli, {
        id: draft.id,
        introduction: draft.introduction,
        updatedAt: draft.updatedAt.toISOString(),
      }),
    );
    await t.test(
      "concurrent manual send attempts emit exactly one local SMTP message",
      async () => {
        const attempts = await Promise.allSettled(
          [1, 2].map(() =>
            approveAndSend(carli, {
              id: draft.id,
              updatedAt: draft.updatedAt.toISOString(),
              confirmed: true,
            }),
          ),
        );
        assert.equal(
          attempts.filter((a) => a.status === "fulfilled").length,
          1,
        );
        assert.equal(accepted.length, 1);
        const sent = await prisma.outreachMessage.findUniqueOrThrow({
          where: { id: draft.id },
        });
        assert.equal(sent.status, "SENT");
        assert.equal(
          (await deliverQueuedEmail(sent.emailDeliveryId!)).sent,
          false,
        );
        assert.equal(
          (await processEmailQueue()).results.some(
            (row) => row.id === sent.emailDeliveryId,
          ),
          false,
        );
        assert.equal(
          await prisma.recruitmentTask.count({
            where: { dedupeKey: `follow-up:${draft.id}` },
          }),
          1,
        );
      },
    );
    await t.test(
      "follow-up preparation is idempotent and does not send email",
      async () => {
        const followUp = await locked((tx) =>
          prepareDraft(tx, carli, prospect.id, quote.id, draft.id),
        );
        const repeated = await locked((tx) =>
          prepareDraft(tx, carli, prospect.id, quote.id, draft.id),
        );
        assert.equal(followUp.id, repeated.id);
        assert.equal(followUp.sequence, 1);
        assert.equal(followUp.status, "DRAFT");
        assert.equal(accepted.length, 1);
      },
    );
    await t.test(
      "unsubscribe persists suppression, blocks drafts and cancels follow-up tasks",
      async () => {
        const suppressed = await locked((tx) =>
          saveProspect(tx, carli, {
            ...prospectInput,
            companyName: `Suppressed ${tag}`,
            email: `suppressed-${tag}@validation.invalid`,
          }),
        );
        const pending = await locked((tx) =>
          prepareDraft(tx, carli, suppressed.id, quote.id),
        );
        const pendingTask = await prisma.recruitmentTask.create({
          data: {
            title: "Suppression cancellation check",
            assignedAdminId: carli.id,
            prospectId: suppressed.id,
            dueAt: new Date(),
          },
        });
        await locked((tx) =>
          suppressContact(tx, suppressed.email!, "Recipient request", "test"),
        );
        assert.ok(
          (
            await prisma.recruitmentTask.findUniqueOrThrow({
              where: { id: pendingTask.id },
            })
          ).cancelledAt,
        );
        assert.equal(
          (
            await prisma.outreachMessage.findUniqueOrThrow({
              where: { id: pending.id },
            })
          ).status,
          "CANCELLED",
        );
        await assert.rejects(
          approveAndSend(carli, {
            id: pending.id,
            updatedAt: pending.updatedAt.toISOString(),
            confirmed: true,
          }),
          /suppressed/,
        );
        await assert.rejects(
          locked((tx) => prepareDraft(tx, carli, suppressed.id, quote.id)),
          /suppressed/,
        );
        assert.equal(
          (
            await prisma.moverProspect.findUniqueOrThrow({
              where: { id: suppressed.id },
            })
          ).status,
          "DO_NOT_CONTACT",
        );
      },
    );
    await t.test(
      "registration attribution checks email, expiry and replay before crediting a new account",
      async () => {
        const token = draft.text.match(/attribution\?token=(\S+)/)?.[1];
        assert.ok(token);
        const user = await prisma.user.create({
          data: {
            name: "New mover",
            email: prospect.email!,
            passwordHash,
            moverCompany: {
              create: {
                companyName: prospect.companyName,
                serviceAreas: ["Auckland", "Waikato"],
              },
            },
          },
          include: { moverCompany: true },
        });
        await locked((tx) =>
          claimRegistrationAttribution(
            tx,
            token,
            user.id,
            "wrong@validation.invalid",
            user.moverCompany!.id,
          ),
        );
        assert.equal(
          (
            await prisma.moverProspect.findUniqueOrThrow({
              where: { id: prospect.id },
            })
          ).moverCompanyId,
          null,
        );
        await prisma.outreachMessage.update({
          where: { id: draft.id },
          data: { attributionExpiresAt: new Date(0) },
        });
        await locked((tx) =>
          claimRegistrationAttribution(
            tx,
            token,
            user.id,
            prospect.email!,
            user.moverCompany!.id,
          ),
        );
        assert.equal(
          (
            await prisma.moverProspect.findUniqueOrThrow({
              where: { id: prospect.id },
            })
          ).moverCompanyId,
          null,
        );
        await prisma.outreachMessage.update({
          where: { id: draft.id },
          data: { attributionExpiresAt: new Date(Date.now() + 600000) },
        });
        await Promise.all(
          [1, 2].map(() =>
            locked((tx) =>
              claimRegistrationAttribution(
                tx,
                token,
                user.id,
                prospect.email!,
                user.moverCompany!.id,
              ),
            ),
          ),
        );
        const attributed = await prisma.moverProspect.findUniqueOrThrow({
          where: { id: prospect.id },
        });
        assert.equal(attributed.status, "REGISTRATION_STARTED");
        assert.equal(attributed.recruitedById, carli.id);
        assert.equal(
          await prisma.recruitmentActivity.count({
            where: { prospectId: prospect.id, action: "registration_started" },
          }),
          1,
        );
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerifiedAt: new Date() },
        });
        await syncRecruitmentOutcomes();
        await syncRecruitmentOutcomes();
        const registered = await prisma.moverProspect.findUniqueOrThrow({
          where: { id: prospect.id },
        });
        assert.ok(registered.registeredAt);
        assert.ok(registered.activatedAt);
        assert.equal(
          await prisma.recruitmentActivity.count({
            where: {
              prospectId: prospect.id,
              action: "registration_completed",
            },
          }),
          1,
        );
        assert.equal(
          await prisma.recruitmentTask.count({
            where: {
              prospectId: prospect.id,
              cancelledAt: null,
              completedAt: null,
            },
          }),
          0,
        );
      },
    );
    await t.test(
      "only a succeeded paid lead is credited; waived trial leads are excluded",
      async () => {
        const registered = await prisma.moverProspect.findUniqueOrThrow({
          where: { id: prospect.id },
        });
        const lead = await prisma.lead.create({
          data: {
            quoteRequestId: quote.id,
            moverCompanyId: registered.moverCompanyId!,
            price: 2000,
            status: "PURCHASED",
            purchasedAt: new Date(),
            payment: { create: { amount: 2000, status: "WAIVED" } },
          },
        });
        await syncRecruitmentOutcomes(registered.moverCompanyId!);
        assert.equal(
          (
            await prisma.moverProspect.findUniqueOrThrow({
              where: { id: prospect.id },
            })
          ).firstPaidLeadAt,
          null,
        );
        await prisma.payment.update({
          where: { leadId: lead.id },
          data: { status: "SUCCEEDED" },
        });
        await syncRecruitmentOutcomes(registered.moverCompanyId!);
        assert.ok(
          (
            await prisma.moverProspect.findUniqueOrThrow({
              where: { id: prospect.id },
            })
          ).firstPaidLeadAt,
        );
      },
    );
    await t.test(
      "dashboard metrics use database events and correct recruiting attribution",
      async () => {
        const metrics = await recruitmentMetrics(carli);
        assert.equal(metrics.invitationsSent, 1);
        assert.equal(metrics.registered, 1);
        assert.equal(metrics.activated, 1);
        assert.equal(metrics.invitationConversion, 100);
        const other = await recruitmentMetrics(tiaan);
        assert.equal(other.registered, 0);
        assert.equal(other.invitationsSent, 0);
      },
    );
    await t.test(
      "failed SMTP delivery is recorded and never retried automatically",
      async () => {
        const failedProspect = await locked((tx) =>
          saveProspect(tx, carli, {
            ...prospectInput,
            companyName: `Failure ${tag}`,
            email: `failure-${tag}@validation.invalid`,
          }),
        );
        const failureDraft = await locked((tx) =>
          prepareDraft(tx, carli, failedProspect.id, quote.id),
        );
        rejectRecipients = true;
        try {
          const result = await approveAndSend(carli, {
            id: failureDraft.id,
            updatedAt: failureDraft.updatedAt.toISOString(),
            confirmed: true,
          });
          assert.equal(result.status, "NEEDS_REVIEW");
          const failed = await prisma.outreachMessage.findUniqueOrThrow({
            where: { id: failureDraft.id },
          });
          assert.equal(
            (await deliverQueuedEmail(failed.emailDeliveryId!)).sent,
            false,
          );
          await assert.rejects(
            approveAndSend(carli, {
              id: failureDraft.id,
              updatedAt: failed.updatedAt.toISOString(),
              confirmed: true,
            }),
            /already attempted/,
          );
          assert.equal(accepted.length, 1);
        } finally {
          rejectRecipients = false;
        }
      },
    );
    await t.test(
      "disable and role changes invalidate old sessions and block privileged actions",
      async () => {
        const prior = await prisma.user.findUniqueOrThrow({
          where: { id: carli.id },
        });
        await locked((tx) =>
          updateTeamUser(tx, owner, {
            id: carli.id,
            role: "RECRUITMENT_ADMIN",
            disabled: true,
            canSend: false,
            canViewLeads: false,
          }),
        );
        const changed = await prisma.user.findUniqueOrThrow({
          where: { id: carli.id },
        });
        assert.ok(changed.sessionVersion > prior.sessionVersion);
        assert.ok(changed.adminDisabledAt);
        await assert.rejects(
          locked((tx) => checkActor(tx, carli)),
          /access has changed/,
        );
        await assert.rejects(
          locked((tx) =>
            updateTeamUser(tx, tiaan, {
              id: carli.id,
              role: "OWNER",
              disabled: false,
              canSend: true,
              canViewLeads: true,
            }),
          ),
          /Owner access/,
        );
        await assert.rejects(
          locked((tx) =>
            updateTeamUser(tx, owner, {
              id: owner.id,
              role: "RECRUITMENT_ADMIN",
              disabled: true,
              canSend: false,
              canViewLeads: false,
            }),
          ),
          /own permissions/,
        );
      },
    );
    await t.test(
      "existing account invitations require proven ownership and preserve passwords and data",
      async () => {
        const originalPassword = secureToken();
        const originalHash = await hashPassword(originalPassword);
        const user = await prisma.user.create({
          data: {
            email: `existing-${tag}@validation.invalid`,
            passwordHash: originalHash,
            emailVerifiedAt: new Date(),
            moverCompany: {
              create: {
                companyName: "Preserved company",
                serviceAreas: ["Otago"],
              },
            },
          },
        });
        const invitation = await locked((tx) =>
          createTeamInvitation(tx, owner, {
            name: "Existing",
            email: user.email,
          }),
        );
        const token = secureToken();
        await prisma.adminInvitation.update({
          where: { id: invitation.id },
          data: {
            tokenHash: tokenHash(token),
            expiresAt: new Date(Date.now() + 600000),
          },
        });
        await assert.rejects(
          locked((tx) => activateTeamInvitation(tx, token, passwordHash)),
          /Sign in to your existing/,
        );
        await locked((tx) =>
          activateTeamInvitation(tx, token, passwordHash, user.id),
        );
        const preserved = await prisma.user.findUniqueOrThrow({
          where: { id: user.id },
          include: { moverCompany: true },
        });
        assert.equal(preserved.passwordHash, originalHash);
        assert.equal(
          await verifyPassword(originalPassword, preserved.passwordHash),
          true,
        );
        assert.equal(preserved.moverCompany?.companyName, "Preserved company");
      },
    );
    await t.test(
      "sensitive audit and recruitment history cannot be edited or deleted",
      async () => {
        const row = await locked(async (tx) => {
          await audit(tx, owner.id, "validation_audit", {});
          return tx.adminAuditLog.findFirstOrThrow({
            where: { actorId: owner.id },
          });
        });
        await assert.rejects(
          prisma.adminAuditLog.delete({ where: { id: row.id } }),
          /append-only/,
        );
        const event = await prisma.recruitmentActivity.findFirstOrThrow({
          where: { prospectId: prospect.id },
        });
        await assert.rejects(
          prisma.recruitmentActivity.update({
            where: { id: event.id },
            data: { action: "tampered" },
          }),
          /append-only/,
        );
      },
    );
    await t.test(
      "manual terminal status cannot fake a registration",
      async () => {
        const unregistered = await locked((tx) =>
          saveProspect(tx, tiaan, {
            ...prospectInput,
            companyName: `Declined ${tag}`,
            email: `declined-${tag}@validation.invalid`,
          }),
        );
        await locked((tx) =>
          setProspectStatus(
            tx,
            tiaan,
            unregistered.id,
            "NOT_INTERESTED",
            unregistered.version,
          ),
        );
        const declined = await prisma.moverProspect.findUniqueOrThrow({
          where: { id: unregistered.id },
        });
        assert.ok(declined.respondedAt);
        assert.equal(declined.registeredAt, null);
      },
    );
  },
);
