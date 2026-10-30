# Company contact availability

In Admin → Companies, new companies require a separate availability choice below
Business email and Phone number. Publicly Accessible requires a valid value;
Not Publicly Accessible allows the value to be absent. A manually obtained value
can be recorded while its availability remains Not Publicly Accessible.

Companies remain in the recruitment pipeline when contacts are missing. Their
contact-information indicator explains the missing detail. Use the contact filter
for all follow-up, missing email, missing phone, or availability not yet reviewed.
Edit company records the missing details and reviews availability. Existing stage,
ownership and reviewed contact permission remain independent.

A reviewed missing contact creates one task assigned to the company's assigned
administrator. Missing email with a suitable phone asks for phone follow-up;
missing phone asks for contact research; missing both asks for research before
outreach. No phone call is requested without a valid phone. Saving both valid
details automatically completes this contact task. It cannot be manually marked
complete while a required detail is absent. Removing a detail reopens the task
when its availability has been reviewed as Not Publicly Accessible.

Email Station links to the missing-email follow-up list and disables recipient
selection without a valid email. Both draft preparation and sending check the
address on the server. Saving an address never queues or sends an email, never
grants consent, and never changes recruitment status. Replacing an address
cancels unsent previews; existing post-contact correction restrictions and fresh
permission-evidence requirements still apply. Suppressions, individual sending
approval, permissions, rate limits and sender verification remain enforced.

Migration `20261031000000_prospect_contact_availability` makes prospect email
nullable and adds nullable emailAvailability / phoneAvailability fields with
PUBLIC / NOT_PUBLIC constraints. Existing values are retained and both statuses
remain unreviewed (NULL); blank existing fields are not classified automatically.
Editing unrelated fields preserves those unreviewed statuses. Reviewing a missing
detail creates its task. Availability is not marketing contact permission.

Validation covers form choices, contact validation, local PostgreSQL migration
preservation, multiple companies with absent emails, ownership, optimistic locking,
follow-up creation/completion, actual HTTP filters and completion guards, no
automatic email delivery, and the existing individually approved outreach flow.
