import { prisma } from "../lib/db";
import { canMoverAccessLeads } from "../lib/mover-lead-access";
import { calculateLeadPrice } from "../lib/lead-pricing";
import { getLeadExpiryDate, getQuoteMatchedRegions, INITIAL_LEAD_RECIPIENT_LIMIT, selectLeadRecipients, sendMoverNewLeadNotification } from "../lib/lead-lifecycle";

// Dry run by default. Usage: npx tsx scripts/repair-mover-quote-distribution.ts --quote ID [--apply]
const args = process.argv.slice(2);
const quoteId = args[args.indexOf("--quote") + 1];
const apply = args.includes("--apply");
const repairAction = "lead_created_after_eligibility_update";

async function main() {
  if (!args.includes("--quote") || !quoteId || quoteId.startsWith("--")) throw new Error("Specify --quote ID.");
  const quote = await prisma.quoteRequest.findUniqueOrThrow({ where: { id: quoteId } });
  if (!quote.sharingConsentAt) throw new Error("This repair requires recorded customer sharing consent.");
  if (quote.moveDate && quote.moveDate.getTime() < Date.now() - 24 * 60 * 60 * 1000) throw new Error("The move date is in the past; review it before redistributing.");
  const matchedRegions = getQuoteMatchedRegions(quote);
  if (!matchedRegions.length) throw new Error("No service regions could be resolved.");

  const result = await prisma.$transaction(async (tx) => {
    // Serialize repeat repair runs for this quote without changing existing leads.
    await tx.$queryRaw`SELECT id FROM "QuoteRequest" WHERE id = ${quoteId} FOR UPDATE`;
    const existing = await tx.lead.findMany({ where: { quoteRequestId: quoteId }, select: { id: true, moverCompanyId: true, price: true } });
    const movers = await tx.moverCompany.findMany({ where: { status: "ACTIVE", serviceAreas: { hasSome: matchedRegions } }, include: { user: true } });
    const eligible = movers.filter(canMoverAccessLeads);
    const recipients = selectLeadRecipients(
      eligible.filter((mover) => !existing.some((lead) => lead.moverCompanyId === mover.id)),
      INITIAL_LEAD_RECIPIENT_LIMIT - new Set(existing.map((lead) => lead.moverCompanyId)).size,
    );
    const summary = {
      quoteId, matchedRegions, existingLeadCount: existing.length,
      eligibleMovers: eligible.map((mover) => ({ id: mover.id, companyName: mover.companyName })),
      newRecipients: recipients.map((mover) => ({ id: mover.id, companyName: mover.companyName })),
    };
    if (!apply) return { ...summary, createdLeadIds: [] as string[] };
    const price = existing[0]?.price ?? calculateLeadPrice(quote).price;
    const createdLeadIds: string[] = [];
    for (const mover of recipients) {
      const lead = await tx.lead.create({ data: {
        quoteRequestId: quoteId, moverCompanyId: mover.id, status: "NOTIFIED", price, expiresAt: getLeadExpiryDate(),
        auditLogs: { create: { action: repairAction, meta: { quoteRequestId: quoteId, matchedRegions, reason: "Owner requested quote access for active movers while business verification is pending." } } },
      } });
      createdLeadIds.push(lead.id);
    }
    if (createdLeadIds.length) await tx.adminAuditLog.create({ data: {
      action: "quote_distribution_repaired", meta: { ...summary, createdLeadIds, source: "Owner-authorized maintenance" },
    } });
    return { ...summary, createdLeadIds };
  }, { timeout: 20_000 });
  console.log(JSON.stringify({ apply, ...result }, null, 2));

  if (apply) {
    // Retry only leads created by this repair. The email dedupe key prevents a
    // repeat run from resending an already delivered notification.
    const leads = await prisma.lead.findMany({
      where: { quoteRequestId: quoteId, status: { in: ["NEW", "NOTIFIED", "VIEWED"] }, expiresAt: { gt: new Date() }, auditLogs: { some: { action: repairAction } } },
      include: { quoteRequest: true, moverCompany: { include: { user: true } } },
    });
    for (const lead of leads) {
      if (!canMoverAccessLeads(lead.moverCompany)) continue;
      const delivery = await sendMoverNewLeadNotification(lead);
      console.log(JSON.stringify({ mover: lead.moverCompany.companyName, leadId: lead.id, sent: delivery.sent, queued: delivery.queued, skipped: delivery.skipped, emailDeliveryId: delivery.emailDeliveryId }));
      if (!delivery.sent && !delivery.queued) throw new Error("Notification was neither sent nor queued.");
    }
  }
}

main().then(async () => { await prisma.$disconnect(); process.exit(0); }).catch(async (error: unknown) => {
  // Connection strings and customer details must not appear in maintenance logs.
  console.error(error instanceof Error ? error.name : "Repair failed");
  await prisma.$disconnect();
  process.exit(1);
});
