"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/Button";

const FEATURE_KEYS = ["monitoring", "analysis", "alerts"] as const;

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
      <section className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          {t("home.hero.title")}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-500">
          {t("home.hero.subtitle")}
        </p>
        <div className="mt-10">
          <Button size="lg">
            <Link href="/dashboard">{t("home.hero.cta")}</Link>
          </Button>
        </div>
      </section>

      <section className="mt-24 grid gap-8 sm:grid-cols-3">
        {FEATURE_KEYS.map((key) => (
          <div key={key} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900">
              {t(`home.features.${key}.title`)}
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {t(`home.features.${key}.description`)}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
