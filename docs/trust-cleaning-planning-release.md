# Trust, cleaning and planning release

## Implemented

The homepage now leads with a free quote request, customer choice and an explanation of the actual introduction process. Moving and optional cleaning appear immediately after the hero. The mobile quote entry appears before the truck illustration. The large scroll animation and zero-review statistics have been removed. Real reviewed companies appear automatically when approved review records exist.

Previously, unrated company cards showed numeric zero ratings and generic verification labels. Cards and profiles now show an honest no-review state, separately recorded business identity/email/phone checks, supplied services and coverage, and operating history only after an owner records evidence review. Descriptions are not replaced with invented sales copy. The About directory total uses the same public listing query as the directory; request totals are not described as completed moves.

A new /trust page explains introduction, matching, unlocking, reviews, bookings, payment boundaries, information sharing and support. /about has owner-editable operator, registration and team content, initially blank until verified. Existing unverified founder biographies and unsupported response guarantees are not republished.

The original three-step quote form remains connected to lead creation, existing pricing and provider notifications. Optional cleaning supports one selected pickup or destination property, multiple services, carpeted-room counts, a preferred date/time window, vacancy, before/after-movers timing and private access notes. Destination cleaning needs explicit permission and known destination property information. /cleaning-quotes explains the flow; its CTA carries intent and highlights the optional choice without selecting it automatically.

Cleaning requests persist only the selected property's snapshot. Matching, previews, unlocked details, notification summaries and invoice locality use that selection. Moving inventory, the other address and unrelated moving requirements stay outside cleaner output. Private notes remain locked until a persisted purchase; suspended accounts cannot retrieve them. The fixed cleaner lead fee and invoice transaction logic are unchanged.

New quote and cleaning request creation is atomic. Retrying a submission uses the stored request, never an altered incoming cleaning selection. Moving distribution locks the individual request and records completion, allowing safe retry of an interrupted assignment without duplicate moving leads. Existing email and push deduplication remains in use.

Optional quote/inventory drafts use authenticated AES-256-GCM server encryption and an opaque HTTP-only browser cookie. They expire after seven days, can be restored on that browser, and can be cleared. Contact details and inventory notes are not put in local/session storage or new address-bearing URLs. The hero and calculator transfer via this draft API. The calculator's established estimate arithmetic is retained; its household size, route category and selected access/packing factors carry into the quote draft. Estimates remain estimates, not provider offers.

The existing quantity picker is retained. /moving-inventory adds a room catalogue, custom items, quantities, notes, editing and secure saving/reuse. Structured inventory reaches unlocked mover details. No unsupported exact volume estimates have been introduced.

The existing /resources/moving-house-checklist URL now includes a personal date-based checklist. Completion and date save locally for 90 days after a change; no contact details or address are stored. It can be cleared or exported as text and requires no account.

Confirmation uses actual persisted request data and a private cookie. /request shows submitted details, cleaning selection, real assignment/unlock counts and support corrections. Thirty-day private return links use 256-bit random tokens stored as hashes; a request ID or query-string confirmation flag alone cannot authorise access. Provider quotes and bookings remain outside the platform and are described accordingly.

Reviews retain their single-use invitation and one-review-per-lead constraints. Public reporting, authenticated company responses, owner moderation and append-only audit events have been added. Responses require approval before publication. Automatic new review invitations now require a WON lead and the existing purchase/date criteria. A linked enquiry is not presented as independent proof of a completed move.

Owner controls at /admin/trust cover verified operator content, mover completeness/history checks, cleaner completeness, review/report/response moderation, customer corrections and recent contact enquiries. Existing owner/MFA checks and recruitment permissions are preserved. Recruitment administrators cannot access this owner area. Existing verification and cleaner activation/billing screens remain available.

Mover pricing examples now derive from LEAD_PRICING. /cleaner/partner uses CLEANING_LEAD_PRICING and explains activation, previews, monthly invoicing, coverage and booking limitations. Contact confirmation recognises a successfully saved enquiry even when email notification is unavailable.

Bounded analytics include quote steps/submissions, cleaning attachment, tool engagement and partner registration. No arbitrary names, emails, phones, addresses, notes or URLs enter those event records. Event IDs deduplicate retries. Owner reporting distinguishes browser event signals from actual submitted-request and cleaning-attachment records. It does not invent unique-visitor conversion rates. Do Not Track and a privacy-page opt-out are respected. Existing Google Analytics/Clarity are excluded from sensitive workspaces, quote/contact forms, inventory and customer tracking. No extra analytics SDK was installed.

