import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://thebeast.seangworld.com"),
  title: "The Beast",
  description:
    "BeastOS is a platform shell for money, planning, and future life operations modules.",
  openGraph: {
    title: "The Beast",
    description:
      "BeastOS is a platform shell for money, planning, and future life operations modules.",
    url: "https://thebeast.seangworld.com",
    siteName: "The Beast",
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
    title: "The Beast",
    description:
      "BeastOS is a platform shell for money, planning, and future life operations modules.",
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

        {process.env.NODE_ENV !== "production" && (
          <div className="mx-auto mt-2 max-w-full bg-[#fef3c7] px-3 py-1 text-center text-xs font-semibold text-[#92400e] sm:text-sm">
            DEV MODE — Connected to: {process.env.NEXT_PUBLIC_SUPABASE_URL ?? "<not configured>"}
          </div>
        )}

        {children}

        <footer className="mt-12 space-y-2 border-t border-[#2a3242] py-6 text-center text-sm text-[#7f8da3]">
          <div>© 2026 seangworld.com</div>
          <div>
            <a href="https://seangworld.com" className="hover:underline">
              Main Site
            </a>{" "}
            •{" "}
            <a
              href="https://seangworld.com/privacy.html"
              className="hover:underline"
            >
              Privacy
            </a>{" "}
            •{" "}
            <a
              href="https://seangworld.com/terms.html"
              className="hover:underline"
            >
              Terms
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
