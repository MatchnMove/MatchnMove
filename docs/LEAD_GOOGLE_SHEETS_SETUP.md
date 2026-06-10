# Secure Google Sheets Lead Register

The lead register is a company-owned Google Sheet in your existing Google Workspace. New quote requests are queued in Postgres and appended automatically. Postgres remains the source of truth, so a Google outage cannot lose a lead.

## Security model

- Use a Google Cloud service account dedicated to this integration.
- Give the service account access only to the lead Sheet, not the rest of your Drive.
- Keep the Sheet's **General access** set to **Restricted**.
- Share the Sheet only with named teammates.
- Give edit access only to the communications lead and backup operators.
- Give view-only access to partners who do not need to update lead handling fields.
- Customer text is sent with `RAW` input and neutralised if it begins with a spreadsheet formula character.
- Delivery is idempotent by Quote ID. Retries check the Sheet before appending, including after an ambiguous timeout.
- Admin setup and recovery require a signed-in Match 'n Move admin with MFA.
- Diagnostics and logs contain IDs and delivery errors, not customer names, phone numbers, emails, or addresses.

An authorised editor can still copy data they are allowed to see. Reduce this risk with least-privilege access, confidentiality terms, Google Workspace audit logs, and immediate offboarding.

## 1. Create the Google Sheet

1. Sign in to your Match 'n Move Google Workspace account.
2. Open https://sheets.google.com and create a new blank spreadsheet.
3. Name it `Match n Move Lead Register`.
4. Leave it blank with its single default tab. The app will rename and format it.
5. Copy the spreadsheet ID from its URL:

   `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`

If your Workspace plan supports Shared Drives, place the Sheet in a Match 'n Move Shared Drive. Otherwise, keep it owned by a stable company admin account.

## 2. Create the Google Cloud service account

1. Open https://console.cloud.google.com.
2. Create or select a project named `Match n Move`.
3. Open **APIs & Services > Library**.
4. Find **Google Sheets API** and select **Enable**.
5. Open **IAM & Admin > Service Accounts**.
6. Select **Create service account**.
7. Name it `matchnmove-lead-sheets`.
8. Do not grant project roles. It only needs direct access to the Sheet.
9. Open the new service account, then **Keys > Add key > Create new key > JSON**.
10. Download the JSON key once and store it securely.

From the JSON file you need:

- `client_email`
- `private_key`

Never email, commit, or upload the complete JSON key to the repository.

Official references:

- Service-account credentials: https://developers.google.com/workspace/guides/create-credentials
- Append rows: https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/append
- Sheet formatting: https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/batchUpdate

## 3. Share the Sheet

In the Google Sheet:

1. Select **Share**.
2. Add the service account `client_email` from the JSON key as **Editor**.
3. Add yourself and the communications leader as **Editors**.
4. Add partners who only need visibility as **Viewers**.
5. Under **General access**, keep **Restricted**.
6. In Share settings, disable editors changing permissions or sharing when your Workspace policy allows it.

The application does not manage Google Drive permissions. This is deliberate: access remains visible and controlled through your normal Workspace sharing panel.

## 4. Configure Railway

Add these variables to the deployed Match 'n Move service:

```text
GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL=matchnmove-lead-sheets@your-project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
GOOGLE_SHEETS_SPREADSHEET_ID=<the ID from the Sheet URL>
GOOGLE_SHEETS_SHEET_NAME=Leads
GOOGLE_SHEETS_EDITOR_EMAILS=you@matchnmove.co.nz,communications@matchnmove.co.nz
GOOGLE_SHEETS_VIEWER_EMAILS=partner-one@example.com,partner-two@example.com
LEAD_SPREADSHEET_NOTIFICATION_EMAILS=lanceoosterbroek179@gmail.com,sethclark4@gmail.com,tiaan.gouws@gmail.com
GOOGLE_SHEETS_RETRY_BASE_MS=60000
GOOGLE_SHEETS_RETRY_MAX_MS=21600000
GOOGLE_SHEETS_SENDING_STALE_MS=600000
```

For `GOOGLE_SHEETS_PRIVATE_KEY`, copy only the JSON `private_key` value. Railway should store it as one line containing literal `\n` sequences. The app converts those sequences back into line breaks.

Keep these existing variables enabled:

```text
BACKGROUND_JOBS_ENABLED=true
BACKGROUND_JOBS_INTERVAL_MS=60000
BACKGROUND_JOBS_PROCESS_LIMIT=50
```

Redeploy after saving the variables.

## 5. Verify and format

1. Sign in to Match 'n Move as an admin.
2. Complete admin MFA.
3. Open `https://www.matchnmove.co.nz/admin/leads`.
4. Confirm the service-account email and spreadsheet ID are shown.
5. Select **Verify and format Google Sheet**.
6. Open the Sheet from the admin page.

The app creates:

- A structured `Leads` tab with frozen headers, readable widths, wrapping, and status drop-downs.
- Customer, route, property, date, and item details.
- Operational fields for mover offered, mover contact, outreach status, follow-up date, and team notes.
- A `Read Me` tab with privacy and handling instructions.

## 6. Test the live feed

1. Submit a test quote through the public Match 'n Move quote form.
2. Wait up to the configured background-job interval, normally one minute.
3. Open `/admin/leads`.
4. Confirm the delivery becomes `SYNCED`.
5. Confirm the test row appears in the Google Sheet.
6. Confirm each notification recipient receives one email with an **Open admin lead register** button.
7. Confirm the button signs the teammate in, completes their authenticator check, and opens `/admin/leads`.
8. Confirm the communications leader can edit operational columns.
9. Confirm view-only partners cannot edit.
10. Remove or clearly mark the test lead.

## Ongoing operations

- **Sync now** processes ready deliveries immediately.
- **Retry failed** resets failed deliveries and tries again.
- Notification emails are deduplicated by quote and recipient, including when a Sheet delivery is retried.
- If credentials are removed, unsynced leads remain safely queued in Postgres.
- Never rename the `Leads` tab or remove/reorder the integration columns.
- Review named access monthly.
- Remove departing teammates immediately.
- Rotate the service-account JSON key if it is exposed, then update Railway.
