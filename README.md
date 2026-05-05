# Match'nMove

Full-stack quote marketplace for moving companies built with **Next.js App Router + TypeScript + Tailwind + Prisma + Postgres + custom JWT auth + Stripe**.

## Features
- Public marketing site: home, quote flow, contact, about, faq, terms, thank-you pages.
- 3-step quote request flow with optional AI voice transcription trigger.
- API endpoints for quote submission, contact form, transcription session + webhook, mover leads, lead unlock, Stripe webhook.
- Mover authentication (credentials + JWT cookie session) and protected dashboard with profile progress + leads.
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
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
  Enables Google sign-in for movers.
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
  Required only if you want live Stripe billing flows.
- `ELEVENLABS_API_KEY`
- `N8N_WEBHOOK_URL`
  Required only if you want the voice/transcription workflow.
- `STORAGE_ACCESS_KEY`
- `STORAGE_SECRET_KEY`
- `STORAGE_BUCKET`
- `STORAGE_REGION`
- `STORAGE_PUBLIC_URL`
  Required only if you want uploads backed by real object storage.

## Notes
- No watermark references are included in the UI.
- Stripe unlock endpoint gracefully simulates unlock if Stripe key is absent.
- n8n transcription webhook endpoint stores transcript payload on quote requests.

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
