"use client";

import { type ReactNode, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Position = { left: number; top?: number; bottom?: number; width: number; maxHeight: number };

export function OverlayPopover({ label, ariaLabel, children, width = 240, testId, triggerClassName = "" }: {
  label: string;
  ariaLabel?: string;
  children: (close: () => void) => ReactNode;
  width?: number;
  testId?: string;
  triggerClassName?: string;
}) {
  const id = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => buttonRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    window.dispatchEvent(new CustomEvent("money-popover-open", { detail: id }));
    const onOtherOpen = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      const items = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') || []
      );
      if (items.length === 0) return;
      const currentIndex = items.indexOf(document.activeElement as HTMLElement);
      let nextIndex: number | null = null;
      if (event.key === "ArrowDown") nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
      if (event.key === "ArrowUp") nextIndex = currentIndex < 0 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = items.length - 1;
      if (nextIndex !== null) {
        event.preventDefault();
        items[nextIndex]?.focus();
      }
    };
    window.addEventListener("money-popover-open", onOtherOpen);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("money-popover-open", onOtherOpen);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [close, id, open]);

  useEffect(() => {
    if (!open || !position) return;
    requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus();
    });
  }, [open, position]);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const update = () => {
      const rect = buttonRef.current!.getBoundingClientRect();
      const gutter = 8;
      const panelWidth = Math.min(width, window.innerWidth - gutter * 2);
      if (window.innerWidth <= 640) {
        setPosition({
          left: gutter,
          bottom: gutter,
          width: window.innerWidth - gutter * 2,
          maxHeight: Math.max(0, window.innerHeight - gutter * 2),
        });
        return;
      }
      const spaceBelow = window.innerHeight - rect.bottom - gutter;
      const spaceAbove = rect.top - gutter;
      const openAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(0, Math.min(320, openAbove ? spaceAbove : spaceBelow));
      setPosition({
        left: Math.max(gutter, Math.min(rect.left, window.innerWidth - panelWidth - gutter)),
        ...(openAbove
          ? { bottom: window.innerHeight - rect.top + gutter }
          : { top: rect.bottom + gutter }),
        width: panelWidth,
        maxHeight,
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, width]);

  return (
    <div className="inline-block max-w-full" data-overlay-popover={testId || "true"}>
      <button ref={buttonRef} type="button" className={`beast-button-secondary inline-flex max-w-full items-center gap-2 whitespace-nowrap ${triggerClassName}`} aria-label={ariaLabel} aria-haspopup="menu" aria-expanded={open} aria-controls={`${id}-panel`} onClick={() => setOpen((current) => !current)} onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          setOpen(true);
        }
      }}>
        <span className="min-w-0 flex-1 truncate">{label}</span><span className="shrink-0" aria-hidden="true">▾</span>
      </button>
      {open && position && createPortal(
        <div ref={panelRef} id={`${id}-panel`} role="menu" className="fixed z-[100] overflow-y-auto overflow-x-hidden rounded-lg border border-[#2a3242] bg-[#111827] p-2 text-left shadow-2xl" style={position} data-popover-overlay="true">
          {children(close)}
        </div>,
        document.body
      )}
    </div>
  );
}
