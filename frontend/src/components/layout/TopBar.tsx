"use client";

import { Icon } from "@/components/ui/Icon";

interface BackLink {
  label: string;
  onClick: () => void;
}

interface TopBarProps {
  title?: string;
  subtitle?: string;
  back?: BackLink;
  right?: React.ReactNode;
}

export function TopBar({ title, subtitle, back, right }: TopBarProps) {
  return (
    <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-ink-100 shrink-0">
      <div className="flex items-center gap-4 min-w-0">
        {back && (
          <button
            onClick={back.onClick}
            className="flex items-center gap-1.5 text-[11.5px] text-ink-500 hover:text-ink-800 shrink-0"
          >
            <Icon name="arrowLeft" className="w-3.5 h-3.5" />
            <span className="truncate">{back.label}</span>
          </button>
        )}
        {title && (
          <div className="min-w-0">
            <div className="text-[15px] font-semibold tracking-tight text-ink-900 truncate">{title}</div>
            {subtitle && (
              <div className="text-[11.5px] text-ink-500 mt-0.5 truncate">{subtitle}</div>
            )}
          </div>
        )}
      </div>
      {right && <div className="flex items-center gap-3 shrink-0">{right}</div>}
    </div>
  );
}
