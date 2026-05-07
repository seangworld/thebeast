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

      if (
        typeof window !== "undefined" &&
        typeof (window as any).gtag === "function"
      ) {
        (window as any).gtag("event", "beast_session_start", {
          event_category: "engagement",
          event_label: "User Logged In",
        });
      }

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
      <div className="fixed right-4 top-12 z-50">
        <LogoutButton />
      </div>
      {children}
    </>
  );
}