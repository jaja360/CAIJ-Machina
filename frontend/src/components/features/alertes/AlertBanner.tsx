import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import type { AlertItem } from "@/types";

interface AlertBannerProps {
  alert: AlertItem;
}

export function AlertBanner({ alert: a }: AlertBannerProps) {
  return (
    <div className="bg-white ring-1 ring-ink-100 rounded-lg overflow-hidden">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <Chip variant="critical">Critique</Chip>
          <Chip variant="pest">{a.domainLabel}</Chip>
          <span className="font-mono text-[10.5px] text-ink-400 ml-auto">
            ALR-{a.id.toUpperCase()}
          </span>
        </div>
        <div className="text-[18px] font-bold tracking-tight text-ink-900">{a.title}</div>
        {a.legislationRef && (
          <div className="mt-1 text-[11px] font-mono text-brand-700 font-medium">
            {a.legislationRef}
          </div>
        )}
        <div className="mt-1 text-[11.5px] text-ink-500 flex items-center gap-1.5">
          <Icon name="globe" className="w-3.5 h-3.5" />
          {a.sourceFull ?? a.source}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 border-t border-ink-100">
        {[
          { v: a.modCount,  l: "Modifications", cls: "text-red-700"              },
          { v: a.contracts, l: "Contrats",       cls: "text-orange-700"          },
          { v: a.clients,   l: "Clients",        cls: "text-ink-900"             },
          { v: a.deadline,  l: "Délai",          cls: "text-red-700 text-[14px]" },
        ].map((s, i) => (
          <div key={i} className={`px-5 py-3.5 ${i < 3 ? "border-r border-ink-100" : ""}`}>
            <div className={`text-[20px] font-bold tracking-tight ${s.cls}`}>{s.v}</div>
            <div className="text-[10.5px] text-ink-500 mt-0.5 uppercase tracking-wider">{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
