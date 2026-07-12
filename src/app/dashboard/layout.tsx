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
  getBeastModuleNavigationForPersona,
  type ModuleChildNavItem,
  type ModuleNavSection,
} from "@/lib/moduleNavigation";
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
  { label: "Home", href: "/dashboard/learning", module: "learning" },
  { label: "Today", href: "/dashboard/today", module: "learning" },
  { label: "Continue Learning", href: "/dashboard/learning/activities", module: "learning" },
  { label: "Learning Path", href: "/dashboard/learning#learning-path", module: "learning" },
  { label: "Progress", href: "/dashboard/learning#progress", module: "learning" },
  { label: "Achievements", href: "/dashboard/learning#achievements", module: "learning" },
  { label: "Profile", href: "/dashboard/profile", module: "beastos" },
];

const learningSettingsNavigation: ModuleNavSection[] = [
  { label: "Settings", href: "/dashboard/settings", module: "beastos" },
];

const platformPrimaryNavigation: ModuleNavSection[] = [
  { label: "Profile", href: "/dashboard/profile", module: "beastos" },
  { label: "Home", href: "/dashboard", module: "beastos" },
  { label: "Today", href: "/dashboard/today", module: "beastos" },
  { label: "Search", href: "/dashboard/search", module: "search" },
  { label: "Notifications", href: "/dashboard/notifications", module: "notifications" },
];

const platformSharedNavigation: ModuleNavSection[] = [
  { label: "Calendar", href: "/dashboard/calendar", module: "calendar" },
  { label: "Timeline", href: "/dashboard/timeline", module: "timeline" },
  { label: "Upload Center", href: "/dashboard/uploads", module: "documents" },
  { label: "Settings", href: "/dashboard/settings", module: "beastos" },
];

const memberPlatformSharedNavigation: ModuleNavSection[] = platformSharedNavigation.filter(
  (item) => item.label !== "Upload Center"
);

