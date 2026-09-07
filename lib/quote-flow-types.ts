export type QuoteFlowDelivery = {
  kind: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  sentAt: string | null;
  lastError: string | null;
  providerMessageId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type QuoteFlowItem = {
  id: string;
  quoteRequestId: string;
  status: string;
  price: number;
  assignedAt: string;
  viewedAt: string | null;
  purchasedAt: string | null;
  reminderSentAt: string | null;
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
  emailDeliveries: QuoteFlowDelivery[];
};

export type QuoteFlowPage = {
  items: QuoteFlowItem[];
  nextCursor: string | null;
};
