export const businessTypes = ["MOVING", "CLEANING"] as const;
export type PartnerBusinessType = (typeof businessTypes)[number];

export function businessTypeLabel(value: string) {
  return value === "CLEANING" ? "Cleaning" : "Moving";
}

export const movingServices = ["HOUSEHOLD", "OFFICE", "PACKING", "STORAGE", "SPECIALTY"] as const;
export const cleaningServices = ["MOVE_OUT_CLEANING", "MOVE_IN_CLEANING", "GENERAL_CLEANING", "COMMERCIAL_CLEANING"] as const;

export function partnerRegistrationPath(businessType: string) {
  return businessType === "CLEANING" ? "/cleaner/register" : "/mover/login?mode=signup";
}
