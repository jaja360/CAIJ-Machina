import { api } from "./api";
import type { MonitoredSource } from "@/types";

export const sourcesService = {
  getAll: () =>
    api.get<MonitoredSource[]>("/api/sources"),

  create: (payload: Omit<MonitoredSource, "id" | "lastCheckedAt">) =>
    api.post<MonitoredSource>("/api/sources", payload),

  update: (id: string, payload: Partial<MonitoredSource>) =>
    api.put<MonitoredSource>(`/api/sources/${id}`, payload),

  remove: (id: string) =>
    api.delete<void>(`/api/sources/${id}`),
};
