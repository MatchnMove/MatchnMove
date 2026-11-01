# Find partners online

Moving and cleaning onboarding uses **SerpApi's Google Maps search** for business discovery. NZBN access is not required.

## Administrator workflow

1. Open **Find partners online**, beside **Add company**.
2. Choose **Moving companies** or **Cleaning companies**, enter a New Zealand city or town and a keyword such as `movers`, `removals`, `cleaners` or a company name. Click **Search movers** or **Search cleaners**.
3. Review each company's name, category, available phone number and website. The Google Maps listing and company website open in a separate tab.
4. Click **Review & add**. The app retrieves the listing again and repeats duplicate checks before opening the existing company form.
5. Confirm the company's business type, contact availability and actual services and coverage before saving. The prospect belongs to the administrator who saves it. Cleaning companies have cleaning service choices; long-distance moving applies only to movers.

Opening the panel does not call the paid provider. Each search, result page and listing review makes one provider request. Pagination preserves the original business type, keyword and city, and stops after six pages or when the provider supplies no next page. Switching business type clears old results and selects a suitable default keyword.

Known outreach duplicates, registered moving or cleaning partner matches, suppressed email addresses and listings explicitly marked permanently/temporarily closed cannot be selected through this panel. Ordinary closing hours are not treated as business closure. Existing prospect links appear only for administrators allowed to access those records.

Google Maps results do not supply a verified business email. The email stays blank until an administrator confirms it separately. Missing contact details can be saved with their availability reviewed and followed up manually. Search location is not service coverage, and nearby or irrelevant businesses can appear. No coverage, NZBN verification, availability or service quality is inferred from a search match.

Contact permission starts as **Unknown**. Discovery creates no partner accounts and sends no emails. Invitation review and sending continue through the existing outreach workflow.

## Moving and cleaning onboarding

- The company directory supports business type filters. Email station previews use the selected company's moving or cleaning introduction; owners can edit each template independently.
- Cleaning invitations direct recipients to `/cleaner/register`. Matching, unexpired attribution tokens credit the newly registered cleaner and connect existing onboarding inbox threads to its cleaner account. Verification, activation and paid-lead outcomes appear in recruitment reporting.
- Moving lead opportunities remain specific to moving companies. Cleaning companies receive general cleaning invitations; moving lead invitations are rejected for cleaning prospects.
- The inbox displays cleaner contact details and history. Owners can search and link registered cleaners, while recruiters retain their existing assigned-prospect and conversation access. Cleaner phone numbers support call follow-ups.
- Apply migration `20261102000000_cleaning_partner_recruitment` before deploying the updated application. It adds business types and nullable cleaner account links. Existing prospects retain `MOVING`; staff should review and classify existing cleaning prospects before preparing invitations. Business type changes are blocked after an invitation is prepared to preserve its wording and attribution.
- The stored `ACTIVE_MOVER` recruitment stage remains for compatibility and is displayed as **Active partner** for both business types.

## One-time owner setup

1. Create a [SerpApi account](https://serpapi.com/) and obtain its [API key](https://serpapi.com/manage-api-key). Review the [current plans and credits](https://serpapi.com/pricing).
2. Add `SERPAPI_API_KEY` to the server/hosting environment, then restart or redeploy the app. Do not put the key in client-side variables, company notes or chat.
3. Optionally set `MOVER_DISCOVERY_DAILY_LIMIT`. The default is **100 provider attempts per rolling 24 hours across the whole team**. Allowed values are integers from 1 to 10000; invalid values use 100. Searches, pages and listing reviews all count; failed upstream attempts also consume a reservation.
4. Check provider account billing/renewal settings and choose a cap appropriate to the available credits. The app limit is separate from SerpApi's account quota and does not reserve a particular dollar budget.
5. Search a known NZ moving business and a cleaning business, then review each listing before rollout.

An absent or rejected key shows setup guidance. Credit/rate limits, outages and timeouts show actionable errors. Moving and cleaning discovery share the existing request cap and SerpApi key. No new runtime dependency is required.

The existing NZBN verification integration and its optional `NZBN_API_SUBSCRIPTION_KEY`/`NZBN_API_BASE_URL` settings remain available. The earlier NZBN discovery API actions are retained for compatibility, but the outreach search panel uses SerpApi and does not require an NZBN subscription.

## Server behaviour

- Current administrator session and MFA required; exact-origin JSON checks and per-admin rate limits apply.
- Paid attempts are reserved under the existing shared PostgreSQL recruitment lock, using append-only audit records. The rolling cap works across administrators and server instances.
- API requests go only to the fixed HTTPS SerpApi endpoint, with redirects disabled and a timeout. Provider pagination URLs and search-result URLs are never fetched by the server.
- Only selected business fields reach the UI. Reviews, photos, addresses and raw provider responses are not copied to prospects. No website scraping or automatic email extraction occurs.
- Account state is rechecked before provider use and before results return. Duplicate checks do not expose other administrators' notes, assignments or prospect IDs.
- The normal CRM save action still validates email, assignment, duplicate review and permission fields. Source listing links and place IDs are recorded in the reviewed prospect's notes.

## Validation

- Ordinary tests include moving/cleaning search selection, pagination and review, cleaner form persistence, invitation wording, attribution identity checks, and registered cleaner inbox display/linking. Provider calls are mocked; no paid searches or emails are sent by these tests.
- Opt-in integration suites cover both providers, denied requests, duplicate privacy, manual email review and CRM save, missing keys, disabled accounts and concurrent request-cap enforcement. They require a disposable local PostgreSQL database.
- Adapter tests cover response projection, opening hours versus business closure, pagination, detail identity, input limits, fixed provider requests, safe links, provider failures and oversized response limits.

Run `npm test` for ordinary tests. To run database integration checks, use an isolated, migrated loopback PostgreSQL database whose name ends in `_test`; set both `DATABASE_URL` and `DISCOVERY_TEST_DATABASE_URL` to that URL, then run `npx tsx --test tests/mover-discovery-database.test.ts`. Tests mock both provider APIs and make no paid search calls.

No SerpApi key was available during implementation. Live listing compatibility and a browser walkthrough remain to be verified after configuration. No production data or outbound email was used for validation.
