import { CleaningLeadStatus, Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CLEANING_LEAD_PRICING } from "@/lib/cleaner-lead-pricing";
import { matchNzServiceArea, type NzServiceArea } from "@/lib/nz-regions";

type PickupAddress = {
  fromRegion?: string | null;
  fromCity?: string | null;
  fromAddress?: string | null;
};

export type CleaningLeadNotificationContext = {
  leadId: string;
  cleaningRequestId: string;
  cleanerCompanyId: string;
  cleanerEmail: string;
  cleanerName: string;
  cleanerCompanyName: string;
  preferredLocale: string;
  pickupServiceArea: NzServiceArea;
  createdAt: Date;
};

export type CleaningLeadNotificationResult =
  | {
      sent?: boolean;
      queued?: boolean;
      emailDeliveryId?: string;
      error?: string;
    }
  | void;

/** Callback implementations must deduplicate by leadId. */
export type CleaningLeadNotificationCallback = (
  context: CleaningLeadNotificationContext,
) => Promise<CleaningLeadNotificationResult>;

export function getCleaningPickupServiceArea(quote: PickupAddress) {
  for (const value of [quote.fromRegion, quote.fromCity, quote.fromAddress]) {
    const area = matchNzServiceArea(value);
    if (area) return area;
  }
  return null;
}

const cleanerAssignmentSelect = Prisma.validator<Prisma.CleaningLeadSelect>()({
  id: true,
  cleaningRequestId: true,
  cleanerCompanyId: true,
  status: true,
  price: true,
  createdAt: true,
});

type CleanerAssignment = Prisma.CleaningLeadGetPayload<{ select: typeof cleanerAssignmentSelect }>;

async function ensureCleanerAssignment(input: {
  cleaningRequestId: string;
  cleanerCompanyId: string;
  pickupServiceArea: NzServiceArea;
}) {
  try {
    const lead = await prisma.$transaction(async (tx) => {
      const created = await tx.cleaningLead.create({
        data: {
          cleaningRequestId: input.cleaningRequestId,
          cleanerCompanyId: input.cleanerCompanyId,
          status: CleaningLeadStatus.NEW,
          price: CLEANING_LEAD_PRICING.fixedPrice,
        },
        select: cleanerAssignmentSelect,
      });
      await tx.cleaningLeadAuditLog.create({
        data: {
          cleaningLeadId: created.id,
          action: "cleaning_lead_assigned",
          meta: {
            cleanerCompanyId: input.cleanerCompanyId,
            cleaningRequestId: input.cleaningRequestId,
            pickupServiceArea: input.pickupServiceArea,
            price: CLEANING_LEAD_PRICING.fixedPrice,
            currency: CLEANING_LEAD_PRICING.currency,
          },
        },
      });
      return created;
    });
    return { lead, created: true } as const;
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error;
    }

    const existing = await prisma.cleaningLead.findUnique({
      where: {
        cleaningRequestId_cleanerCompanyId: {
          cleaningRequestId: input.cleaningRequestId,
          cleanerCompanyId: input.cleanerCompanyId,
        },
      },
      select: cleanerAssignmentSelect,
    });
    if (!existing) throw error;
    return { lead: existing, created: false } as const;
  }
}

function notificationWasAccepted(result: CleaningLeadNotificationResult) {
  if (!result) return true;
  return Boolean(result.sent || result.queued);
}

