"use client";

import { useLanguage } from "@/context/LanguageContext";
import type { FilterOptions, UpdateCategory, UrgencyLevel } from "@/types";

const CATEGORIES: UpdateCategory[] = ["legislation", "regulation", "compliance", "platform", "jurisprudence"];
const URGENCIES: UrgencyLevel[] = ["high", "medium", "low"];

interface SourceFilterProps {
  filters: Partial<FilterOptions>;
  onChange: (filters: Partial<FilterOptions>) => void;
}

export function SourceFilter({ filters, onChange }: SourceFilterProps) {
  const { t } = useLanguage();

  const toggle = <K extends "categories" | "urgency">(
    key: K,
    value: FilterOptions[K][number]
  ) => {
    const current = (filters[key] ?? []) as string[];
    const next = current.includes(value as string)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...filters, [key]: next as FilterOptions[K] });
  };

  const isActive = (key: "categories" | "urgency", value: string) =>
    ((filters[key] ?? []) as string[]).includes(value);

  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          {t("dashboard.filters.category")}
        </span>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => toggle("categories", cat)}
            className={[
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              isActive("categories", cat)
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-gray-200 text-gray-600 hover:border-gray-300",
            ].join(" ")}
          >
            {t(`update.category.${cat}`)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          {t("dashboard.filters.urgency")}
        </span>
        {URGENCIES.map((urg) => (
          <button
            key={urg}
            onClick={() => toggle("urgency", urg)}
            className={[
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              isActive("urgency", urg)
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-gray-200 text-gray-600 hover:border-gray-300",
            ].join(" ")}
          >
            {t(`update.urgency.${urg}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
