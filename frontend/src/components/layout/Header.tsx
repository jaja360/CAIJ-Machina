"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageToggle } from "@/components/features/LanguageToggle";

export function Header() {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-bold text-blue-700 text-lg">
          <span className="text-2xl">⚖️</span>
          {t("app.name")}
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
            {t("nav.home")}
          </Link>
          <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
            {t("nav.dashboard")}
          </Link>
          <Link href="/sources" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
            {t("nav.sources")}
          </Link>
        </nav>

        <LanguageToggle />
      </div>
    </header>
  );
}
