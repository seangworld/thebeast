"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import LogoutButton from "@/app/components/LogoutButton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkUser() {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.replace("/login");
        return;
      }

      const seenKey = `beast_seen_${data.user.id}`;
      const hasSeenBefore = localStorage.getItem(seenKey) === "true";

      if (
        typeof window !== "undefined" &&
        typeof (window as any).gtag === "function"
      ) {
        (window as any).gtag("event", hasSeenBefore ? "beast_return" : "beast_signup", {
          event_category: "engagement",
          event_label: hasSeenBefore ? "Returning Beast User" : "New Beast User",
        });
      }

      localStorage.setItem(seenKey, "true");
      setChecking(false);
    }

    checkUser();
  }, [router]);

  if (checking) {
    return (
      <main className="beast-page flex min-h-screen items-center justify-center">
        <div className="beast-card">
          <p className="text-sm text-[#c7cfdb]">Loading The Beast...</p>
        </div>
      </main>
    );
  }

  return (
    <>
      

      {children}
    </>
  );
}