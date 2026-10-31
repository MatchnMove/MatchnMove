# Partner inbox: owner setup and operations

The admin inbox is at **https://www.matchnmove.co.nz/admin/inbox**. It connects only to **support@matchnmove.co.nz**, using the Gmail API. Production SMTP configuration (`smtp-relay.gmail.com`) and domain MX records confirmed Google Workspace hosting before implementation. Existing transactional mail and the email station continue to use their current SMTP delivery system.

## Connect the mailbox — Lance's one-time steps

1. Sign in to [Google Cloud Console](https://console.cloud.google.com/) with the account that manages your Workspace organisation. Select or create the organisation's project for Match 'n Move.
2. Open **APIs & Services → Library**, find **Gmail API**, and enable it.
3. Open **Google Auth Platform → Branding**. Set the app name to **Match 'n Move Partner Inbox**, and use your business support/contact email for the contact details.
4. Under **Audience**, select **Internal** if this project belongs to your Workspace organisation. The inbox connects a staff mailbox, not customers' Gmail accounts. If Internal is unavailable, check that the project belongs to the correct organisation before proceeding. An External app has additional Google testing/verification requirements; do not treat an External Testing client as a permanent production connection.
5. Create a client under **Clients → Create client**, choosing **Web application**. Add this exact **Authorised redirect URI**:

   ```text
   https://www.matchnmove.co.nz/api/admin/inbox/oauth/callback
   ```

6. In Match 'n Move, sign in as an owner, complete admin MFA, and open **Administration → Inbox → Google client settings**. Paste the client ID and client secret **into that secure form**, then select **Save secure connection settings**. Do not send passwords or tokens in chat or commit them to Git.
7. Select **Connect support@matchnmove.co.nz with Google**. Choose the actual **support@matchnmove.co.nz** Workspace user and approve the requested Gmail access. The app rejects a different primary mailbox. If support is only an alias, forwarding address or Google Group, it needs a suitable actual mailbox before this connection can work; do not connect a personal mailbox instead.
8. Return to Inbox. It should show **Connected as support@matchnmove.co.nz**. The worker runs every minute; **Sync** lets an owner request an immediate pass. Initial import finds conversations active in the last 30 days and includes older messages in those threads. Large imports continue across successive passes.
9. Under **Explicit team access**, grant **Inbox access** to the colleagues who need it and **Send email** only where appropriate. They must sign in again after a permission change. Assign each conversation to the responsible colleague.

The requested scope is `https://www.googleapis.com/auth/gmail.modify`, covering reading, sending, drafts and mailbox labels. Google Workspace policy can require an administrator to allow the OAuth app. Follow Google's [consent screen guidance](https://developers.google.com/workspace/guides/configure-oauth-consent) and [web-server OAuth guidance](https://developers.google.com/identity/protocols/oauth2/web-server) if Google blocks the connection. Internal Workspace apps have different review requirements from apps distributed outside the organisation.

## Day-to-day use

- **Inbox, Unread, Sent, Drafts, Archived, Spam, Assigned to me, Follow-ups, Awaiting partner, Overdue and All conversations** separate the work. Search covers companies, contacts, sender addresses, subjects and message text. Pipeline and assignee filters narrow the list.
- Open a conversation to read its messages, see the company record and previous email-station history, change its pipeline stage, assign responsibility, add private notes or create a task.
- **Reply / Reply all** respond to an incoming enquiry and retain its thread. **Forward** creates a separate conversation and quotes only the selected public message. Files are forwarded only when explicitly selected after scanning.
- **New email** supports partnership outreach or an operational service message. Partnership emails still need reviewed contact permission, current ownership, existing outreach enablement, verified sender settings and explicit send permission. They reuse the current invitation renderer, sender details, registration attribution and unsubscribe links. Public contact availability never substitutes for contact permission.
- A service message requires a recorded operational reason. That reason and internal notes stay inside the admin system. A reply must address participants in the incoming enquiry.
- **Save draft** sends nothing. **Review email** shows the final saved body, including any required invitation footer. Only **Confirm and send** sends it. Templates insert editable text; they never send automatically.
- Drafts mirror into Gmail. App-authored drafts remain authoritative in the app so a provider sync cannot overwrite unsaved app work. Avoid editing the same draft in both clients. Gmail-created drafts appear in Drafts and can be adopted with **Continue Gmail draft**, then reviewed and classified before sending.
- A short drafting lease and message versions prevent competing edits. The server claims a send once before contacting Google. A timeout with an uncertain outcome produces **Needs review**, not an automatic resend. An owner must check Gmail Sent and use **Review uncertain send**; the app searches the exact message identifier again before restoring an apparently unsent draft. If delivery is still doubtful, leave it blocked.
- Tasks have assignee, due date, priority, kind, completion state and internal notes. They appear in the inbox's Follow-ups view and dashboard reminders. Choosing a different follow-up owner transfers the conversation and outstanding follow-ups, so the responsible colleague can access the context. Private inbox tasks are excluded from older recruitment task/detail screens and their completion endpoint. Creating a task never sends mail. Call tasks and Needs phone call labels require a recorded suitable phone number; otherwise use a research task.
- Use the company pipeline for Interested / Not interested. Registration and activation remain tied to the existing registration workflow rather than being invented from an email reply. Informational labels record pricing requests, information requests and registration follow-up work.
- Exact known addresses and reviewed associations can link incoming mail. An uncertain match stays unlinked. Linking a conversation does not merge company records or grant marketing permission.

## Server configuration

| Variable | Purpose |
| --- | --- |
| `PARTNER_INBOX_ENCRYPTION_KEY` | Dedicated 32-byte random key encoded as 64 hex characters. Required for encrypted OAuth secrets. Store only as a Railway secret; retain it across deploys and restore it with backups. |
| `PARTNER_INBOX_GOOGLE_CLIENT_ID` / `PARTNER_INBOX_GOOGLE_CLIENT_SECRET` | Optional alternative to the owner's encrypted setup form. Stored form settings take precedence. |
| `PARTNER_INBOX_ADDRESS` | Defaults to `support@matchnmove.co.nz`; keep this mailbox identity stable. |
| `NEXTAUTH_URL` | Public HTTPS app origin, currently `https://www.matchnmove.co.nz`. Determines the exact OAuth callback. |
| `BACKGROUND_JOBS_ENABLED` | Existing worker switch; production must leave this enabled. Inbox processing has a separate timer and database lease so imports do not block lead jobs. |
| `MALWARE_SCAN_URL` / `MALWARE_SCAN_TOKEN` | Existing malware-scanner integration. Must return a successful JSON response with `clean: true` and, if supplied, `status: "CLEAN"`. Inbox files fail closed even if the wider application permits unscanned documents. |
| `STORAGE_*` | Existing private S3-compatible storage. Reused without making the bucket public or changing mover document/logo credentials. |

The database migration is additive: two explicit user permission flags; mailbox/OAuth state; conversations; messages; attachments; reviewed contact associations; notes; activity; and optional conversation/kind fields on existing recruitment tasks. Existing contact details and recruitment permissions are preserved. Owners retain access under the existing owner role; recruitment admins see only assigned conversations and need explicit inbox permission. The API repeats MFA, current-account and scope checks server-side.

Refresh tokens and stored client secrets use AES-256-GCM with the dedicated key. The browser receives neither encrypted nor plaintext provider credentials. OAuth state is single-use, actor-bound, cookie-bound, short-lived and protected with PKCE. Only Google's fixed API endpoints are called.

Files are limited to 10 MB each, 10 files and 15 MB combined per draft. Supported files: matching PDF/PNG/JPEG/WEBP, UTF-8 TXT/CSV and modern Office documents. They are scanned, stored privately and checked against their saved SHA-256 on download. Downloads repeat permissions after the file read and force attachment disposition; email HTML is sanitised, sandboxed and cannot load tracking images/scripts. Removing a forwarded file from a draft retains a shared private object rather than deleting another message's file.

## Reliability and recovery

Gmail history cursors, page tokens, a renewable database lease and unique Gmail message/draft IDs prevent duplicate import and overlapping workers. Provider outages preserve the cursor and use capped exponential backoff. Expired Gmail history rebuilds the recent index. Read/unread, archive and spam changes queue idempotent provider label updates. Internal assignments, pipeline labels and notes remain app-only. The existing email station's successful sends are copied into inbox history without being sent again.

An interrupted draft-create request is never blindly repeated. The sync reconciles Gmail Drafts using its message identifier; until then the app retains the saved draft and reports the pending mirror. If a mirrored draft was deleted in Gmail, the app can create a fresh mirror on a later safe pass. Explicit sending remains separate from draft mirroring.

Use **Reconnect** if Google revokes/invalidates access. **Disconnect** stops new sync/send requests and keeps existing history. Changing OAuth client settings disconnects the old connection and requires consent again. Revoking the app in the support account's Google security settings also stops provider access. Do not rotate the encryption key without migrating existing ciphertext or planning to reconnect.

## Verification and live acceptance test

Automated tests cover sanitisation, encoding/address parsing, encrypted secrets, migration of populated old records, RBAC/MFA/CSRF, ownership, drafts, final preview, duplicate sends, threading, forwards, outage/backoff, leases, uncertain send reconciliation, marketing safeguards, pipeline/tasks and attachment scanning/private storage/integrity. Provider and storage integration tests use isolated loopback services and disposable databases, never real prospect mailboxes or production customer leads.

After the owner connects Google, complete this final live acceptance test using a mailbox you control:

1. Send a clearly labelled support enquiry **to support@matchnmove.co.nz** from your controlled mailbox.
2. Confirm it appears after Sync. If it is not an existing known company address, it should remain unlinked; manually link it only to an appropriate real record, without altering contact permission.
3. Open it, reply, review the final body and explicitly send.
4. Check the controlled recipient's Inbox/Spam and Gmail Sent. Provider acceptance alone is not proof of Inbox placement.
5. Reply again from the controlled mailbox. Confirm it joins the same conversation.
6. Add a note and follow-up task; confirm neither appears in the external email.
7. Test a small harmless document through the existing scanner and private storage. Check a colleague without inbox permission cannot access it.

**Live Google authorisation and an external round trip are still required before declaring live delivery verified.** The implementation does not automatically contact prospects, create customer leads, enable marketing or complete Google consent on the owner's behalf.
