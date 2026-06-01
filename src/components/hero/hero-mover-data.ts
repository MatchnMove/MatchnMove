export type HeroMoverTickerItem = {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  badge: string;
  tone: string;
};

type HeroMoverSource = {
  id: string;
  companyName: string;
  averageRating: number;
  totalReviewCount: number;
  leaderboardEligible: boolean;
};

const fallbackMovers: HeroMoverTickerItem[] = [
  {
    id: "fallback-harbourline",
    name: "Harbourline",
    rating: 0,
    reviewCount: 0,
    badge: "Preview",
    tone: "bg-emerald-500",
  },
  {
    id: "fallback-easy-movers",
    name: "Easy Movers",
    rating: 0,
    reviewCount: 0,
    badge: "Preview",
    tone: "bg-blue-500",
  },
  {
    id: "fallback-home-movers",
    name: "Home Movers",
    rating: 0,
    reviewCount: 0,
    badge: "Preview",
    tone: "bg-accentOrange",
  },
  {
    id: "fallback-coastal-carry",
    name: "Coastal Carry",
    rating: 0,
    reviewCount: 0,
    badge: "Preview",
    tone: "bg-sky-500",
  },
  {
    id: "fallback-summit-shift",
    name: "Summit Shift",
    rating: 0,
    reviewCount: 0,
    badge: "Preview",
    tone: "bg-violet-500",
  },
];

const tones = ["bg-emerald-500", "bg-blue-500", "bg-accentOrange", "bg-sky-500", "bg-violet-500"];

export function buildHeroMoverItems(movers: HeroMoverSource[]) {
  const liveMovers = movers.slice(0, 10).map((mover, index) => ({
    id: mover.id,
    name: mover.companyName,
    rating: mover.averageRating,
    reviewCount: mover.totalReviewCount,
    badge: mover.leaderboardEligible ? "Top rated" : mover.totalReviewCount > 0 ? "Verified mover" : "New mover",
    tone: tones[index % tones.length],
  }));

  return liveMovers.length > 0 ? liveMovers : fallbackMovers;
}
