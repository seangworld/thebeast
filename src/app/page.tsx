"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    async function routeUser() {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();

      if (data.user) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }

    routeUser();
  }, [router]);

  return (
    <main className="beast-page flex min-h-screen items-center justify-center">
      <div className="beast-card">
        <p className="text-sm text-[#c7cfdb]">Loading The Beast...</p>
      </div>
    </main>
  );
}