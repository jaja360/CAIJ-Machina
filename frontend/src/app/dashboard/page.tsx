"use client";

import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useUpdates } from "@/hooks/useUpdates";
import { UpdateCard } from "@/components/features/UpdateCard";
import { SourceFilter } from "@/components/features/SourceFilter";
import type { FilterOptions } from "@/types";

export default function DashboardPage() {
  const { t } = useLanguage();
  const [filters, setFilters] = useState<Partial<FilterOptions>>({});
  const { data, isLoading, error, refetch } = useUpdates(filters);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t("dashboard.title")}</h1>
        <p className="mt-1 text-gray-500">{t("dashboard.subtitle")}</p>
      </header>

      <div className="mb-6">
        <SourceFilter filters={filters} onChange={setFilters} />
      </div>

      {isLoading && (
        <p className="text-center text-gray-400">{t("dashboard.loading")}</p>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm text-red-700">{t("common.error")}</p>
          <button
            onClick={refetch}
            className="mt-2 text-sm font-medium text-red-600 hover:underline"
          >
            {t("common.retry")}
          </button>
        </div>
      )}

      {!isLoading && !error && data?.data.length === 0 && (
        <p className="text-center text-gray-400">{t("dashboard.empty")}</p>
      )}

      <div className="space-y-4">
        {data?.data.map((update) => (
          <UpdateCard key={update.id} update={update} />
        ))}
      </div>
    </div>
  );
}
