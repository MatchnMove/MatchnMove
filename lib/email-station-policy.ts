export const emailStationStatuses = ["NOT_STARTED", "DRAFT", "IN_PROGRESS", "SENDING", "RESPONSE_RECEIVED", "REVISIT_DUE", "PAUSED", "REGISTERING", "REGISTERED", "NEEDS_REVIEW", "LEGACY", "STOPPED"] as const;
export type EmailStationStatus = typeof emailStationStatuses[number];
export const emailStationStatusLabels: Record<EmailStationStatus, string> = {
  NOT_STARTED: "Not started", DRAFT: "Draft ready", IN_PROGRESS: "In progress", SENDING: "Sending",
  RESPONSE_RECEIVED: "Response received", REVISIT_DUE: "Revisit due", PAUSED: "Paused",
  REGISTERING: "Registration started", REGISTERED: "Registered", NEEDS_REVIEW: "Needs review",
  LEGACY: "Previous emails", STOPPED: "Stopped",
};
export const emailStationSteps = [
  { title: "Initial invitation", timing: "Day 0", description: "General invitation or relevant opportunity" },
  { title: "First follow-up", timing: "Day 7", description: "A friendly reminder" },
  { title: "Second follow-up", timing: "Day 28", description: "Check company interest" },
  { title: "Final follow-up", timing: "One month after the second follow-up", description: "Close the automatic sequence" },
  { title: "Manual re-engagement", timing: "Three months from the initial email", description: "Administrator review and approval required" },
];

export function stationTemplateLabel(key?: string | null, sequence = 0) {
  return key?.endsWith("OPPORTUNITY") ? key.startsWith("CLEANER_") ? "Cleaning opportunities introduction" : "Invitation with moving opportunity"
    : key?.endsWith("GENERAL") ? "General invitation" : emailStationSteps[sequence]?.title || "Previous invitation";
}

export function stationNextLabel(status: EmailStationStatus) {
  if (["RESPONSE_RECEIVED", "PAUSED"].includes(status)) return "Paused";
  if (["REGISTERED", "REGISTERING", "STOPPED"].includes(status)) return "Stopped";
  if (status === "REVISIT_DUE") return "Manual review";
  if (status === "NEEDS_REVIEW") return "Review delivery";
  if (status === "LEGACY") return "Review previous emails";
  if (status === "DRAFT") return "Review draft";
  if (status === "SENDING") return "Sending in progress";
  return "Not scheduled";
}
