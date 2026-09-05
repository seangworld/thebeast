import type { Metadata } from "next";
import { BeastAnalytics, BeastAnalyticsConsentControl } from "@/app/components/analytics/BeastAnalytics";
import { AdSensePlacement } from "@/app/components/ads/AdSensePlacement";
import { seangworldAdSenseClientId } from "@/lib/adsense";
import { externalResourceLinkProps } from "@/lib/platform/externalResources";
import {
  beastOSFooterLinks,
  beastOSProductionOrigin,
} from "@/lib/publicSeo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(beastOSProductionOrigin),
  title: "BeastOS | The Beast Platform",
  description:
    "BeastOS is the operating system connecting identity, permissions, memory, shared services, and every Beast application.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "BeastOS | The Beast Platform",
    description:
      "BeastOS is the operating system connecting identity, permissions, memory, shared services, and every Beast application.",
    url: beastOSProductionOrigin,
    siteName: "BeastOS",
    images: [
      {
        url: "/beast-head-icon.png",
        width: 512,
        height: 512,
        alt: "BeastOS icon",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BeastOS | The Beast Platform",
    description:
      "BeastOS is the operating system connecting identity, permissions, memory, shared services, and every Beast application.",
    images: ["/beast-head-icon.png"],
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
        <BeastAnalytics
          measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || ""}
          environmentName={process.env.VERCEL_ENV || process.env.NODE_ENV}
          configuredConsent={
            process.env.NEXT_PUBLIC_ANALYTICS_CONSENT_DEFAULT
          }
        />

        {process.env.NODE_ENV !== "production" && (
          <div className="mx-auto mt-2 max-w-full bg-[#fef3c7] px-3 py-1 text-center text-xs font-semibold text-[#92400e] sm:text-sm">
            DEV MODE — Connected to: {process.env.NEXT_PUBLIC_SUPABASE_URL ?? "<not configured>"}
          </div>
        )}

        {children}

        <footer className="mt-12 border-t border-[#2a3242] py-6 text-center text-sm text-[#7f8da3]">
          <div className="mx-auto mb-6 w-[min(1100px,calc(100%-32px))] rounded-xl border border-cyan-400/30 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(3,10,24,0.98))] p-5 text-left">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">SEANGWORLD flagship</div>
            <div className="mt-1 text-xl font-black text-white">SEANGWORLDNEWS</div>
            <div className="mt-1 text-sm leading-relaxed text-slate-300">Facts-first news from national coverage down toward local communities. Just the facts. No opinion. No BS.</div>
            <a {...externalResourceLinkProps} href="https://news.seangworld.com" className="mt-3 inline-block text-xs font-black uppercase tracking-[0.12em] text-cyan-300 hover:text-cyan-100">Read the News →</a>
          </div>
          <div className="space-y-2">
            <div className="font-semibold text-slate-300">The Beast · BeastOS is a SEANGWORLD flagship product.</div>
            <BeastAnalyticsConsentControl configuredConsent={process.env.NEXT_PUBLIC_ANALYTICS_CONSENT_DEFAULT} />
            <AdSensePlacement
              clientId={seangworldAdSenseClientId}
              slot={process.env.NEXT_PUBLIC_ADSENSE_FOOTER_SLOT || ""}
              environmentName={process.env.VERCEL_ENV || process.env.NODE_ENV}
              configuredConsent={
                process.env.NEXT_PUBLIC_ADSENSE_CONSENT_DEFAULT
              }
            />
            <div>© 2026 seangworld.com</div>
            <div>
              <a href={beastOSFooterLinks.developmentAi} className="hover:underline">Development AI</a>{" "}•{" "}
              <a href={beastOSFooterLinks.memberAi} className="hover:underline">Member AI</a>{" "}•{" "}
              <a {...externalResourceLinkProps} href={beastOSFooterLinks.mainSite} className="hover:underline">SEANGWORLD</a>{" "}•{" "}
              <a {...externalResourceLinkProps} href={beastOSFooterLinks.privacy} className="hover:underline">Privacy</a>{" "}•{" "}
              <a {...externalResourceLinkProps} href={beastOSFooterLinks.terms} className="hover:underline">Terms</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
