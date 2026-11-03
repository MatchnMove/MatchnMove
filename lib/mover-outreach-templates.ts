import { escapeHtml, type SafeLead } from "@/lib/recruitment-policy";
import { NZ_SERVICE_AREAS } from "@/lib/nz-regions";
import { outreachEmailLayout, outreachSignatureHtml } from "@/lib/outreach-email-layout";

export const MOVER_TEMPLATE_VERSION = "2026-11-03.v2";
export const moverTemplateKeys = ["MOVER_GENERAL", "MOVER_OPPORTUNITY", "MOVER_FOLLOWUP_1", "MOVER_FOLLOWUP_2", "MOVER_FINAL", "MOVER_REENGAGEMENT"] as const;
export type MoverTemplateKey = typeof moverTemplateKeys[number];
export const cleanerTemplateKeys = ["CLEANER_GENERAL", "CLEANER_OPPORTUNITY", "CLEANER_FOLLOWUP_1", "CLEANER_FOLLOWUP_2", "CLEANER_FINAL", "CLEANER_REENGAGEMENT"] as const;
export type PartnerTemplateKey = MoverTemplateKey | typeof cleanerTemplateKeys[number];
const about = `**About Match 'n Move**

Match 'n Move is a New Zealand platform designed to connect people actively planning a move with professional moving companies that service their area. We're currently growing our mover network across the country, and we'd be pleased to have [Company Name] involved.

Customers submit the details of their move once through Match 'n Move, and relevant opportunities are then made available to moving companies based on factors such as their service area and the requirements of the move.

The aim is simple: to provide moving companies with another source of genuine enquiries from customers who are actively looking for moving services.

**Joining Match 'n Move is currently free, with no monthly subscription or long-term contract.**

Once registered, your team can:

- Create a professional profile for [Company Name]
- Select the regions and areas you service
- Receive relevant moving lead opportunities
- See the cost of a lead before accessing the customer's full contact details
- Manage leads through your Match 'n Move dashboard
- Pay for the leads you choose to access through one simple month-end invoice

We operate on a pay-per-lead model, so there is no monthly fee simply for being part of the platform.

[View our mover pricing and how the pay-per-lead system works](https://www.matchnmove.co.nz/mover/pricing)

As part of the registration process, we ask moving companies to complete their business details, service areas and relevant verification information. This helps us build a network of genuine, professional moving providers that customers can feel confident dealing with.

[Register here to join Match 'n Move as a moving provider](https://www.matchnmove.co.nz/mover/login)`;
const shortLinks = `[View our mover pricing](https://www.matchnmove.co.nz/mover/pricing)

[Register to join Match 'n Move](https://www.matchnmove.co.nz/mover/login)`;
export const moverEmailTemplates: Record<MoverTemplateKey, { name: string; subject: string; body: string }> = {
  MOVER_GENERAL: {
    name: "1A · General onboarding invitation",
    subject: "Invitation to join the Match 'n Move mover network",
    body: `I hope you're doing well.

I'm reaching out to introduce Match 'n Move and invite [Company Name] to join our growing network of professional moving companies across New Zealand.

${about.replace("**About Match 'n Move**\n\n", "")}

We'd love to welcome [Company Name] to Match 'n Move and get your team set up to receive relevant moving opportunities as our network continues to grow.

If you have any questions about Match 'n Move, the pricing structure or the registration process, simply reply directly to this email and I'll be happy to help.`,
  },
  MOVER_OPPORTUNITY: {
    name: "1B · Invitation with moving opportunity",
    subject: "Invitation to join the Match 'n Move mover network",
    body: `I hope you're doing well.

I'm reaching out from Match 'n Move as we have a moving opportunity that may be relevant to [Company Name], based on the areas your team services.

**Moving opportunity details**

We've received a moving request through Match 'n Move with the following details:

{{approvedLeadSummary}}

This opportunity may be a good fit for your team, and we'd like to invite [Company Name] to join Match 'n Move to access opportunities like this through our platform.

${about}

We'd love to welcome [Company Name] to Match 'n Move and get your team set up on the platform so you can review this moving opportunity and access other relevant enquiries as our network continues to grow.

If you have any questions about this moving opportunity, Match 'n Move, the pricing structure or the registration process, simply reply directly to this email and we'll be happy to help.`,
  },
  MOVER_FOLLOWUP_1: {
    name: "2 · First follow-up",
    subject: "Following up on your Match 'n Move invitation",
    body: `I hope you're doing well.

I wanted to follow up on our recent email inviting [Company Name] to join the Match 'n Move mover network.

We're continuing to grow our network of professional moving companies across New Zealand and would be pleased to have your team involved.

As mentioned in our previous email, Match 'n Move connects moving companies with genuine enquiries from customers actively planning a move.

**Joining is currently free, with no monthly subscription or long-term contract.** Our pay-per-lead model allows moving companies to review relevant opportunities and see the cost before choosing whether to access the customer's full contact details.

You can find more information about our pricing and registration process below:

${shortLinks}

We'd love to have [Company Name] involved as our network continues to grow.

If you have any questions or would like to discuss how the platform works, simply reply to this email and we'll be happy to help.`,
  },
  MOVER_FOLLOWUP_2: {
    name: "3 · Second follow-up",
    subject: "Checking in | Match 'n Move mover network",
    body: `I hope you're doing well.

I'm reaching out again regarding our invitation for [Company Name] to join the Match 'n Move mover network.

We understand that running a moving company can be busy, so I wanted to check whether your team has had an opportunity to consider joining the platform.

Our goal at Match 'n Move is to make it easier for moving companies to connect with customers actively looking for moving services, without the commitment of ongoing subscription fees.

**Registration remains free, and there is no obligation to purchase leads simply by joining.**

Once registered, your team can select the areas you service, review relevant moving opportunities and choose which leads you'd like to access.

${shortLinks}

If [Company Name] would be interested in joining, we'd be pleased to welcome your team.

Alternatively, if you have any questions or would prefer to discuss the platform before registering, feel free to reply directly to this email.

We look forward to hearing from you.`,
  },
  MOVER_FINAL: {
    name: "4 · Final follow-up",
    subject: "Final follow-up | Match 'n Move invitation",
    body: `I hope you're doing well.

I wanted to reach out one final time regarding our invitation for [Company Name] to join the Match 'n Move mover network.

We've previously shared some information about our platform and how we connect professional moving companies with customers actively looking for moving services.

We understand that joining another platform may not be a priority for your team at the moment, and that's completely understandable.

Before we close off our current invitation, I wanted to leave you with the opportunity to register whenever the timing suits your business.

**Joining Match 'n Move remains free, with no monthly subscription or long-term contract.** Your team can choose which moving opportunities to access through our pay-per-lead system.

${shortLinks}

We'll leave things here for now, but the invitation remains open should [Company Name] wish to join in the future.

Thank you for your time, and we wish your team all the best.`,
  },
  MOVER_REENGAGEMENT: {
    name: "5 · Three-month re-engagement (manual)",
    subject: "Reconnecting with [Company Name] | Match 'n Move",
    body: `I hope you're doing well.

I'm reaching out from Match 'n Move to reconnect with [Company Name] regarding an earlier invitation to join our mover network.

We're continuing to develop Match 'n Move as a platform connecting customers planning a move with professional moving companies across New Zealand.

As part of our ongoing network expansion, we're revisiting moving companies that may be interested in receiving additional moving enquiries through our platform.

**Registration is currently free, with no monthly subscription or long-term contract.**

Our pay-per-lead model allows moving companies to review relevant opportunities and decide which leads they'd like to access.

If [Company Name] would be interested in joining, we'd be pleased to welcome your team.

${shortLinks}

If you have any questions about how the platform works, simply reply to this email and we'll be happy to assist.`,
  },
};

