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
  beastSecurityNavigation,
  beastOSNavigation,
  buildApplicationNavigationForPersona,
  buildOwnerNavigationForPersona,
  findActiveExpandableModule,
  getBeastModuleNavigationForPersona,
  secondaryNavigation,
  sharedNavigation,
  toggleExpandedModule,
  type ModuleChildNavItem,
  type ModuleNavSection,
} from "@/lib/moduleNavigation";
import type { BeastMemberModuleAccessOverride } from "@/lib/moduleRegistry";
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
import { getBeastOSWorkspaceContext } from "@/lib/platform/identity";
import { buildAuthLoginPath } from "@/lib/auth/experience";
import { BEAST_ADMIN_MESSAGE_UNREAD_EVENT } from "@/lib/beastAdminMessaging";

const learningPrimaryNavigation: ModuleNavSection[] = [
  { label: "Guidance Counselor", href: "/dashboard/education/guidance-counselor", module: "learning" },
  { label: "Today", href: "/dashboard/today", module: "learning" },
  { label: "Educational Roadmap", href: "/dashboard/education/educational-roadmap", module: "learning" },
  { label: "Career Planning", href: "/dashboard/education/career-planning", module: "learning" },
  { label: "Schools", href: "/dashboard/education/schools", module: "learning" },
  { label: "Scholarships", href: "/dashboard/education/scholarships", module: "learning" },
  { label: "Certifications", href: "/dashboard/education/certifications", module: "learning" },
  { label: "Skills", href: "/dashboard/education/skills", module: "learning" },
  { label: "Reports", href: "/dashboard/education/reports", module: "learning" },
];

