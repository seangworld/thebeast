"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DashboardCard,
  SectionHeader,
  type ModuleKey,
} from "@/app/components/design/DashboardPrimitives";
import { createClient } from "@/lib/supabase/client";
import { isBeastAdminOwnerRole } from "@/lib/beastAdmin";
import { buildCurrentAuthLoginPath } from "@/lib/auth/experience";

export function OwnerOnlyModuleGuard({
  module,
  applicationName,
  children,
}: {
  module: ModuleKey;
  applicationName: string;
  children: React.ReactNode;
}) {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function verifyOwner() {
      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;

        if (!userId) {
          router.replace(buildCurrentAuthLoginPath());
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle();

        if (!active) return;
        if (!isBeastAdminOwnerRole(profile?.role)) {
          router.replace("/dashboard");
          return;
        }
        setAuthorized(true);
      } finally {
        if (active) setChecking(false);
      }
    }

    void verifyOwner();
    return () => {
      active = false;
    };
  }, [router]);

  if (checking || !authorized) {
    return (
      <main className="beast-page">
        <div className="beast-container">
          <DashboardCard accent={module}>
            <SectionHeader
              eyebrow={applicationName}
              title="Checking owner access"
              description={`${applicationName} routes are protected for owner-only review.`}
            />
          </DashboardCard>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