// Preserve the sequence and approved commercial terms while adapting the service
// language before company names are populated.
function cleaningWording(value: string) {
  return value.replaceAll("https://www.matchnmove.co.nz/mover/pricing", "https://www.matchnmove.co.nz/cleaner/partner")
    .replaceAll("https://www.matchnmove.co.nz/mover/login", "https://www.matchnmove.co.nz/cleaner/register")
    .replaceAll("people actively planning a move", "people looking for move-out and move-in cleaning")
    .replaceAll("customers actively planning a move", "customers looking for move-out and move-in cleaning")
    .replaceAll("customers planning a move", "customers looking for move-out and move-in cleaning")
    .replaceAll("details of their move", "details of their cleaning request")
    .replaceAll("requirements of the move", "requirements of the clean")
    .replaceAll("professional moving", "professional cleaning")
    .replaceAll("moving companies", "cleaning companies").replaceAll("moving company", "cleaning company")
    .replaceAll("moving providers", "cleaning providers").replaceAll("moving provider", "cleaning provider")
    .replaceAll("moving services", "cleaning services").replaceAll("moving enquiries", "cleaning enquiries")
    .replaceAll("moving opportunities", "cleaning opportunities").replaceAll("moving lead", "cleaning lead")
    .replaceAll("mover network", "cleaner network").replaceAll("our mover", "our cleaner")
    .replaceAll("mover pricing", "cleaner pricing");
}
export const cleanerEmailTemplates = Object.fromEntries(moverTemplateKeys.map((key, index) => [cleanerTemplateKeys[index], {
  ...moverEmailTemplates[key], subject: cleaningWording(moverEmailTemplates[key].subject), body: cleaningWording(moverEmailTemplates[key].body),
}])) as Record<typeof cleanerTemplateKeys[number], { name: string; subject: string; body: string }>;
// Cleaning requests do not currently carry permission for recruitment summaries.
// This alternative introduces the opportunity model without inventing a job or
// copying a moving customer's property, dates or contact details.
cleanerEmailTemplates.CLEANER_OPPORTUNITY = {
  name: "1B · Cleaning opportunities introduction",
  subject: "Cleaning opportunities with Match 'n Move",
  body: `I hope you're doing well.\n\nI'm reaching out from Match 'n Move to invite [Company Name] to receive relevant move-out and move-in cleaning enquiries in the areas your team services.\n\n**Cleaning opportunities for your team**\n\nCustomers can request cleaning through Match 'n Move. Relevant enquiries are made available to cleaning companies based on their service areas and the customer's requirements. Your team can review each opportunity and its price before choosing whether to access the customer's full contact details.\n\n${cleaningWording(about)}\n\nWe'd love to welcome [Company Name] and help your team get set up to receive relevant cleaning enquiries.\n\nIf you have any questions about the cleaning opportunities, pricing or registration, simply reply to this email and we'll be happy to help.`,
};
export const outreachEmailTemplates = { ...moverEmailTemplates, ...cleanerEmailTemplates };
export function templateKeysForBusiness(businessType: string) {
  return businessType === "CLEANING" ? cleanerTemplateKeys : moverTemplateKeys;
}