const learningSettingsNavigation: ModuleNavSection[] = [
  { label: "Messages", href: "/dashboard/messages", module: "beastos" },
  { label: "Personal Hub", href: "/dashboard/settings", module: "beastos" },
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

function getTopLevelModuleForWorkspace(module: ModuleKey): ModuleKey {
  return module === "calendar" ||
    module === "documents" ||
    module === "goals" ||
    module === "notifications" ||
    module === "search" ||
    module === "timeline"
    ? "beastos"
    : module;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [mobileOnline, setMobileOnline] = useState(true);
  const [locationHash, setLocationHash] = useState("");
  const [expandedModule, setExpandedModule] = useState<ModuleKey | null>(() =>
    getTopLevelModuleForWorkspace(getWorkspaceModule(pathname))
  );
  const [learningOnlyNavigation, setLearningOnlyNavigation] = useState(false);
  const [isAdminPersona, setIsAdminPersona] = useState(false);
  const [memberModuleAccess, setMemberModuleAccess] = useState<
    BeastMemberModuleAccessOverride[]
  >([]);
  const [adminViewMode, setAdminViewMode] = useState<AdminViewMode>(
    loadAdminViewMode
  );
  const [resolvingDashboardAccess, setResolvingDashboardAccess] = useState(true);
  const [dashboardGuardResolved, setDashboardGuardResolved] = useState(false);
  const [dashboardAccessError, setDashboardAccessError] = useState(false);
  const [adminMessageUnreadCount, setAdminMessageUnreadCount] = useState(0);
  const workspaceModule = getWorkspaceModule(pathname);
  const workspaceContext = getBeastOSWorkspaceContext(workspaceModule);
  const personaModuleNavigation = getBeastModuleNavigationForPersona(
    isAdminPersona,
    memberModuleAccess
  );
  const applicationNavigation = buildApplicationNavigationForPersona({
    isOwner: isAdminPersona,
    moduleAccess: memberModuleAccess,
  });
  const lifeModuleNavigation = [
    ...applicationNavigation,
    beastSecurityNavigation,
  ];
  const ownerNavigation = buildOwnerNavigationForPersona({
    isOwner: isAdminPersona,
  });
  const mobileNavigation = buildMobileNavigation({
    isOwner: isAdminPersona,
    learningOnly: learningOnlyNavigation,
    moduleAccess: memberModuleAccess,
  });
  const mobileRuntimeState = buildMobileRuntimeState({
    online: mobileOnline,
    degraded: resolvingDashboardAccess && dashboardGuardResolved,
  });
  const activeExpandableModule =
    findActiveExpandableModule(pathname, [
      beastOSNavigation,
      ...lifeModuleNavigation,
      ...ownerNavigation,
    ]) || getTopLevelModuleForWorkspace(workspaceModule);

  useEffect(() => {
    let active = true;
    async function loadAdminMessageUnreadCount() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc(
          "get_beast_admin_message_unread_count"
        );
        if (
          active &&
          !error &&
          typeof data === "number" &&
          Number.isInteger(data) &&
          data >= 0
        ) {
          setAdminMessageUnreadCount(data);
        }
      } catch {
        if (active) setAdminMessageUnreadCount(0);
      }
    }

    const refreshUnread = () => void loadAdminMessageUnreadCount();
    void loadAdminMessageUnreadCount();
    window.addEventListener(
      BEAST_ADMIN_MESSAGE_UNREAD_EVENT,
      refreshUnread
    );
    const interval = window.setInterval(refreshUnread, 60_000);
    return () => {
      active = false;
      window.removeEventListener(
        BEAST_ADMIN_MESSAGE_UNREAD_EVENT,
        refreshUnread
      );
      window.clearInterval(interval);
    };
  }, [pathname]);

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
    if (!activeExpandableModule) return;

    setExpandedModule(activeExpandableModule);
  }, [activeExpandableModule]);

  function handleExpandedModuleToggle(module: ModuleKey) {
    setExpandedModule((current) => toggleExpandedModule(current, module));
  }

  useEffect(() => {
    let active = true;
    setResolvingDashboardAccess(true);
    setDashboardAccessError(false);

    async function resolveDashboardAccess() {
      let supabase: ReturnType<typeof createClient>;

      try {
        supabase = createClient();
      } catch {
        if (active) {
          setDashboardAccessError(true);
          setResolvingDashboardAccess(false);
        }
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      const authUser = userData?.user;

      if (!active) return;

      if (userError || !authUser) {
        router.replace(
          buildAuthLoginPath(
            `${window.location.pathname}${window.location.search}${window.location.hash}`,
            userError ? "session_expired" : null
          )
        );
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authUser.id)
        .maybeSingle();

      if (!active) return;

      if (profileError || !profile) {
        setDashboardAccessError(true);
        setResolvingDashboardAccess(false);
        return;
      }

      const canUseBeastAdmin = canAccessBeastAdmin({
        role: profile.role,
        adminViewMode,
      });
      const { data: moduleAccessRows, error: moduleAccessError } = await supabase
        .from("beast_admin_member_module_access")
        .select("module_id,enabled")
        .eq("member_id", authUser.id);

      if (!active) return;

      const resolvedModuleAccess: BeastMemberModuleAccessOverride[] =
        moduleAccessError
          ? []
          : (moduleAccessRows || []).flatMap((row) =>
              (row.module_id === "money" || row.module_id === "learning") &&
              typeof row.enabled === "boolean"
                ? [
                    {
                      moduleId: row.module_id,
                      enabled: row.enabled,
                    },
                  ]
                : []
            );
      setMemberModuleAccess(resolvedModuleAccess);

      const currentModuleOverride = resolvedModuleAccess.find(
        (item) => item.moduleId === workspaceModule
      );
      if (
        !canUseBeastAdmin &&
        currentModuleOverride?.enabled === false
      ) {
        router.replace("/dashboard/today");
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

      if (pathname.startsWith("/dashboard/admin") && !canUseBeastAdmin) {
        router.replace("/dashboard");
        return;
      }

      setIsAdminPersona(canUseBeastAdmin);
      setLearningOnlyNavigation(
        useLearningOnlyNavigation &&
          !resolvedModuleAccess.some(
            (item) => item.moduleId === "learning" && !item.enabled
          )
      );
      setDashboardGuardResolved(true);

      if (
        useLearningOnlyNavigation &&
        isRestrictedForLearningOnlyNavigation(pathname)
      ) {
        router.replace("/dashboard/today");
        return;
      }

      setResolvingDashboardAccess(false);
    }

    resolveDashboardAccess();

    return () => {
      active = false;
    };
  }, [adminViewMode, pathname, router, workspaceModule]);

  if (dashboardAccessError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f1419] px-6">
        <div className="max-w-xl rounded-xl border border-red-300/30 bg-red-400/10 p-6 text-left">
          <p className="text-xs font-bold uppercase tracking-wide text-red-100">
            Dashboard unavailable
          </p>
          <h1 className="mt-3 text-2xl font-black text-white">
            We could not confirm your account access.
          </h1>
          <p className="mt-4 text-sm text-[#c7cfdb]">
            Refresh and try again. If the problem continues, contact Beast
            Administration.
          </p>
        </div>
      </div>
    );
  }

  const shouldShowDashboardGuardFallback =
    resolvingDashboardAccess &&
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

  function privateMessageUnreadCountForHref(href?: string) {
    if (
      (isAdminPersona && href === "/dashboard/admin/messages") ||
      (!isAdminPersona && href === "/dashboard/messages")
    ) {
      return adminMessageUnreadCount;
    }
    return 0;
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
    navigationOnly = false,
    onNavigate,
    controlIdPrefix = "desktop",
  }: {
    compact?: boolean;
    navigationOnly?: boolean;
    onNavigate?: () => void;
    controlIdPrefix?: string;
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
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {privateMessageUnreadCountForHref(item.href) > 0 ? (
            <span
              className="ml-2 rounded-full bg-red-300 px-1.5 py-0.5 text-[10px] font-black text-[#2b0b0b]"
              aria-label={`${privateMessageUnreadCountForHref(
                item.href
              )} unread private messages`}
            >
              {privateMessageUnreadCountForHref(item.href) > 99
                ? "99+"
                : privateMessageUnreadCountForHref(item.href)}
            </span>
          ) : null}
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
      const navGroupId = `${controlIdPrefix}-${item.module}-nav-group`;
      const primaryChildren =
        item.children?.filter(
          (child) =>
            !child.future &&
            !child.secondary &&
            !child.group &&
            !child.parent
        ) || [];
      const nestedChildren =
        item.children?.filter(
          (child) =>
            !child.future &&
            !child.secondary &&
            !child.group &&
            child.parent
        ) || [];
      function ChildBranch({
        child,
        depth = 0,
      }: {
        child: ModuleChildNavItem;
        depth?: number;
      }) {
        const descendants = nestedChildren.filter(
          (candidate) => candidate.parent === child.label
        );

        return (
          <div>
            <ChildLink item={child} module={item.module} />
            {descendants.length > 0 ? (
              <div
                className="ml-3 mt-1 space-y-1 border-l border-white/10 pl-2"
                data-navigation-depth={depth + 1}
              >
                {descendants.map((descendant) => (
                  <ChildBranch
                    key={descendant.label}
                    child={descendant}
                    depth={depth + 1}
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      }
      const groupedChildren =
        item.children?.filter(
          (child) => !child.future && !child.secondary && child.group
        ) || [];
      const childGroups = Array.from(
        new Set(groupedChildren.map((child) => child.group).filter(Boolean))
      );
      const handleModuleLabelNavigation = () => {
        if (hasChildren) {
          setExpandedModule(item.module);
        }
        onNavigate?.();
      };

      if (item.external && item.href) {
        return (
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onNavigate}
            title={compact ? `${item.label} (opens in a new tab)` : undefined}
            aria-label={compact ? `${item.label} (opens in a new tab)` : undefined}
            className="group flex w-full min-w-0 items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm font-bold text-[#c7cfdb] transition duration-200 hover:border-[#2a3242] hover:bg-[#1a1f2b] sm:px-4"
          >
            <span
              aria-hidden="true"
              className="flex h-4 w-4 shrink-0 items-center justify-center text-sm text-amber-300"
            >
              {item.icon || "▦"}
            </span>
            <span className={compact ? "sr-only lg:not-sr-only" : ""}>
              {item.label}
            </span>
            {!compact ? <span className="sr-only"> (opens in a new tab)</span> : null}
          </a>
        );
      }

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
              badgeCount={
                item.module === "admin" && isAdminPersona
                  ? adminMessageUnreadCount
                  : item.module === "beastos" && !isAdminPersona
                    ? adminMessageUnreadCount
                    : 0
              }
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
              onClick={handleModuleLabelNavigation}
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
              onClick={() => handleExpandedModuleToggle(item.module)}
              className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs text-[#7f8da3] transition hover:bg-[#0f1419] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1419]"
              aria-expanded={expanded}
              aria-controls={navGroupId}
              aria-label={`${expanded ? "Collapse" : "Expand"} ${item.label}`}
            >
              <span
                aria-hidden="true"
                className={`transition-transform duration-200 motion-reduce:transition-none ${
                  expanded ? "rotate-90" : ""
                }`}
              >
                ▶
              </span>
            </button>
          </div>

          <div
            id={navGroupId}
            aria-hidden={!expanded}
            className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${
              expanded
                ? "grid-rows-[1fr] opacity-100"
                : "pointer-events-none grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="mt-2 space-y-1 pl-4">
                {primaryChildren.map((child) => (
                  <ChildBranch key={child.label} child={child} />
                ))}
                {childGroups.map((group) => (
                  <div key={group} className="pt-2 first:pt-0">
                    <div className="px-3 text-[10px] font-bold uppercase tracking-wide text-[#596579]">
                      {group}
                    </div>
                    <div className="mt-1 space-y-1">
                      {groupedChildren
                        .filter((child) => child.group === group)
                        .map((child) => (
                          <ChildLink
                            key={child.label}
                            item={child}
                            module={item.module}
                          />
                        ))}
                    </div>
                  </div>
                ))}
                {item.children?.some((child) => child.secondary) ? (
                  <div className="pt-2">
                    <div className="px-3 text-[10px] font-bold uppercase tracking-wide text-[#596579]">
                      Supporting learning
                    </div>
                    <div className="mt-1 space-y-1">
                      {item.children
                        .filter((child) => child.secondary)
                        .map((child) => (
                          <ChildLink key={child.label} item={child} module={item.module} />
                        ))}
                    </div>
                  </div>
                ) : null}
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
            </div>
          </div>
        </div>
      );
    }

    function SecondaryNavigationLinks() {
      return (
        <nav
          className="space-y-2"
          aria-label="Relationships and about"
        >
          {!compact ? (
            <div className="px-2 text-xs font-bold uppercase tracking-wide text-[#596579]">
              Relationships &amp; about
            </div>
          ) : null}
          {secondaryNavigation.map((item) => (
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
      );
    }

    return (
      <div className="flex h-full min-h-0 flex-col">
        {!navigationOnly ? (
          <div className={compact ? "flex justify-center px-3 py-4" : "px-4 py-5"}>
            <BeastBrandMark
              module="beastos"
              subtitle={compact ? "" : workspaceContext}
              size="sm"
              iconOnly={compact}
            />
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          <div className="space-y-6">
            <nav className="space-y-2" aria-label="BeastOS platform">
              {!compact ? (
                <div className="px-2">
                  <div className="text-xs font-bold uppercase tracking-wide text-[#38bdf8]">
                    Platform
                  </div>
                  <p className="mt-1 text-[11px] font-semibold leading-4 text-[#596579]">
                    Shared identity and services
                  </p>
                </div>
              ) : null}
              {learningOnlyNavigation ? (
                learningPrimaryNavigation.map((item) => (
                  <div key={item.label} onClick={onNavigate}>
                    <ModuleNavItem
                      label={item.label}
                      href={item.href}
                      module={item.module}
                      active={item.href ? isActiveRoute(item.href) : false}
                      compact={compact}
                    />
                  </div>
                ))
              ) : (
                <ExpandableModuleNavItem item={beastOSNavigation} />
              )}
            </nav>

            {!learningOnlyNavigation ? (
              <>
                <div className="border-t border-[#2a3242]" />

                <nav className="space-y-2" aria-label="Life modules">
                  {!compact ? (
                    <div className="px-2">
                      <div className="text-xs font-bold uppercase tracking-wide text-[#596579]">
                        Life modules
                      </div>
                      <p className="mt-1 text-[11px] font-semibold leading-4 text-[#465266]">
                        Apps for the parts of life you manage
                      </p>
                    </div>
                  ) : null}
                  {lifeModuleNavigation.map((item) => (
                    <ExpandableModuleNavItem key={item.label} item={item} />
                  ))}
                </nav>

                <div className="border-t border-[#2a3242]" />

                <nav className="space-y-2" aria-label="Shared platform">
                  {!compact ? (
                    <div className="px-2">
                      <div className="text-xs font-bold uppercase tracking-wide text-[#596579]">
                        Shared platform
                      </div>
                      <p className="mt-1 text-[11px] font-semibold leading-4 text-[#465266]">
                        Resources used across Beast
                      </p>
                    </div>
                  ) : null}
                  {sharedNavigation.map((item) => (
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
                      badgeCount={
                        privateMessageUnreadCountForHref(item.href)
                      }
                    />
                    </div>
                  ))}
                </nav>
              </>
            ) : null}

          </div>
        </div>

        {navigationOnly ? (
          <div className="border-t border-[#2a3242] px-3 py-4">
            <SecondaryNavigationLinks />
          </div>
        ) : null}

        {!navigationOnly ? (
          <>
            <div className="border-t border-[#2a3242] px-3 py-4">
              <SecondaryNavigationLinks />
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
          </>
        ) : null}
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
            module="beastos"
            size="sm"
            subtitle={workspaceContext}
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
                  module="beastos"
                  size="sm"
                  subtitle="Platform navigation"
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
            <div className="mt-4 h-[min(60dvh,36rem)]">
              <NavRail
                navigationOnly
                onNavigate={() => setMobileMoreOpen(false)}
                controlIdPrefix="mobile"
              />
            </div>
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
