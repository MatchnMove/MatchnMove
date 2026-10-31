// Shared by the admin UI and server policy without importing server-only code.
export const statuses = [
  "NOT_CONTACTED", "CONTACTED", "FOLLOW_UP_REQUIRED", "INTERESTED",
  "REGISTRATION_STARTED", "REGISTERED", "ACTIVE_MOVER", "NOT_INTERESTED", "DO_NOT_CONTACT",
] as const;
export const manualStatuses = [
  "NOT_CONTACTED", "CONTACTED", "FOLLOW_UP_REQUIRED", "INTERESTED", "NOT_INTERESTED", "DO_NOT_CONTACT",
] as const;
export const stoppedStatuses = ["REGISTERED", "ACTIVE_MOVER", "NOT_INTERESTED", "DO_NOT_CONTACT"];
