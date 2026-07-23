"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { APP_VERSION_LABEL } from "@/lib/appVersion";
import LogoutButton from "@/app/components/LogoutButton";
import AdminViewAsControl from "@/app/components/AdminViewAsControl";
import { createClient } from "@/lib/supabase/client";
import {
  BeastBrandMark,
  ModuleNavItem,
  moduleAccents,
  type ModuleKey,
} from "@/app/components/design/DashboardPrimitives";
import {
  buildApplicationNavigationForPersona,
  buildOwnerNavigationForPersona,
  getBeastModuleNavigationForPersona,
  primaryNavigation,
  type ModuleChildNavItem,
  type ModuleNavSection,
} from "@/lib/moduleNavigation";
import { buildMobileNavigation } from "@/lib/mobileFoundation";
import { buildMobileRuntimeState } from "@/lib/mobileHardening";
import { isBeastMoneyNavigationActive } from "@/lib/moneyNavigation";
import { canAccessBeastAdmin } from "@/lib/beastAdmin";
import {
  ADMIN_VIEW_MODE_EVENT,
  ADMIN_VIEW_MODE_STORAGE_KEY,
  normalizeAdminViewMode,
  type AdminViewMode,
} from "@/lib/entitlements";
import {
  isRestrictedForLearningOnlyNavigation,
  shouldUseLearningOnlyNavigation,
} from "@/lib/learning/access";
import {
  getOnboardingRedirect,
  isLearningOnboardingComplete,
  loadLearningOnboardingDataStatus,
  profileOnboardingCompletionKeyColumn,
  shouldAttemptLearningOnboardingRepair,
} from "@/lib/learning/onboardingCompletion";

const learningPrimaryNavigation: ModuleNavSection[] = [
  { label: "Guidance Counselor", href: "/dashboard/education", module: "learning" },
  { label: "Today", href: "/dashboard/today", module: "learning" },
  { label: "Next Step", href: "/dashboard/education#mentor-session", module: "learning" },
  { label: "My Roadmap", href: "/dashboard/education#mentor-plan", module: "learning" },
  { label: "Progress", href: "/dashboard/education#mentor-progress", module: "learning" },
  { label: "Wins", href: "/dashboard/education#wins", module: "learning" },
  { label: "Profile", href: "/dashboard/profile", module: "beastos" },
];

const learningSettingsNavigation: ModuleNavSection[] = [
  { label: "Settings", href: "/dashboard/settings", module: "beastos" },
];

function loadAdminViewMode() {
  if (typeof window === "undefined") return "admin" as AdminViewMode;

  return normalizeAdminViewMode(
    window.localStorage.getItem(ADMIN_VIEW_MODE_STORAGE_KEY)
  );
}

