import type { UrgencyLevel, UpdateCategory } from "@/types";

type BadgeVariant = UrgencyLevel | UpdateCategory | "neutral";

const variantClasses: Record<BadgeVariant, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-red-100 text-red-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-green-100 text-green-800",
  legislation: "bg-blue-100 text-blue-800",
  regulation: "bg-purple-100 text-purple-800",
  compliance: "bg-orange-100 text-orange-800",
  platform: "bg-cyan-100 text-cyan-800",
  jurisprudence: "bg-indigo-100 text-indigo-800",
  neutral: "bg-gray-100 text-gray-700",
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "neutral", children, className = "" }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
