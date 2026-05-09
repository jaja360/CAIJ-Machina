"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Toggle } from "@/components/ui/Toggle";
import { useLanguage } from "@/context/LanguageContext";
import type { WatchSource } from "@/types";

interface SourcesTabProps {
  sources: WatchSource[];
  onChange: (updated: WatchSource[]) => void;
}

function SourceRow({
  source,
  index,
  sources,
  onChange,
  t,
}: {
  source: WatchSource;
  index: number;
  sources: WatchSource[];
  onChange: (updated: WatchSource[]) => void;
  t: (key: string) => string;
}) {
  const [keyOpen, setKeyOpen] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [draft, setDraft] = useState(source.apiKey ?? "");

  const update = (patch: Partial<WatchSource>) =>
    onChange(sources.map((s, j) => (j === index ? { ...s, ...patch } : s)));

  const saveKey = () => {
    update({ apiKey: draft });
    setKeyOpen(false);
  };

  const clearKey = () => {
    setDraft("");
    update({ apiKey: "" });
    setKeyOpen(false);
  };

  return (
    <div className="border-b border-ink-100 last:border-b-0">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className="w-7 h-7 rounded-md bg-ink-50 ring-1 ring-ink-200 grid place-items-center text-ink-500 shrink-0">
          <Icon name={source.icon} className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold text-ink-900 truncate flex items-center gap-1.5">
            {source.name}
            {source.apiKey && (
              <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                {t("settings.sources.apiKeySet")}
              </span>
            )}
          </div>
          <div className="text-[10.5px] text-ink-400 font-mono mt-0.5 truncate">{source.url}</div>
        </div>
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
            source.on ? "bg-emerald-100 text-emerald-700" : "bg-ink-100 text-ink-500"
          }`}
        >
          {source.on ? t("settings.sources.active") : t("settings.sources.inactive")}
        </span>
        <button
          onClick={() => setKeyOpen((v) => !v)}
          title={t("settings.sources.apiKey")}
          className={`p-1.5 rounded-md transition-colors ${
            keyOpen
              ? "bg-brand-100 text-brand-700"
              : "text-ink-400 hover:text-ink-700 hover:bg-ink-100"
          }`}
        >
          <Icon name="key" className="w-3.5 h-3.5" />
        </button>
        <Toggle on={source.on} onChange={(v) => update({ on: v })} />
      </div>

      {keyOpen && (
        <div className="px-4 pb-3 flex items-center gap-2">
          <div className="flex-1 flex items-center gap-1.5 bg-ink-50 ring-1 ring-ink-200 rounded-md px-2.5 py-1.5 focus-within:ring-brand-300 focus-within:bg-white transition-colors">
            <Icon name="key" className="w-3 h-3 text-ink-400 shrink-0" />
            <input
              type={showKey ? "text" : "password"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("settings.sources.apiKeyPlaceholder")}
              className="flex-1 bg-transparent text-[11.5px] outline-none text-ink-900 placeholder:text-ink-400 font-mono"
            />
            <button
              onClick={() => setShowKey((v) => !v)}
              className="text-ink-400 hover:text-ink-700 shrink-0"
            >
              <Icon name={showKey ? "eyeOff" : "eye"} className="w-3.5 h-3.5" />
            </button>
          </div>
          {draft && (
            <button
              onClick={clearKey}
              className="text-[11px] text-ink-500 hover:text-red-600 px-2 py-1.5"
            >
              {t("settings.sources.apiKeyClear")}
            </button>
          )}
          <button
            onClick={saveKey}
            className="text-[11px] font-semibold px-2.5 py-1.5 rounded-md bg-brand-700 text-white hover:bg-brand-800 transition-colors"
          >
            {t("settings.footer.save")}
          </button>
        </div>
      )}
    </div>
  );
}

function SourceBlock({
  label,
  icon,
  group,
  allSources,
  onChange,
  t,
  addLabel,
}: {
  label: string;
  icon: string;
  group: { source: WatchSource; originalIndex: number }[];
  allSources: WatchSource[];
  onChange: (updated: WatchSource[]) => void;
  t: (key: string) => string;
  addLabel: string;
}) {
  const activeCount = group.filter((g) => g.source.on).length;

  return (
    <div className="bg-white ring-1 ring-ink-100 rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 bg-ink-50/60 border-b border-ink-100 text-[11px] font-semibold text-ink-900 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Icon name={icon} className="w-3.5 h-3.5 text-ink-500" />
          {label}
        </span>
        <span className="text-[10.5px] text-ink-500 font-normal">
          {activeCount} / {group.length}
        </span>
      </div>
      {group.map(({ source, originalIndex }) => (
        <SourceRow
          key={originalIndex}
          source={source}
          index={originalIndex}
          sources={allSources}
          onChange={onChange}
          t={t}
        />
      ))}
      <button className="w-full flex items-center gap-2 px-4 py-2.5 text-[11.5px] text-ink-500 hover:bg-ink-50 cursor-pointer border-t border-ink-100 transition-colors">
        <Icon name="plus" className="w-3.5 h-3.5" />
        {addLabel}
      </button>
    </div>
  );
}

export function SourcesTab({ sources, onChange }: SourcesTabProps) {
  const { t } = useLanguage();

  const internal = sources
    .map((s, i) => ({ source: s, originalIndex: i }))
    .filter((g) => g.source.type !== "external");

  const external = sources
    .map((s, i) => ({ source: s, originalIndex: i }))
    .filter((g) => g.source.type === "external");

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h3 className="text-[14px] font-bold tracking-tight text-ink-900">
          {t("settings.sources.title")}
        </h3>
        <p className="text-[11.5px] text-ink-500 mt-0.5">
          {t("settings.sources.description")}
        </p>
      </div>

      <SourceBlock
        label={t("settings.sources.internalHeader")}
        icon="building"
        group={internal}
        allSources={sources}
        onChange={onChange}
        t={t}
        addLabel={t("settings.sources.add")}
      />

      <SourceBlock
        label={t("settings.sources.externalHeader")}
        icon="rss"
        group={external}
        allSources={sources}
        onChange={onChange}
        t={t}
        addLabel={t("settings.sources.addExternal")}
      />
    </section>
  );
}
