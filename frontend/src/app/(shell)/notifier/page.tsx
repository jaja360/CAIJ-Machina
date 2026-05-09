"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Btn } from "@/components/ui/Btn";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { StepProgress } from "@/components/features/notifier/StepProgress";
import { EmailComposer } from "@/components/features/notifier/EmailComposer";
import { useLanguage } from "@/context/LanguageContext";
import { MOCK_NOTIFIER_CLIENTS } from "@/data/mockData";

export default function NotifierPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [clientIndex, setClientIndex] = useState(0);
  const [sent, setSent] = useState(false);

  const client = MOCK_NOTIFIER_CLIENTS[clientIndex];
  const isLast = clientIndex === MOCK_NOTIFIER_CLIENTS.length - 1;
  const remaining = MOCK_NOTIFIER_CLIENTS.length - 1 - clientIndex;
  const activeStep = sent ? 5 : 4;

  function handleNextClient() {
    if (isLast) {
      router.push("/contrats");
    } else {
      setClientIndex(clientIndex + 1);
      setSent(false);
    }
  }

  return (
    <>
      {/* Stepper header */}
      <div className="px-6 py-3 bg-white border-b border-ink-100 shrink-0">
        <button
          onClick={() => router.push("/contrats")}
          className="flex items-center gap-1.5 text-[11.5px] text-ink-500 hover:text-ink-800 mb-3"
        >
          <Icon name="arrowLeft" className="w-3.5 h-3.5" />
          {t("notify.back", { id: client.contractId })}
        </button>
        <StepProgress activeStep={activeStep} />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
        {/* Client card */}
        <section>
          <div className="text-[10.5px] font-semibold tracking-[0.08em] uppercase text-ink-500 mb-2">
            {t("notify.sections.client")}
          </div>
          <div className="bg-white ring-1 ring-ink-100 rounded-lg px-4 py-3 flex items-center gap-3">
            <Avatar initials={client.initials} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-ink-900">{client.name}</div>
              <div className="text-[11px] text-ink-500 mt-0.5">{client.email} · {client.phone}</div>
            </div>
            <Chip variant="critical">{t("notify.chip.urgent")}</Chip>
          </div>
        </section>

        {/* Attachment */}
        <section>
          <div className="text-[10.5px] font-semibold tracking-[0.08em] uppercase text-ink-500 mb-2">
            {t("notify.sections.attachment")}
          </div>
          <div className="bg-ink-50/60 ring-1 ring-ink-100 rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-white ring-1 ring-ink-200 grid place-items-center text-brand-700">
              <Icon name="fileText" className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-ink-900">
                Avenant no 1 — {client.contractId} (glyphosate ARLA 2025).docx
              </div>
              <div className="text-[10.5px] text-ink-500">
                {t("notify.attachment.meta", { count: 2 })}
              </div>
            </div>
            <Btn>{t("notify.email.preview")}</Btn>
          </div>
        </section>

        {/* Email composer */}
        <section>
          <div className="text-[10.5px] font-semibold tracking-[0.08em] uppercase text-ink-500 mb-2">
            {t("notify.sections.email")}
          </div>
          <EmailComposer email={client.email_draft} onSent={() => setSent(true)} />
        </section>
      </div>

      <div className="px-6 py-3 border-t border-ink-100 bg-white flex items-center justify-between shrink-0">
        <span className="text-[11.5px] text-ink-600">
          {sent && <span className="text-emerald-700 font-medium mr-2">{t("notify.footer.sent")}</span>}
          {remaining > 0 && t("notify.footer.remaining", { count: remaining })}
        </span>
        <Btn onClick={handleNextClient}>
          {isLast ? t("contract.actions.next") : t("notify.footer.nextClient")}
          <Icon name="arrowRight" className="w-3.5 h-3.5" />
        </Btn>
      </div>
    </>
  );
}
