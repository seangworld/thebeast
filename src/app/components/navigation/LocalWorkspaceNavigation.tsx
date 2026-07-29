"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, type KeyboardEvent } from "react";
import {
  isLocalWorkspaceNavigationActive,
  type LocalWorkspaceNavigationItem,
} from "@/lib/localWorkspaceNavigation";

export function LocalWorkspaceNavigation({
  label,
  items,
}: {
  label: string;
  items: readonly LocalWorkspaceNavigationItem[];
}) {
  const pathname = usePathname();
  const linksRef = useRef<Array<HTMLAnchorElement | null>>([]);

  function moveFocus(
    event: KeyboardEvent<HTMLAnchorElement>,
    currentIndex: number
  ) {
    let nextIndex: number | undefined;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % items.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + items.length) % items.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = items.length - 1;
    }

    if (nextIndex === undefined) return;
    event.preventDefault();
    linksRef.current[nextIndex]?.focus();
  }

  return (
    <nav
      aria-label={label}
      className="sticky top-2 z-20 max-w-full rounded-2xl border border-white/10 bg-[#10171f]/95 p-1.5 shadow-lg shadow-black/20 backdrop-blur"
      data-local-workspace-navigation="true"
    >
      <div
        className="max-w-full overflow-x-auto overscroll-x-contain"
        data-local-workspace-scroll="true"
      >
        <ul className="flex min-w-max items-center gap-1" role="list">
          {items.map((item, index) => {
            const active = isLocalWorkspaceNavigationActive(item, pathname);

            return (
              <li key={item.href}>
                <Link
                  ref={(node) => {
                    linksRef.current[index] = node;
                  }}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onKeyDown={(event) => moveFocus(event, index)}
                  className={`inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                    active
                      ? "bg-cyan-300 text-slate-950"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
