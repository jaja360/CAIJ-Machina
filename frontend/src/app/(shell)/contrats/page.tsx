"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { useLanguage } from "@/context/LanguageContext";
import { MOCK_CLIENTS, MOCK_CLIENT_MODELS } from "@/data/mockData";
import type { ChipVariant } from "@/types";

function statusVariant(s: string): ChipVariant {
  if (s === "urgent") return "critical";
  if (s === "to-revise") return "high";
  return "success";
}

const DOMAIN_DOT: Record<string, string> = {
  agri: "bg-emerald-500",
  pest: "bg-amber-500",
  sante: "bg-brand-500",
  env: "bg-teal-500",
  comm: "bg-ink-300",
};

export default function ContratsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [selectedCode, setSelectedCode] = useState(MOCK_CLIENTS[0].code);

  const models = MOCK_CLIENT_MODELS[selectedCode] ?? [];
  const totalModels = Object.values(MOCK_CLIENT_MODELS).flat().length;

  return (
    <>
      <TopBar
        title={t("nav.items.contrats")}
        subtitle={`${MOCK_CLIENTS.length} ${t("contrats.clientsLabel").toLowerCase()} · ${totalModels} modèles`}
      />

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left: Clients list */}
        <div className="w-64 shrink-0 border-r border-ink-100 flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 bg-ink-50/60 border-b border-ink-100 shrink-0">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-500 flex items-center gap-1.5">
              <Icon name="users" className="w-3.5 h-3.5" />
              {t("contrats.clientsLabel")} — {MOCK_CLIENTS.length}
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {MOCK_CLIENTS.map((c) => {
              const active = selectedCode === c.code;
              const clientModels = MOCK_CLIENT_MODELS[c.code] ?? [];
              const urgentCount = clientModels.filter((m) => m.status === "urgent").length;
              return (
                <button
                  key={c.code}
                  onClick={() => setSelectedCode(c.code)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 border-b border-ink-50 transition-colors ${
                    active
                      ? "bg-brand-50 border-l-[3px] border-l-brand-600"
                      : "hover:bg-ink-50 border-l-[3px] border-l-transparent"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full grid place-items-center text-[11px] font-bold shrink-0 ${c.color}`}
                  >
                    {c.code}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-[12px] font-semibold truncate ${
                        active ? "text-brand-800" : "text-ink-900"
                      }`}
                    >
                      {c.name}
                    </div>
                    <div className="text-[10px] text-ink-500 mt-0.5">
                      {clientModels.length} modèle{clientModels.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  {urgentCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold grid place-items-center shrink-0">
                      {urgentCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Models list */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="px-5 py-2.5 bg-ink-50/60 border-b border-ink-100 shrink-0">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-500 flex items-center gap-1.5">
              <Icon name="fileText" className="w-3.5 h-3.5" />
              {t("contrats.modelsLabel")} — {models.length}
            </div>
          </div>

          {models.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-[12px] text-ink-400">
              {t("contrats.noModels")}
            </div>
          ) : (
            <div className="px-5 py-4 flex flex-col gap-2">
              {models.map((m) => (
                <div
                  key={m.id}
                  className="bg-white ring-1 ring-ink-100 hover:ring-ink-200 hover:shadow-soft rounded-lg px-4 py-3 flex items-center gap-3 transition-all"
                >
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${DOMAIN_DOT[m.domain] ?? "bg-ink-300"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold text-ink-900 truncate">{m.title}</div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="font-mono text-[10px] text-ink-400">{m.id}</span>
                      {m.clausesToModify > 0 && (
                        <span className="text-[10px] text-orange-700">
                          {t("contrats.clauses", { count: m.clausesToModify })}
                        </span>
                      )}
                      {m.deadline && (
                        <span className="text-[10px] text-red-700 flex items-center gap-1">
                          <Icon name="warning" className="w-3 h-3" />
                          {t("contrats.deadline", { date: m.deadline })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Chip variant={statusVariant(m.status)}>
                      {t(`contrats.status.${m.status}`)}
                    </Chip>
                    <button
                      onClick={() => router.push("/contrats/detail")}
                      className="text-[11px] px-2.5 py-1 rounded-md ring-1 ring-ink-200 text-ink-700 hover:bg-ink-50 transition-colors"
                    >
                      {t("contrats.openModel")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
