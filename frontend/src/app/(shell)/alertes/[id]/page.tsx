"use client";

import { useParams, useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { Btn } from "@/components/ui/Btn";
import { Icon } from "@/components/ui/Icon";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { AlertBanner } from "@/components/features/alertes/AlertBanner";
import { ModificationCard } from "@/components/features/alertes/ModificationCard";
import { useLanguage } from "@/context/LanguageContext";
import { MOCK_ALERTS } from "@/data/mockData";

export default function AlertDetailPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const alert = MOCK_ALERTS.find((a) => a.id === id) ?? MOCK_ALERTS[0];
  const mods = alert.modifications ?? [];

  return (
    <>
      <TopBar
        back={{ label: t("alert.back"), onClick: () => router.push("/dashboard") }}
        right={
          <>
            <Btn>
              <Icon name="download" className="w-3.5 h-3.5" />
              {t("alert.actions.export")}
            </Btn>
            <Btn variant="primary" onClick={() => router.push("/contrats")}>
              <Icon name="fileText" className="w-3.5 h-3.5" />
              {t("alert.actions.viewContracts")}
            </Btn>
          </>
        }
      />

      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
        <AlertBanner alert={alert} />

        {mods.length > 0 && (
          <section>
            <SectionLabel>{t("alert.sections.modifications")}</SectionLabel>
            <div className="flex flex-col gap-2.5">
              {mods.map((m, i) => <ModificationCard key={i} mod={m} />)}
            </div>
          </section>
        )}
      </div>

      <div className="px-6 py-3 border-t border-ink-100 bg-white flex items-center justify-between shrink-0">
        <div className="text-[11.5px] text-ink-600">
          {t("alert.footer", { contracts: alert.contracts, clients: alert.clients })}
          {" "}<span className="text-red-700 font-semibold">{alert.deadline}</span>
        </div>
        <Btn variant="primary" onClick={() => router.push("/contrats")}>
          <Icon name="fileText" className="w-3.5 h-3.5" />
          {t("alert.actions.openContract")}
        </Btn>
      </div>
    </>
  );
}
