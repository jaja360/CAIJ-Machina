"use client";

import { Icon } from "@/components/ui/Icon";
import { Toggle } from "@/components/ui/Toggle";
import { useLanguage } from "@/context/LanguageContext";
import type { WatchSource } from "@/types";

interface SourcesTabProps {
  sources: WatchSource[];
  onChange: (updated: WatchSource[]) => void;
}

export function SourcesTab({ sources, onChange }: SourcesTabProps) {
  const { t } = useLanguage();
  const activeCount = sources.filter((s) => s.on).length;

  const toggle = (i: number, v: boolean) =>
    onChange(sources.map((s, j) => (j === i ? { ...s, on: v } : s)));

  return (
    <section>
      <h3 className="text-[14px] font-bold tracking-tight text-ink-900">{t("settings.sources.title")}</h3>
      <p className="text-[11.5px] text-ink-500 mt-0.5 mb-3">{t("settings.sources.description")}</p>
      <div className="bg-white ring-1 ring-ink-100 rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 bg-ink-50/60 border-b border-ink-100 text-[11px] font-semibold text-ink-900 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Icon name="database" className="w-3.5 h-3.5 text-ink-500" />
            {t("settings.sources.header")}
          </span>
          <span className="text-[10.5px] text-ink-500 font-normal">
            {t("settings.sources.count", { active: activeCount, total: sources.length })}
          </span>
        </div>
        {sources.map((s, i) => (
          <div key={i} className={`flex items-center gap-3 px-4 py-2.5 ${i < sources.length - 1 ? "border-b border-ink-100" : ""}`}>
            <div className="w-7 h-7 rounded-md bg-ink-50 ring-1 ring-ink-200 grid place-items-center text-ink-500 shrink-0">
              <Icon name={s.icon} className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-ink-900 truncate">{s.name}</div>
              <div className="text-[10.5px] text-ink-400 font-mono mt-0.5 truncate">{s.url}</div>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${s.on ? "bg-emerald-100 text-emerald-700" : "bg-ink-100 text-ink-500"}`}>
              {s.on ? t("settings.sources.active") : t("settings.sources.inactive")}
            </span>
            <Toggle on={s.on} onChange={(v) => toggle(i, v)} />
          </div>
        ))}
        <div className="flex items-center gap-2 px-4 py-2.5 text-[11.5px] text-ink-500 hover:bg-ink-50 cursor-pointer border-t border-ink-100">
          <Icon name="plus" className="w-3.5 h-3.5" />
          {t("settings.sources.add")}
        </div>
      </div>
    </section>
  );
}
