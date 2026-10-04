import { isConfiguredAdminEmail } from "@/lib/admin-auth";
import { sanitiseNzServiceAreas } from "@/lib/nz-regions";

type MoverLeadAccount = {
  id: string;
  status: string;
  serviceAreas: string[];
  nzbnVerificationSource: string | null;
  user: { role: string; email: string; emailVerifiedAt: Date | null };
};

// Lead access is independent of the public profile's verification badge.
// Active businesses can receive quotes while completing business/document checks.
export function getMoverLeadAccessError(mover: MoverLeadAccount): string | null {
  if (mover.status !== "ACTIVE") return "This mover account is not active.";
  if (
    ["TEST", "SEED"].includes(mover.nzbnVerificationSource ?? "") ||
    /^(demo-|shared-load-)/.test(mover.id) ||
    /@(demo\.matchnmove\.co\.nz|loadtest\.matchnmove\.local|loadtest\.local)$/i.test(mover.user.email) ||
    mover.user.role !== "MOVER" ||
    isConfiguredAdminEmail(mover.user.email)
  ) return "This account cannot receive customer quotes.";
  if (!mover.user.emailVerifiedAt) return "Verify your account email before accessing leads.";
  if (!sanitiseNzServiceAreas(mover.serviceAreas).length) return "Add your service regions before accessing leads.";
  return null;
}

export function canMoverAccessLeads(mover: MoverLeadAccount) {
  return getMoverLeadAccessError(mover) === null;
}
