"use client";

import { useRouter } from "next/navigation";
import { Chip } from "@/components/ui/Chip";
import { DiffOld, DiffNew } from "@/components/ui/DiffBlock";
import { useLanguage } from "@/context/LanguageContext";
import type { Modification } from "@/types";

interface ModificationCardProps {
  mod: Modification;
}

export function ModificationCard({ mod: m }: ModificationCardProps) {
  const { t } = useLanguage();
  const router = useRouter();

  return (
    <div className="bg-white ring-1 ring-ink-100 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-ink-50/60 border-b border-ink-100">
        <div className="flex items-center gap-2 min-w-0">
          <Chip variant={m.impact === "high" ? "critical" : "high"}>
            {t(`alert.impact.${m.impact}`)}
          </Chip>
          <span className="text-[12px] font-semibold text-ink-900 truncate">{m.title}</span>
        </div>
        <span className="text-[10.5px] text-ink-500 shrink-0">
          {m.contractsCount} contrats
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-3 flex flex-col gap-2">
        <div className="text-[11.5px] text-ink-700 mb-1">{m.subtitle}</div>
        <DiffOld>{m.before}</DiffOld>
        <DiffNew>{m.after}</DiffNew>

        {/* Affected contracts */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2.5 border-t border-ink-100">
          <span className="text-[10.5px] text-ink-500 mr-1">{t("alert.labels.contracts")}</span>
          {m.contracts.map((c) => (
            <button
              key={c.name}
              onClick={() => router.push("/contrats")}
              className={[
                "text-[10.5px] px-2.5 py-1 rounded-full ring-1 transition-colors",
                c.urgent
                  ? "bg-red-50 text-red-700 ring-red-200 hover:bg-red-100"
                  : "bg-orange-50 text-orange-700 ring-orange-200 hover:bg-orange-100",
              ].join(" ")}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
