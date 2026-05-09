import { api } from "./api";
import type { ApiResponse, FilterOptions, LegalUpdate } from "@/types";

export const updatesService = {
  getAll: (filters?: Partial<FilterOptions>, page = 1, pageSize = 20) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (filters?.categories?.length) params.set("categories", filters.categories.join(","));
    if (filters?.urgency?.length) params.set("urgency", filters.urgency.join(","));
    if (filters?.sources?.length) params.set("sources", filters.sources.join(","));
    if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters?.dateTo) params.set("dateTo", filters.dateTo);
    return api.get<ApiResponse<LegalUpdate[]>>(`/api/updates?${params}`);
  },

  getById: (id: string) =>
    api.get<LegalUpdate>(`/api/updates/${id}`),
};
