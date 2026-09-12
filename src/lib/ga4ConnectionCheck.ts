export type Ga4ConnectionCheck = {
  checkedAt: string;
  status: "matched" | "mismatch" | "unavailable";
  message: string;
  streams: { label: string; measurementId: string; status: "found" | "missing" | "unavailable" }[];
};

// Public production baseline verified on 2026-09-12; update if the SW tag changes.
export const SEANGWORLD_NEWS_MEASUREMENT_ID = "G-YFRV4QJK04";
