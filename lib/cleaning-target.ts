import { Prisma } from "@prisma/client";
export const cleaningTargetSelect =
  Prisma.validator<Prisma.CleaningRequestSelect>()({
    location: true,
    services: true,
    targetAddress: true,
    targetCity: true,
    targetRegion: true,
    targetPostcode: true,
    propertyType: true,
    bedrooms: true,
    preferredDate: true,
    timeWindow: true,
    propertyEmpty: true,
    moverTiming: true,
    accessNotes: true,
    carpetRooms: true,
    destinationConsentAt: true,
  });
export type CleaningTargetData = {
  location: string;
  services?: string[];
  targetAddress?: string | null;
  targetCity?: string | null;
  targetRegion?: string | null;
  targetPostcode?: string | null;
  propertyType?: string | null;
  bedrooms?: string | null;
  preferredDate?: Date | null;
  timeWindow?: string | null;
  propertyEmpty?: string | null;
  moverTiming?: string | null;
  accessNotes?: string | null;
  carpetRooms?: number | null;
  destinationConsentAt?: Date | null;
};
type LegacyPickup = {
  fromAddress: string;
  fromCity: string;
  fromRegion: string;
  fromPostcode?: string;
  fromPropertyType?: string;
  bedrooms?: string;
  moveDate?: Date | null;
  dateFlexible?: boolean;
};
/** A destination is never fetched here. Move-in requires its own consented snapshot.
 * Existing move-out records retain their pickup fallback without changing purchased data. */
export function cleaningTarget(
  request: CleaningTargetData & { quoteRequest: LegacyPickup },
) {
  const safeSnapshot =
    Boolean(request.targetAddress) &&
    (request.location === "MOVE_OUT" || Boolean(request.destinationConsentAt));
  const legacy = request.location === "MOVE_OUT" ? request.quoteRequest : null;
  return {
    fromAddress: safeSnapshot
      ? request.targetAddress!
      : (legacy?.fromAddress ?? ""),
    fromCity: safeSnapshot
      ? (request.targetCity ?? "")
      : (legacy?.fromCity ?? ""),
    fromRegion: safeSnapshot
      ? (request.targetRegion ?? "")
      : (legacy?.fromRegion ?? ""),
    fromPostcode: safeSnapshot
      ? (request.targetPostcode ?? "")
      : (legacy?.fromPostcode ?? ""),
    fromPropertyType: safeSnapshot
      ? (request.propertyType ?? "Not supplied")
      : (legacy?.fromPropertyType ?? "Not supplied"),
    bedrooms: safeSnapshot
      ? (request.bedrooms ?? "Not supplied")
      : (legacy?.bedrooms ?? "Not supplied"),
    moveDate:
      request.preferredDate ??
      (!safeSnapshot && request.location === "MOVE_OUT"
        ? (legacy?.moveDate ?? null)
        : null),
    dateFlexible: request.preferredDate
      ? false
      : safeSnapshot
        ? true
        : (legacy?.dateFlexible ?? true),
  };
}
