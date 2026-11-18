"use client";

import { useCallback, useEffect, useState } from "react";
import { describeError } from "@/services/api/client";
import type { ApiMeta, ApiResult } from "@/types";

interface Settled<T> {
  key: string;
  result?: ApiResult<T>;
  error?: string;
}

export interface UseApiState<T> {
  data: T | undefined;
  meta: ApiMeta | undefined;
  /** No data yet — show a skeleton. */
  loading: boolean;
  /** Data is on screen but a newer request is in flight. */
  refreshing: boolean;
  error: string | undefined;
  refetch: () => void;
}

/**
 * Minimal data hook for the service layer.
 *
 * `key` identifies the request: when it changes the fetcher runs again. The
 * previous payload stays on screen while the next one loads, so controls such
 * as the demand input or the scenario switch never flash a skeleton.
 */
export function useApi<T>(key: string, fetcher: () => Promise<ApiResult<T>>): UseApiState<T> {
  const [settled, setSettled] = useState<Settled<T>>({ key: "" });
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${key}#${attempt}`;

  useEffect(() => {
    let cancelled = false;
    fetcher()
      .then((result) => {
        if (!cancelled) setSettled({ key: requestKey, result });
      })
      .catch((error: unknown) => {
        if (!cancelled) setSettled({ key: requestKey, error: describeError(error) });
      });
    return () => {
      cancelled = true;
    };
    // The fetcher is identified by `key`; re-running on every new closure would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const refetch = useCallback(() => setAttempt((n) => n + 1), []);
  const pending = settled.key !== requestKey;

  return {
    data: settled.result?.data,
    meta: settled.result?.meta,
    loading: pending && !settled.result,
    refreshing: pending && !!settled.result,
    error: pending ? undefined : settled.error,
    refetch,
  };
}
