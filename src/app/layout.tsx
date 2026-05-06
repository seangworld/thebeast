import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <script async src="https://www.googletagmanager.com/gtag/js?id=G-YFRV4QJK04"></script>
<script
  dangerouslySetInnerHTML={{
    __html: `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-XXXXXXX');
    `,
  }}
/>
      <body>
        {/* TOP BANNER */}
        <div className="w-full bg-[#38bdf8] text-black text-center text-sm py-2 font-semibold">
          The Beast (Beta) — Free Financial Command System
        </div>

        {children}

        {/* GLOBAL FOOTER */}
        <footer className="mt-12 border-t border-[#2a3242] text-center text-sm text-[#7f8da3] py-6 space-y-2">
  <div>© {new Date().getFullYear()} seangworld.com</div>
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