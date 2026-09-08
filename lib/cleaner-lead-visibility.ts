import { Prisma } from "@prisma/client";
import { CLEANING_LEAD_PRICING } from "@/lib/cleaner-lead-pricing";
import { matchNzServiceArea } from "@/lib/nz-regions";

/**
 * Keep the database projection beside the serializer so every cleaner-facing
 * endpoint starts from the same deliberately small set of moving-request data.
 * Destination, inventory, and transcript fields are not fetched.
 */
export const cleaningLeadForCleanerSelect = Prisma.validator<Prisma.CleaningLeadSelect>()({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  viewedAt: true,
  purchasedAt: true,
  purchase: {
    select: {
      id: true,
      amount: true,
      currency: true,
      purchasedAt: true,
    },
  },
  cleaningRequest: {
    select: {
      location: true,
      notes: true,
      quoteRequest: {
        select: {
          name: true,
          email: true,
          phone: true,
          bedrooms: true,
          fromAddress: true,
          fromCity: true,
          fromRegion: true,
          fromPostcode: true,
          fromPropertyType: true,
          moveDate: true,
          dateFlexible: true,
        },
      },
    },
  },
});

type CleaningLeadQuoteRequest = {
  name: string;
  email: string;
  phone: string;
  bedrooms: string;
  fromAddress: string;
  fromCity: string;
  fromRegion: string;
  fromPostcode: string;
  fromPropertyType: string;
  moveDate: Date | null;
  dateFlexible: boolean;
};

type CleaningLeadVisibilityInput = {
  id: string;
  status: string;
  createdAt: Date;
  updatedAt?: Date;
  viewedAt: Date | null;
  purchasedAt: Date | null;
  purchase: {
    id: string;
    amount: number;
    currency: string;
    purchasedAt: Date;
  } | null;
  cleaningRequest: {
    location: string;
    notes: string | null;
    quoteRequest: CleaningLeadQuoteRequest;
  };
};

const streetAddressPattern = /(?:^|\s)(?:unit|flat|apartment|suite|level)\b|\d|(?:^|\s)(?:street|st|road|rd|avenue|ave|lane|drive|dr|place|pl|crescent|cres|terrace|highway|parade|quay|close|grove|rise|mews|esplanade)\b/i;

export function getCleaningGeneralLocation(
  quoteRequest: Pick<CleaningLeadQuoteRequest, "fromAddress" | "fromCity" | "fromRegion">,
) {
  const rawCity = quoteRequest.fromCity.trim();
  const rawAddress = quoteRequest.fromAddress.trim();
  const region = matchNzServiceArea(quoteRequest.fromRegion)
    ?? matchNzServiceArea(rawCity)
    ?? matchNzServiceArea(rawAddress);
  const cityIsAddress = !rawCity
    || rawCity.localeCompare("Not provided", undefined, { sensitivity: "base" }) === 0
    || rawCity.localeCompare(rawAddress, undefined, { sensitivity: "base" }) === 0
    || streetAddressPattern.test(rawCity);
  const city = cityIsAddress ? "" : rawCity;

  if (!city) return region ?? "Location available after opening";
  if (!region || city.localeCompare(region, undefined, { sensitivity: "base" }) === 0) return city;
  return `${city}, ${region}`;
}

/**
 * The persisted purchase is the access entitlement. Status alone must never
 * reveal customer contact details because it can be changed independently.
 */
export function isCleaningLeadUnlocked(lead: Pick<CleaningLeadVisibilityInput, "purchase">) {
  return Boolean(lead.purchase);
}

/**
 * This serializer deliberately accepts only pickup/cleaning fields. Destination,
 * moving inventory, and transcript data cannot accidentally enter its output.
 */
export function serializeCleaningLeadForCleaner(
  lead: CleaningLeadVisibilityInput,
  options: { revealCustomerDetails?: boolean } = {},
) {
  const quote = lead.cleaningRequest.quoteRequest;
  const unlocked = isCleaningLeadUnlocked(lead);
  const customerDetailsAvailable = unlocked && options.revealCustomerDetails !== false;
  const price = lead.purchase?.amount ?? CLEANING_LEAD_PRICING.fixedPrice;
  const currency = lead.purchase?.currency ?? CLEANING_LEAD_PRICING.currency;

  return {
    id: lead.id,
    status: lead.status,
    unlocked,
    price,
    currency,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: (lead.updatedAt ?? lead.createdAt).toISOString(),
    viewedAt: lead.viewedAt?.toISOString() ?? null,
    purchasedAt: lead.purchase?.purchasedAt.toISOString() ?? lead.purchasedAt?.toISOString() ?? null,
    cleaning: {
      location: lead.cleaningRequest.location,
      // Free-form customer notes are not a safe locked-preview field: people
      // routinely include their phone number, email address, or street address
      // in them. Keep them behind the same persisted purchase entitlement as
      // the direct contact details.
      notes: customerDetailsAvailable ? lead.cleaningRequest.notes : null,
      propertyType: quote.fromPropertyType,
      bedrooms: quote.bedrooms,
      generalLocation: getCleaningGeneralLocation(quote),
      moveDate: quote.moveDate?.toISOString() ?? null,
      dateFlexible: quote.dateFlexible,
    },
    customerAccessSuspended: unlocked && !customerDetailsAvailable,
    customer: customerDetailsAvailable
      ? {
          name: quote.name,
          email: quote.email,
          phone: quote.phone,
          address: quote.fromAddress,
          city: quote.fromCity,
          region: quote.fromRegion,
          postcode: quote.fromPostcode,
        }
      : null,
  };
}

export type SerializedCleaningLead = ReturnType<typeof serializeCleaningLeadForCleaner>;
