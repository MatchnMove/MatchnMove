# Mover Dashboard Security Setup

The code-side security controls are installed. The items below need external accounts or production values.

## ACTION REQUIRED 0: Use the correct database URL locally

The local `.env` currently points to `postgres.railway.internal`. That hostname works only inside Railway.

For local development, replace `DATABASE_URL` with Railway's public Postgres connection URL or a local Postgres URL. Keep the internal URL in Railway Variables for the deployed app.

## ACTION REQUIRED 1: Apply the database migration

Railway runs this automatically during deployment:

```bash
npm run prisma:migrate:deploy
```

For another host, run that command once against the production `DATABASE_URL`.

## ACTION REQUIRED 2: Copy generated secrets to Railway

These values have already been generated in the local `.env`. Add the same values to Railway Variables:

- `MFA_ENCRYPTION_KEY`
- `MOVER_VERIFICATION_ADMIN_TOKEN`

Do not generate a different `MFA_ENCRYPTION_KEY` after admin MFA has been enrolled. Changing it makes the stored authenticator secret unreadable.

## Optional Later: Configure Twilio SMS

SMS phone verification is disabled for initial launch to avoid extra costs:

```env
MOVER_PHONE_VERIFICATION_REQUIRED=false
```

When you are ready to require SMS verification, create a Twilio account, obtain an SMS-capable New Zealand number, then add:

```env
MOVER_PHONE_VERIFICATION_REQUIRED=true
PHONE_VERIFICATION_SECRET=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=+64...
```

With the flag set to `true`, production phone verification fails closed until Twilio is configured. With the flag set to `false`, movers still need a saved phone number but do not need an SMS code to go live.

## ACTION REQUIRED 4: Configure private document storage

Create a private S3-compatible bucket. Do not make the bucket public. Add:

```env
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
STORAGE_BUCKET=
STORAGE_REGION=
STORAGE_ENDPOINT=
STORAGE_FORCE_PATH_STYLE=false
STORAGE_SIGNED_URL_TTL_SECONDS=300
STORAGE_SERVER_SIDE_ENCRYPTION=
```

`STORAGE_ENDPOINT` can be blank for AWS S3. Set it for another S3-compatible provider. Leave `STORAGE_SERVER_SIDE_ENCRYPTION` blank for Railway Buckets; AWS S3 users can set it to `AES256`. Document links are signed for five minutes and only issued after mover/admin authorization.

## ACTION REQUIRED 5: Connect malware scanning

The repository includes a Railway-ready scanner service at `services/malware-scanner`. It accepts the raw file body and returns JSON with `{"clean": true}` only for a clean file.

Production is currently configured to use the Railway `malware-scanner` service:

```env
MALWARE_SCAN_URL=https://malware-scanner-production-6f1a.up.railway.app/scan
MALWARE_SCAN_TOKEN=
ALLOW_UNSCANNED_DOCUMENTS=false
```

`MALWARE_SCAN_TOKEN` must match the scanner service `SCANNER_TOKEN`. Production uploads are rejected if scanning is unavailable. Keep `ALLOW_UNSCANNED_DOCUMENTS=false`.

To redeploy scanner changes manually:

```bash
railway up ./services/malware-scanner --path-as-root --service malware-scanner --detach
```

## ACTION REQUIRED 6: Complete admin MFA

1. Deploy the app with `MFA_ENCRYPTION_KEY`.
2. Sign in using an email listed in `MOVER_ADMIN_EMAILS`.
3. Open `/admin/verification`.
4. The app redirects to `/admin/mfa`.
5. Scan the QR code with an authenticator app and enter the current six-digit code.

Every later browser admin session requires an authenticator code. The API admin token remains available for controlled server-to-server automation only.

## ACTION REQUIRED 7: NZBN production key

After MBIE approves the subscription, add the production key:

```env
NZBN_API_SUBSCRIPTION_KEY=
NZBN_API_BASE_URL=https://api.business.govt.nz/gateway/nzbn/v5
```

Until then, valid-format NZBN submissions remain in manual review and are not treated as verified.

## ACTION REQUIRED 8: Review email routing

Set the mailbox that should receive new NZBN and document review alerts:

```env
VERIFICATION_REVIEW_TO_EMAIL=lanceoosterbroek179@gmail.com
```

SMTP must also be configured. Movers receive approval, rejection, and insurance-expiry messages through the same queued email system.

## Production verification test

Before launch, test all of these:

- A locked lead response contains no customer name, phone, email, street address, or postcode.
- A changed phone number loses its verified status.
- A fake file extension is rejected.
- Insurance cannot be approved without a future expiry date.
- A suspended mover cannot unlock or update leads.
- `/admin/verification` requires password/Google login and an authenticator code.
- Approval and rejection create `VerificationAudit` records and email the mover.
