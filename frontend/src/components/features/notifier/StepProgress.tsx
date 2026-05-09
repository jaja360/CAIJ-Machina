import { Icon } from "@/components/ui/Icon";
import { useLanguage } from "@/context/LanguageContext";

type StepState = "done" | "active" | "todo";

interface Step {
  n: number;
  labelKey: string;
  state: StepState;
}

interface StepProgressProps {
  activeStep: number;
}

export function StepProgress({ activeStep }: StepProgressProps) {
  const { t } = useLanguage();

  const steps: Step[] = [1, 2, 3, 4, 5].map((n) => ({
    n,
    labelKey: `notify.steps.${n}`,
    state: activeStep > n ? "done" : activeStep === n ? "active" : "todo",
  }));

  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className="flex items-center gap-2 shrink-0">
            <div
              className={[
                "w-6 h-6 rounded-full grid place-items-center text-[10.5px] font-semibold",
                s.state === "done"   ? "bg-emerald-100 text-emerald-700" :
                s.state === "active" ? "bg-brand-700 text-white"         :
                                       "ring-1 ring-ink-200 text-ink-400",
              ].join(" ")}
            >
              {s.state === "done" ? (
                <Icon name="check" className="w-3.5 h-3.5" strokeWidth={2.4} />
              ) : s.n}
            </div>
            <span
              className={[
                "text-[11px] whitespace-nowrap",
                s.state === "active" ? "text-ink-900 font-semibold" : "text-ink-500",
              ].join(" ")}
            >
              {t(s.labelKey)}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="flex-1 h-px bg-ink-100 mx-3 min-w-[8px]" />
          )}
        </div>
      ))}
    </div>
  );
}
