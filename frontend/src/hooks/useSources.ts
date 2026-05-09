"use client";

import { useCallback, useEffect, useState } from "react";
import { sourcesService } from "@/services/sourcesService";
import type { MonitoredSource } from "@/types";

interface UseSourcesResult {
  sources: MonitoredSource[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSources(): UseSourcesResult {
  const [sources, setSources] = useState<MonitoredSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await sourcesService.getAll();
      setSources(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { sources, isLoading, error, refetch: fetch };
}
