export type QuoteFlowDelivery = {
  status: string;
  attempts: number;
  maxAttempts: number;
  sentAt: string | null;
  lastError: string | null;
  updatedAt: string;
};

export type QuoteFlowItem = {
  id: string;
  quoteRequestId: string;
  status: string;
  price: number;
  assignedAt: string;
  purchasedAt: string | null;
  expiresAt: string | null;
  expiredAt: string | null;
  redistributedAt: string | null;
  redistributionRound: number;
  quote: {
    createdAt: string;
    bedrooms: string;
    movingWhat: string | null;
    fromCity: string;
    fromRegion: string;
    toCity: string;
    toRegion: string;
    moveDate: string | null;
    dateFlexible: boolean;
  };
  emailDelivery: QuoteFlowDelivery | null;
};

export type QuoteFlowPage = {
  items: QuoteFlowItem[];
  nextCursor: string | null;
};
