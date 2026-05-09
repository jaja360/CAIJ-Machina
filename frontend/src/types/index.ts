export type Language = "en" | "fr";

export type UrgencyLevel = "high" | "medium" | "low";

export type UpdateCategory =
  | "legislation"
  | "regulation"
  | "compliance"
  | "platform"
  | "jurisprudence";

export interface LegalUpdate {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  category: UpdateCategory;
  urgency: UrgencyLevel;
  affectedSectors: string[];
  publishedAt: string;
  detectedAt: string;
  jurisdiction?: string;
  keyChanges: string[];
}

export interface MonitoredSource {
  id: string;
  name: string;
  url: string;
  category: UpdateCategory;
  isActive: boolean;
  lastCheckedAt: string;
}

export interface FilterOptions {
  categories: UpdateCategory[];
  urgency: UrgencyLevel[];
  sources: string[];
  dateFrom?: string;
  dateTo?: string;
}

export interface ApiResponse<T> {
  data: T;
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  message: string;
  code: string;
  status: number;
}
