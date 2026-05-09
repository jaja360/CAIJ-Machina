"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Btn } from "@/components/ui/Btn";
import { DomainsTab } from "@/components/features/parametres/DomainsTab";
import { KeywordsTab } from "@/components/features/parametres/KeywordsTab";
import { AlertConfigTab } from "@/components/features/parametres/AlertConfigTab";
import { SourcesTab } from "@/components/features/parametres/SourcesTab";
import { ClientsTab } from "@/components/features/parametres/ClientsTab";
import { useLanguage } from "@/context/LanguageContext";
import { MOCK_DOMAINS, MOCK_KEYWORDS, MOCK_SOURCES } from "@/data/mockData";
import type { WatchSource } from "@/types";
import type { DomainConfig } from "@/types";

type TabId = "domains" | "keywords" | "freq" | "sources" | "clients";

interface NavSection {
  section: string;
  tabs: { id: TabId; label: string }[];
}

export default function ParametresPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabId>("domains");
  const [domains, setDomains] = useState<DomainConfig[]>(MOCK_DOMAINS);
  const [keywords, setKeywords] = useState<string[]>(MOCK_KEYWORDS);
  const [sources, setSources] = useState(MOCK_SOURCES);
  const [dirty, setDirty] = useState(false);

  const markDirty = () => setDirty(true);

  const navSections: NavSection[] = [
    {
      section: t("settings.navSections.veille"),
      tabs: [
        { id: "domains",  label: t("settings.tabs.domains")  },
        { id: "keywords", label: t("settings.tabs.keywords") },
        { id: "sources",  label: t("settings.tabs.sources")  },
      ],
    },
    {
      section: t("settings.navSections.alertes"),
      tabs: [
        { id: "freq", label: t("settings.tabs.freq") },
      ],
    },
    {
      section: t("settings.navSections.dossiers"),
      tabs: [
        { id: "clients", label: t("settings.tabs.clients") },
      ],
    },
  ];

  return (
    <>
      <TopBar
        title={t("settings.title")}
        subtitle={t("settings.subtitle")}
      />

      <div className="flex-1 grid grid-cols-[200px_1fr] overflow-hidden min-h-0">
        {/* Left nav */}
        <nav className="border-r border-ink-100 bg-ink-50/40 overflow-y-auto py-4 px-3 flex flex-col gap-4">
          {navSections.map(({ section, tabs }) => (
            <div key={section}>
              <div className="text-[9.5px] font-semibold tracking-[0.1em] uppercase text-ink-400 px-2 mb-1">
                {section}
              </div>
              {tabs.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-[12px] transition-colors ${
                    activeTab === id
                      ? "bg-white shadow-soft text-ink-900 font-semibold ring-1 ring-ink-100"
                      : "text-ink-600 hover:text-ink-900 hover:bg-white/60"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Tab content */}
        <div className="overflow-y-auto min-h-0 px-6 py-5">
          {activeTab === "domains" && (
            <DomainsTab
              domains={domains}
              onChange={(d) => { setDomains(d); markDirty(); }}
            />
          )}
          {activeTab === "keywords" && (
            <KeywordsTab
              keywords={keywords}
              onChange={(kw) => { setKeywords(kw); markDirty(); }}
            />
          )}
          {activeTab === "freq" && (
            <AlertConfigTab />
          )}
          {activeTab === "sources" && (
            <SourcesTab
              sources={sources}
              onChange={(updated: WatchSource[]) => { setSources(updated); markDirty(); }}
            />
          )}
          {activeTab === "clients" && (
            <ClientsTab />
          )}
        </div>
      </div>

      <div className="px-6 py-3 border-t border-ink-100 bg-white flex items-center justify-between shrink-0">
        <span className="text-[11.5px] text-ink-500">
          {dirty ? t("settings.footer.unsaved") : ""}
        </span>
        <div className="flex items-center gap-2">
          <Btn onClick={() => setDirty(false)}>{t("settings.footer.cancel")}</Btn>
          <Btn variant="primary" onClick={() => setDirty(false)}>
            {t("settings.footer.save")}
          </Btn>
        </div>
      </div>
    </>
  );
}
