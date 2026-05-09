import type { ChipVariant } from "@/types";

const VARIANTS: Record<ChipVariant, string> = {
  critical: "bg-red-50 text-red-700 ring-1 ring-red-200",
  high:     "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  success:  "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  info:     "bg-brand-50 text-brand-700 ring-1 ring-brand-200",
  pest:     "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  sante:    "bg-brand-50 text-brand-700 ring-1 ring-brand-200",
  agri:     "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  neutral:  "bg-ink-50 text-ink-700 ring-1 ring-ink-200",
};

interface ChipProps {
  children: React.ReactNode;
  variant?: ChipVariant;
  className?: string;
}

export function Chip({ children, variant = "neutral", className = "" }: ChipProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold tracking-wide",
        VARIANTS[variant],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
