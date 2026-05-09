"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useLanguage } from "@/context/LanguageContext";
import { MOCK_USER } from "@/data/mockData";

type FreqId   = "rt" | "day" | "week";
type NotifId  = "mail" | "mobile" | "slack" | "teams";

const FREQ_OPTIONS: Array<{ id: FreqId; icon: string }> = [
  { id: "rt",   icon: "bolt"     },
  { id: "day",  icon: "sun"      },
  { id: "week", icon: "calendar" },
];

const NOTIF_OPTIONS: Array<{ id: NotifId; icon: string }> = [
  { id: "mail",   icon: "mail"  },
  { id: "mobile", icon: "phone" },
  { id: "slack",  icon: "chat"  },
  { id: "teams",  icon: "users" },
];

export function AlertConfigTab() {
  const { t } = useLanguage();
  const [freq, setFreq]     = useState<FreqId>("rt");
  const [notifs, setNotifs] = useState<Record<NotifId, boolean>>({
    mail: true, mobile: true, slack: false, teams: false,
  });

  return (
    <section>
      <h3 className="text-[14px] font-bold tracking-tight text-ink-900">{t("settings.alertConfig.title")}</h3>
      <p className="text-[11.5px] text-ink-500 mt-0.5 mb-3">{t("settings.alertConfig.description")}</p>

      <div className="grid grid-cols-2 gap-3">
        {/* Frequency */}
        <div className="bg-white ring-1 ring-ink-100 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 bg-ink-50/60 border-b border-ink-100 text-[11px] font-semibold text-ink-900 flex items-center gap-1.5">
            <Icon name="clock" className="w-3.5 h-3.5 text-ink-500" />
            {t("settings.alertConfig.freqHeader")}
          </div>
          {FREQ_OPTIONS.map((o) => {
            const sel = freq === o.id;
            return (
              <button
                key={o.id}
                onClick={() => setFreq(o.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${sel ? "bg-brand-50/50" : "hover:bg-ink-50/60"}`}
              >
                <Icon name={o.icon} className="w-4 h-4 text-ink-500" />
                <div className="flex-1">
                  <div className="text-[12px] text-ink-900">{t(`settings.alertConfig.freq.${o.id}.label`)}</div>
                  <div className="text-[10.5px] text-ink-500 mt-0.5">{t(`settings.alertConfig.freq.${o.id}.sub`)}</div>
                </div>
                <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${sel ? "bg-brand-700 ring-4 ring-brand-200" : "ring-1 ring-ink-300"}`} />
              </button>
            );
          })}
        </div>

        {/* Notifications */}
        <div className="bg-white ring-1 ring-ink-100 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 bg-ink-50/60 border-b border-ink-100 text-[11px] font-semibold text-ink-900 flex items-center gap-1.5">
            <Icon name="bell" className="w-3.5 h-3.5 text-ink-500" />
            {t("settings.alertConfig.notifsHeader")}
          </div>
          {NOTIF_OPTIONS.map((o) => {
            const on = notifs[o.id];
            const sub = o.id === "mail"
              ? t(`settings.alertConfig.notifs.${o.id}.sub`, { email: `${MOCK_USER.firstName.toLowerCase()}.tremblay@lexveille.ca` })
              : t(`settings.alertConfig.notifs.${o.id}.sub`);
            return (
              <button
                key={o.id}
                onClick={() => setNotifs({ ...notifs, [o.id]: !on })}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${on ? "bg-brand-50/40" : "hover:bg-ink-50/60"}`}
              >
                <Icon name={o.icon} className="w-4 h-4 text-ink-500" />
                <div className="flex-1">
                  <div className="text-[12px] text-ink-900">{t(`settings.alertConfig.notifs.${o.id}.label`)}</div>
                  <div className="text-[10.5px] text-ink-500 mt-0.5">{sub}</div>
                </div>
                <span className={`w-3.5 h-3.5 rounded-[3px] shrink-0 grid place-items-center ${on ? "bg-brand-700" : "ring-1 ring-ink-300"}`}>
                  {on && <Icon name="check" className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
