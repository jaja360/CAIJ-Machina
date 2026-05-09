"use client";

import { useRouter } from "next/navigation";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import type { AgentMessage } from "@/types";

export function Message({ role, content, time, results, suggestion }: AgentMessage) {
  const router = useRouter();

  if (role === "user") {
    return (
      <div className="self-end flex flex-col items-end gap-0.5 max-w-[88%] animate-fade-in">
        <div className="px-3 py-2 rounded-[14px] rounded-br-[4px] bg-brand-700 text-white text-[12px] leading-relaxed">
          {content}
        </div>
        <div className="text-[10px] text-ink-400">{time}</div>
      </div>
    );
  }

  return (
    <div className="self-start flex flex-col gap-1 max-w-[94%] animate-fade-in">
      {/* Agent content may include <strong>/<em> HTML — this is controlled data, not user input */}
      <div
        className="px-3 py-2 rounded-[14px] rounded-bl-[4px] bg-ink-50 ring-1 ring-ink-100 text-[12px] leading-relaxed text-ink-800"
        dangerouslySetInnerHTML={{ __html: content }}
      />

      {results?.map((r, i) => (
        <div key={i} className="ml-1 px-2.5 py-1.5 ring-1 ring-ink-200 rounded-md bg-white">
          <div className="flex items-center gap-1.5">
            <Chip variant={r.chipVariant}>{r.chip}</Chip>
            <div className="text-[11.5px] font-semibold text-ink-900">{r.name}</div>
          </div>
          <div className="text-[10.5px] text-ink-500 mt-0.5">{r.sub}</div>
        </div>
      ))}

      {suggestion && (
        <button
          onClick={() => suggestion.target ? router.push(suggestion.target) : suggestion.onClick?.()}
          className="ml-1 px-2.5 py-1.5 ring-1 ring-ink-200 rounded-md bg-white hover:bg-ink-50 text-[11.5px] text-ink-700 flex items-center gap-1.5 self-start"
        >
          <Icon name={suggestion.icon ?? "arrowRight"} className="w-3.5 h-3.5 text-ink-500" />
          <span>{suggestion.label}</span>
        </button>
      )}

      <div className="text-[10px] text-ink-400 ml-1">{time}</div>
    </div>
  );
}
