"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { AlertCard } from "@/components/features/dashboard/AlertCard";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { MOCK_ALERTS } from "@/data/mockData";
import { fetchAlerts } from "@/services/alertsService";
import type { AlertItem } from "@/types";

export default function AlertesPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { token } = useAuth();
  const [alerts, setAlerts] = useState<AlertItem[]>(MOCK_ALERTS);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      const data = await fetchAlerts(token);
      if (!cancelled && data) setAlerts(data);
    })();
    return () => { cancelled = true; };
  }, [token]);

  const critical = alerts.filter((a) => a.severity === "critical");
  const high     = alerts.filter((a) => a.severity === "high");
  const low      = alerts.filter((a) => a.severity === "low" || a.severity === "medium");

  return (
    <>
      <TopBar
        title={t("nav.items.alertes")}
        subtitle={t("dashboard.subtitle", { count: alerts.length })}
      />

      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
        {critical.length > 0 && (
          <section>
            <SectionLabel
              right={
                <span className="text-[10.5px] text-ink-500 px-2 py-0.5 bg-ink-50 rounded-full ring-1 ring-ink-100">
                  {critical.length}
                </span>
              }
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {t("dashboard.sections.critical")}
            </SectionLabel>
            <div className="flex flex-col gap-2">
              {critical.map((a) => (
                <AlertCard key={a.id} alert={a} onClick={() => router.push(`/alertes/${a.id}`)} />
              ))}
            </div>
          </section>
        )}

        {high.length > 0 && (
          <section>
            <SectionLabel
              right={
                <span className="text-[10.5px] text-ink-500 px-2 py-0.5 bg-ink-50 rounded-full ring-1 ring-ink-100">
                  {high.length}
                </span>
              }
            >
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              {t("dashboard.sections.high")}
            </SectionLabel>
            <div className="flex flex-col gap-2">
              {high.map((a) => (
                <AlertCard key={a.id} alert={a} onClick={() => router.push(`/alertes/${a.id}`)} />
              ))}
            </div>
          </section>
        )}

        {low.length > 0 && (
          <section>
            <SectionLabel
              right={
                <span className="text-[10.5px] text-ink-500 px-2 py-0.5 bg-ink-50 rounded-full ring-1 ring-ink-100">
                  {low.length}
                </span>
              }
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              {t("dashboard.sections.low")}
            </SectionLabel>
            <div className="flex flex-col gap-2">
              {low.map((a) => (
                <AlertCard key={a.id} alert={a} onClick={() => router.push(`/alertes/${a.id}`)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