function getWorkspaceModule(pathname: string): ModuleKey {
  if (pathname.startsWith("/dashboard/money")) return "money";
  if (pathname.startsWith("/dashboard/learning")) return "learning";
  if (pathname.startsWith("/dashboard/calendar")) return "calendar";
  if (pathname.startsWith("/dashboard/notifications")) return "notifications";
  if (pathname.startsWith("/dashboard/timeline")) return "timeline";
  if (pathname.startsWith("/dashboard/search")) return "search";
  if (pathname.startsWith("/dashboard/uploads")) return "documents";

  return "beastos";
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedModule, setExpandedModule] = useState<ModuleKey | null>(null);
  const [learningOnlyNavigation, setLearningOnlyNavigation] = useState(false);
  const [isAdminPersona, setIsAdminPersona] = useState(false);
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
  const onboardingPath = "/dashboard/onboarding";
  const activeExpandableModule =
    personaModuleNavigation.find(
      (item) => item.module === workspaceModule && item.children?.length
    )?.module || null;

  useEffect(() => {
    setExpandedModule(activeExpandableModule);
  }, [activeExpandableModule]);

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

      console.info("BeastLearning onboarding profile completion read.", {
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
          `BeastLearning could not read your account completion status. User ${authUser.id}. Supabase: ${profileError.message}`
        );
        setResolvingOnboarding(false);
        return;
      }

      if (!profile) {
        console.error("BeastLearning profile row is missing.", {
          userId: authUser.id,
          profileKeyColumn: profileOnboardingCompletionKeyColumn,
        });
        setOnboardingDiagnosticError(
          `BeastLearning could not find your account profile row. User ${authUser.id}. Expected public.profiles.${profileOnboardingCompletionKeyColumn} to match your authenticated user id.`
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

        console.info("BeastLearning onboarding saved data status.", {
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
          console.info("BeastLearning onboarding repair result.", {
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
            console.error("Unable to repair BeastLearning onboarding completion.", {
              userId: authUser.id,
              message: repairResult.error.message,
              code: repairResult.error.code,
              details: repairResult.error.details,
            });
          }

          if (!onboardingComplete) {
            setOnboardingDiagnosticError(
              repairResult.error
                ? `BeastLearning could not repair your account completion status. User ${authUser.id}. Supabase: ${repairResult.error.message}`
                : `BeastLearning found saved setup data but could not update public.profiles.${profileOnboardingCompletionKeyColumn} for user ${authUser.id}.`
            );
            setResolvingOnboarding(false);
            return;
          }
        } else if (error) {
          setOnboardingDiagnosticError(
            `BeastLearning could not verify your saved setup data. User ${authUser.id}.`
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
              "Authoritative layout guard read public.profiles.onboarding_complete as false for a protected BeastLearning route.",
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

      setIsAdminPersona(profile?.role === "admin");
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
  }, [pathname, router]);

  if (onboardingDiagnosticError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f1419] px-6">
        <div className="max-w-xl rounded-xl border border-red-300/30 bg-red-400/10 p-6 text-left">
          <p className="text-xs font-bold uppercase tracking-wide text-red-100">
            BeastLearning setup needs attention
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
            BeastLearning setup redirect diagnostic
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
    const [path, hash] = item.href.split("#");

    if (hash) return false;

    return path === "/dashboard" ? isActiveRoute(path) : pathname === path || pathname.startsWith(`${path}/`);
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
        (expandedModule ? expandedModule === item.module : active);
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
          <button
            type="button"
            onClick={() =>
              setExpandedModule((current) =>
                current === item.module && !active ? null : item.module
              )
            }
            className={`group flex w-full shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-bold transition duration-200 sm:px-4 ${
              active
                ? `${moduleAccents[item.module].border} ${moduleAccents[item.module].bg} ${moduleAccents[item.module].text}`
                : "border-transparent text-[#c7cfdb] hover:border-[#2a3242] hover:bg-[#1a1f2b]"
            }`}
            aria-expanded={expanded}
            aria-controls={navGroupId}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{
                background: active ? moduleAccents[item.module].color : "#596579",
              }}
            />
            <span className="flex-1 text-left">{item.label}</span>
            <span className="text-xs text-[#7f8da3]">
              {expanded ? "−" : "+"}
            </span>
          </button>

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
                  Navigation
                </div>
              ) : null}
              {(learningOnlyNavigation ? learningPrimaryNavigation : platformPrimaryNavigation).map((item) => (
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

                <nav className="space-y-2" aria-label="BeastOS modules">
                  {!compact ? (
                    <div className="px-2 text-xs font-bold uppercase tracking-wide text-[#596579]">
                      Beast Modules
                    </div>
                  ) : null}
                  {personaModuleNavigation.map((item) => (
                    <ExpandableModuleNavItem key={item.label} item={item} />
                  ))}
                </nav>
              </>
            ) : null}

            <div className="border-t border-[#2a3242]" />

            <nav className="space-y-2" aria-label="Shared navigation">
              {!compact ? (
                <div className="px-2 text-xs font-bold uppercase tracking-wide text-[#596579]">
                  Shared
                </div>
              ) : null}
              {(learningOnlyNavigation
                ? learningSettingsNavigation
                : isAdminPersona
                  ? platformSharedNavigation
                  : memberPlatformSharedNavigation
              ).map((item) => (
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
    <div className="min-h-screen bg-[#11151c] text-white">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-20 border-r border-[#2a3242] bg-[#0f1419]/98 backdrop-blur md:block lg:w-72">
        <div className="hidden h-full lg:block">
          <NavRail />
        </div>
        <div className="h-full lg:hidden">
          <NavRail compact />
        </div>
      </aside>

      <header className="sticky top-0 z-50 border-b border-[#2a3242] bg-[#11151c]/95 px-3 py-3 backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-3">
          <BeastBrandMark
            module={workspaceModule}
            size="sm"
          />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-xl border border-[#2a3242] bg-[#0f1419] px-3 py-2 text-sm font-bold text-[#c7cfdb]"
            aria-label="Open navigation menu"
          >
            Menu
          </button>
        </div>
      </header>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close navigation menu"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative h-full w-[min(86vw,330px)] border-r border-[#2a3242] bg-[#0f1419] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2a3242] px-4 py-3">
              <BeastBrandMark
                module={workspaceModule}
                size="sm"
              />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg border border-[#2a3242] px-3 py-2 text-sm font-bold text-[#c7cfdb]"
              >
                Close
              </button>
            </div>
            <NavRail onNavigate={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="min-h-screen md:pl-20 lg:pl-72">
        {children}
      </div>
    </div>
  );
}
