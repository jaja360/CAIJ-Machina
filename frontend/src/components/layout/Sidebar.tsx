"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useLanguage } from "@/context/LanguageContext";

interface NavItem {
  id: string;
  href: string;
  labelKey: string;
  icon: string;
  section: "veille" | "gestion";
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", href: "/dashboard",  labelKey: "nav.items.dashboard", icon: "dashboard", section: "veille"  },
  { id: "alertes",   href: "/alertes",    labelKey: "nav.items.alertes",   icon: "bell",      section: "veille"  },
  { id: "contrats",  href: "/contrats",   labelKey: "nav.items.contrats",  icon: "fileText",  section: "veille"  },
  { id: "clients",   href: "/notifier",   labelKey: "nav.items.clients",   icon: "users",     section: "gestion" },
  { id: "historique",href: "/historique", labelKey: "nav.items.historique",icon: "history",   section: "gestion" },
];

const SECTIONS: Array<"veille" | "gestion"> = ["veille", "gestion"];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { t } = useLanguage();
  const pathname = usePathname();

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <aside
      className={[
        "relative h-screen bg-ink-900 text-white flex flex-col transition-[width] duration-300 ease-out shrink-0",
        collapsed ? "w-[60px]" : "w-[212px]",
      ].join(" ")}
    >
      {/* Brand */}
      <div className={`px-3.5 pt-4 pb-3 border-b border-white/5 ${collapsed ? "flex justify-center" : ""}`}>
        {collapsed ? (
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-brand-400 to-brand-700 grid place-items-center">
            <Icon name="shield" className="w-4 h-4 text-white" strokeWidth={2.4} />
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-brand-400 to-brand-700 grid place-items-center">
                <Icon name="shield" className="w-3.5 h-3.5 text-white" strokeWidth={2.4} />
              </div>
              <div className="text-[14px] font-semibold tracking-tight">{t("app.name")}</div>
            </div>
            <div className="mt-1 text-[9.5px] uppercase tracking-[0.1em] text-white/40 ml-8">
              {t("app.domain")}
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {SECTIONS.map((sec) => (
          <div key={sec} className="mb-1">
            {!collapsed && (
              <div className="px-4 pt-2 pb-1 text-[9.5px] uppercase tracking-[0.1em] text-white/30">
                {t(`nav.sections.${sec}`)}
              </div>
            )}
            {NAV_ITEMS.filter((i) => i.section === sec).map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  title={collapsed ? t(item.labelKey) : undefined}
                  className={[
                    "w-full flex items-center gap-2.5 text-[12.5px] transition-colors border-l-2",
                    collapsed ? "justify-center px-2 py-2.5" : "px-4 py-2",
                    active
                      ? "bg-white/10 text-white border-brand-400 font-medium"
                      : "text-white/55 border-transparent hover:bg-white/5 hover:text-white/90",
                  ].join(" ")}
                >
                  <Icon name={item.icon} className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Settings */}
      <div className="border-t border-white/5">
        <Link
          href="/parametres"
          className={[
            "w-full flex items-center gap-2.5 text-[12.5px] transition-colors border-l-2",
            collapsed ? "justify-center px-2 py-2.5" : "px-4 py-2.5",
            pathname.startsWith("/parametres")
              ? "border-brand-400 bg-white/10 text-white font-medium"
              : "border-transparent text-white/55 hover:text-white/90 hover:bg-white/5",
          ].join(" ")}
        >
          <Icon name="settings" className="w-4 h-4 shrink-0" />
          {!collapsed && <span>{t("nav.settings")}</span>}
        </Link>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        title={collapsed ? t("nav.expand") : t("nav.collapse")}
        className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-white ring-1 ring-ink-200 shadow-soft text-ink-600 hover:text-brand-700 grid place-items-center z-10"
      >
        <Icon
          name={collapsed ? "chevronRight" : "chevronLeft"}
          className="w-3 h-3"
          strokeWidth={2.5}
        />
      </button>
    </aside>
  );
}
