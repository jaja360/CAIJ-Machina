"use client";

import { Chip } from "@/components/ui/Chip";
import { DomainDot } from "@/components/ui/DomainDot";
import { Icon } from "@/components/ui/Icon";
import { useLanguage } from "@/context/LanguageContext";
import type { AlertItem, ChipVariant } from "@/types";

function severityVariant(s: AlertItem["severity"]): ChipVariant {
  return s === "critical" ? "critical" : "high";
}

function severityAccent(s: AlertItem["severity"]): string {
  return s === "critical" ? "bg-red-500" : "bg-orange-400";
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
          <div className="text-[12.5px] font-semibold text-ink-900 truncate">{a.title}</div>
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