function getWorkspaceModule(pathname: string): ModuleKey {
  if (pathname.startsWith("/dashboard/admin")) return "admin";
  if (pathname.startsWith("/dashboard/money")) return "money";
  if (pathname.startsWith("/dashboard/learning") || pathname.startsWith("/dashboard/education")) return "learning";
  if (pathname.startsWith("/dashboard/health")) return "health";
  if (pathname.startsWith("/dashboard/home")) return "home";
  if (pathname.startsWith("/dashboard/calendar")) return "calendar";
  if (pathname.startsWith("/dashboard/notifications")) return "notifications";
  if (pathname.startsWith("/dashboard/timeline")) return "timeline";
  if (pathname.startsWith("/dashboard/search")) return "search";
  if (pathname.startsWith("/dashboard/uploads")) return "documents";
  if (pathname.startsWith("/dashboard/goals")) return "goals";

  return "beastos";
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [mobileOnline, setMobileOnline] = useState(true);
  const [locationHash, setLocationHash] = useState("");
  const [expandedModule, setExpandedModule] = useState<ModuleKey | null>(null);
  const [learningOnlyNavigation, setLearningOnlyNavigation] = useState(false);
  const [isAdminPersona, setIsAdminPersona] = useState(false);
  const [adminViewMode, setAdminViewMode] = useState<AdminViewMode>(
    loadAdminViewMode
  );
  const [resolvingOnboarding, setResolvingOnboarding] = useState(true);
  const [dashboardGuardResolved, setDashboardGuardResolved] = useState(false);
  const [onboardingDiagnosticError, setOnboardingDiagnosticError] = useState("");
  const [onboardingRedirectDiagnostic, setOnboardingRedirectDiagnostic] = useState<{
    source: string;
    userId: string;
    reason: string;
    onboardingComplete: boolean | null;
    target: string;
  } | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const workspaceModule = getWorkspaceModule(pathname);
  const personaModuleNavigation = getBeastModuleNavigationForPersona(isAdminPersona);
  const applicationNavigation = buildApplicationNavigationForPersona({
    isOwner: isAdminPersona,
  });
  const ownerNavigation = buildOwnerNavigationForPersona({
    isOwner: isAdminPersona,
  });
  const mobileNavigation = buildMobileNavigation({
    isOwner: isAdminPersona,
    learningOnly: learningOnlyNavigation,
  });
  const mobileRuntimeState = buildMobileRuntimeState({
    online: mobileOnline,
    degraded: resolvingOnboarding && dashboardGuardResolved,
  });
  const onboardingPath = "/dashboard/onboarding";
  const activeExpandableModule =
    personaModuleNavigation.find(
      (item) => item.module === workspaceModule && item.children?.length
    )?.module || null;

  const [previousActiveExpandableModule, setPreviousActiveExpandableModule] =
    useState<ModuleKey | null>(null);

  useEffect(() => {
    const syncLocationHash = () => setLocationHash(window.location.hash);
    syncLocationHash();
    window.addEventListener("hashchange", syncLocationHash);
    window.addEventListener("popstate", syncLocationHash);
    return () => {
      window.removeEventListener("hashchange", syncLocationHash);
      window.removeEventListener("popstate", syncLocationHash);
    };
  }, [pathname]);

  useEffect(() => {
    function syncAdminViewMode() {
      setAdminViewMode(loadAdminViewMode());
    }

    window.addEventListener("storage", syncAdminViewMode);
    window.addEventListener(ADMIN_VIEW_MODE_EVENT, syncAdminViewMode);

    return () => {
      window.removeEventListener("storage", syncAdminViewMode);
      window.removeEventListener(ADMIN_VIEW_MODE_EVENT, syncAdminViewMode);
    };
  }, []);

  useEffect(() => {
    function syncOnlineState() {
      setMobileOnline(navigator.onLine);
    }

    syncOnlineState();
    window.addEventListener("online", syncOnlineState);
    window.addEventListener("offline", syncOnlineState);

    return () => {
      window.removeEventListener("online", syncOnlineState);
      window.removeEventListener("offline", syncOnlineState);
    };
  }, []);

  useEffect(() => {
    if (activeExpandableModule !== previousActiveExpandableModule) {
      setExpandedModule(activeExpandableModule);
      setPreviousActiveExpandableModule(activeExpandableModule);
    }
  }, [activeExpandableModule, previousActiveExpandableModule]);

  useEffect(() => {
    let active = true;
    setResolvingOnboarding(true);
    setOnboardingDiagnosticError("");
    setOnboardingRedirectDiagnostic(null);

    async function routeFirstTimeUsers() {
      let supabase: ReturnType<typeof createClient>;

      try {
        supabase = createClient();
      } catch {
        if (active) setResolvingOnboarding(false);
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      const authUser = userData?.user;

      if (!active) return;

      if (userError || !authUser) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, onboarding_complete")
        .eq(profileOnboardingCompletionKeyColumn, authUser.id)
        .maybeSingle();

      if (!active) return;

      console.info("BeastEducation onboarding profile completion read.", {
        userId: authUser.id,
        profileKeyColumn: profileOnboardingCompletionKeyColumn,
        rowFound: Boolean(profile),
        onboardingComplete: profile?.onboarding_complete ?? null,
        errorMessage: profileError?.message ?? null,
        errorCode: profileError?.code ?? null,
        errorDetails: profileError?.details ?? null,
      });

      if (profileError) {
        console.error("Unable to read onboarding completion profile.", {
          userId: authUser.id,
          message: profileError.message,
          code: profileError.code,
          details: profileError.details,
        });
        setOnboardingDiagnosticError(
          `BeastEducation could not read your account completion status. User ${authUser.id}. Supabase: ${profileError.message}`
        );
        setResolvingOnboarding(false);
        return;
      }

      if (!profile) {
        console.error("BeastEducation profile row is missing.", {
          userId: authUser.id,
          profileKeyColumn: profileOnboardingCompletionKeyColumn,
        });
        setOnboardingDiagnosticError(
          `BeastEducation could not find your account profile row. User ${authUser.id}. Expected public.profiles.${profileOnboardingCompletionKeyColumn} to match your authenticated user id.`
        );
        setResolvingOnboarding(false);
        return;
      }

      const completionKey = `beastlearning:onboarding-complete:${authUser.id}`;
      let onboardingComplete = isLearningOnboardingComplete({
        profileComplete: profile?.onboarding_complete,
        sessionComplete:
          typeof window !== "undefined" &&
          window.sessionStorage.getItem(completionKey) === "complete",
      });

      if (profile?.onboarding_complete && typeof window !== "undefined") {
        window.sessionStorage.setItem(completionKey, "complete");
      }

      if (!onboardingComplete) {
        const repairKey = `beastlearning:onboarding-repair:${authUser.id}`;
        const repairAlreadyAttempted =
          typeof window !== "undefined" &&
          window.sessionStorage.getItem(repairKey) === "attempted";
        const { status, error } = await loadLearningOnboardingDataStatus(
          supabase,
          authUser.id
        );

        if (!active) return;

        console.info("BeastEducation onboarding saved data status.", {
          userId: authUser.id,
          status,
          errorMessage:
            error && typeof error === "object" && "message" in error
              ? String(error.message)
              : error
                ? String(error)
                : null,
          repairAlreadyAttempted,
        });

        if (
          shouldAttemptLearningOnboardingRepair({
            onboardingComplete,
            status,
            statusError: error,
            repairAlreadyAttempted,
          })
        ) {
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(repairKey, "attempted");
          }

          const repairResult = await supabase
            .from("profiles")
            .update({ onboarding_complete: true })
            .eq(profileOnboardingCompletionKeyColumn, authUser.id)
            .select("id, onboarding_complete")
            .maybeSingle();

          if (!active) return;

          onboardingComplete = !repairResult.error && Boolean(repairResult.data);
          console.info("BeastEducation onboarding repair result.", {
            userId: authUser.id,
            profileKeyColumn: profileOnboardingCompletionKeyColumn,
            attempted: true,
            rowFound: Boolean(repairResult.data),
            onboardingComplete:
              repairResult.data?.onboarding_complete ?? null,
            errorMessage: repairResult.error?.message ?? null,
            errorCode: repairResult.error?.code ?? null,
            errorDetails: repairResult.error?.details ?? null,
          });
          if (onboardingComplete && typeof window !== "undefined") {
            window.sessionStorage.setItem(completionKey, "complete");
          }
          if (!onboardingComplete && repairResult.error) {
            console.error("Unable to repair BeastEducation onboarding completion.", {
              userId: authUser.id,
              message: repairResult.error.message,
              code: repairResult.error.code,
              details: repairResult.error.details,
            });
          }

          if (!onboardingComplete) {
            setOnboardingDiagnosticError(
              repairResult.error
                ? `BeastEducation could not repair your account completion status. User ${authUser.id}. Supabase: ${repairResult.error.message}`
                : `BeastEducation found saved setup data but could not update public.profiles.${profileOnboardingCompletionKeyColumn} for user ${authUser.id}.`
            );
            setResolvingOnboarding(false);
            return;
          }
        } else if (error) {
          setOnboardingDiagnosticError(
            `BeastEducation could not verify your saved setup data. User ${authUser.id}.`
          );
          setResolvingOnboarding(false);
          return;
        }
      }

      const onboardingRedirect = getOnboardingRedirect({
        isAuthenticated: true,
        onboardingComplete,
        pathname,
        onboardingPath,
      });

      if (onboardingRedirect) {
        if (onboardingRedirect === onboardingPath) {
          setOnboardingRedirectDiagnostic({
            source: "src/app/dashboard/layout.tsx",
            userId: authUser.id,
            reason:
              "Authoritative layout guard read public.profiles.onboarding_complete as false for a protected BeastEducation route.",
            onboardingComplete: profile.onboarding_complete ?? null,
            target: onboardingRedirect,
          });
          setResolvingOnboarding(false);
          return;
        }

        router.replace(onboardingRedirect);
        return;
      }

      const { data: learningProfiles } = await supabase
        .from("learning_profiles")
        .select("id, learner_role, learning_style")
        .eq("user_id", authUser.id)
        .limit(1);

      if (!active) return;

      const primaryLearningProfile = learningProfiles?.[0];

      const useLearningOnlyNavigation = shouldUseLearningOnlyNavigation({
        role: profile?.role,
        learnerRole: primaryLearningProfile?.learner_role,
        gradeLevel: primaryLearningProfile?.learning_style,
      });

      const canUseBeastAdmin = canAccessBeastAdmin({
        role: profile?.role,
        adminViewMode,
      });

      if (pathname.startsWith("/dashboard/admin") && !canUseBeastAdmin) {
        router.replace("/dashboard");
        return;
      }

      setIsAdminPersona(canUseBeastAdmin);
      setLearningOnlyNavigation(useLearningOnlyNavigation);
      setDashboardGuardResolved(true);

      if (
        useLearningOnlyNavigation &&
        isRestrictedForLearningOnlyNavigation(pathname)
      ) {
        router.replace("/dashboard/today");
        return;
      }

      setResolvingOnboarding(false);
    }

    routeFirstTimeUsers();

    return () => {
      active = false;
    };
  }, [adminViewMode, pathname, router]);

  if (onboardingDiagnosticError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f1419] px-6">
        <div className="max-w-xl rounded-xl border border-red-300/30 bg-red-400/10 p-6 text-left">
          <p className="text-xs font-bold uppercase tracking-wide text-red-100">
            BeastEducation setup needs attention
          </p>
          <h1 className="mt-3 text-2xl font-black text-white">
            We stopped before redirecting.
          </h1>
          <p className="mt-3 text-sm font-semibold text-red-100">
            {onboardingDiagnosticError}
          </p>
          <p className="mt-4 text-sm text-[#c7cfdb]">
            This prevents the Today and Learning Setup pages from looping while
            completion status is ambiguous.
          </p>
        </div>
      </div>
    );
  }

  if (onboardingRedirectDiagnostic) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f1419] px-6">
        <div className="max-w-xl rounded-xl border border-amber-300/30 bg-amber-400/10 p-6 text-left">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-100">
            BeastEducation setup redirect diagnostic
          </p>
          <h1 className="mt-3 text-2xl font-black text-white">
            Setup is required before continuing.
          </h1>
          <div className="mt-4 space-y-2 text-sm font-semibold text-amber-50">
            <p>Source: {onboardingRedirectDiagnostic.source}</p>
            <p>User: {onboardingRedirectDiagnostic.userId}</p>
            <p>Reason: {onboardingRedirectDiagnostic.reason}</p>
            <p>
              profiles.onboarding_complete:{" "}
              {String(onboardingRedirectDiagnostic.onboardingComplete)}
            </p>
          </div>
          <Link
            href={onboardingRedirectDiagnostic.target}
            className="mt-5 inline-flex rounded-lg bg-amber-200 px-4 py-2 text-sm font-black text-[#1b1300]"
          >
            Continue to Learning Setup
          </Link>
        </div>
      </div>
    );
  }

  const shouldShowDashboardGuardFallback =
    resolvingOnboarding &&
    (!dashboardGuardResolved ||
      (learningOnlyNavigation && isRestrictedForLearningOnlyNavigation(pathname)));

  if (shouldShowDashboardGuardFallback) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f1419] px-6 text-center">
        <div>
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#2a3242] border-t-indigo-300" />
          <p className="mt-4 text-sm font-semibold text-[#9aa7b8]">
            Opening your dashboard...
          </p>
        </div>
      </div>
    );
  }

  function isActiveRoute(href: string) {
    const [path] = href.split("#");

    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname === path || pathname.startsWith(`${path}/`);
  }

  function isModuleActive(item: ModuleNavSection) {
    return item.href ? isActiveRoute(item.href) : workspaceModule === item.module;
  }

  function isChildActive(item: ModuleChildNavItem) {
    if (item.href.startsWith("/dashboard/money")) {
      return isBeastMoneyNavigationActive(item, pathname, locationHash);
    }
    const [path, hash] = item.href.split("#");

    if (hash) return false;

    return path === "/dashboard" ? isActiveRoute(path) : pathname === path || pathname.startsWith(`${path}/`);
  }

  function MobileNavButton({ item }: { item: ReturnType<typeof buildMobileNavigation>["primary"][number] }) {
    const active = item.href === "#mobile-more" ? mobileMoreOpen : isActiveRoute(item.href);
    const accent = moduleAccents[item.module];
    const className = `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[11px] font-black transition ${
      active
        ? `${accent.border} ${accent.bg} ${accent.text}`
        : "border-transparent text-[#9aa7b8] hover:border-[#2a3242] hover:bg-[#1a1f2b] hover:text-white"
    }`;

    if (item.href === "#mobile-more") {
      return (
        <button
          type="button"
          className={className}
          onClick={() => setMobileMoreOpen(true)}
          aria-expanded={mobileMoreOpen}
          aria-controls="beast-mobile-more-sheet"
          aria-label="Open more mobile destinations"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: active ? accent.color : "#596579" }}
          />
          <span className="truncate">{item.label}</span>
        </button>
      );
    }

    return (
      <Link href={item.href} className={className} aria-current={active ? "page" : undefined}>
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: active ? accent.color : "#596579" }}
        />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  }

  function NavRail({
    compact = false,
    onNavigate,
  }: {
    compact?: boolean;
    onNavigate?: () => void;
  }) {
    function ChildLink({
      item,
      module,
    }: {
      item: ModuleChildNavItem;
      module: ModuleKey;
    }) {
      const accent = moduleAccents[module];
      const active = isChildActive(item);

      return (
        <Link
          href={item.href}
          onClick={onNavigate}
          className={`block rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
            active
              ? `${accent.border} ${accent.bg} ${accent.text}`
              : "border-transparent text-[#9aa7b8] hover:border-[#2a3242] hover:bg-[#1a1f2b] hover:text-white"
          }`}
        >
          {item.label}
        </Link>
      );
    }

    function ExpandableModuleNavItem({ item }: { item: ModuleNavSection }) {
      const hasChildren = Boolean(item.children?.length);
      const active = isModuleActive(item);
      const expanded =
        !compact &&
        hasChildren &&
        expandedModule === item.module;
      const navGroupId = `${item.module}-nav-group`;

      if (compact || !hasChildren) {
        return (
          <div onClick={item.comingSoon ? undefined : onNavigate}>
            <ModuleNavItem
              label={item.label}
              href={item.href}
              module={item.module}
              active={active}
              comingSoon={item.comingSoon}
              compact={compact}
            />
          </div>
        );
      }

      return (
        <div>
          <div
            className={`group flex w-full shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border text-sm font-bold transition duration-200 ${
              active
                ? `${moduleAccents[item.module].border} ${moduleAccents[item.module].bg} ${moduleAccents[item.module].text}`
                : "border-transparent text-[#c7cfdb] hover:border-[#2a3242] hover:bg-[#1a1f2b]"
            }`}
          >
            <Link
              href={item.href || "#"}
              onClick={onNavigate}
              className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 sm:px-4"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  background: active
                    ? moduleAccents[item.module].color
                    : "#596579",
                }}
              />
              <span className="truncate text-left">{item.label}</span>
            </Link>
            <button
              type="button"
              onClick={() =>
                setExpandedModule((current) =>
                  current === item.module ? null : item.module
                )
              }
              className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs text-[#7f8da3] transition hover:bg-[#0f1419] hover:text-white"
              aria-expanded={expanded}
              aria-controls={navGroupId}
              aria-label={`${expanded ? "Collapse" : "Expand"} ${item.label}`}
            >
              {expanded ? "−" : "+"}
            </button>
          </div>

          {expanded ? (
            <div id={navGroupId} className="mt-2 space-y-1 pl-4">
              {item.children?.filter((child) => !child.future).map((child) => (
                <ChildLink key={child.label} item={child} module={item.module} />
              ))}
              {item.children?.some((child) => child.future) ? (
                <div className="pt-2">
                  <div className="px-3 text-[10px] font-bold uppercase tracking-wide text-[#596579]">
                    Future
                  </div>
                  <div className="mt-1 space-y-1">
                    {item.children
                      .filter((child) => child.future)
                      .map((child) => (
                        <span
                          key={child.label}
                          className="block rounded-lg border border-transparent px-3 py-1.5 text-sm font-semibold text-[#596579]"
                        >
                          {child.label}
                        </span>
                      ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className={compact ? "flex justify-center px-3 py-4" : "px-4 py-5"}>
          <BeastBrandMark
            module={workspaceModule}
            subtitle={compact ? "" : "Platform Shell"}
            size="sm"
            iconOnly={compact}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          <div className="space-y-6">
            <nav className="space-y-2" aria-label="Primary navigation">
              {!compact ? (
                <div className="px-2 text-xs font-bold uppercase tracking-wide text-[#596579]">
                  BeastOS
                </div>
              ) : null}
              {(learningOnlyNavigation ? learningPrimaryNavigation : primaryNavigation).map((item) => (
                <div key={item.label} onClick={onNavigate}>
                  <ModuleNavItem
                    label={item.label}
                    href={item.href}
                    module={item.module}
                    active={item.href ? isActiveRoute(item.href) : false}
                    compact={compact}
                  />
                </div>
              ))}
            </nav>

            {!learningOnlyNavigation ? (
              <>
                <div className="border-t border-[#2a3242]" />

                <nav className="space-y-2" aria-label="Applications">
                  {!compact ? (
                    <div className="px-2 text-xs font-bold uppercase tracking-wide text-[#596579]">
                      Applications
                    </div>
                  ) : null}
                  {applicationNavigation.map((item) => (
                    <ExpandableModuleNavItem key={item.label} item={item} />
                  ))}
                </nav>
              </>
            ) : null}

            {ownerNavigation.length > 0 && !learningOnlyNavigation ? (
              <>
                <div className="border-t border-[#2a3242]" />

                <nav className="space-y-2" aria-label="Owner">
                  {!compact ? (
                    <div className="px-2 text-xs font-bold uppercase tracking-wide text-[#596579]">
                      Owner
                    </div>
                  ) : null}
                  {ownerNavigation.map((item) => (
                    <ExpandableModuleNavItem key={item.label} item={item} />
                  ))}
                </nav>
              </>
            ) : null}

            {learningOnlyNavigation ? (
              <>
                <div className="border-t border-[#2a3242]" />

                <nav className="space-y-2" aria-label="Shared navigation">
                  {!compact ? (
                    <div className="px-2 text-xs font-bold uppercase tracking-wide text-[#596579]">
                      BeastOS
                    </div>
                  ) : null}
                  {learningSettingsNavigation.map((item) => (
                    <div key={item.label} onClick={onNavigate}>
                      <ModuleNavItem
                        label={item.label}
                        href={item.href}
                        module={item.module}
                        active={item.href ? isActiveRoute(item.href) : false}
                        compact={compact}
                      />
                    </div>
                  ))}
                </nav>
              </>
            ) : null}
          </div>
        </div>

        <AdminViewAsControl compact={compact} surface="sidebar" />

        <div className="border-t border-[#2a3242] p-3">
          <div className="space-y-2">
            <div className={compact ? "[&>button]:w-full [&>button]:px-2" : "[&>button]:w-full"}>
              <LogoutButton />
            </div>
            {!compact ? (
              <a
                href="/release-notes"
                className="block px-1 text-xs font-semibold text-[#7c8798] transition hover:text-white"
              >
                {APP_VERSION_LABEL}
              </a>
            ) : (
              <a
                href="/release-notes"
                className="block text-center text-[10px] font-bold text-[#7c8798]"
                aria-label={APP_VERSION_LABEL}
              >
                v
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-w-0 bg-[#11151c] text-white">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-20 border-r border-[#2a3242] bg-[#0f1419]/98 backdrop-blur md:block lg:w-72">
        <div className="hidden h-full lg:block">
          <NavRail />
        </div>
        <div className="h-full lg:hidden">
          <NavRail compact />
        </div>
      </aside>

      <header className="sticky top-0 z-50 border-b border-[#2a3242] bg-[#11151c]/95 px-3 pb-3 pt-[calc(env(safe-area-inset-top)+12px)] backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-3">
          <BeastBrandMark
            module={workspaceModule}
            size="sm"
            subtitle="Mobile"
          />
          <Link
            href="/dashboard/search"
            className="rounded-xl border border-[#2a3242] bg-[#0f1419] px-3 py-2 text-sm font-bold text-[#c7cfdb]"
          >
            Search
          </Link>
        </div>
        {mobileRuntimeState.banner ? (
          <div
            className="mt-3 rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-left"
            role="status"
            aria-live="polite"
            data-mobile-analytics-event="beast_mobile_runtime_state_visible"
            data-mobile-runtime-state={mobileRuntimeState.banner.kind.toLowerCase()}
          >
            <div className="text-xs font-black uppercase text-amber-100">
              {mobileRuntimeState.banner.title}
            </div>
            <p className="mt-1 text-xs font-semibold leading-5 text-amber-50">
              {mobileRuntimeState.banner.recoveryAction}
            </p>
          </div>
        ) : null}
      </header>

      {mobileMoreOpen ? (
        <div className="fixed inset-0 z-[60] md:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close mobile navigation"
            onClick={() => setMobileMoreOpen(false)}
          />
          <div
            id="beast-mobile-more-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="beast-mobile-more-title"
            className="absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-y-auto rounded-t-2xl border border-[#2a3242] bg-[#0f1419] px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 shadow-2xl"
            data-mobile-analytics-event="beast_mobile_nav_open"
            data-mobile-hardening="more-sheet"
            data-mobile-release-readiness="bf-mob-009"
          >
            <div className="flex items-center justify-between border-b border-[#2a3242] px-4 py-3">
              <div id="beast-mobile-more-title">
                <BeastBrandMark
                  module={workspaceModule}
                  size="sm"
                />
              </div>
              <button
                type="button"
                onClick={() => setMobileMoreOpen(false)}
                className="rounded-lg border border-[#2a3242] px-3 py-2 text-sm font-bold text-[#c7cfdb]"
              >
                Close
              </button>
            </div>
            <nav className="mt-4 grid gap-2" aria-label="More mobile destinations">
              {mobileNavigation.more.map((item) => (
                <Link
                  key={`${item.label}-${item.href}`}
                  href={item.href}
                  onClick={() => setMobileMoreOpen(false)}
                  className="flex min-h-[48px] items-center justify-between gap-3 rounded-xl border border-[#2a3242] bg-[#111827] px-4 py-3 text-sm font-bold text-white"
                >
                  <span className="min-w-0 truncate">{item.label}</span>
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: moduleAccents[item.module].color }}
                  />
                </Link>
              ))}
            </nav>
            <div className="mt-4 border-t border-[#2a3242] pt-4">
              <AdminViewAsControl surface="sidebar" />
            </div>
          </div>
        </div>
      ) : null}

      <div className="min-h-screen min-w-0 max-w-full pb-[calc(env(safe-area-inset-bottom)+76px)] md:pb-0 md:pl-20 lg:pl-72">
        {children}
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[#2a3242] bg-[#0f1419]/98 px-2 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 backdrop-blur md:hidden"
        aria-label="Mobile navigation"
        data-mobile-analytics-event="beast_mobile_route_open"
        data-mobile-hardening="bottom-navigation"
        data-mobile-release-readiness="bf-mob-009"
      >
        <div className="mx-auto flex max-w-md gap-1">
          {mobileNavigation.primary.map((item) => (
            <MobileNavButton key={item.label} item={item} />
          ))}
        </div>
      </nav>
    </div>
  );
}
