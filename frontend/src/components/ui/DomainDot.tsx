import type { Domain } from "@/types";

const DOT_COLORS: Record<Domain | "off", string> = {
  agri:  "bg-emerald-500",
  pest:  "bg-amber-500",
  sante: "bg-brand-500",
  env:   "bg-teal-500",
  comm:  "bg-ink-400",
  off:   "bg-ink-300",
};

interface DomainDotProps {
  domain: Domain | "off";
  className?: string;
}

export function DomainDot({ domain, className = "w-1.5 h-1.5" }: DomainDotProps) {
  return (
    <span
      className={["rounded-full shrink-0", DOT_COLORS[domain] ?? DOT_COLORS.off, className].join(" ")}
    />
  );
}
