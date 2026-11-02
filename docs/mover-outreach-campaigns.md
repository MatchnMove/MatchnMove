# Approved mover onboarding and follow-ups

The six supplied mover emails are integrated into the existing company directory, Email station, partner inbox and job worker. Cleaning invitations retain their separate workflow. No real campaign, customer email or paid provider call was sent while developing or testing this change.

## Approved content

`lib/mover-outreach-templates.ts` is the canonical source, version `2026-11-03.v1`. The repeated re-engagement body in the supplied request is represented once. The supplied wording, paragraphs, emphasis and lists are preserved. Technical additions are the tracked registration destination, personalised fields, a discreet unsubscribe footer and the existing availability/booking disclaimer.

| Template | Exact subject | Use |
| --- | --- | --- |
| 1A | Invitation to join the Match 'n Move mover network | General Day 0 invitation |
| 1B | Invitation to join the Match 'n Move mover network | Alternative Day 0 with an authorised, current moving opportunity |
| 2 | Following up on your Match 'n Move invitation | First follow-up |
| 3 | Checking in \| Match 'n Move mover network | Second follow-up |
| 4 | Final follow-up \| Match 'n Move invitation | Final automatic follow-up |
| 5 | Reconnecting with [Company Name] \| Match 'n Move | Manual three-month re-engagement; company name is populated |

Greetings use the editable contact person and company record: `Hi Alex from Example Movers,`. A missing contact person produces `Hi Example Movers team,`. Empty/placeholder names are rejected or replaced with that fallback. Names and personal notes are escaped in HTML. An optional note changes only that email; the canonical copy is not overwritten.

The signature is one shared renderer with the exact supplied team name, both phone numbers, contact email, website and tagline. Its official image is the existing **`public/logo-mark.png`**, already used by the application's email infrastructure, hosted at `https://www.matchnmove.co.nz/logo-mark.png`. No substitute logo was generated. The PNG has alt text and a white backing; phone, email and website links are clickable. The predominantly white layout uses inline styles, presentation tables, Arial and restrained existing teal/slate colours, with a readable plain-text alternative.

The general invitation and signature were visually checked at 320px and 700px widths in the browser. All six templates have automated render/content checks. Actual Gmail, Outlook and Apple Mail message delivery/rendering has not been exercised; do a single authorised internal seed-inbox check before enabling live automation.

## Administrator instructions

1. Open **Company directory**, add or edit a **Moving company**, enter its contact person, business email and real service coverage, then record the reviewed contact-permission basis and evidence.
2. Use **Write email / Email station** for Template 1A. To use 1B, open **Lead opportunities**, review an authorised summary and prepare the invitation there. A draft sequence has only one Day 0 email; choosing the other initial template replaces that unsent initial draft.
3. Review the populated subject, recipient, greeting, full HTML/plain-text body, links, signature and any approved summary. An optional personal note is available. Save edits to refresh the preview, then explicitly approve sending.
4. In **Inbox**, an outreach draft can use an empty personal-note field. Saving inserts the approved mover invitation or existing cleaning invitation. The formatted preview displays the signature; arbitrary external images remain blocked.
5. The company's **Mover outreach sequence** panel shows Day 0, most recent send, current stage, next follow-up, response/registration state, review date and template/version history. **Pause follow-ups**, **Resume eligible sequence** and **Cancel pending follow-ups** operate on the saved sequence.
6. Open **Follow-ups → Revisit due · three-month review** for due reviews. **Preview re-engagement** prepares Template 5 without sending it. Review it in the Email station and explicitly approve sending, or postpone the review 14 days or dismiss/close it.
7. Starting a later campaign requires the separate **Start a new reviewed sequence** action and confirmation. Replies, registrations, permanent suppressions and unresolved delivery outcomes still block it. Closing a sequence never automatically repeats it.

Existing emails remain in their history. Legacy records are **not automatically enrolled**. Staff must review their history and explicitly start a new eligible sequence. Cleaning companies are not enrolled in this mover campaign.

## Calendar and worker behaviour

Dates are persisted in PostgreSQL and displayed in **Pacific/Auckland**:

- Day 0 is the initial invitation's **successful provider-acceptance timestamp**.
- Template 2 is due seven Auckland calendar days later.
- Template 3 is due 21 Auckland calendar days after Template 2 is successfully sent, nominally Day 28. If an earlier send is delayed, the later interval is preserved rather than compressing several messages together.
- Template 4 is due one Auckland calendar month after Template 3 is successfully sent.
- The manual review date is always **three calendar months after Day 0**, independently of delayed or missing later follow-ups. Due reviews cancel pending automatic follow-ups and create a review task; they do not send Template 5.
- Weekends count as calendar days. Month-end dates clamp to the target month's last day. Wall-clock time is preserved through DST; nonexistent spring-forward times move into the first valid hour.

The existing partner inbox worker runs the campaign processor once per tick. The authenticated `POST /api/recruitment/process` cron endpoint also runs it, for deployments using an external scheduler. Unlike the old endpoint, this job **can send eligible scheduled follow-ups when automation is explicitly enabled**. The generic transactional email queue still excludes recruitment deliveries.

The shared recruitment database lock, per-campaign stage uniqueness, a single open campaign per company, persisted send state and stable RFC message IDs protect against simultaneous workers, repeated clicks and restarts. Existing rolling per-admin send limits and the one-company-attempt-per-24-hours guard remain. Follow-up reminders are retained in the existing task system and completed/cancelled as stages progress or stop. Threading uses `In-Reply-To`/`References` where supported; the admin inbox keeps the messages associated with the original conversation. Some mail clients may split conversations because the approved subject lines differ.

## Setup and stopping conditions

The owner must verify the existing SMTP sender connection and enable **outreach sending**. The separate **Enable automatic mover follow-ups** setting defaults to **off**. Turning it on does not enrol historical emails and never sends initial invitations or Template 5 automatically.

Before automatic sends, the application requires:

- A connected monitored partner inbox, completed initial sync and no pending reply-import page.
- A successful sync within the last two minutes and no current sync error.
- Recruitment From and Reply-To are fixed to `contact@matchnmove.co.nz`; the connected Google account must receive replies to that address and authorise it as its primary address or a verified send-as alias.
- An active, authorised assigned admin with sending permission; verified/enabled sender settings; reviewed consent; an unsuppressed valid recipient; an eligible current campaign stage; and the existing contact limits.

If inbox integration is missing, stale or catching up, automatic emails wait. The UI explicitly says reply status is unknown; no inference is made that a company ignored an email.

An imported anchored reply records `respondedAt`, stops pending outreach and creates a review task. Explicit unsubscribe/no-contact wording in the new reply is suppressed; quoted unsubscribe footers are excluded from that detection. Other replies also stop the sequence even when their intent needs human review. A decline or do-not-contact status, registration (including without an attribution cookie), unsubscribe link, or verified provider hard-bounce/complaint event stops outreach. Suppressions are not automatically cleared and a response never automatically restarts a sequence.

Definitive temporary SMTP rejections can retry scheduled automatic follow-ups up to **three total attempts**, with 5-minute and 15-minute backoffs persisted in the database. Permanent failures stop the sequence; permanent recipient failures are suppressed. Ambiguous outcomes, including losing the connection after DATA, require owner review and are **never automatically resent**. A prior unresolved delivery also prevents a replacement campaign. Confirming a provider-accepted message through the existing inbox reconciliation can resolve its delivery state; only an eligible sequence with a confirmed outcome can resume. Message history labels **sent/provider accepted**, not proven inbox delivery.

## Customer privacy

For asynchronous bounces and complaints, the existing `/api/recruitment/provider-events` contract accepts verified `HARD_BOUNCE`, `COMPLAINT` and `UNSUBSCRIBE` events. A provider-specific adapter must verify the provider's native signature and relay the signed contract using `RECRUITMENT_WEBHOOK_SECRET`. That external relay is **not configured or verified by this change**. Verify permanent-bounce feedback before enabling live automation; a healthy inbox sync is not proof of bounce-event coverage. Immediate SMTP recipient rejection is separately handled and tested.

Template 1B accepts only the existing customer-authorised recruitment summary: canonical NZ regions, date/flexibility, allowlisted property type and bedroom count. Move type is derived from that approved property type. The database must still have `recruitmentSharingAllowed` and sharing consent. Dated opportunities cannot be in the past; undated requests must have been created within 30 days. The permission, date and rendered summary are rechecked at send time. Changed details require a refreshed preview.