async function notifyCleanerAssignment(
  assignment: CleanerAssignment,
  cleaner: {
    id: string;
    companyName: string;
    contactPerson: string;
    user: { email: string; name: string | null; preferredLocale: string };
  },
  pickupServiceArea: NzServiceArea,
  notify: CleaningLeadNotificationCallback,
) {
  try {
    const result = await notify({
      leadId: assignment.id,
      cleaningRequestId: assignment.cleaningRequestId,
      cleanerCompanyId: cleaner.id,
      cleanerEmail: cleaner.user.email,
      cleanerName: cleaner.contactPerson || cleaner.user.name || cleaner.companyName,
      cleanerCompanyName: cleaner.companyName,
      preferredLocale: cleaner.user.preferredLocale,
      pickupServiceArea,
      createdAt: assignment.createdAt,
    });
    const accepted = notificationWasAccepted(result);

    if (accepted) {
      await prisma.$transaction(async (tx) => {
        const claim = await tx.cleaningLead.updateMany({
          where: {
            id: assignment.id,
            status: CleaningLeadStatus.NEW,
          },
          data: { status: CleaningLeadStatus.NOTIFIED },
        });
        if (claim.count === 1) {
          await tx.cleaningLeadAuditLog.create({
            data: {
              cleaningLeadId: assignment.id,
              action: "cleaning_lead_notification_accepted",
              meta: {
                sent: result?.sent ?? null,
                queued: result?.queued ?? null,
                emailDeliveryId: result?.emailDeliveryId ?? null,
              },
            },
          });
        }
      });
    } else {
      await prisma.cleaningLeadAuditLog.create({
        data: {
          cleaningLeadId: assignment.id,
          action: "cleaning_lead_notification_deferred",
          meta: {
            error: result?.error ?? "Notification callback did not accept the message.",
          },
        },
      });
    }

    return {
      leadId: assignment.id,
      accepted,
      error: accepted ? undefined : result?.error,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown cleaning lead notification error.";
    try {
      await prisma.cleaningLeadAuditLog.create({
        data: {
          cleaningLeadId: assignment.id,
          action: "cleaning_lead_notification_failed",
          meta: { error: message },
        },
      });
    } catch {
      // Notification failure must not be replaced by an audit-write failure.
    }
    return { leadId: assignment.id, accepted: false, error: message };
  }
}

export async function distributeCleaningRequest(input: {
  cleaningRequestId: string;
  notify?: CleaningLeadNotificationCallback;
}) {
  const cleaningRequest = await prisma.cleaningRequest.findUnique({
    where: { id: input.cleaningRequestId },
    select: {
      id: true,
      quoteRequestId: true,
      quoteRequest: {
        select: {
          fromAddress: true,
          fromCity: true,
          fromRegion: true,
        },
      },
    },
  });
  if (!cleaningRequest) throw new Error("Cleaning request not found.");

  const pickupServiceArea = getCleaningPickupServiceArea(cleaningRequest.quoteRequest);
  if (!pickupServiceArea) {
    await prisma.adminAuditLog.create({
      data: {
        action: "cleaning_distribution_no_service_area",
        meta: {
          cleaningRequestId: cleaningRequest.id,
          quoteRequestId: cleaningRequest.quoteRequestId,
        },
      },
    });
    return {
      pickupServiceArea: null,
      matchingCleanerCount: 0,
      assignedCount: 0,
      createdCount: 0,
      notifications: [],
    };
  }

  const cleaners = await prisma.cleanerCompany.findMany({
    where: {
      status: "ACTIVE",
      serviceAreas: { has: pickupServiceArea },
      user: { role: UserRole.CLEANER },
    },
    select: {
      id: true,
      companyName: true,
      contactPerson: true,
      user: {
        select: {
          email: true,
          name: true,
          preferredLocale: true,
        },
      },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  const assignmentResults = await Promise.all(
    cleaners.map((cleaner) =>
      ensureCleanerAssignment({
        cleaningRequestId: cleaningRequest.id,
        cleanerCompanyId: cleaner.id,
        pickupServiceArea,
      }),
    ),
  );

  // Existing NEW assignments are retried. The callback contract requires a
  // lead-based dedupe key, matching the existing email queue architecture.
  const notificationCandidates = input.notify
    ? assignmentResults.filter((assignment) => assignment.lead.status === CleaningLeadStatus.NEW)
    : [];
  const notifications = input.notify
    ? await Promise.all(
        notificationCandidates.map((assignment) => {
          const cleaner = cleaners.find((item) => item.id === assignment.lead.cleanerCompanyId);
          if (!cleaner) {
            return Promise.resolve({
              leadId: assignment.lead.id,
              accepted: false,
              error: "Cleaner notification context was not found.",
            });
          }
          return notifyCleanerAssignment(assignment.lead, cleaner, pickupServiceArea, input.notify!);
        }),
      )
    : [];

  const createdCount = assignmentResults.filter((assignment) => assignment.created).length;
  await prisma.adminAuditLog.create({
    data: {
      action: cleaners.length ? "cleaning_distribution_completed" : "cleaning_distribution_no_recipients",
      meta: {
        cleaningRequestId: cleaningRequest.id,
        quoteRequestId: cleaningRequest.quoteRequestId,
        pickupServiceArea,
        matchingCleanerCount: cleaners.length,
        assignedCount: assignmentResults.length,
        createdCount,
        notificationAttemptCount: notifications.length,
        notificationAcceptedCount: notifications.filter((notification) => notification.accepted).length,
        notificationFailureCount: notifications.filter((notification) => !notification.accepted).length,
      },
    },
  });

  return {
    pickupServiceArea,
    matchingCleanerCount: cleaners.length,
    assignedCount: assignmentResults.length,
    createdCount,
    notifications,
  };
}
