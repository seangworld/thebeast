"use client";

import { useLayoutEffect, useRef, type MutableRefObject, type ReactNode } from "react";

export function NavigationScrollRegion({ positions, region, children }: {
  positions: MutableRefObject<Record<string, number>>;
  region: string;
  children: ReactNode;
}) {
  const element = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (element.current) element.current.scrollTop = positions.current[region] ?? 0;
  }, [positions, region]);
  return <div ref={element} className="min-h-0 flex-1 overflow-y-auto px-3 pb-4"
    data-beast-navigation
    onScroll={event => { positions.current[region] = event.currentTarget.scrollTop; }}>
    {children}
  </div>;
}
