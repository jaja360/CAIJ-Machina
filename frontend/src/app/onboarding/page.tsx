"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Toggle } from "@/components/ui/Toggle";
import { Btn } from "@/components/ui/Btn";
import { Icon } from "@/components/ui/Icon";
import { useLanguage } from "@/context/LanguageContext";
import { MOCK_DOMAINS, MOCK_KEYWORDS, MOCK_SOURCES } from "@/data/mockData";
import type { DomainConfig, WatchSource } from "@/types";

const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [domains, setDomains] = useState<DomainConfig[]>(MOCK_DOMAINS);
  const [keywords, setKeywords] = useState<string[]>(MOCK_KEYWORDS.slice(0, 4));
  const [newKw, setNewKw] = useState("");
  const [sources, setSources] = useState<WatchSource[]>(MOCK_SOURCES);
  const [channels, setChannels] = useState<Set<number>>(new Set([0]));

  const stepMeta = [
    { name: t("onboarding.steps.1.name"), sub: t("onboarding.steps.1.sub") },
    { name: t("onboarding.steps.2.name"), sub: t("onboarding.steps.2.sub") },
    { name: t("onboarding.steps.3.name"), sub: t("onboarding.steps.3.sub") },
  ];

  const addKeyword = () => {
    const kw = newKw.trim();
    if (kw && !keywords.includes(kw)) setKeywords([...keywords, kw]);
    setNewKw("");
  };

  const removeKeyword = (kw: string) => setKeywords(keywords.filter((k) => k !== kw));

  const toggleSource = (idx: number, v: boolean) =>
    setSources(sources.map((s, i) => (i === idx ? { ...s, on: v } : s)));

  const toggleChannel = (idx: number) => {
    const next = new Set(channels);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    setChannels(next);
  };

  const channelLabels = [
    t("onboarding.channel.email"),
    t("onboarding.channel.mobile"),
    t("onboarding.channel.slack"),
    t("onboarding.channel.teams"),
  ];

  return (
    <div className="min-h-screen bg-ink-50 flex flex-col items-center justify-center p-6">
      {/* Card */}
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-pop overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-ink-100">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[11px] font-semibold tracking-[0.08em] uppercase text-ink-400">
              {t("onboarding.stepLabel", { current: step, total: TOTAL_STEPS })}
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="text-[11.5px] text-ink-400 hover:text-ink-700"
            >
              {t("onboarding.skip")}
            </button>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-5">
            {stepMeta.map((s, i) => {
              const n = i + 1;
              const done = n < step;
              const active = n === step;
              return (
                <div key={n} className="flex items-center gap-2">
                  <div
                    className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                      active
                        ? "bg-brand-700 text-white"
                        : done
                        ? "bg-brand-100 text-brand-700"
                        : "bg-ink-100 text-ink-400"
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white/20 grid place-items-center text-[10px] font-bold">
                      {done ? <Icon name="check" className="w-2.5 h-2.5" /> : n}
                    </span>
                    <span>{s.name}</span>
                  </div>
                  {i < TOTAL_STEPS - 1 && (
                    <div className={`flex-1 h-px w-6 ${done ? "bg-brand-300" : "bg-ink-200"}`} />
                  )}
                </div>
              );
            })}
          </div>

          <h1 className="text-[20px] font-bold tracking-tight text-ink-900">
            {t(`onboarding.titles.${step}`)}
          </h1>
        </div>

        {/* Step body */}
        <div className="px-8 py-6 min-h-[340px]">
          {step === 1 && (
            <div className="flex flex-col gap-6">
              {/* Domains */}
              <div className="grid grid-cols-2 gap-2">
                {domains.map((d) => (
                  <div
                    key={d.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md ring-1 cursor-pointer transition-colors ${
                      d.on ? "bg-brand-50/40 ring-brand-200" : "bg-ink-50 ring-ink-100"
                    }`}
                    onClick={() =>
                      setDomains(domains.map((x) => (x.id === d.id ? { ...x, on: !x.on } : x)))
                    }
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${d.dotCls}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-ink-900">{d.name}</div>
                      <div className="text-[10.5px] text-ink-500">{d.sub}</div>
                    </div>
                    <Toggle on={d.on} onChange={(v) => setDomains(domains.map((x) => (x.id === d.id ? { ...x, on: v } : x)))} />
                  </div>
                ))}
              </div>

              {/* Keywords */}
              <div>
                <div className="text-[11px] font-semibold text-ink-600 mb-2">
                  {t("onboarding.keywordsLabel")}
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {keywords.map((kw) => (
                    <span
                      key={kw}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-ink-100 rounded-full text-[11px] text-ink-700"
                    >
                      {kw}
                      <button onClick={() => removeKeyword(kw)} className="text-ink-400 hover:text-ink-700 leading-none">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newKw}
                    onChange={(e) => setNewKw(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                    placeholder={t("onboarding.keywordsAdd")}
                    className="flex-1 px-3 py-1.5 rounded-md ring-1 ring-ink-200 text-[12px] focus:outline-none focus:ring-brand-400 bg-white"
                  />
                  <Btn onClick={addKeyword}>{t("onboarding.keywordsAdd")}</Btn>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-2">
              {sources.map((s, i) => (
                <div
                  key={s.name}
                  className="flex items-center gap-3 px-3 py-2.5 bg-ink-50 rounded-md ring-1 ring-ink-100"
                >
                  <div className="w-7 h-7 rounded-md bg-white ring-1 ring-ink-200 grid place-items-center text-ink-500">
                    <Icon name={s.icon as "building" | "shield" | "rss"} className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-ink-900">{s.name}</div>
                    <div className="text-[10.5px] text-ink-400 font-mono truncate">{s.url}</div>
                  </div>
                  <Toggle on={s.on} onChange={(v) => toggleSource(i, v)} />
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-6">
              {/* Contract upload */}
              <div>
                <div className="border-2 border-dashed border-ink-200 rounded-xl px-6 py-8 flex flex-col items-center gap-3 text-center">
                  <div className="w-10 h-10 rounded-full bg-ink-100 grid place-items-center text-ink-500">
                    <Icon name="upload" className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-ink-900">{t("onboarding.upload.title")}</div>
                    <div className="text-[11px] text-ink-500 mt-0.5">{t("onboarding.upload.subtitle")}</div>
                  </div>
                  <Btn>{t("onboarding.upload.browse")}</Btn>
                </div>
              </div>

              {/* Alert channels */}
              <div>
                <div className="text-[11px] font-semibold text-ink-600 mb-2">{t("onboarding.alertsBy")}</div>
                <div className="flex flex-wrap gap-2">
                  {channelLabels.map((label, i) => (
                    <button
                      key={label}
                      onClick={() => toggleChannel(i)}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-medium ring-1 transition-colors ${
                        channels.has(i)
                          ? "bg-brand-700 text-white ring-brand-700"
                          : "bg-white text-ink-600 ring-ink-200 hover:ring-ink-400"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-ink-100 bg-ink-50/40 flex items-center justify-between">
          {/* Trust badges */}
          <div className="flex items-center gap-3">
            {(["canlii", "journals", "gov"] as const).map((key) => (
              <span key={key} className="flex items-center gap-1 text-[10.5px] text-ink-500">
                <Icon name="shield" className="w-3 h-3 text-brand-500" />
                {t(`onboarding.trust.${key}`)}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 1 && (
              <Btn onClick={() => setStep(step - 1)}>{t("onboarding.prev")}</Btn>
            )}
            {step < TOTAL_STEPS ? (
              <Btn variant="primary" onClick={() => setStep(step + 1)}>
                {t("onboarding.next")}
                <Icon name="arrowRight" className="w-3.5 h-3.5" />
              </Btn>
            ) : (
              <Btn variant="primary" onClick={() => router.push("/dashboard")}>
                {t("onboarding.finish")}
                <Icon name="check" className="w-3.5 h-3.5" />
              </Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
