import { apiGetClients, type BackendClient } from "@/lib/api";
import type { Client } from "@/types";

/** Safely extract a string from a field that may be string, null, or sql.NullString-like object. */
export function extractIcon(
  icon: BackendClient["icon"],
): string {
  if (!icon) return "building";
  if (typeof icon === "string") return icon;
  if (icon.Valid && icon.String) return icon.String;
  return "building";
}

/** Map a backend Client to the UI Client shape. */
export function mapClient(c: BackendClient): Client {
  return {
    id: c.id,
    code: c.name
      .split(/\s+/)
      .map((w) => w.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 4) || c.id.slice(0, 2).toUpperCase(),
    name: c.name,
    detail: "",
    count: 0,
    color: "bg-brand-100 text-brand-700",
  };
}

/**
 * Fetch clients from the Go backend and map them to UI Client[].
 * Returns null on error.
 */
export async function fetchClients(
  token: string,
): Promise<Client[] | null> {
  try {
    const data = await apiGetClients(token);
    return data.map(mapClient);
  } catch {
    return null;
  }
}
