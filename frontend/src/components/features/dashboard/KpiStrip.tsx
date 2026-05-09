"use client";

import { Icon } from "@/components/ui/Icon";
import { useLanguage } from "@/context/LanguageContext";

export type KpiFilter = "all" | "critical" | "high" | "low";

interface KpiStripProps {
  activeFilter: KpiFilter;
  onFilter: (f: KpiFilter) => void;
  criticalCount: number;
  highCount: number;
  lowCount: number;
}

export function KpiStrip({ activeFilter, onFilter, criticalCount, highCount, lowCount }: KpiStripProps) {
  const { t } = useLanguage();

  const items = [
    {
      filter: "critical" as KpiFilter,
      value: criticalCount,
      labelKey: "dashboard.kpi.critical",
      detailKey: "dashboard.kpi.exposed",
      detailParams: { count: 8 },
      icon: "warning",
      accent: "text-red-600",
      activeRing: "ring-red-300 bg-red-50/40",
    },
    {
      filter: "high" as KpiFilter,
      value: highCount,
      labelKey: "dashboard.kpi.active",
      detailKey: "dashboard.kpi.thisWeek",
      detailParams: { count: 2 },
      icon: "bell",
      accent: "text-orange-600",
      activeRing: "ring-orange-300 bg-orange-50/40",
    },
    {
      filter: "low" as KpiFilter,
      value: lowCount,
      labelKey: "dashboard.kpi.low",
      detailKey: "dashboard.kpi.thisMonth",
      detailParams: { count: 2 },
      icon: "info",
      accent: "text-blue-600",
      activeRing: "ring-blue-300 bg-blue-50/40",
    },
  ];

  return (
    <div className="px-6 pt-5 grid grid-cols-3 gap-3">
      {items.map((k) => {
        const active = activeFilter === k.filter;
        return (
          <button
            key={k.filter}
            onClick={() => onFilter(active ? "all" : k.filter)}
            className={`text-left bg-white ring-1 rounded-lg p-3.5 flex items-center gap-3 transition-all hover:shadow-soft ${
              active ? k.activeRing : "ring-ink-100 hover:ring-ink-200"
            }`}
          >
            <div className={`w-9 h-9 rounded-md grid place-items-center shrink-0 ${active ? "bg-white" : "bg-ink-50"} ${k.accent}`}>
              <Icon name={k.icon} className="w-4 h-4" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="text-[20px] font-semibold tracking-tight text-ink-900 leading-none">
                {k.value}
              </div>
              <div className="text-[11px] text-ink-700 mt-1">{t(k.labelKey)}</div>
              <div className="text-[10px] text-ink-400 mt-0.5">{t(k.detailKey, k.detailParams)}</div>
            </div>
            {active && (
              <div className={`ml-auto text-[9.5px] font-semibold uppercase tracking-wide ${k.accent}`}>
                Filtre actif
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
