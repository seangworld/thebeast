"use client";

import { type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Position = { left: number; top?: number; bottom?: number; width: number; maxHeight: number };

export function OverlayPopover({ label, children, width = 240, testId, triggerClassName = "" }: {
  label: string;
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

  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    window.dispatchEvent(new CustomEvent("money-popover-open", { detail: id }));
    const onOtherOpen = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) close();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !panelRef.current?.contains(target)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        buttonRef.current?.focus();
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
  }, [id, open]);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const update = () => {
      const rect = buttonRef.current!.getBoundingClientRect();
      const gutter = 8;
      const panelWidth = Math.min(width, window.innerWidth - gutter * 2);
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
      <button ref={buttonRef} type="button" className={`beast-button-secondary inline-flex max-w-full items-center gap-2 whitespace-nowrap ${triggerClassName}`} aria-haspopup="menu" aria-expanded={open} aria-controls={`${id}-panel`} onClick={() => setOpen((current) => !current)}>
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
