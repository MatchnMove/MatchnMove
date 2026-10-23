import { TeamActivation } from "@/components/team-activation";
export const metadata = { referrer: "no-referrer" as const };
export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return <TeamActivation token={(await searchParams).token || ""} />;
}
