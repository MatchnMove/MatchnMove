import { NZ_SERVICE_AREAS } from "@/lib/nz-regions";

const validServiceAreas = new Set<string>(NZ_SERVICE_AREAS);

export function hasCleanerServiceRegions(serviceAreas: readonly string[]) {
  return serviceAreas.some((area) => validServiceAreas.has(area));
}

export function getCleanerActivationError(cleaner: {
  emailVerified: boolean;
  serviceAreas: readonly string[];
}) {
  if (!cleaner.emailVerified) return "Verify the cleaner email address before activation.";
  if (!hasCleanerServiceRegions(cleaner.serviceAreas)) {
    return "The cleaner must save at least one service region in their dashboard before activation.";
  }
  return null;
}

export function canCleanerAccessLeads(cleaner: {
  status: string;
  serviceAreas: readonly string[];
}) {
  return cleaner.status === "ACTIVE" && hasCleanerServiceRegions(cleaner.serviceAreas);
}
