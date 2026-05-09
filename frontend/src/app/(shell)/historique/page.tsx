"use client";

import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { Icon } from "@/components/ui/Icon";
import { useLanguage } from "@/context/LanguageContext";

export default function HistoriquePage() {
  const { t } = useLanguage();
  const router = useRouter();

  return (
    <>
      <TopBar title={t("history.title")} subtitle={t("history.subtitle")} />

      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-ink-100 grid place-items-center text-ink-400">
          <Icon name="clock" className="w-6 h-6" />
        </div>
        <div>
          <div className="text-[15px] font-bold text-ink-900">{t("history.comingSoon")}</div>
          <p className="text-[12px] text-ink-500 mt-1 max-w-xs">{t("history.description")}</p>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="text-[11.5px] text-ink-500 hover:text-ink-800 mt-2"
        >
          {t("history.back")}
        </button>
      </div>
    </>
  );
}
