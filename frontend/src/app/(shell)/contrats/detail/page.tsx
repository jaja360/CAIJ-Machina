"use client";

import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { Btn } from "@/components/ui/Btn";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { ClauseCard } from "@/components/features/contrats/ClauseCard";
import { ActionList } from "@/components/features/contrats/ActionList";
import { useLanguage } from "@/context/LanguageContext";
import { MOCK_CONTRACT } from "@/data/mockData";

export default function ContratDetailPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const c = MOCK_CONTRACT;

  return (
    <>
      <TopBar
        back={{ label: t("contract.back"), onClick: () => router.push("/contrats") }}
        right={
          <>
            <Btn>
              <Icon name="download" className="w-3.5 h-3.5" />
              {t("contract.actions.exportAmendment")}
            </Btn>
            <Btn variant="primary" onClick={() => router.push("/notifier")}>
              <Icon name="send" className="w-3.5 h-3.5" />
              {t("contract.actions.notify")}
            </Btn>
          </>
        }
      />

      <div className="px-6 py-4 bg-white border-b border-ink-100 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Chip variant="critical">
            {t("contract.labels.clausesToModify", { count: c.clausesToModify })}
          </Chip>
          <Chip variant="pest">Pesticides</Chip>
          <span className="font-mono text-[10.5px] text-ink-500 ml-1">{c.id}</span>
        </div>
        <div className="text-[16px] font-bold tracking-tight text-ink-900">{c.title}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11.5px] text-ink-500">
          <span className="flex items-center gap-1">
            <Icon name="user" className="w-3.5 h-3.5" />
            {c.client} · {c.email}
          </span>
          <span className="flex items-center gap-1">
            <Icon name="calendar" className="w-3.5 h-3.5" />
            {t("contract.labels.signed", { date: c.signedOn })}
          </span>
          <span className="flex items-center gap-1 text-red-700">
            <Icon name="warning" className="w-3.5 h-3.5" />
            {t("contract.labels.actionRequired", { date: c.deadline })}
          </span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 overflow-hidden min-h-0">
        <div className="overflow-y-auto min-h-0 h-full px-5 py-4 border-r border-ink-100 flex flex-col gap-3">
          <div className="text-[10.5px] font-semibold tracking-[0.08em] uppercase text-ink-500">
            {t("contract.labels.clausesTitle")}
          </div>
          {c.clauses.map((cl) => <ClauseCard key={cl.id} clause={cl} />)}
        </div>
        <div className="overflow-y-auto min-h-0 h-full px-5 py-4">
          <ActionList actions={c.actions} note={c.note} />
        </div>
      </div>

      <div className="px-6 py-3 border-t border-ink-100 bg-white flex items-center justify-between shrink-0">
        <span className="text-[11.5px] text-ink-600">
          {t("contract.labels.nextLabel", { label: "Coop Agri-Nord — LXV-AGR-2022-031" })}
        </span>
        <Btn>
          {t("contract.actions.next")}
          <Icon name="arrowRight" className="w-3.5 h-3.5" />
        </Btn>
      </div>
    </>
  );
}