Existing public URLs remain. Trust, inventory and cleaner information are linked through navigation, resources and the sitemap. No fabricated review/rating structured data was added. Reduced motion and visible keyboard focus have been strengthened.

## Data and migration

Apply `prisma/migrations/20261024120000_trust_cleaning_planning/migration.sql` through the normal reviewed migration deployment.

Additive changes:
- MoverCompany: operatingRegion, movingServices, yearsOperatingVerifiedAt, legacyPublicProfile, profileReviewedAt.
- QuoteRequest: inventory, toBedrooms, movingDistributedAt.
- CleaningRequest: selected-property snapshot, services, schedule, vacancy/access details, carpetRooms and destinationConsentAt.
- Review: provider response and response moderation timestamps.
- New models: QuoteDraft, CustomerRequestAccess, CustomerRequestSupport, ReviewReport and ConversionEvent.
- Public business introduction uses the existing RecruitmentSetting model under a separate key.

The migration runs in a transaction, retains all customer/provider/review/payment/invoice records, marks existing mover records for the legacy completeness policy and marks historical moving distributions complete. Existing visibility rules continue to apply; existing companies are not silently unpublished. New public profiles must also have the new minimum information. Owner review flags do not automatically publish a company.

No production database operation has been performed. Disposable database bootstrap skipped the historical guarded cleanup migration 20260615040000_cleanup_test_movers, which intentionally cannot run against an empty database without its expected historical business record. That exception was only for empty local validation databases; do not copy it to production.

## Environment

Existing DATABASE_URL, NEXTAUTH_SECRET, NEXT_PUBLIC_APP_URL/NEXTAUTH_URL, email, payment and account settings remain in use.

QUOTE_DRAFT_SECRET is an optional dedicated, stable, high-entropy server secret; when absent the existing NEXTAUTH_SECRET is used with domain separation. Production requires one of those secrets. Prefer a dedicated secret and retain it for the draft lifetime. Rotating it invalidates outstanding encrypted drafts; it does not change submitted quote records. No new NEXT_PUBLIC secret is required.

The public application URL must match the actual browser origin for the new mutation origin checks. Continue to use HTTPS in production so private cookies are secure. Do not put private return URLs into analytics, support screenshots or public logs.

## Validation

- npm run lint: passed.
- npm run typecheck: passed.
- npm test: 49 passing tests; three explicitly opt-in integration entry tests skipped in the ordinary run.
- npm run test:trust:db: nine passing tests (including the parent suite) against a separate fresh disposable PostgreSQL database. Real route handlers ran within Next request/cookie contexts, without a listening HTTP server. Covered encrypted drafts, privacy isolation, quote/lead creation, duplicate submission, move-in/out matching, purchases/invoice locality, suspension, customer links/corrections, owner/MFA/recruiter boundaries, moderation/audits, registration and event rejection/deduplication.
- Existing recruitment PostgreSQL suite: 17 passing tests (including the parent suite) in a separate clean local database. Covered individual accounts, scoped access, attribution, paid-lead credit, append-only audits and local mock-SMTP behaviour. Its global delivery-count assertions require a fresh database; running it in a database already populated by the trust suite is not valid isolation.
- Production build: passed, 168 generated static pages plus dynamic routes.
- Prisma migration deploy and schema comparison on disposable PostgreSQL: passed, no schema drift.
- Existing lead pricing, purchase/invoice and notification logic is retained. Integration testing sent no real email and made no live payment calls.
- Local host Node was 24.12; package deployment engine remains the existing Node 20.x.

## Release steps and remaining verification

1. Review and back up the production database. Apply the additive migration before serving the new application code: `npx prisma migrate deploy`. Check the migration status. Do not reset or seed production.
2. Configure the stable draft secret and canonical application URL in the deployment environment.
3. Use the existing deployment process after production-operation approval. This task authorises a Git push, not a separate manual production migration, live payment change or email campaign. Git hosting may have its own automatic deployment hooks; verify those when releasing.
4. In /admin/trust, enter verified operator/legal and team information, review incomplete profiles and only confirm operating history when supported by evidence.
5. Complete responsive browser and keyboard QA in an environment with a browser surface. Check live-origin cookies, full HTTP navigation, autocomplete and private access-link redirects. The current session supplied no browser surfaces. Automatic approval review rejected attempts to start the local HTTP server with the generic reason “blocked by policy”; production compilation and direct API/database tests were completed instead.
6. After an approved deployment, measure real mobile Core Web Vitals and run an approved email/payment smoke test in the appropriate sandbox. No measured CWV improvement or production delivery result is claimed.

