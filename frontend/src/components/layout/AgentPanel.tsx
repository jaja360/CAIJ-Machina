"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Message } from "./Message";
import { useAgent } from "@/context/AgentContext";
import { useLanguage } from "@/context/LanguageContext";

export function AgentPanel() {
  const { messages, status, quickActions, isCollapsed, setCollapsed, sendMessage } = useAgent();
  const { t } = useLanguage();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput("");
  };

  if (isCollapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        title={t("agent.open")}
        className="h-screen w-[44px] shrink-0 border-l border-ink-100 bg-white hover:bg-ink-50 flex flex-col items-center py-4 gap-3"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-800 grid place-items-center text-white">
          <Icon name="sparkles" className="w-4 h-4" strokeWidth={2} />
        </div>
        <div className="text-[10px] [writing-mode:vertical-rl] rotate-180 tracking-[0.18em] uppercase text-ink-500 font-medium">
          {t("agent.name")}
        </div>
        {/* Live indicator */}
        <div className="mt-auto w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
      </button>
    );
  }

  return (
    <aside className="h-screen w-[316px] shrink-0 border-l border-ink-100 bg-white flex flex-col animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-ink-100">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-800 grid place-items-center text-white shrink-0">
          <Icon name="sparkles" className="w-4 h-4" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-semibold text-ink-900">{t("agent.name")}</div>
          <div className="text-[10.5px] text-ink-500 flex items-center gap-1.5 mt-0.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot shrink-0" />
            <span className="truncate">{status || t("agent.defaultStatus")}</span>
          </div>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          title={t("agent.collapse")}
          className="text-ink-400 hover:text-ink-700 p-1 rounded"
        >
          <Icon name="panelRight" className="w-4 h-4" />
        </button>
      </div>

      {/* Chat messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2.5">
        {messages.map((m, i) => <Message key={i} {...m} />)}
      </div>

      {/* Quick actions */}
      {quickActions && quickActions.length > 0 && (
        <div className="px-2.5 py-2 border-t border-ink-100 flex flex-wrap gap-1.5">
          {quickActions.map((qa, i) => (
            <button
              key={i}
              onClick={qa.onClick}
              className="text-[10.5px] px-2.5 py-1 rounded-full ring-1 ring-ink-200 text-ink-600 hover:bg-ink-50 inline-flex items-center gap-1"
            >
              {qa.icon && <Icon name={qa.icon} className="w-3 h-3" />}
              {qa.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={submit} className="px-3 py-2.5 border-t border-ink-100 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("agent.placeholder")}
          className="flex-1 text-[12px] px-3 py-2 rounded-md bg-ink-50 ring-1 ring-transparent focus:ring-brand-300 focus:bg-white outline-none placeholder:text-ink-400"
        />
        <button
          type="submit"
          className="w-8 h-8 rounded-md bg-brand-700 text-white grid place-items-center hover:bg-brand-800 shrink-0"
        >
          <Icon name="arrowUp" className="w-4 h-4" strokeWidth={2.2} />
        </button>
      </form>
    </aside>
  );
}
