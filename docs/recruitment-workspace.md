# Recruitment workspace: implementation and release guide

Entry point: `/admin/recruitment`. This extends the existing application, PostgreSQL database, session cookie, admin authenticator flow, password hashing, SMTP transport and `EmailDelivery` records. No new runtime dependency or paid service was added.

## Implemented

- Personal and owner dashboards, current task queues, event history, Auckland calendar date filters, team comparison and database-derived conversion reporting.
- Owner-only Team Management: prepare, send, revoke and accept individual invitations; change roles and lead-summary/sending permissions; disable accounts; send existing password-recovery links. Self-demotion and self-disable are blocked. Permission changes revoke existing sessions and pending authentication tokens.
- Assigned mover CRM: searchable and paginated companies, pipeline filters, contact details, service coverage, permission evidence, notes, ownership checks, versioned edits and owner reassignment that transfers pending tasks.
- Normalized email uniqueness, normalized company-name detection, website/phone duplicate warnings, and explicit owner explanations for legitimate duplicates. Cross-admin duplicate errors do not expose the other record's notes or identity.
- Optional customer consent for recruitment summaries. Existing requests default to excluded. Recruitment summaries explicitly allow only canonical NZ regions, date/flexibility, approved property type and bedroom count. No names, street addresses, postcodes, phones, emails, transcripts or free-form customer notes are serialized.
- Existing quote-detail cards have **Create Mover Invitation** links. The opportunities view ranks authorized companies using recorded coverage, service category and distance capability, explains its reasons and flags incomplete coverage for review.
- Individually personalized HTML and plain-text invitations, sandboxed previews, constrained introduction editing, saved drafts, formatted clipboard copying, sending history and manual approval for every send. Batch preparation creates up to 20 drafts and sends none.
- Persistent consent basis/evidence, suppression records, public unsubscribe confirmation, reply-based suppression by the owner, and a signed adapter endpoint for bounce/complaint/unsubscribe events.
- Global transactional send/assignment/registration locking, a rolling database-backed per-admin limit, one contact attempt per company per 24 hours, stable delivery identifiers and no automatic recruitment retries.
- Follow-up drafts and configurable, deduplicated follow-up/registration/response tasks. Registration, declining and unsubscribing cancel unnecessary follow-ups. The scheduler marks overdue follow-ups and interrupted sends for review; it never sends outreach.
- Secure registration attribution in an HTTP-only cookie: 256-bit opaque token, hashed lookup, 30-day expiration, exact prospect email match and a single transactional claim on a newly created account. Links never authenticate users or claim existing businesses.
- Direct outcome synchronization on email verification, Google signup, profile changes and successful Stripe checkout; periodic reconciliation covers later changes. Existing customer, mover, cleaner and billing routes remain in place.
- Append-only database triggers for privileged audit records and recruitment activity. Database operators can still alter triggers, so use restricted application credentials and independent backups for stronger operational assurance.
- Private workspaces and account-token pages exclude Google Analytics and Microsoft Clarity. Crossing between public and private routes starts a fresh document before private content is rendered, preventing an already loaded public recorder from observing the workspace.

## Accounts: actual status

No production migration, live account mutation or real invitation/outreach email was performed during implementation.

The migration stages **Carli**, `carlioosterbroek@outlook.com`, as a pending `RECRUITMENT_ADMIN` invitation. This is the normalized form of `Carlioosterbroek@outlook.com`. It creates no password, credential, token or email delivery. If an existing matching account already has a team role, the migration leaves it alone. If a matching ordinary account exists, invitation acceptance requires its signed-in, verified owner and preserves its password, role, business data and existing ID.

After deploying and verifying SMTP, open **Team Management**, review Carli's pending invitation, and explicitly send it. Carli follows the 48-hour single-use link, chooses her own password if creating a new account, then signs in through the existing email-code and authenticator flow. Sending permission is initially off; lead-summary permission is initially on. The owner can grant sending access separately.

For Tiaan, enter his actual email in **Team Management → Prepare invitation**, review the recipient, then send. No address for Tiaan was fabricated.

Existing `ADMIN` and configured `MOVER_ADMIN_EMAILS` owner access is preserved unless the account has an explicit recruitment role or is disabled. Recruitment membership cannot inherit owner access through the legacy allowlist. No database user was guessed to be Lance. After verifying Lance's existing account ID and verified email, use:

