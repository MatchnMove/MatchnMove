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
2. Add environment variables listed below.
3. Deploy this repo (Railway auto-detects `railway.json`).
4. Run once in Railway shell:
   ```bash
   npx prisma migrate deploy
   npm run prisma:seed
   ```

## Required environment variables
- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `ELEVENLABS_API_KEY`
- `N8N_WEBHOOK_URL`
- `STORAGE_ACCESS_KEY`
- `STORAGE_SECRET_KEY`
- `STORAGE_BUCKET`
- `STORAGE_REGION`
- `STORAGE_PUBLIC_URL`

## Notes
- No watermark references are included in the UI.
- Stripe unlock endpoint gracefully simulates unlock if Stripe key is absent.
- n8n transcription webhook endpoint stores transcript payload on quote requests.