function name(value?: string | null) {
  const clean = value?.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return clean && !/^(null|undefined|\[.*\])$/i.test(clean) ? clean : "";
}
export function moverGreeting(companyName: string, contactName?: string | null) {
  const company = name(companyName);
  if (!company) throw new Error("A company name is required before rendering an invitation.");
  const person = name(contactName);
  return person ? `Hi ${person} from ${company},` : `Hi ${company} team,`;
}

export const moverSignatureText = `Kind regards,

The Match 'n Move Team

P: +64 21 958 000 (Seth)
P: +64 210 872 1208 (Tiaan)
E: contact@matchnmove.co.nz
W: https://www.matchnmove.co.nz/

Plan the move. Book with confidence.`;
export function moverSignatureHtml() {
  return outreachSignatureHtml();
}

// Only the existing customer-authorised, allowlisted summary reaches this renderer.
// Requirements/private notes have no separately approved field, so they are omitted.
export function approvedOpportunityRows(lead: SafeLead) {
  const rows: Array<[string, string]> = [];
  const region = (value: string) => NZ_SERVICE_AREAS.some(area => area === value);
  if (region(lead.origin)) rows.push(["Moving from", lead.origin]);
  if (region(lead.destination)) rows.push(["Moving to", lead.destination]);
  if (/^\d{4}-\d{2}-\d{2}$/.test(lead.moveDate)) rows.push(["Preferred moving date", `${lead.moveDate}${lead.dateFlexible ? " (flexible)" : ""}`]);
  const property = /^(house|apartment|flat|unit|townhouse|office|storage|other)$/i.test(lead.property) ? lead.property : "";
  const bedrooms = /^(studio|[1-9]|[1-9]\+|[1-9] bedrooms?)$/i.test(lead.bedrooms) ? lead.bedrooms : "";
  const size = [bedrooms, property].filter(Boolean).join(" / ");
  if (size) rows.push(["Property size", size]);
  if (property) rows.push(["Type of move", property.toLowerCase() === "office" ? "Commercial" : ["storage", "other"].includes(property.toLowerCase()) ? "Other" : "Residential"]);
  return rows;
}

