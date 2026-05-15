import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://thebeast.seangworld.com"),
  title: "The Beast",
  description:
    "A financial execution system for paycheck planning, debt payoff, bill tracking, and cashflow control.",
  openGraph: {
    title: "The Beast",
    description:
      "A financial execution system for paycheck planning, debt payoff, bill tracking, and cashflow control.",
    url: "https://thebeast.seangworld.com",
    siteName: "The Beast",
    images: [
      {
        url: "/beast-logo-banner.png",
        width: 1200,
        height: 630,
        alt: "The Beast financial execution system",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Beast",
    description:
      "A financial execution system for paycheck planning, debt payoff, bill tracking, and cashflow control.",
    images: ["/beast-logo-banner.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-YFRV4QJK04"
          strategy="afterInteractive"
        />

        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-YFRV4QJK04');
          `}
        </Script>

        <div className="w-full bg-[#38bdf8] text-black text-center text-sm py-2 font-semibold">
          The Beast v1.3.0 Beta — Free Financial Command System
        </div>

        {children}

        <footer className="mt-12 border-t border-[#2a3242] text-center text-sm text-[#7f8da3] py-6 space-y-2">
          <div>© 2026 seangworld.com</div>
          <div>
            <a href="https://seangworld.com" className="hover:underline">
              Main Site
            </a>{" "}
            •{" "}
            <a href="https://seangworld.com/privacy.html" className="hover:underline">
              Privacy
            </a>{" "}
            •{" "}
            <a href="https://seangworld.com/terms.html" className="hover:underline">
              Terms
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}