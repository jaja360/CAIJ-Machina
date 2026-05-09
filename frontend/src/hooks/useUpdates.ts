"use client";

import { useCallback, useEffect, useState } from "react";
import { updatesService } from "@/services/updatesService";
import type { ApiResponse, FilterOptions, LegalUpdate } from "@/types";

interface UseUpdatesResult {
  data: ApiResponse<LegalUpdate[]> | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useUpdates(
  filters?: Partial<FilterOptions>,
  page = 1,
  pageSize = 20
): UseUpdatesResult {
  const [data, setData] = useState<ApiResponse<LegalUpdate[]> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await updatesService.getAll(filters, page, pageSize);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
}
