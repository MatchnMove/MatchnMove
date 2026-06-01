export type HeroMoverTickerItem = {
  id: string;
  name: string;
  logoUrl: string | null;
  rating: number;
  reviewCount: number;
  badge: string;
  tone: string;
};

type HeroMoverSource = {
  id: string;
  companyName: string;
  logoUrl: string | null;
  averageRating: number;
  totalReviewCount: number;
  leaderboardEligible: boolean;
};

const tones = ["bg-emerald-500", "bg-blue-500", "bg-accentOrange", "bg-sky-500", "bg-violet-500"];

export function buildHeroMoverItems(movers: HeroMoverSource[]) {
  return movers.slice(0, 10).map((mover, index) => ({
    id: mover.id,
    name: mover.companyName,
    logoUrl: mover.logoUrl,
    rating: mover.averageRating,
    reviewCount: mover.totalReviewCount,
    badge: mover.leaderboardEligible ? "Top rated" : mover.totalReviewCount > 0 ? "Verified mover" : "New mover",
    tone: tones[index % tones.length],
  }));
}
