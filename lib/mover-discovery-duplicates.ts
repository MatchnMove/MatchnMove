import { prisma } from "@/lib/db";
import {
  normalizeCompany,
  type RecruitmentActor,
} from "@/lib/recruitment-policy";
import type { DiscoveryCandidate } from "@/lib/mover-discovery";
export type DiscoveryMatch = {
  duplicate: boolean;
  registered: boolean;
  suppressed: boolean;
  existingId: string | null;
};
export async function annotateDiscoveredMovers(
  items: DiscoveryCandidate[],
  actor: RecruitmentActor,
) {
  if (!items.length) return [];
  const names = items.map((c) => normalizeCompany(c.companyName));
  const emails = items.map((c) => c.email).filter(Boolean);
  const websites = items.map((c) => c.website).filter(Boolean);
  const phones = items.map((c) => c.phone).filter(Boolean);
  const [prospects, registered, suppressions] = await Promise.all([
    prisma.moverProspect.findMany({
      where: {
        OR: [
          { normalizedName: { in: names } },
          ...(emails.length ? [{ email: { in: emails } }] : []),
          ...(websites.length ? [{ website: { in: websites } }] : []),
          ...(phones.length ? [{ phone: { in: phones } }] : []),
        ],
      },
      select: {
        id: true,
        assignedAdminId: true,
        normalizedName: true,
        email: true,
        website: true,
        phone: true,
      },
    }),
    prisma.moverCompany.findMany({
      where: {
        OR: [
          { nzbn: { in: items.map((c) => c.nzbn).filter(Boolean) } },
          ...items.map((c) => ({
            companyName: {
              equals: c.companyName,
              mode: "insensitive" as const,
            },
          })),
          ...(emails.length ? [{ user: { email: { in: emails } } }] : []),
        ],
      },
      select: {
        nzbn: true,
        companyName: true,
        user: { select: { email: true } },
      },
    }),
    emails.length
      ? prisma.contactSuppression.findMany({
          where: { email: { in: emails } },
          select: { email: true },
        })
      : Promise.resolve([]),
  ]);
  return items.map((candidate) => {
    const duplicate = prospects.find(
      (p) =>
        p.normalizedName === normalizeCompany(candidate.companyName) ||
        (candidate.email && p.email === candidate.email) ||
        (candidate.website && p.website === candidate.website) ||
        (candidate.phone && p.phone === candidate.phone),
    );
    return {
      ...candidate,
      match: {
        duplicate: Boolean(duplicate),
        registered: registered.some(
          (m) =>
            (Boolean(candidate.nzbn) && m.nzbn === candidate.nzbn) ||
            normalizeCompany(m.companyName) ===
              normalizeCompany(candidate.companyName) ||
            (candidate.email && m.user.email === candidate.email),
        ),
        suppressed:
          Boolean(candidate.email) &&
          suppressions.some((s) => s.email === candidate.email),
        existingId:
          duplicate &&
          (actor.role === "OWNER" || duplicate.assignedAdminId === actor.id)
            ? duplicate.id
            : null,
      } satisfies DiscoveryMatch,
    };
  });
}
