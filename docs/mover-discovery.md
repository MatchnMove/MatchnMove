# Find movers online

Mover Outreach now uses **SerpApi's Google Maps search** for business discovery. NZBN access is not required.

## Administrator workflow

1. Open **Find movers online**, beside **Add company**.
2. Enter a New Zealand city or town, choose a keyword such as `movers` or `removals`, and click **Search movers**.
3. Review each company's name, category, available phone number and website. The Google Maps listing and company website open in a separate tab.
4. Click **Review & add**. The app retrieves the listing again and repeats duplicate checks before opening the existing company form.
5. Confirm the company is a mover, enter its business email, select its actual service areas and save. The prospect belongs to the administrator who saves it.

Opening the panel does not call the paid provider. Each search, result page and listing review makes one provider request. Pagination preserves the original keyword and city, and stops after six pages or when the provider supplies no next page.

Known outreach duplicates, registered mover matches, suppressed email addresses and listings explicitly marked permanently/temporarily closed cannot be selected through this panel. Ordinary closing hours are not treated as business closure. Existing prospect links appear only for administrators allowed to access those records.

Google Maps results do not supply a verified business email. The email stays blank until an administrator confirms it separately; the existing form requires it before saving. Search location is not service coverage, and nearby or irrelevant businesses can appear. No coverage, NZBN verification, availability or service quality is inferred from a search match.

Contact permission starts as **Unknown**. Discovery creates no mover accounts and sends no emails. Invitation review and sending continue through the existing outreach workflow.

## One-time owner setup

1. Create a [SerpApi account](https://serpapi.com/) and obtain its [API key](https://serpapi.com/manage-api-key). Review the [current plans and credits](https://serpapi.com/pricing).
2. Add `SERPAPI_API_KEY` to the server/hosting environment, then restart or redeploy the app. Do not put the key in client-side variables, company notes or chat.
3. Optionally set `MOVER_DISCOVERY_DAILY_LIMIT`. The default is **100 provider attempts per rolling 24 hours across the whole team**. Allowed values are integers from 1 to 10000; invalid values use 100. Searches, pages and listing reviews all count; failed upstream attempts also consume a reservation.
4. Check provider account billing/renewal settings and choose a cap appropriate to the available credits. The app limit is separate from SerpApi's account quota and does not reserve a particular dollar budget.
5. Search a known NZ moving business and review its listing before rollout.

An absent or rejected key shows setup guidance. Credit/rate limits, outages and timeouts show actionable errors. No schema migration or new runtime dependency is required.

The existing NZBN verification integration and its optional `NZBN_API_SUBSCRIPTION_KEY`/`NZBN_API_BASE_URL` settings remain available. The earlier NZBN discovery API actions are retained for compatibility, but the outreach search panel uses SerpApi and does not require an NZBN subscription.

## Server behaviour

- Current administrator session and MFA required; exact-origin JSON checks and per-admin rate limits apply.
- Paid attempts are reserved under the existing shared PostgreSQL recruitment lock, using append-only audit records. The rolling cap works across administrators and server instances.
- API requests go only to the fixed HTTPS SerpApi endpoint, with redirects disabled and a timeout. Provider pagination URLs and search-result URLs are never fetched by the server.
- Only selected business fields reach the UI. Reviews, photos, addresses and raw provider responses are not copied to prospects. No website scraping or automatic email extraction occurs.
- Account state is rechecked before provider use and before results return. Duplicate checks do not expose other administrators' notes, assignments or prospect IDs.
- The normal CRM save action still validates email, assignment, duplicate review and permission fields. Source listing links and place IDs are recorded in the reviewed prospect's notes.

## Validation

- Full ordinary suite: 63 passing, four opt-in integration entries skipped.
- Explicit discovery integration suite: 11 passing on isolated local PostgreSQL. It covers both providers, denied requests, duplicate privacy, manual email review and CRM save, missing keys, disabled accounts and concurrent request-cap enforcement.
- Adapter tests cover response projection, opening hours versus business closure, pagination, detail identity, input limits, fixed provider requests, safe links, provider failures and oversized response limits.
- TypeScript, lint and the production build passed.

Run `npm test` for ordinary tests. To run database integration checks, use an isolated, migrated loopback PostgreSQL database whose name ends in `_test`; set both `DATABASE_URL` and `DISCOVERY_TEST_DATABASE_URL` to that URL, then run `npx tsx --test tests/mover-discovery-database.test.ts`. Tests mock both provider APIs and make no paid search calls.

No SerpApi key was available during implementation. Live listing compatibility and a browser walkthrough remain to be verified after configuration. No production data or outbound email was used for validation.
