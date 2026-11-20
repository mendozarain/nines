import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api, isMissingEndpoint } from "~/lib/api";

export function useFetch<T>(path: string | null, options?: { fallback?: T; gracefulEmpty?: boolean }) {
  const gracefulEmpty = options?.gracefulEmpty ?? options?.fallback !== undefined;
  const fallbackRef = useRef(options?.fallback);
  fallbackRef.current = options?.fallback;

  const [data, setData] = useState<T | null>(() => options?.fallback ?? null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(path));

  const reload = useCallback(async () => {
    if (!path) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setData(await api<T>(path));
    } catch (caught) {
      if (gracefulEmpty && isMissingEndpoint(caught)) {
        setData(fallbackRef.current ?? null);
        setError("");
      } else {
        setError(caught instanceof ApiError ? caught.message : "Could not load this page.");
      }
    } finally {
      setLoading(false);
    }
  }, [path, gracefulEmpty]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload };
}
