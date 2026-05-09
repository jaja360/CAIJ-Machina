"use client";

import { Icon } from "@/components/ui/Icon";
import { useLanguage } from "@/context/LanguageContext";

interface KeywordsTabProps {
  keywords: string[];
  onChange: (updated: string[]) => void;
}

export function KeywordsTab({ keywords, onChange }: KeywordsTabProps) {
  const { t } = useLanguage();

  return (
    <section>
      <h3 className="text-[14px] font-bold tracking-tight text-ink-900">{t("settings.keywords.title")}</h3>
      <p className="text-[11.5px] text-ink-500 mt-0.5 mb-3">{t("settings.keywords.description")}</p>
      <div className="bg-white ring-1 ring-ink-100 rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 bg-ink-50/60 border-b border-ink-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-900">
            <Icon name="tag" className="w-3.5 h-3.5 text-ink-500" />
            {t("settings.keywords.header")}
          </div>
          <span className="text-[10.5px] text-ink-500">
            {t("settings.keywords.count", { count: keywords.length })}
          </span>
        </div>
        <div className="p-3 flex flex-wrap gap-1.5">
          {keywords.map((k) => (
            <span
              key={k}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full ring-1 ring-ink-200 bg-ink-50/60 text-[11.5px] text-ink-700"
            >
              {k}
              <button
                onClick={() => onChange(keywords.filter((x) => x !== k))}
                className="text-ink-400 hover:text-red-600"
              >
                <Icon name="close" className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button className="px-3 py-1 rounded-full ring-1 ring-dashed ring-ink-300 text-[11.5px] text-ink-500 hover:bg-ink-50">
            {t("settings.keywords.add")}
          </button>
        </div>
      </div>
    </section>
  );
}
