import { Icon } from "@/components/ui/Icon";
import { useLanguage } from "@/context/LanguageContext";
import { MOCK_CLIENTS } from "@/data/mockData";

export function ClientsTab() {
  const { t } = useLanguage();

  return (
    <section>
      <h3 className="text-[14px] font-bold tracking-tight text-ink-900">{t("settings.clients.title")}</h3>
      <p className="text-[11.5px] text-ink-500 mt-0.5 mb-3">{t("settings.clients.description")}</p>
      <div className="bg-white ring-1 ring-ink-100 rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 bg-ink-50/60 border-b border-ink-100 flex items-center justify-between">
          <div className="text-[11px] font-semibold text-ink-900 flex items-center gap-1.5">
            <Icon name="users" className="w-3.5 h-3.5 text-ink-500" />
            {t("settings.clients.header")}
          </div>
          <button className="text-[10.5px] text-brand-700 hover:text-brand-900 font-semibold flex items-center gap-1">
            <Icon name="plus" className="w-3 h-3" />
            {t("settings.clients.add")}
          </button>
        </div>
        {MOCK_CLIENTS.map((cl, i) => (
          <div key={cl.code} className={`flex items-center gap-3 px-4 py-2.5 ${i < MOCK_CLIENTS.length - 1 ? "border-b border-ink-100" : ""}`}>
            <div className={`w-7 h-7 rounded-full grid place-items-center text-[10px] font-bold shrink-0 ${cl.color}`}>
              {cl.code}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-ink-900 truncate">{cl.name}</div>
              <div className="text-[10.5px] text-ink-500 mt-0.5 truncate">{cl.detail}</div>
            </div>
            <span className="text-[10.5px] text-ink-500">
              {t("settings.clients.count", { count: cl.count })}
            </span>
            <button className="text-[10.5px] px-2.5 py-1 rounded-md ring-1 ring-ink-200 text-ink-700 hover:bg-ink-50">
              {t("settings.clients.manage")}
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2 px-4 py-2.5 text-[11.5px] text-ink-500 hover:bg-ink-50 cursor-pointer border-t border-ink-100">
          <Icon name="upload" className="w-3.5 h-3.5" />
          {t("settings.clients.import")}
        </div>
      </div>
    </section>
  );
}
