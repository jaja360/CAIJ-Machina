"use client";

import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/Card";
import { useLanguage } from "@/context/LanguageContext";
import type { LegalUpdate } from "@/types";

interface UpdateCardProps {
  update: LegalUpdate;
}

export function UpdateCard({ update }: UpdateCardProps) {
  const { t } = useLanguage();

  const formattedDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-gray-900 leading-snug">{update.title}</h3>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <Badge variant={update.urgency}>{t(`update.urgency.${update.urgency}`)}</Badge>
            <Badge variant={update.category}>{t(`update.category.${update.category}`)}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardBody className="space-y-3">
        <p className="text-sm text-gray-600 leading-relaxed">{update.summary}</p>

        {update.keyChanges.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
              {t("update.labels.keyChanges")}
            </p>
            <ul className="space-y-1">
              {update.keyChanges.map((change, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                  {change}
                </li>
              ))}
            </ul>
          </div>
        )}

        {update.affectedSectors.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
              {t("update.labels.affectedSectors")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {update.affectedSectors.map((sector) => (
                <Badge key={sector}>{sector}</Badge>
              ))}
            </div>
          </div>
        )}
      </CardBody>

      <CardFooter>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>
            {t("update.labels.publishedAt")}: {formattedDate(update.publishedAt)}
          </span>
          <a
            href={update.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-blue-600 hover:underline"
          >
            {update.source} →
          </a>
        </div>
      </CardFooter>
    </Card>
  );
}
