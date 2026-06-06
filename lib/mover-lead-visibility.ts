const UNLOCKED_LEAD_STATUSES = new Set(["PURCHASED", "CONTACTED", "WON"]);

type MoverLeadQuoteRequest = {
  id: string;
  name: string;
  email: string;
  phone: string;
  movingWhat: string | null;
  bedrooms: string;
  fromAddress: string;
  fromCity: string;
  fromRegion: string;
  fromPostcode: string;
  toAddress: string;
  toCity: string;
  toRegion: string;
  toPostcode: string;
  fromPropertyType: string;
  toPropertyType: string;
  moveDate: Date | null;
  dateFlexible: boolean;
};

function formatMoveDate(value: Date | null) {
  if (!value) return "Flexible timing";

  return new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

export function isMoverLeadUnlocked(status: string) {
  return UNLOCKED_LEAD_STATUSES.has(status);
}

export function serializeMoverLeadQuoteRequest(status: string, quoteRequest: MoverLeadQuoteRequest) {
  const unlocked = isMoverLeadUnlocked(status);

  return {
    id: quoteRequest.id,
    name: unlocked ? quoteRequest.name : null,
    email: unlocked ? quoteRequest.email : null,
    phone: unlocked ? quoteRequest.phone : null,
    movingWhat: unlocked ? quoteRequest.movingWhat : null,
    bedrooms: quoteRequest.bedrooms,
    fromAddress: unlocked ? quoteRequest.fromAddress : null,
    fromCity: quoteRequest.fromCity,
    fromRegion: quoteRequest.fromRegion,
    fromPostcode: unlocked ? quoteRequest.fromPostcode : null,
    toAddress: unlocked ? quoteRequest.toAddress : null,
    toCity: quoteRequest.toCity,
    toRegion: quoteRequest.toRegion,
    toPostcode: unlocked ? quoteRequest.toPostcode : null,
    fromPropertyType: quoteRequest.fromPropertyType,
    toPropertyType: quoteRequest.toPropertyType,
    moveDateLabel: formatMoveDate(quoteRequest.moveDate),
    dateFlexible: quoteRequest.dateFlexible,
  };
}
