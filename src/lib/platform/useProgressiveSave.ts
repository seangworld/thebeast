"use client";

import { useEffect, useRef, useState } from "react";

export function useProgressiveSave<T>({ value, save, delayMs = 700, enabled = true }: { value: T; save: (value: T) => Promise<void>; delayMs?: number; enabled?: boolean }) {
  const first = useRef(true);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedAt, setSavedAt] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!enabled) return;
    const timer = window.setTimeout(async () => {
      setStatus("saving");
      try { await save(value); setSavedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })); setErrorMessage(undefined); setStatus("saved"); }
      catch (error) { setErrorMessage(error instanceof Error ? error.message : "Unable to save changes."); setStatus("error"); }
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, enabled, save, value]);

  return { status, savedAt, errorMessage };
}
