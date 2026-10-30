// Made-up movies for development only. Never served in production (see ./index.ts).
// The titles, services and prices are invented and must not be shown to real users.

import type { Movie, Offer, OfferType, Provider } from "@/domain/types";

const providers = {
  netflix: { id: "netflix", name: "Netflix" },
  viaplay: { id: "viaplay", name: "Viaplay" },
  max: { id: "max", name: "Max" },
  svtplay: { id: "svtplay", name: "SVT Play" },
  sfanytime: { id: "sfanytime", name: "SF Anytime" },
  appletv: { id: "appletv", name: "Apple TV" },
  prime: { id: "prime", name: "Prime Video" },
  googleplay: { id: "googleplay", name: "Google Play" },
  blockbuster: { id: "blockbuster", name: "Blockbuster" },
} satisfies Record<string, Provider>;

type P = keyof typeof providers;

function offer(p: P, type: OfferType, sek?: number, quality: Offer["quality"] = "HD"): Offer {
  return {
    provider: providers[p],
    type,
    price: sek === undefined ? null : { amount: sek, currency: "SEK" },
    quality,
    url: `https://example.com/mock/${p}`,
  };
}

function movie(id: string, title: string, year: number, originalTitle: string | null = null): Movie {
  return { id, title, originalTitle, year, tmdbId: null, posterUrl: null };
}

export const MOCK_CATALOG: { movie: Movie; offers: Offer[] }[] = [
  {
    movie: movie("mock-1", "Midnight Ferry", 2019),
    offers: [
      offer("netflix", "subscription"),
      offer("sfanytime", "rent", 49),
      offer("appletv", "rent", 39),
      offer("appletv", "rent", 29, "SD"),
      offer("prime", "rent", 45),
      offer("appletv", "buy", 129, "4K"),
      offer("sfanytime", "buy", 149),
      offer("googleplay", "buy", 119),
    ],
  },
  {
    movie: movie("mock-2", "Midnight Ferry", 1987),
    offers: [offer("appletv", "buy", 99, "SD")],
  },
  {
    movie: movie("mock-3", "Orbit of Small Things", 2023),
    offers: [
      offer("viaplay", "subscription", undefined, "4K"),
      offer("max", "subscription"),
      offer("blockbuster", "rent", 59),
      offer("appletv", "rent", 49),
      offer("appletv", "buy", 179),
    ],
  },
  {
    movie: movie("mock-4", "Kanelbullar och krig", 2021, "Cinnamon and War"),
    offers: [offer("svtplay", "free"), offer("sfanytime", "rent", 39)],
  },
  {
    movie: movie("mock-5", "The Quiet Lighthouse", 2016),
    offers: [],
  },
];
