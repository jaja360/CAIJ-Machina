"use client";

import { Toggle } from "@/components/ui/Toggle";
import { Icon } from "@/components/ui/Icon";
import { useLanguage } from "@/context/LanguageContext";
import type { DomainConfig } from "@/types";

interface DomainsTabProps {
  domains: DomainConfig[];
  onChange: (updated: DomainConfig[]) => void;
}

export function DomainsTab({ domains, onChange }: DomainsTabProps) {
  const { t } = useLanguage();
  const activeCount = domains.filter((d) => d.on).length;

  const toggle = (id: string, v: boolean) =>
    onChange(domains.map((d) => (d.id === id ? { ...d, on: v } : d)));

  return (
    <section>
      <h3 className="text-[14px] font-bold tracking-tight text-ink-900">{t("settings.domains.title")}</h3>
      <p className="text-[11.5px] text-ink-500 mt-0.5 mb-3">{t("settings.domains.description")}</p>
      <div className="bg-white ring-1 ring-ink-100 rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 bg-ink-50/60 border-b border-ink-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-900">
            <Icon name="leaf" className="w-3.5 h-3.5 text-ink-500" />
            {t("settings.domains.header")}
          </div>
          <span className="text-[10.5px] text-ink-500">
            {t("settings.domains.count", { active: activeCount, total: domains.length })}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 p-3">
          {domains.map((d) => (
            <div
              key={d.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md ring-1 ${d.on ? "bg-brand-50/40 ring-brand-200" : "bg-white ring-ink-100"}`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${d.dotCls}`} />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium text-ink-900">{d.name}</div>
                <div className="text-[10.5px] text-ink-500 mt-0.5">{d.sub}</div>
              </div>
              <Toggle on={d.on} onChange={(v) => toggle(d.id, v)} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
