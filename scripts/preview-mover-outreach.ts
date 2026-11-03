import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { outreachEmailTemplates, moverTemplateKeys, cleanerTemplateKeys, renderMoverOutreachEmail } from "../lib/mover-outreach-templates";
import { safeLeadSummary } from "../lib/recruitment-policy";

async function main() {
  const output = path.resolve(process.argv[2] || ".next/outreach-previews");
  await mkdir(output, { recursive: true });
  const lead = safeLeadSummary({ id: "preview-only", fromRegion: "Auckland", toRegion: "Waikato", moveDate: new Date("2027-01-20T00:00:00Z"), dateFlexible: false, bedrooms: "3", fromPropertyType: "House", createdAt: new Date() });
  const keys = [...moverTemplateKeys, ...cleanerTemplateKeys];
  for (const templateKey of keys) {
    const cleaning = templateKey.startsWith("CLEANER_");
    const email = renderMoverOutreachEmail({ templateKey, companyName: cleaning ? "North Harbour Cleaners" : "North Harbour Movers", contactName: "Alex", lead: cleaning ? null : lead,
      registrationUrl: `https://www.matchnmove.co.nz/${cleaning ? "cleaner/register" : "mover/login?mode=signup"}`, unsubscribeUrl: "https://www.matchnmove.co.nz/recruitment/unsubscribe?token=preview-only" });
    await writeFile(path.join(output, `${templateKey.toLowerCase()}.html`), email.html);
    await writeFile(path.join(output, `${templateKey.toLowerCase()}.txt`), `Subject: ${email.subject}\n\n${email.text}`);
  }
  const index = `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Match 'n Move · Approved outreach preview</title><style>body{margin:0;padding:24px;background:#e2e8f0;color:#0f172a;font:14px/1.5 Arial}h1{font-size:24px}nav{display:flex;flex-wrap:wrap;gap:12px;margin:20px 0}a{color:#0f766e}main{display:flex;gap:24px;align-items:flex-start}iframe{border:1px solid #cbd5e1;background:white;height:2100px}h2{font-size:16px}.mobile{width:320px}.desktop{width:700px}</style></head><body><h1>Match 'n Move · Moving & cleaning email previews</h1><p>Review-only examples. This page does not send emails. The signature uses the existing public PNG logo. Choose any template to inspect its full email.</p><nav>${keys.map(key => `<a href="${key.toLowerCase()}.html">${(key.startsWith("CLEANER_") ? "Cleaning · " : "Moving · ") + outreachEmailTemplates[key].name}</a>`).join("")}</nav><main><section><h2>Mobile · 320px</h2><iframe class="mobile" title="Mobile invitation" src="mover_general.html"></iframe></section><section><h2>Desktop · 700px</h2><iframe class="desktop" title="Desktop invitation" src="mover_general.html"></iframe></section></main></body></html>`;
  await writeFile(path.join(output, "index.html"), index);
  console.log(`Wrote twelve HTML/plain-text email previews to ${output}`);
}
void main();
