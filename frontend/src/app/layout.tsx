import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";

export const metadata: Metadata = {
  title: "LexVeille — Intelligence juridique en temps réel",
  description: "Surveillance juridique et réglementaire propulsée par l'IA.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <body className="h-full font-sans antialiased bg-ink-50 text-ink-900">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
