import type { Metadata } from "next";
import { HomeRedirect } from "./HomeRedirect";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function HomePage() {
  return <HomeRedirect />;
}
