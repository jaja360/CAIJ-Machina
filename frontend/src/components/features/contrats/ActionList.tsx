import { Icon } from "@/components/ui/Icon";
import { useLanguage } from "@/context/LanguageContext";
import type { ContractAction } from "@/types";

interface ActionListProps {
  actions: ContractAction[];
  note: string;
}

export function ActionList({ actions, note }: ActionListProps) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[10.5px] font-semibold tracking-[0.08em] uppercase text-ink-500">
        {t("contract.labels.actionsTitle")}
      </div>

      <div className="flex flex-col gap-2">
        {actions.map((a) => (
          <div key={a.n} className="flex items-start gap-3 bg-white ring-1 ring-ink-100 rounded-lg px-3.5 py-3">
            <div className="w-6 h-6 rounded-full bg-brand-700 text-white grid place-items-center text-[11px] font-bold shrink-0">
              {a.n}
            </div>
            <div className="text-[11.5px] text-ink-700 leading-relaxed">
              <strong className="text-ink-900 font-semibold">{a.t}</strong>
              <span className="ml-1">— {a.d}</span>
            </div>
          </div>
        ))}
      </div>

      {/* AI legal note */}
      <div className="bg-brand-50/70 ring-1 ring-brand-200 rounded-lg px-3.5 py-3 mt-2">
        <div className="flex items-center gap-1.5 text-[10.5px] text-brand-800 font-semibold uppercase tracking-wider mb-1.5">
          <Icon name="sparkles" className="w-3.5 h-3.5" />
          {t("contract.labels.legalNote")}
        </div>
        <div className="text-[11.5px] text-brand-900 leading-relaxed">{note}</div>
      </div>
    </div>
  );
}
