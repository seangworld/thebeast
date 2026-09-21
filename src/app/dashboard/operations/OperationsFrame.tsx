"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import LogoutButton from "@/app/components/LogoutButton";
import { operationsLinks, isOperationsLinkActive } from "@/lib/operationsNavigation";

function OperationsNavigation({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
    return <nav aria-label="SEANGWORLD HQ" className="space-y-6">
      {["Owner", "Ventures", "Shared services"].map((group) => <div key={group}>
        <p className="mb-2 px-3 text-xs font-bold uppercase tracking-widest text-slate-500">{group}</p>
        <div className="space-y-1">{operationsLinks.filter((item) => item.group === group).map((item) => {
          const active = isOperationsLinkActive(pathname, item.href);
          const NavigationLink = item.href === "/dashboard/operations/atlas" ? "a" : Link;
          return <NavigationLink key={item.href} href={item.href} onClick={() => onNavigate()} aria-current={active ? "page" : undefined} className={`block min-h-11 rounded-xl px-3 py-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 ${active ? "bg-cyan-300/10 text-cyan-200" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}>{item.label}</NavigationLink>;
        })}</div>
      </div>)}
    </nav>;
  }

export function OperationsFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { setMenuOpen(false); }, [pathname]);



  return <div className="beast-app-shell min-h-screen bg-[#0b111b] text-white" data-beast-module="admin">
    <a href="#operations-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-slate-900 focus:p-4">Skip to content</a>
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-white/10 bg-[#0d1522] lg:flex">
      <Link href="/dashboard/operations" className="px-6 py-7"><span className="block text-sm font-bold tracking-[0.18em] text-cyan-200">SEANGWORLD</span><span className="mt-1 block text-2xl font-bold">HQ</span><span className="mt-1 block text-xs font-semibold uppercase tracking-widest text-slate-500">Company headquarters</span></Link>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6"><OperationsNavigation pathname={pathname} onNavigate={() => setMenuOpen(false)} /></div>
      <div className="space-y-2 border-t border-white/10 p-4">
        <Link href="/dashboard/admin" className="block min-h-11 rounded-lg px-3 py-3 text-sm font-semibold text-slate-300 hover:bg-white/5">BeastAdmin</Link>
        <Link href="/dashboard/today" className="block min-h-11 rounded-lg px-3 py-3 text-sm font-semibold text-slate-300 hover:bg-white/5">Open The Beast</Link>
        <LogoutButton />
      </div>
    </aside>
    <div className="min-w-0 lg:pl-64">
      <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0b111b]/95 px-4 py-4 backdrop-blur sm:px-6">
        <div><p className="text-sm font-bold text-cyan-200 lg:hidden">SEANGWORLD HQ</p><p className="text-sm text-slate-400">Company headquarters <span className="mx-2 text-slate-600">/</span> Powered by BeastFusion</p></div>
        <div className="flex items-center gap-3"><Link href="/dashboard/admin" className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/5">BeastAdmin</Link><button type="button" className="min-h-11 rounded-lg border border-white/15 px-3 text-sm font-bold lg:hidden" aria-expanded={menuOpen} aria-controls="operations-mobile-menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? "Close menu" : "Menu"}</button></div>
      </header>
      {menuOpen && <div id="operations-mobile-menu" className="max-h-[70dvh] overflow-y-auto border-b border-white/10 bg-[#0d1522] p-4 lg:hidden"><OperationsNavigation pathname={pathname} onNavigate={() => setMenuOpen(false)} /><Link href="/dashboard/today" className="mt-4 block px-3 py-3 text-sm text-cyan-200">Open The Beast</Link><LogoutButton /></div>}
      <div id="operations-content" tabIndex={-1} className="min-w-0 pb-[env(safe-area-inset-bottom)]">{children}</div>
    </div>
  </div>;
}
