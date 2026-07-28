import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Release Notes | BeastOS",
  alternates: {
    canonical: "/release-notes",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ReleaseNotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
