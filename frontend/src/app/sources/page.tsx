"use client";

import { useLanguage } from "@/context/LanguageContext";
import { useSources } from "@/hooks/useSources";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function SourcesPage() {
  const { t } = useLanguage();
  const { sources, isLoading, error } = useSources();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t("sources.title")}</h1>
      </header>

      {isLoading && (
        <p className="text-center text-gray-400">{t("common.loading")}</p>
      )}
      {error && (
        <p className="text-center text-red-500">{t("common.error")}</p>
      )}

      {!isLoading && sources.length === 0 && (
        <p className="text-center text-gray-400">{t("sources.empty")}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {sources.map((source) => (
          <Card key={source.id}>
            <CardBody className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-900">{source.name}</p>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-xs text-blue-600 hover:underline"
                >
                  {source.url}
                </a>
                <p className="mt-1 text-xs text-gray-400">
                  {t("sources.lastChecked")}: {new Date(source.lastCheckedAt).toLocaleString()}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <Badge variant={source.category}>{t(`update.category.${source.category}`)}</Badge>
                <Badge variant={source.isActive ? "low" : "neutral"}>
                  {source.isActive ? t("sources.active") : t("sources.inactive")}
                </Badge>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
