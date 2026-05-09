import { apiGetAlerts, type BackendAlert } from "@/lib/api";
import type { AlertItem } from "@/types";

/** Format an ISO timestamp as a short relative string. */
function ago(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Il y a ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `Il y a ${days} j`;
  return new Date(iso).toLocaleDateString("fr-CA");
}

/** Pick a severity label based on backend priority. */
function toSeverity(priority: string): AlertItem["severity"] {
  if (priority === "high" || priority === "critical") return "critical";
  return "high";
}

/** Map a backend Alert to the UI AlertItem shape with sensible defaults. */
export function mapAlertToItem(a: BackendAlert): AlertItem {
  return {
    id: a.id,
    severity: toSeverity(a.priority),
    domain: "agri",
    domainLabel: "Agriculture",
    title: a.message || "Nouvelle alerte",
    source: "Backend · Veille",
    sourceFull: `Détectée ${ago(a.created_at)}`,
    clients: 0,
    contracts: 0,
    time: ago(a.created_at),
    deadline: a.send_at
      ? new Date(a.send_at).toLocaleDateString("fr-CA", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "",
    modCount: 0,
  };
}

/**
 * Fetch alerts from the Go backend and map them to UI AlertItem[].
 * Returns null on error (caller can fall back to mock data).
 */
export async function fetchAlerts(
  token: string,
): Promise<AlertItem[] | null> {
  try {
    const data = await apiGetAlerts(token);
    return data.map(mapAlertToItem);
  } catch {
    return null;
  }
}
