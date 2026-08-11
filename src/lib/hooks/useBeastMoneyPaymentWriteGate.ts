"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadBeastMoneyPaymentWriteStatus,
  type BeastMoneyPaymentWriteStatus,
} from "@/lib/beastMoneyPaymentWriteGate";
import { createClient } from "@/lib/supabase/client";

const initialStatus: BeastMoneyPaymentWriteStatus = {
  restricted: true,
  paymentsAvailable: false,
  acceptanceException: false,
};

export function useBeastMoneyPaymentWriteGate() {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setStatus(await loadBeastMoneyPaymentWriteStatus(createClient()));
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...status, loading, refresh };
}
