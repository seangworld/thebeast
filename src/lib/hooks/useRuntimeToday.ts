"use client";

import { useEffect, useState } from "react";
import { getBeastRuntimeToday } from "@/lib/runtimeDate";

const REFRESH_INTERVAL_MS = 60 * 1000;

export function useRuntimeNow() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  return now;
}

export function useRuntimeToday() {
  const now = useRuntimeNow();

  return {
    now,
    today: getBeastRuntimeToday(now),
  };
}
