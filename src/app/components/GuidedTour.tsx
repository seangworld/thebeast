"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  beastEducationGuidedTour,
  beastGuidedTour,
  guidedTourStorageKey,
  shouldOfferGuidedTour,
  type GuidedTourDefinition,
  type GuidedTourProgress,
} from "@/lib/guidedOnboarding";

export const START_GUIDED_TOUR_EVENT = "beast:start-guided-tour";

function readProgress(key: string): GuidedTourProgress | null {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as GuidedTourProgress) : null;
  } catch {
    return null;
  }
}

function writeProgress(
  key: string,
  definition: GuidedTourDefinition,
  status: GuidedTourProgress["status"],
  step: number
) {
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({
        status,
        version: definition.version,
        step,
        updatedAt: new Date().toISOString(),
      } satisfies GuidedTourProgress)
    );
  } catch {
    // The tour remains usable when storage is disabled or full.
  }
}

function targetRect(selector?: string) {
  if (!selector) return null;
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) return null;
  element.scrollIntoView({ block: "center", behavior: "smooth" });
  const rect = element.getBoundingClientRect();
  return {
    left: Math.max(8, rect.left - 8),
    top: Math.max(8, rect.top - 8),
    width: Math.min(window.innerWidth - 16, rect.width + 16),
    height: Math.min(window.innerHeight - 16, rect.height + 16),
  };
}

export function GuidedTour({
  memberId,
  educationOnly = false,
}: {
  memberId: string;
  educationOnly?: boolean;
}) {
  const definition = educationOnly ? beastEducationGuidedTour : beastGuidedTour;
  const storageKey = guidedTourStorageKey(memberId, definition.id);
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<ReturnType<typeof targetRect>>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const step = definition.steps[stepIndex];

  useEffect(() => {
    const progress = readProgress(storageKey);
    if (!shouldOfferGuidedTour(progress, definition)) return;
    writeProgress(storageKey, definition, "offered", 0);
    const timer = window.setTimeout(() => setOpen(true), 700);
    return () => window.clearTimeout(timer);
  }, [definition, storageKey]);

  useEffect(() => {
    function start(event: Event) {
      const requested = (event as CustomEvent<{ tourId?: string }>).detail?.tourId;
      if (requested && requested !== definition.id) return;
      setStepIndex(0);
      setOpen(true);
    }
    window.addEventListener(START_GUIDED_TOUR_EVENT, start);
    return () => window.removeEventListener(START_GUIDED_TOUR_EVENT, start);
  }, [definition.id]);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    writeProgress(storageKey, definition, "started", stepIndex);
    const update = () => setRect(targetRect(step.target));
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    dialogRef.current?.focus();
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [definition, open, step.target, stepIndex, storageKey]);

  const position = useMemo(() => {
    if (!rect) return "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2";
    const placeBelow = rect.top + rect.height < window.innerHeight * 0.58;
    return placeBelow
      ? "left-1/2 bottom-5 -translate-x-1/2"
      : "left-1/2 top-5 -translate-x-1/2";
  }, [rect]);

  if (!open) return null;

  const last = stepIndex === definition.steps.length - 1;
  function close(status: "completed" | "skipped") {
    writeProgress(storageKey, definition, status, stepIndex);
    setOpen(false);
    window.requestAnimationFrame(() => restoreFocusRef.current?.focus());
  }

  function containFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close("skipped");
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;
    const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ));
    if (!controls.length) return;
    const first = controls[0];
    const lastControl = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      lastControl.focus();
    } else if (!event.shiftKey && document.activeElement === lastControl) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100]"
      role="presentation"
      onKeyDown={containFocus}
      data-guided-tour={definition.id}
    >
      <div className="absolute inset-0 bg-black/70" />
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-2xl border-2 border-cyan-300 shadow-[0_0_0_9999px_rgba(0,0,0,0.28),0_0_36px_rgba(103,232,249,0.42)] transition-all duration-200 motion-reduce:transition-none"
          style={rect}
          aria-hidden="true"
        />
      ) : null}
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guided-tour-title"
        aria-describedby="guided-tour-description"
        className={`fixed z-[101] w-[min(92vw,32rem)] rounded-3xl border border-cyan-300/30 bg-[#111827] p-5 shadow-2xl outline-none sm:p-6 ${position}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-200">
              {definition.title} · {stepIndex + 1} of {definition.steps.length}
            </p>
            <h2 id="guided-tour-title" className="mt-2 text-2xl font-black text-white">
              {step.title}
            </h2>
          </div>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-sm font-bold text-slate-300 hover:bg-white/10 hover:text-white"
            onClick={() => close("skipped")}
            data-analytics-event="workflow_completed"
            data-analytics-category="guided_tour"
            data-analytics-status="dismissed"
          >
            Skip
          </button>
        </div>
        <p id="guided-tour-description" className="mt-3 text-sm leading-6 text-slate-200">
          {step.description}
        </p>
        <div
          className="mt-5 h-2 overflow-hidden rounded-full bg-black/30"
          role="progressbar"
          aria-label="Tour progress"
          aria-valuemin={1}
          aria-valuemax={definition.steps.length}
          aria-valuenow={stepIndex + 1}
        >
          <div
            className="h-full rounded-full bg-cyan-300 transition-[width] motion-reduce:transition-none"
            style={{ width: `${((stepIndex + 1) / definition.steps.length) * 100}%` }}
          />
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            className="beast-button-secondary disabled:cursor-not-allowed disabled:opacity-40"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
          >
            Back
          </button>
          <button
            type="button"
            className="beast-button-primary"
            onClick={() =>
              last
                ? close("completed")
                : setStepIndex((current) => Math.min(definition.steps.length - 1, current + 1))
            }
            data-analytics-event={last ? "workflow_completed" : "call_to_action_selected"}
            data-analytics-category="guided_tour"
            data-analytics-status={last ? "completed" : "continued"}
          >
            {last ? "Finish" : step.actionLabel || "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function GuidedTourReplayButton({
  compact = false,
  tourId,
}: {
  compact?: boolean;
  tourId?: string;
}) {
  return (
    <button
      type="button"
      className={
        compact
          ? "w-full rounded-lg px-2 py-2 text-center text-xs font-bold text-cyan-200 hover:bg-white/10"
          : "w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-cyan-100 hover:bg-white/10"
      }
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent(START_GUIDED_TOUR_EVENT, { detail: { tourId } })
        )
      }
      data-analytics-event="call_to_action_selected"
      data-analytics-category="guided_tour"
      data-analytics-action="replay"
    >
      {compact ? "Tour" : "How to Use Beast / Take the Tour Again"}
    </button>
  );
}