```powershell
npm run admin:recruitment-owner -- --user-id VERIFIED_EXISTING_USER_ID --email VERIFIED_EXISTING_EMAIL
# Inspect the dry-run result, then explicitly apply to that same verified account:
npm run admin:recruitment-owner -- --user-id VERIFIED_EXISTING_USER_ID --email VERIFIED_EXISTING_EMAIL --apply
```

The script rejects missing/unverified/non-admin accounts and never creates a replacement owner. It invalidates that account's sessions after assigning `OWNER`; sign in again. Owners whose existing user role was `MOVER` appear in team assignment lists once this explicit role is assigned.

## Schema and code map

Migration: `prisma/migrations/20261024000000_recruitment_workspace/migration.sql`.

New models: `AdminInvitation`, `MoverProspect`, `OutreachMessage`, `RecruitmentTask`, `RecruitmentActivity`, `ContactSuppression`, `RecruitmentSetting`, `RecruitmentProviderEvent`. New enums: `AdminRole`, `RecruitmentStatus`.

Existing `User` gains team role, disabled timestamp, permission flags, session version and last sign-in. `QuoteRequest` gains a false-by-default recruitment-sharing flag; `MoverCompany` gains the attribution relationship. Existing lead, payment, company and email-delivery records are reused.

| Files | Responsibility |
| --- | --- |
| `lib/recruitment-policy.ts`, `lib/recruitment-request.ts`, `lib/recruitment-dates.ts` | Privacy projection, consent gates, matching, tokens, request-origin checks and Auckland report dates |
| `lib/recruitment.ts` | Actor authorization, transaction locking, CRM, consent, suppression, drafts and activity |
| `lib/recruitment-team.ts` | Team invitations, activation, ownership verification and role changes |
| `lib/recruitment-outreach.ts` | Approved SMTP delivery, draft editing, attribution and outcome/task reconciliation |
| `lib/recruitment-reporting.ts` | Scoped database counts and cohort conversions |
| `app/api/admin/recruitment/route.ts` | Authenticated, validated and scoped workspace operations |
| `app/admin/recruitment/[[...section]]/page.tsx`, `components/recruitment-workspace.tsx` | Integrated dashboard, CRM, opportunities, email review, tasks, team and settings |
| `app/admin/accept-invitation`, `components/team-activation.tsx` | Individual account activation |
| `app/api/recruitment/*`, `app/recruitment/unsubscribe` | Activation endpoint, registration-link redirect, unsubscribe confirmation, scheduler and provider relay |
| Existing auth, mover registration/verification/profile, Stripe webhook, email and background-job files | Compatibility integration and immediate session revocation |
| Existing quote form, validators, quote submission and privacy page | Separate optional customer authorization for general recruitment summaries |
| `tests/recruitment-*.test.ts` | Policy, PostgreSQL concurrency and live HTTP access-control tests |

## Email configuration and first test

