"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Language } from "@/types";
import en from "@/assets/locales/en.json";
import fr from "@/assets/locales/fr.json";

const dictionaries = { en, fr } as const;

function deepGet(obj: Record<string, unknown>, path: string): string {
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
  return typeof value === "string" ? value : path;
}

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  /** Translate key with optional {{param}} interpolation */
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("fr");

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let result = deepGet(dictionaries[language] as Record<string, unknown>, key);
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          result = result.replaceAll(`{{${k}}}`, String(v));
        }
      }
      return result;
    },
    [language]
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
