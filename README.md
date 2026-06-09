# Match'nMove

Full-stack quote marketplace for moving companies built with **Next.js App Router + TypeScript + Tailwind + Prisma + Postgres + custom JWT auth + Stripe**.

## Features
- Public marketing site: home, quote flow, contact, about, faq, terms, thank-you pages.
- 3-step quote request flow.
- API endpoints for quote submission, contact form, mover leads, lead unlock, Stripe webhook.
- Mover authentication (credentials or Google sign-in + JWT cookie session) and protected dashboard with profile progress + leads.
- Lead distribution by service area and pay-per-lead model.
- Prisma schema for users, movers, quotes, leads, payments, messages, logs.

## Local development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env` from `.env.example` and set values.
3. Run prisma:
   ```bash
   npx prisma migrate dev --name init
   npm run prisma:seed
   ```
4. Start:
   ```bash
   npm run dev
   ```

Default seeded mover login:
- `mover@matchnmove.co.nz`
- `Password123!`

## Railway deployment
1. Create a new Railway project and attach a Postgres service.
2. Add environment variables from `.env.example`.
3. Deploy this repo (Railway auto-detects `railway.json`).
4. Run once in Railway shell:
   ```bash
   npx prisma migrate deploy
   npm run prisma:seed
   ```

## Minimum variables for a first live preview
- `DATABASE_URL`
  Railway Postgres can supply this directly, for example `${{Postgres.DATABASE_URL}}`.
- `NEXTAUTH_URL`
  Set this to your Railway public URL or custom domain, for example `https://your-service.up.railway.app`.
- `NEXT_PUBLIC_APP_URL`
  Set this to the same public URL as `NEXTAUTH_URL`.
- `NEXTAUTH_SECRET`
  Generate a long random secret before deploying.
- `CONTACT_TO_EMAIL`
- `CONTACT_FROM_EMAIL`
- `SUPPORT_EMAIL`
- `DEFAULT_FROM_EMAIL`
- `INFO_FROM_EMAIL`
- `NO_REPLY_FROM_EMAIL`
- `AUTH_FROM_EMAIL`
- `FEEDBACK_FROM_EMAIL`
- `REVIEW_FROM_EMAIL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_SECURE`
- `NEXT_PUBLIC_SUPPORT_EMAIL`
- `NEXT_PUBLIC_INFO_EMAIL`
- `NEXT_PUBLIC_CONTACT_EMAIL`
- `NEXT_PUBLIC_PARTNERS_EMAIL`
- `NEXT_PUBLIC_FEEDBACK_EMAIL`
- `NEXT_PUBLIC_PRIVACY_EMAIL`
- `NEXT_PUBLIC_NO_REPLY_EMAIL`

## Optional integrations
- `ADDRESS_SEARCH_BASE_URL`
  Optional Nominatim-compatible endpoint for explicit manual searches. The public endpoint is never used for autocomplete.
- `GOOGLE_CLOUD_PROJECT_ID`
  Optional project override for Google Places automatic suggestions. The app otherwise infers it from
  `GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL`. The service account needs `roles/serviceusage.serviceUsageConsumer`,
  Places API (New), and billing enabled.
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
  Enables the Google Identity Services button on the mover login page.
- `GOOGLE_CLIENT_ID`
  Optional server-side override for Google ID token verification. Leave blank unless it differs from `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
  Required only if you want live Stripe billing flows.
- `STORAGE_ACCESS_KEY`
- `STORAGE_SECRET_KEY`
- `STORAGE_BUCKET`
- `STORAGE_REGION`
- `STORAGE_ENDPOINT`
  Required for private verification-document storage. Leave the endpoint blank only when using AWS S3.

## Notes
- No watermark references are included in the UI.
- Stripe unlock endpoint gracefully simulates unlock if Stripe key is absent.

## Google mover sign-in
The mover login page uses Google Identity Services to collect a Google ID token, then `/api/mover/google` verifies it server-side and issues the existing `mm_session` cookie.

To enable it:
1. In Google Cloud Console, create or choose an OAuth client with application type `Web application`.
2. Add authorized JavaScript origins for each app origin you use, for example:
   ```text
   http://localhost:3000
   https://www.matchnmove.co.nz
   https://your-service.up.railway.app
   ```
3. Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to that Web client ID in `.env` and Railway.
4. Restart the dev server or redeploy so Next.js picks up the public env var.

This ID-token button flow does not use an OAuth redirect callback URL.

## Google Workspace Email
The app sends transactional email through Nodemailer using the `SMTP_*` variables.

Your domain MX records route inbound mail to Google Workspace. For outbound app mail, use one of these Google Workspace options:

- SMTP relay: keep `SMTP_HOST=smtp-relay.gmail.com`, `SMTP_PORT=587`, and `SMTP_SECURE=false`. In Google Admin, allow the deployed app/server to use SMTP relay, either by IP allowlisting or SMTP authentication.
- Mailbox SMTP: use `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_SECURE=false`, `SMTP_USER=your-workspace-address`, and `SMTP_PASS` set to an app password or approved SMTP credential.

Run this before deploying email changes:
```bash
npm run email:verify
```

To send a real test email as well:
```bash
$env:SEND_TEST_EMAIL="true"; $env:TEST_EMAIL="you@example.com"; npm run email:verify
```

## Production email queue
Transactional emails are stored in the `EmailDelivery` table before delivery. This covers contact notifications,
mover verification, password resets, and verified review surveys. Failed sends are retried with exponential backoff.
In production, the app also starts a small background worker that processes queued email and lead lifecycle jobs,
including the 24-hour unopened-lead warning and 48-hour redistribution checks.

Required production variables:
```bash
EMAIL_QUEUE_SECRET=replace-with-a-long-random-secret
EMAIL_MAX_ATTEMPTS=5
EMAIL_RETRY_BASE_MS=60000
EMAIL_RETRY_MAX_MS=1800000
EMAIL_SENDING_STALE_MS=600000
EMAIL_FORCE_SMTP_USER_FROM=true
BACKGROUND_JOBS_ENABLED=true
BACKGROUND_JOBS_INTERVAL_MS=60000
BACKGROUND_JOBS_PROCESS_LIMIT=50
```

Use `EMAIL_FORCE_SMTP_USER_FROM=true` when sending through `smtp.gmail.com` unless every `*_FROM_EMAIL` address is
configured as an approved Google Workspace send-as alias for `SMTP_USER`.

You can also call this endpoint manually, or from a Railway cron/external uptime job as a backup:
```bash
POST https://www.matchnmove.co.nz/api/email/process?limit=50
Authorization: Bearer $EMAIL_QUEUE_SECRET
```

## Secure Google Sheets lead register

New quote requests can be appended automatically to a company-owned Google Sheet for the communications team. The integration uses a dedicated service account, a durable Postgres retry queue, idempotent Quote IDs, raw-value formula protection, and named Workspace sharing.

Production setup and security operations are documented in [`docs/LEAD_GOOGLE_SHEETS_SETUP.md`](docs/LEAD_GOOGLE_SHEETS_SETUP.md). After configuring Railway and sharing the Sheet with the service account, an MFA-verified admin completes setup at `/admin/leads`.
