"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";

type BtnVariant = "default" | "primary" | "ghost" | "danger";
type BtnSize    = "sm" | "md";

const VARIANTS: Record<BtnVariant, string> = {
  default: "bg-white text-ink-800 ring-1 ring-ink-200 hover:bg-ink-50 hover:ring-ink-300",
  primary: "bg-brand-700 text-white hover:bg-brand-800 ring-1 ring-brand-700",
  ghost:   "text-ink-600 hover:bg-ink-100",
  danger:  "bg-red-600 text-white hover:bg-red-700 ring-1 ring-red-600",
};

const SIZES: Record<BtnSize, string> = {
  sm: "text-[11px] px-2.5 py-1",
  md: "text-[12px] px-3 py-1.5",
};

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
}

const Btn = forwardRef<HTMLButtonElement, BtnProps>(
  ({ variant = "default", size = "md", className = "", children, ...props }, ref) => (
    <button
      ref={ref}
      className={[
        "inline-flex items-center gap-1.5 rounded-md font-medium transition-colors",
        "disabled:opacity-50 disabled:pointer-events-none",
        VARIANTS[variant],
        SIZES[size],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  )
);
Btn.displayName = "Btn";
export { Btn };
