# Email station

The Email station opens on company outreach progress. Company cards show the current status and next follow-up or review date; selecting a company opens its Timeline, Send history and Templates tabs. Moving and cleaning companies share the same controls with their own templates.

The company count and status metrics use all companies visible to the signed-in administrator. Search covers company names, contacts and business email. Business and status filters apply before pagination; each page contains 25 companies. Removed companies are excluded. Replies, registration, paused/stopped campaigns and uncertain sends take precedence over scheduled follow-up dates. Earlier campaigns cannot override the latest campaign's status. Dates display in Pacific/Auckland.

The timeline marks a step sent only when its message has a successful send record and timestamp. It displays the stored next due date, including delays, rather than calculating assumed send dates from the reference schedule. The three-month re-engagement always requires manual approval. If the worker has not yet marked a past-due review, the explicit preview action can open that review and prepare its draft; it sends no email.

Send history contains the latest 100 saved email records with their actual statuses and dates. The API returns metadata for the company dashboard, not message bodies or invitation tokens. Staff without lead-summary access cannot open lead-email previews and receive a generic subject for those records. Saved email content loads through **Preview email**, which opens the existing review/approval screen.

**New invitation** opens a compact company picker and preparation form. The large prefilled introduction at the top has been removed. **Preview template** is read-only and uses public registration links, without creating a draft, delivery or tracking token. The mover opportunity template still requires an authorised moving request. Legacy records have a reviewed-sequence action alongside their send history.

Pause/resume, initial preparation and due follow-up actions reuse the current permission, consent, suppression and version checks. Viewing a company, filtering and previewing a template do not send email. The company panel refreshes once per minute while visible and ignores stale responses when selection changes.

Migration `20261104000000_email_station_progress_index` adds an index on company/email creation time for the progress and history queries. It changes no company or email data.
