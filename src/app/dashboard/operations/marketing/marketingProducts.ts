export type MarketingProduct = { id: string; name: string; kind: string; goal: string; destination?: string; starter: string };
/** Owner-facing starter records. These are suggestions, not verified product inventory. */
export const marketingProducts: MarketingProduct[] = [
  { id: "philippines", name: "Philippines book", kind: "Book", goal: "Reach readers interested in the Philippines", starter: "I've written a book about the Philippines. If you're considering a visit or want to learn more, I'm happy to answer questions about what it covers." },
  { id: "ai-normal", name: "AI for Normal People", kind: "Book", goal: "Book sales", destination: "https://www.amazon.com/dp/B0HFZ1WHLX", starter: "Curious about practical ways to use AI? I wrote AI for Normal People to make the subject more approachable." },
  { id: "beastguide", name: "BeastGuide", kind: "Application", goal: "Registrations", destination: "https://beastguide.vercel.app", starter: "I built BeastGuide to help keep track of shows and episodes. If that sounds useful, take a look." },
  { id: "beastmoney", name: "BeastMoney", kind: "Application", goal: "Qualified visitors", starter: "I've been building BeastMoney to help organize budgets and financial planning." },
  { id: "backgammon", name: "Backgammon & Acey-Deucey", kind: "Game", goal: "App Store discovery", starter: "I released an iPhone game featuring Backgammon and Acey-Deucey. If you enjoy either game, you can look it up on the App Store." },
  { id: "news", name: "SEANGWORLD News", kind: "Publication", goal: "Qualified readers", destination: "https://www.seangworld.com", starter: "I've been publishing news and articles on SEANGWORLD. Take a look if you're interested." },
];