Current scope limits are explicit in the product: one cleaning property per enquiry; contact support for a second property. Quotes are exchanged directly with providers, not in a fictional in-platform comparison. Inventory volume is not estimated without defensible measurements. New public content is in English; existing language support remains, while the added explanatory copy needs a reviewed translation pass. Browser signals are aggregate events rather than unique visitor identities, so unique-visitor/signup funnel rates are intentionally not manufactured. Owner queues are bounded (500 provider records, 100 moderation/support items and 30 recent contact messages per load); pagination is a future scaling improvement.

## Changed files

The following source changes comprise this release; generated next-env.d.ts and the pre-existing .codex-preview.log are excluded.

- `app/about/page.tsx`
- `app/admin/trust/page.tsx`
- `app/api/admin/trust/review/route.ts`
- `app/api/admin/trust/route.ts`
- `app/api/cleaner/billing/invoices/[invoiceId]/route.ts`
- `app/api/contact/route.ts`
- `app/api/conversion-events/route.ts`
- `app/api/customer-request/route.ts`
- `app/api/mover/profile/route.ts`
- `app/api/mover/review-response/route.ts`
- `app/api/quote-draft/route.ts`
- `app/api/quote-requests/route.ts`
- `app/api/reviews/report/route.ts`
- `app/cleaner/partner/page.tsx`
- `app/cleaner/register/page.tsx`
- `app/cleaning-quotes/page.tsx`
- `app/contact/page.tsx`
- `app/faq/page.tsx`
- `app/globals.css`
- `app/google-analytics.tsx`
- `app/mover/dashboard/page.tsx`
- `app/mover/login/page.tsx`
- `app/mover/pricing/page.tsx`
- `app/mover/reviews/page.tsx`
- `app/movers/[id]/page.tsx`
- `app/movers/page.tsx`
- `app/moving-inventory/page.tsx`
- `app/page.tsx`
- `app/privacy/page.tsx`
- `app/request/access/route.ts`
- `app/request/page.tsx`
- `app/resources/[slug]/page.tsx`
- `app/resources/page.tsx`
- `app/robots.ts`
- `app/sitemap.ts`
- `app/terms/page.tsx`
- `app/thank-you/page.tsx`
- `app/trust/page.tsx`
- `components/admin-navigation.tsx`
- `components/admin-trust-panel.tsx`
- `components/analytics-choice.tsx`
- `components/cleaner-dashboard-experience.tsx`
- `components/cleaning-options.tsx`
- `components/customer-request-actions.tsx`
- `components/inventory-editor.tsx`
- `components/mover-dashboard-experience.tsx`
- `components/mover-profile-settings.tsx`
- `components/mover-review-responses.tsx`
- `components/moving-checklist.tsx`
- `components/moving-cost-calculator.tsx`
- `components/private-analytics-boundary.tsx`
- `components/public-mover-card.tsx`
- `components/public-movers-directory.tsx`
- `components/public-signals.tsx`
- `components/quote-form.tsx`
- `components/recruitment-workspace.tsx`
- `components/review-actions.tsx`
- `components/saved-inventory.tsx`
- `components/site-shell.tsx`
- `docs/trust-cleaning-planning-release.md`
- `lib/about-stats.ts`
- `lib/analytics-privacy.ts`
- `lib/analytics.ts`
- `lib/business-content.ts`
- `lib/cleaner-lead-visibility.ts`
- `lib/cleaning-distribution.ts`
- `lib/cleaning-request.ts`
- `lib/cleaning-target.ts`
- `lib/conversion-policy.ts`
- `lib/customer-access.ts`
- `lib/draft-privacy.ts`
- `lib/inventory.ts`
- `lib/mover-lead-visibility.ts`
- `lib/moving-checklist.ts`
- `lib/profile-trust.ts`
- `lib/public-movers.ts`
- `lib/quote-distribution.ts`
- `lib/request-origin.ts`
- `lib/reviews.ts`
- `lib/seo.ts`
- `lib/validators.ts`
- `next.config.mjs`
- `package.json`
- `prisma/migrations/20261024120000_trust_cleaning_planning/migration.sql`
- `prisma/schema.prisma`
- `scripts/verify-lead-sheet.ts`
- `src/components/hero/Hero.module.css`
- `src/components/hero/Hero.tsx`
- `src/components/hero/HeroQuoteCard.tsx`
- `src/components/home/MoverReviewsShowcase.tsx`
- `src/components/home/MovingQuotesSeoSection.tsx`
- `src/components/home/ResourceHighlights.tsx`
- `src/components/home/ScrollJourneySection.tsx`
- `tests/recruitment-database.test.ts`
- `tests/recruitment-policy.test.ts`
- `tests/trust-database.test.ts`
- `tests/trust-planning.test.ts`