export function renderMoverOutreachEmail(input: {
  templateKey: PartnerTemplateKey; companyName: string; contactName?: string | null;
  registrationUrl: string; unsubscribeUrl: string; lead?: SafeLead | null; personalNote?: string;
}) {
  const template = outreachEmailTemplates[input.templateKey];
  const cleaning = input.templateKey.startsWith("CLEANER_");
  if (!template) throw new Error("Choose an approved email template.");
  if (cleaning && input.lead) throw new Error("A moving summary cannot be included in a cleaning invitation.");
  if (input.templateKey === "MOVER_OPPORTUNITY" && !input.lead) throw new Error("An authorised moving summary is required.");
  for (const url of [input.registrationUrl, input.unsubscribeUrl]) {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password) throw new Error("Invalid invitation link.");
  }
  const company = name(input.companyName);
  const greeting = moverGreeting(input.companyName, input.contactName);
  const populate = (text: string) => text.replaceAll("[Company Name]", company);
  const e = escapeHtml;
  const inline = (source: string): string => {
    const tokens = /(\*\*[^*]+\*\*|\[[^\]]+\]\(https:\/\/www\.matchnmove\.co\.nz\/[^)]+\)|\[Company Name\])/g;
    let result = "", last = 0;
    for (const match of source.matchAll(tokens)) {
      result += e(source.slice(last, match.index));
      const token = match[0];
      if (token === "[Company Name]") result += e(company);
      else if (token.startsWith("**")) result += `<strong>${inline(token.slice(2, -2))}</strong>`;
      else {
        const parts = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)!;
        const registration = /\/(mover\/login|cleaner\/register)$/.test(parts[2]);
        const url = registration ? input.registrationUrl : parts[2];
        result += `<a href="${e(url)}" style="${registration ? "display:inline-block;background:#0f766e;color:#ffffff;padding:12px 20px;border-radius:6px;font-weight:bold;text-decoration:none" : "color:#0f766e;text-decoration:underline"}">${e(parts[1])}</a>`;
      }
      last = match.index! + token.length;
    }
    return result + e(source.slice(last));
  };
  const rows = input.lead ? approvedOpportunityRows(input.lead) : [];
  const htmlBody = template.body.split("\n\n").map(block => {
    if (block === "{{approvedLeadSummary}}") return `<ul style="margin:0 0 20px;padding-left:24px">${rows.map(([title, value]) => `<li style="margin:0 0 6px"><strong>${e(title)}:</strong> ${e(value)}</li>`).join("")}</ul>`;
    if (block.startsWith("- ")) return `<ul style="margin:0 0 20px;padding-left:24px">${block.split("\n").map(line => `<li style="margin:0 0 6px">${inline(line.slice(2))}</li>`).join("")}</ul>`;
    return `<p style="margin:0 0 20px">${inline(block)}</p>`;
  }).join("");
  const plainBody = populate(template.body).replace("{{approvedLeadSummary}}", rows.map(([title, value]) => `- ${title}: ${value}`).join("\n"))
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, title: string, url: string) => /\/(mover\/login|cleaner\/register)$/.test(url) ? `${title}\nRegister: ${input.registrationUrl}` : `${title}\n${url}`)
    .replaceAll("**", "");
  const disclaimer = input.templateKey === "MOVER_OPPORTUNITY"
    ? "Availability may change; this request is not reserved or guaranteed. Customer contact details are available only through authorised platform access."
    : "Enquiry volumes and bookings are not guaranteed.";
  const footer = `<p style="margin:0;color:#64748b;font-size:12px;line-height:1.6">${e(disclaimer)}<br><a href="${e(input.unsubscribeUrl)}" style="color:#475569">Unsubscribe from recruitment invitations</a>. You can also reply to request no further recruitment emails.</p>`;
  return {
    subject: populate(template.subject),
    text: [greeting, input.personalNote?.trim(), plainBody, moverSignatureText, disclaimer, `Unsubscribe: ${input.unsubscribeUrl}`, "You can also reply to request no further recruitment emails."].filter(Boolean).join("\n\n"),
    html: outreachEmailLayout({ businessType: cleaning ? "CLEANING" : "MOVING", title: input.templateKey.endsWith("GENERAL") || input.templateKey.endsWith("OPPORTUNITY") ? `You're invited to join our ${cleaning ? "cleaner" : "mover"} network.` : input.templateKey.endsWith("REENGAGEMENT") ? "Let's reconnect." : "Your next opportunity starts here.", preheader: `Join New Zealand's ${cleaning ? "cleaning" : "moving"} partner network. Free registration, with the choice of leads you access.`, body: `<p style="margin:0 0 20px">${e(greeting)}</p>${input.personalNote?.trim() ? `<p style="margin:0 0 20px">${e(input.personalNote.trim()).replaceAll("\n", "<br>")}</p>` : ""}${htmlBody}`, footer }),
  };
}
