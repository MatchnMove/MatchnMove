# Company directory and email controls

The directory now shows each company's last successful email stage, send time and next action separately from its recruitment status. Company records show a five-step email timeline: invitation, first follow-up, second follow-up, final follow-up and manual re-engagement. A saved draft or uncertain delivery never counts as a successful send. Times use Pacific/Auckland.

**Remove company from directory** is available in each directory row and company record. It hides the entry from the active directory and recipient search, stops its campaigns and tasks, and removes pending drafts. Sent emails, suppression information, registration attribution and contact history remain intact. The action checks ownership, the record version and active/uncertain sends. Use **Removed companies** and **Restore company to directory** to recover an entry. Restoring does not resume outreach or recreate drafts.

**Remove email draft** is available in the Email station and saved inbox composer. The service checks ownership and the saved version and rejects sent, claimed or uncertain messages. Removing a follow-up pauses its campaign. An administrator can explicitly resume and prepare a replacement later. Removal creates no email delivery.

Removed mirrored drafts are also deleted from Gmail by the existing inbox worker. Provider outages retain the removal request for retry. Local tombstones prevent a stale provider draft or delayed draft-create response from restoring a removed draft. Sending history is retained.

Apply migration `20261103010000_directory_removal` before deploying the updated app. It adds only the nullable company removal timestamp and its index. No company is removed by the migration. The existing mailbox slot, sender configuration and permissions are reused. All admin sending remains from `contact@matchnmove.co.nz`.

The email template catalogue has separate **Moving companies** and **Cleaning companies** tabs. Each contains six templates using the same design and follow-up structure. Existing drafts can be saved again to refresh their preview; existing sent emails retain their original content. The cleaner opportunities introduction describes future enquiries without inventing a current customer job.
