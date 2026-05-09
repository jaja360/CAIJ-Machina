"use client";

import { Chip } from "@/components/ui/Chip";
import { DomainDot } from "@/components/ui/DomainDot";
import { Icon } from "@/components/ui/Icon";
import { useLanguage } from "@/context/LanguageContext";
import type { AlertItem, ChipVariant } from "@/types";

function severityVariant(s: AlertItem["severity"]): ChipVariant {
  if (s === "critical") return "critical";
  if (s === "low") return "info";
  return "high";
}

function severityAccent(s: AlertItem["severity"]): string {
  if (s === "critical") return "bg-red-500";
  if (s === "low") return "bg-blue-400";
  return "bg-orange-400";
}

interface AlertCardProps {
  alert: AlertItem;
  onClick: () => void;
}

export function AlertCard({ alert: a, onClick }: AlertCardProps) {
  const { t } = useLanguage();

  return (
    <button
      onClick={onClick}
      className="group w-full text-left flex items-stretch bg-white ring-1 ring-ink-100 hover:ring-ink-200 hover:shadow-soft rounded-lg overflow-hidden transition-all"
    >
      {/* Severity accent stripe */}
      <div className={`w-[3px] shrink-0 ${severityAccent(a.severity)}`} />

      <div className="flex-1 px-4 py-3 flex items-center gap-3 min-w-0">
        <DomainDot domain={a.domain} />
        <div className="flex-1 min-w-0">
          {a.articleRef && (
            <span className="inline-block mb-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold font-mono bg-ink-100 text-ink-600">
              {a.articleRef}
            </span>
          )}
          <div className="text-[12.5px] font-semibold text-ink-900 truncate">{a.title}</div>
          {a.legislationRef && (
            <div className="text-[10px] font-mono text-brand-600 truncate mt-0.5">{a.legislationRef}</div>
          )}
          <div className="flex items-center gap-3 mt-1 min-w-0">
            <span className="text-[10.5px] text-ink-500 truncate">{a.source}</span>
            <span className="text-[10.5px] text-ink-700 flex items-center gap-1 shrink-0">
              <Icon name="users" className="w-3 h-3" />
              {a.clients} clients · {a.contracts} contrats
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Chip variant={severityVariant(a.severity)}>
            {t(`alert.severity.${a.severity}`)}
          </Chip>
          <span className="text-[10.5px] text-ink-500">{a.time}</span>
          <Icon
            name="chevronRight"
            className="w-4 h-4 text-ink-400 group-hover:text-brand-700 transition-colors"
          />
        </div>
      </div>
    </button>
  );
}