No customer names, phone numbers, emails, exact addresses, private notes or transcripts enter these emails. The existing schema has no separately approved free-text requirements field, so **Additional requirements is omitted**. Missing details are omitted rather than invented. Follow-ups and re-engagement contain no original lead summary or suggestion that it is still available.

## Deployment and implementation

Apply `20261103000000_mover_outreach_campaigns` before running the updated application. Railway's existing pre-deploy migration command handles this when deployed. The migration adds `OutreachCampaign`, campaign/template/version/schedule/retry fields on `OutreachMessage`, and scoped uniqueness indexes. Historical messages are preserved; no production company, consent or customer data is changed. No project runtime dependency was added.

| Area | Files |
| --- | --- |
| Approved content, signature and HTML/plain text | `lib/mover-outreach-templates.ts` |
| Campaign state, eligibility, milestones, review and job processing | `lib/mover-outreach-campaigns.ts` |
| Auckland calendar arithmetic | `lib/recruitment-dates.ts` |
| Drafting, approvals, SMTP, threading and failures | `lib/recruitment.ts`, `lib/recruitment-outreach.ts`, `lib/email.ts` |
| Inbox reply stopping, draft defaults, sending and history | `lib/partner-inbox-sync.ts`, `lib/partner-inbox-outgoing.ts`, `lib/partner-inbox-policy.ts`, `components/partner-inbox.tsx` |
| Admin controls and API | `components/recruitment-workspace.tsx`, `app/api/admin/recruitment/route.ts` |
| Existing worker/cron integration | `lib/partner-inbox-worker.ts`, `app/api/recruitment/process/route.ts` |
| Registration stopping | `lib/mover-auth.ts`, `lib/cleaner-auth.ts` |

## Validation and remaining live checks

| Check | Result |
| --- | --- |
| `npm test` | 114 passed; 10 opt-in integration entries skipped by default |
| New campaign PostgreSQL/local-SMTP suite | 13 passed |
| Existing partner inbox database/fixture-transport suite | 21 passed |
| Existing general recruitment email suite | 8 passed |
| Existing recruitment database suite | 17 passed |
| TypeScript and ESLint | Passed |
| Production build (`npm run build -- --webpack`) | Passed against the disposable local database, background jobs disabled |
| Migration deploy and Prisma schema comparison | Passed; no drift |
| Browser review | General invitation and signature inspected at 320px and 700px; shared layout used by all templates |

The four database suites above were run explicitly rather than relying on their skipped default entries. Other opt-in HTTP/live-session suites were not run in this session.

Tests cover all six subjects/bodies, greetings/fallbacks, signature/logo/links, HTML escaping, customer-data exclusion, lead eligibility and changed summaries, Auckland DST/month arithmetic, mailbox health, opt-out quoting, UI preview-only re-engagement, actual local SMTP transactions, concurrent approvals/workers, retry/backoff limits, uncertain delivery, reply imports, registration/suppression stopping, manual re-engagement and legacy inbox behaviour.

The full migration chain was applied to a disposable loopback PostgreSQL database, with the historical production-only cleanup marked applied **only in that empty test database**. Prisma reported no schema drift. All SMTP messages stayed in a local test catcher and Gmail/storage transports in regression tests were fixtures. Production data and credentials were not changed.

On **3 November 2026**, public HTTPS checks returned 200 for the PNG logo, mover pricing and mover login/signup page. Public DNS published SPF authorising Google, a `google._domainkey` DKIM key and a DMARC quarantine policy. These checks do **not** prove that the configured account currently signs and aligns every outgoing email, nor inbox placement. Before enabling live automation, verify the authorised From/reply-to account, its Gmail inbox connection, one received internal test message's authentication headers and rendering in the required clients. No live messages were sent for these checks.

Generate review-only HTML/plain-text samples with:

```powershell
npx tsx scripts/preview-mover-outreach.ts
```

The default output is `.next/outreach-previews/index.html` plus six HTML and text files. It sends nothing. To run the new database suite, set both `DATABASE_URL` and `OUTREACH_TEST_DATABASE_URL` to the same migrated disposable loopback PostgreSQL URL whose database name ends in `_test`, then run:

```powershell
npx tsx --test tests/mover-outreach-database.test.ts
```
