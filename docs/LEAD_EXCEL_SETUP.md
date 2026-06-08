# Secure Excel Lead Register

The lead register is a Microsoft 365 Excel workbook stored in the dedicated integration account's OneDrive. New quote requests are queued in Postgres and appended to the workbook automatically. Postgres remains the source of truth, so a Microsoft outage cannot lose a lead.

## Security model

- Use a dedicated, licensed Microsoft 365 work account owned by Match 'n Move. Do not connect a founder's personal Microsoft account.
- The Entra application is tenant-restricted and requests delegated `Files.ReadWrite`, because Microsoft Graph's Excel table row API does not support application permissions.
- The OAuth refresh token is encrypted at rest with AES-256-GCM using `LEADS_EXCEL_ENCRYPTION_KEY`.
- Workbook invitations are sent to named accounts with sign-in required. No anonymous or "anyone with the link" sharing is created.
- `LEADS_EXCEL_EDITOR_EMAILS` should contain only the communications lead and backup operators who must update dispatch fields.
- Put everyone else in `LEADS_EXCEL_VIEWER_EMAILS`.
- Customer-supplied text is neutralised before export when it starts with an Excel formula character.
- Delivery is idempotent by Quote ID. Retries check the workbook before appending, including after an ambiguous Microsoft timeout.
- Admin setup and recovery require a signed-in Match 'n Move admin with MFA.
- Diagnostics and logs contain IDs and delivery errors, not customer names, phone numbers, email addresses, or street addresses.

An authorised editor can still copy information they are allowed to see. No spreadsheet can technically prevent that. Reduce this risk with least-privilege access, employment/contract confidentiality terms, Microsoft Purview sensitivity labels and DLP where licensed, and immediate offboarding.

## 1. Create the Microsoft account

1. Create a dedicated account such as `lead-register@matchnmove.co.nz`.
2. Require MFA and use Conditional Access where available.
3. Do not grant this account access to unrelated mailboxes, sites, or files.
4. Disable legacy authentication for the account.

## 2. Register the Entra application

1. In Microsoft Entra admin center, create an App registration for this Microsoft 365 tenant only.
2. Add a Web redirect URI:

   `https://www.matchnmove.co.nz/api/admin/lead-spreadsheet/oauth/callback`

   Use the deployed `NEXT_PUBLIC_APP_URL` host if it differs.

3. Add Microsoft Graph delegated permissions `Files.ReadWrite` and `User.Read`.
4. Create a client secret and store it only in Railway.
5. Record the Directory tenant ID, Application client ID, and client secret.

Microsoft references:

- Excel table rows: https://learn.microsoft.com/graph/api/tablerowcollection-add
- OAuth authorization code flow: https://learn.microsoft.com/entra/identity-platform/v2-oauth2-auth-code-flow
- Named-user file invitations: https://learn.microsoft.com/graph/api/driveitem-invite

## 3. Configure Railway

Set:

```text
MICROSOFT_TENANT_ID=<directory tenant id>
MICROSOFT_CLIENT_ID=<application client id>
MICROSOFT_CLIENT_SECRET=<client secret>
LEADS_EXCEL_OWNER_EMAIL=lead-register@matchnmove.co.nz
LEADS_EXCEL_ENCRYPTION_KEY=<32 random bytes, base64>
LEADS_EXCEL_WORKBOOK_PATH=Match-n-Move-Leads.xlsx
LEADS_EXCEL_TABLE_NAME=LeadsTable
LEADS_EXCEL_EDITOR_EMAILS=communications-lead@matchnmove.co.nz
LEADS_EXCEL_VIEWER_EMAILS=teammate-one@matchnmove.co.nz,teammate-two@matchnmove.co.nz
LEADS_EXCEL_RETRY_BASE_MS=60000
LEADS_EXCEL_RETRY_MAX_MS=21600000
LEADS_EXCEL_SENDING_STALE_MS=600000
```

Generate the encryption key in PowerShell:

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

If `LEADS_EXCEL_WORKBOOK_PATH` includes folders, create those folders in the dedicated account first.

## 4. Connect and provision

1. Deploy the application and migration.
2. Sign in as a Match 'n Move admin and complete admin MFA.
3. Open `https://www.matchnmove.co.nz/admin/leads`.
4. Select **Connect Microsoft 365** and sign in as the dedicated integration account.
5. Select **Create or verify workbook**.
6. Confirm the named editor/viewer invitations and open the workbook.
7. Submit a test quote and confirm it appears within the background-job interval.

The generated workbook contains:

- A structured, filterable `LeadsTable`.
- Frozen headers, readable widths, wrapped notes, and status drop-downs.
- Customer, route, property, date, and item details.
- Operational columns for mover offer, mover contact, outreach status, follow-up date, and team notes.
- A `Read Me` sheet with privacy and handling instructions.

## 5. Microsoft 365 hardening

In SharePoint/OneDrive administration:

1. Disable anonymous "Anyone" sharing for the account/site.
2. Restrict external sharing to approved domains or disable it.
3. Apply a `Confidential - Customer Data` sensitivity label if Microsoft Purview is licensed.
4. Enable audit logging and review workbook access monthly.
5. Use view-only access for teammates who do not update dispatch fields.
6. Remove a departing teammate from both Railway variables and the workbook permissions immediately.

## Operations

- Automatic jobs run through the existing production background worker.
- The admin page shows queued, sending, synced, and failed counts without exposing customer details.
- **Sync now** processes ready deliveries immediately.
- **Retry failed** resets failed/queued delivery attempts and processes them.
- Disconnecting Microsoft pauses export but keeps every unsynced lead queued in Postgres.
- Never rename `LeadsTable`, the `Leads` worksheet, or the `Quote ID` column.
