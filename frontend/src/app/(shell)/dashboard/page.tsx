"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { KpiStrip } from "@/components/features/dashboard/KpiStrip";
import type { KpiFilter } from "@/components/features/dashboard/KpiStrip";
import { AlertCard } from "@/components/features/dashboard/AlertCard";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth, userDisplay } from "@/context/AuthContext";
import { MOCK_ALERTS, MOCK_USER } from "@/data/mockData";
import { fetchAlerts } from "@/services/alertsService";
import { fetchKpi } from "@/services/kpiService";
import type { AlertItem } from "@/types";
import type { KpiData } from "@/lib/api";

function UserMenu() {
  const { language, setLanguage, t } = useLanguage();
  const { user, isAuthenticated, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const display = isAuthenticated && user
    ? userDisplay(user, MOCK_USER.role)
    : { name: MOCK_USER.name, initials: MOCK_USER.initials, role: MOCK_USER.role };

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <div className="text-[12px] font-semibold text-ink-900">{display.name}</div>
        <div className="text-[10.5px] text-ink-500">{display.role}</div>
      </div>
      <div className="relative" ref={ref}>
        <button onClick={() => setOpen((v) => !v)}>
          <Avatar initials={display.initials} />
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1.5 w-40 bg-white rounded-lg shadow-pop ring-1 ring-ink-100 py-1 z-50 animate-fade-in">
            <div className="px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-ink-400">
              Langue / Language
            </div>
            <div className="flex gap-1 px-2 pb-2">
              {(["fr", "en"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => { setLanguage(lang); setOpen(false); }}
                  className={`flex-1 py-1 rounded text-[12px] font-semibold transition-colors ${
                    language === lang ? "bg-brand-700 text-white" : "text-ink-600 hover:bg-ink-100"
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
            {isAuthenticated && (
              <>
                <div className="h-px bg-ink-100 mx-2 mb-1" />
                <button
                  onClick={() => { logout(); setOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-[12px] text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Icon name="arrowLeft" className="w-3 h-3" />
                  {t("nav.settings") === "Paramètres" ? "Déconnexion" : "Sign out"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const { user, token, isAuthenticated } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState<KpiFilter>("all");
  const [alerts, setAlerts] = useState<AlertItem[]>(MOCK_ALERTS);
  const [kpi, setKpi] = useState<KpiData | null>(null);

  // Fetch real data from Go when authenticated
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      const [backendAlerts, backendKpi] = await Promise.all([
        fetchAlerts(token),
        fetchKpi(token),
      ]);
      if (cancelled) return;
      if (backendAlerts) setAlerts(backendAlerts);
      if (backendKpi) setKpi(backendKpi);
    })();
    return () => { cancelled = true; };
  }, [token]);

  const display = isAuthenticated && user
    ? userDisplay(user, MOCK_USER.role)
    : { name: MOCK_USER.name, initials: MOCK_USER.initials, role: MOCK_USER.role };

  const critical = alerts.filter((a) => a.severity === "critical");
  const high     = alerts.filter((a) => a.severity === "high");

  const visibleCritical = critical;
  const visibleHigh     = filter === "critical" ? [] : high;

  return (
    <>
      <TopBar
        title={t("dashboard.greeting", { name: display.name })}
        subtitle={t("dashboard.subtitle", { count: alerts.length })}
        right={
          <div className="flex items-center gap-3">
            <button className="text-ink-400 hover:text-ink-700">
              <Icon name="search" className="w-4 h-4" />
            </button>
            <UserMenu />
          </div>
        }
      />

      <KpiStrip
        activeFilter={filter}
        onFilter={setFilter}
        totalCount={kpi?.alerts_24h ?? alerts.length}
        criticalCount={critical.length}
      />

      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
        <section>
          <SectionLabel
            right={
              <span className="text-[10.5px] text-ink-500 px-2 py-0.5 bg-ink-50 rounded-full ring-1 ring-ink-100">
                {visibleCritical.length}
              </span>
            }
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            {t("dashboard.sections.critical")}
          </SectionLabel>
          <div className="flex flex-col gap-2">
            {visibleCritical.map((a) => (
              <AlertCard key={a.id} alert={a} onClick={() => router.push(`/alertes/${a.id}`)} />
            ))}
          </div>
        </section>

        {visibleHigh.length > 0 && (
          <section>
            <SectionLabel
              right={
                <span className="text-[10.5px] text-ink-500 px-2 py-0.5 bg-ink-50 rounded-full ring-1 ring-ink-100">
                  {visibleHigh.length}
                </span>
              }
            >
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              {t("dashboard.sections.high")}
            </SectionLabel>
            <div className="flex flex-col gap-2">
              {visibleHigh.map((a) => (
                <AlertCard key={a.id} alert={a} onClick={() => router.push(`/alertes/${a.id}`)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
