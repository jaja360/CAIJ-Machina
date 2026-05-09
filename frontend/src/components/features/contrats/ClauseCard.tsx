import { Chip } from "@/components/ui/Chip";
import { DiffOld, DiffNew, DiffAdd } from "@/components/ui/DiffBlock";
import { useLanguage } from "@/context/LanguageContext";
import type { ContractClause } from "@/types";

interface ClauseCardProps {
  clause: ContractClause;
}

export function ClauseCard({ clause: cl }: ClauseCardProps) {
  const { t } = useLanguage();

  return (
    <div className="bg-white ring-1 ring-ink-100 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2 bg-ink-50/60 border-b border-ink-100">
        <span className="text-[11.5px] font-semibold text-ink-900">{cl.title}</span>
        <Chip variant={cl.urgent ? "critical" : "high"}>
          {cl.urgent ? t("contract.chip.urgent") : t("contract.chip.toRevise")}
        </Chip>
      </div>
      <div className="px-3.5 py-3 flex flex-col gap-2">
        <DiffOld>{cl.current}</DiffOld>
        <div className="text-[10.5px] italic text-ink-500">{cl.problem}</div>
        <div className="text-[10.5px] font-semibold tracking-wide uppercase text-ink-500 mt-1">
          {t("contract.labels.newText")}
        </div>
        <DiffNew>{cl.next}</DiffNew>
        {cl.addition && (
          <>
            <div className="text-[10.5px] font-semibold tracking-wide uppercase text-ink-500 mt-1">
              {t("contract.labels.addClause")}
            </div>
            <DiffAdd>{cl.addition}</DiffAdd>
          </>
        )}
      </div>
    </div>
  );
}
