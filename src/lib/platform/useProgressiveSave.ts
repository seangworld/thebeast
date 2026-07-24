"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useProgressiveSave<T>({ value, save, delayMs = 700, enabled = true }: { value: T; save: (value: T) => Promise<void>; delayMs?: number; enabled?: boolean }) {
  const first = useRef(true);
  const timerRef = useRef<number>();
  const [status, setStatus] = useState<"idle" | "dirty" | "saving" | "saved" | "error">("idle");
  const [savedAt, setSavedAt] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();

  const saveNow = useCallback(async () => {
    if (!enabled) return false;
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    setStatus("saving");
    try {
      await save(value);
      setSavedAt(
        new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      );
      setErrorMessage(undefined);
      setStatus("saved");
      return true;
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Save failed — retry."
      );
      setStatus("error");
      return false;
    }
  }, [enabled, save, value]);

  useEffect(() => {
    if (!enabled) return;
    if (first.current) {
      first.current = false;
      return;
    }
    setStatus("dirty");
    timerRef.current = window.setTimeout(() => {
      timerRef.current = undefined;
      void saveNow();
    }, delayMs);
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }
    };
  }, [delayMs, enabled, saveNow]);

  return { status, savedAt, errorMessage, saveNow };
}
