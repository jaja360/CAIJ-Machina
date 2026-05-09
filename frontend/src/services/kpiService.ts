import { apiGetKpi, type KpiData } from "@/lib/api";

/**
 * Fetch KPI data from the Go backend.
 * Returns null on error so callers can fall back gracefully.
 */
export async function fetchKpi(token: string): Promise<KpiData | null> {
  try {
    return await apiGetKpi(token);
  } catch {
    return null;
  }
}