Existing variables remain required: `DATABASE_URL`, a strong `NEXTAUTH_SECRET`, `MFA_ENCRYPTION_KEY`, `NEXTAUTH_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and the existing authentication sender configuration. Use a public HTTPS `NEXTAUTH_URL` in production.

New variables are documented in `.env.example`:

| Variable | Purpose |
| --- | --- |
| `RECRUITMENT_FROM_EMAIL` | Authenticated mailbox or provider-authorized sender alias; falls back to `DEFAULT_FROM_EMAIL` |
| `RECRUITMENT_REPLY_TO` | Monitored mailbox that can also receive unsubscribe replies |
| `RECRUITMENT_EMAIL_VERIFIED` | Defaults false; explicitly set true only after verifying the recruitment sender and account-invitation flow |
| `RECRUITMENT_WEBHOOK_SECRET` | Optional 32+ character secret for the signed provider relay |
| `CRON_SECRET` | Protects the serverless recruitment reconciliation endpoint |

Use TLS and configure the sender domain's SPF/DKIM/DMARC through the existing mail provider. No DNS or provider settings were changed here. Ensure the recruitment From address is actually permitted by the SMTP account; it is not automatically rewritten by the existing transactional-email From override.

1. Configure a staging/local database and mail catcher first. The automated integration suite starts its own loopback SMTP receiver and cannot send to the internet.
2. To check a real SMTP connection without sending, explicitly set `SEND_TEST_EMAIL=false` before `npm run email:verify`. That existing script can send a real test if `SEND_TEST_EMAIL=true`; use that only with owner approval and a designated test recipient.
3. Verify both the authentication/invitation From address and the recruitment From address. Check sender identification, reply handling, registration links and unsubscribe behavior. Keep the reply inbox monitored.
4. Set `RECRUITMENT_EMAIL_VERIFIED=true` only after verification. In owner **Outreach settings**, supply sender identification/contact details, review the approved introduction, set limits, and enable individually approved outreach.
5. Record actual recipient permission/evidence, prepare a draft for an opted-in test request, review the complete preview, and approve one test email to an explicitly approved recipient.
6. Test unsubscribing and ensure further preparation/sending is blocked. Test Carli's invitation against a controlled mailbox in staging before sending her real invitation.

The gates implement documented consent, sender identification and immediate suppression rather than treating public addresses as blanket permission. Owners must assess and record the actual consent basis. See the [DIA commercial-message guidance](https://www.dia.govt.nz/Spam-Three-Steps) and [unsubscribe requirements](https://www.dia.govt.nz/Information-about-unsubscribing). Unsubscribe links have no expiry and require no sign-in; GET opens a confirmation form so link scanners cannot silently unsubscribe recipients. Both the email body and `List-Unsubscribe` header link to it. No email opens are counted as interest.

### Delivery semantics

`SENT` means the SMTP server accepted the message, not confirmed inbox delivery. Each outreach message gets one persisted send claim and one SMTP attempt. Recruitment is explicitly excluded from the existing automatic email queue and stale-send retry recovery. A rejected, timed-out or interrupted attempt becomes `NEEDS_REVIEW`, with a task; inspect provider logs before further contact. Interrupted claims are flagged after ten minutes. SMTP cannot provide universal exactly-once delivery, so this design prefers manual reconciliation over risking duplicate outreach. Failed recruitment messages cannot be resent by clicking again.

Follow-up preparation creates a new linked draft, reuses no send claim, checks consent/suppression and still requires approval. The 24-hour company contact limit also applies to follow-ups. Expired unsent drafts can be refreshed by preparing that same company/request again; sent links cannot be silently refreshed.

### Provider events and replies

`POST /api/recruitment/provider-events` accepts `{eventId,email,type}` with `type` equal to `HARD_BOUNCE`, `COMPLAINT` or `UNSUBSCRIBE`. An adapter must first verify the mail provider's native webhook signature and relay:

- `x-recruitment-timestamp`: current Unix milliseconds.
- `x-recruitment-signature`: hex HMAC-SHA256 of `timestamp + "." + rawRequestBody` using `RECRUITMENT_WEBHOOK_SECRET`.

Five-minute timestamp tolerance, persistent event-ID deduplication and transactional suppression are enforced. This generic contract is implemented and is **not yet connected to a particular provider**. Native provider delivery webhooks, inbound reply ingestion/classification and automatic response parsing are not implemented. For now, record responses as Interested/Not Interested, and add reply-based unsubscribe requests through owner Contact suppression or company Do Not Contact.

## Registration and analytics definitions

- **Registration started:** a valid invitation token is claimed atomically inside a newly created mover account transaction, with the same normalized email. An independent signup remains valid and unattributed. An expired, altered, already consumed or mismatched token gives no credit and never changes an existing account.
- **Registered:** that associated account verifies its email. Google-verified signup also qualifies. This is a completed account registration, not proof of completed company onboarding.
- **Activated:** the mover first meets the existing `canMoverAccessLeads` rule: active real business account, verified email, saved valid service region and all existing exclusions satisfied. Public profile completeness remains a separate existing business concept.
- **First paid lead:** earliest purchased lead with a positive-amount `SUCCEEDED` payment. Pending monthly charges and waived launch-trial leads do not count. Registration/activation/first-payment timestamps remain historical first achievements if the company is later suspended.
- **Assignments / uncontacted / follow-ups due:** current stock totals, unaffected by the date range. Contacted companies, responses and interested counts use contact/first-response/first-interest event dates. Assigned-company counts and responses follow current ownership; sent invitations follow the sender, and registration outcomes preserve the originally attributed recruiting admin after reassignment.
- **Invitation conversion:** attributed, email-verified registrations arising from invitations sent in the selected period / all invitations sent in that period, including follow-ups. **Activation conversion:** activated movers in that sent-invitation cohort / registered movers in the same cohort. Later outcomes remain credited to their original invitation cohort. With no denominator the displayed rate is zero.
- **Lead-to-invitation conversion:** opted-in requests created in the selected period that have a sent invitation / all opted-in requests created in that period.

Report presets use Auckland calendar days, including daylight-saving transitions. Custom ranges are inclusive. No sample statistics or example companies are seeded into production.

## Migration and deployment

1. Back up production and review the new SQL. It adds tables/columns/enums/indexes and append-only triggers, and stages Carli's invitation. It contains no production reset, lead deletion or owner-account guess.
2. Run `npx prisma migrate status` against the intended environment and inspect pending history. **An existing repository migration, `20260615040000_cleanup_test_movers`, is destructive and expects exactly one specific historical mover. Do not run an unexpectedly pending historical cleanup against production.** Resolve production's existing migration history with the owner first. It was left unchanged by this implementation.
3. When the only intended pending migration is the reviewed recruitment migration, deploy migrations before starting this application version: `npm run prisma:migrate:deploy`, then `npm run prisma:generate` and `npm run build`.
4. Deploy through the existing hosting flow. Keep outreach disabled until SMTP, customer consent presentation and onboarding checks are complete. Run the explicit owner-role script against the verified existing owner account.
5. On the existing long-running host, reconciliation uses the current background-job loop. On Vercel/serverless, configure the existing external scheduler to POST `/api/recruitment/process` with `Authorization: Bearer <CRON_SECRET>` every few minutes. This endpoint never sends recruitment emails. It checks up to 50 attributed companies per tick, with oldest-updated first, plus overdue follow-ups and interrupted sends. The owner can also use **Refresh mover outcomes**.
6. Complete staging/browser acceptance checks, then explicitly send Carli's real invitation from Team Management. Invite Tiaan when his email is available. No deployment or real send was performed here.

Do not use `prisma migrate reset`, `db push --accept-data-loss`, or the existing demo seed for production deployment. Preserve restrictive audit triggers during normal operation. Roll application versions forward together with the additive schema; no destructive rollback is provided.

## Validation and remaining work

Automated checks cover existing application tests, privacy projection, region/service matching, Auckland reporting dates, legacy-owner compatibility, both directions of recruiter isolation, database-backed duplicate serialization, invitation ownership/expiry/replay, constrained drafts, concurrent sends against a local SMTP receiver, suppression cancellation, registration attribution/activation, paid-vs-waived outcomes, disabled sessions, owner reassignment, server-side authorization, CSRF and append-only audit history.

Commands:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

For database tests, set `DATABASE_URL` and `RECRUITMENT_TEST_DATABASE_URL` to the **same disposable local PostgreSQL URL**. The database name must end in `_test`. Apply schema/migrations only to that isolated database before `npm run test:recruitment:db`. Test fixtures remain in that disposable database; tests never delete production-like records. When reconstructing this repository's entire migration chain on an empty test database, the historical production-only cleanup must be handled separately; it was marked applied only in the disposable validation database, never in production.

For live HTTP tests, start a local server with that same disposable database and session secret; disable background jobs and point SMTP at a local catcher or closed loopback port. Set `RECRUITMENT_TEST_BASE_URL` to its loopback URL, and run `npm run test:recruitment:http`. Never run these fixtures against production. Plain `npm test` skips the two integration suites unless these explicit variables are present.

The implementation run passed **64 tests with both integration suites enabled**, with no failures/skips; lint, typecheck and production build passed. The initial build using the existing environment logged public-mover database availability warnings; subsequent isolated builds passed without database availability warnings. No source secrets were exposed and no production data was changed. The new additive migration applied successfully against disposable PostgreSQL 16 after the historical cleanup was handled locally; Prisma detected no schema drift.

Browser inventory was empty and the in-app browser was unavailable. Consequently actual desktop/mobile screenshots, interactive clipboard behavior, email-client rendering and user-operated onboarding/MFA were **not visually verified** in this session; server-rendered role-aware pages and authenticated HTTP operations were verified. Live SMTP sender/DNS verification, real Carli activation, Tiaan's email, Lance's verified owner ID, production migration/deployment, native provider webhooks and any real Stripe settlement test remain external release checks. Existing Stripe/webhook code paths were preserved with only a best-effort outcome-sync hook; no real charge was made.

Advanced autonomous sequences, AI matching, inbound mailbox parsing and more elaborate reporting remain future work. The shipped workflow is deliberately admin-reviewed.
