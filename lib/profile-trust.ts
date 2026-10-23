export const MOVING_SERVICES = [
  "Household moving",
  "Apartment moving",
  "Office relocation",
  "Packing",
  "Storage transfers",
  "Furniture and single items",
  "Piano and heavy items",
] as const;
type Profile = {
  companyName: string;
  businessDescription: string | null;
  serviceAreas: string[];
  operatingRegion?: string | null;
  movingServices?: string[];
  user?: { email?: string; emailVerifiedAt?: Date | null };
  phoneVerifiedAt?: Date | null;
  nzbnVerificationStatus?: string;
  yearsOperatingVerifiedAt?: Date | null;
};
export function getProfileCompleteness(profile: Profile) {
  const checks = {
    "Business name": profile.companyName.trim().length >= 2,
    "Contact email": Boolean(
      profile.user?.email || profile.user?.emailVerifiedAt,
    ),
    "Operating location": Boolean(profile.operatingRegion?.trim()),
    "Service regions": profile.serviceAreas.length > 0,
    "Moving services": Boolean(profile.movingServices?.length),
    "Business description":
      (profile.businessDescription?.trim().length ?? 0) >= 80,
  };
  const missing = Object.entries(checks)
    .filter(([, ready]) => !ready)
    .map(([name]) => name);
  return {
    missing,
    complete: missing.length === 0,
    percent: Math.round(
      (1 - missing.length / Object.keys(checks).length) * 100,
    ),
  };
}
export function getTrustLabels(profile: Profile) {
  return [
    ...(profile.nzbnVerificationStatus === "VERIFIED"
      ? ["Business identity checked"]
      : []),
    ...(profile.user?.emailVerifiedAt ? ["Email confirmed"] : []),
    ...(profile.phoneVerifiedAt ? ["Phone confirmed"] : []),
  ];
}
