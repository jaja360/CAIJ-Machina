"use client";

import { useState } from "react";
import { Btn } from "@/components/ui/Btn";
import { Icon } from "@/components/ui/Icon";
import { useLanguage } from "@/context/LanguageContext";
import type { DraftEmail } from "@/types";

interface EmailComposerProps {
  email: DraftEmail;
  onSent?: () => void;
}

export function EmailComposer({ email: e, onSent }: EmailComposerProps) {
  const { t } = useLanguage();
  const [body, setBody] = useState(e.body);
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    setSent(true);
    onSent?.();
  };

  const fields: Array<[string, string]> = [
    [t("notify.email.to"),      e.to],
    [t("notify.email.cc"),      e.cc],
    [t("notify.email.subject"), e.subject],
  ];

  return (
    <div className="bg-white ring-1 ring-ink-100 rounded-lg overflow-hidden">
      {fields.map(([label, value]) => (
        <div key={label} className="flex gap-3 px-4 py-2 border-b border-ink-100 text-[12px]">
          <span className="text-ink-500 w-12 shrink-0">{label}</span>
          <span className="text-ink-900 flex-1 min-w-0 break-words">{value}</span>
        </div>
      ))}

      <textarea
        value={body}
        onChange={(ev) => setBody(ev.target.value)}
        className="w-full px-4 py-3 text-[12.5px] text-ink-700 leading-relaxed font-sans bg-white outline-none resize-none"
        rows={14}
      />

      <div className="flex items-center justify-between px-4 py-2.5 bg-ink-50/60 border-t border-ink-100">
        <div className="text-[10.5px] text-ink-500 flex items-center gap-1.5">
          <Icon name="sparkles" className="w-3.5 h-3.5 text-brand-600" />
          {t("notify.email.aiDisclaimer")}
        </div>
        <div className="flex items-center gap-2">
          <Btn>
            <Icon name="edit" className="w-3.5 h-3.5" />
            {t("notify.email.edit")}
          </Btn>
          <Btn variant="primary" onClick={handleSend} disabled={sent}>
            {sent ? (
              <>
                <Icon name="check" className="w-3.5 h-3.5" strokeWidth={2.4} />
                {t("notify.email.sent")}
              </>
            ) : (
              <>
                <Icon name="send" className="w-3.5 h-3.5" />
                {t("notify.email.send")}
              </>
            )}
          </Btn>
        </div>
      </div>
    </div>
  );
}
