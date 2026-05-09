"use client";

import {
  createContext, useCallback, useContext, useMemo, useState,
} from "react";
import { usePathname } from "next/navigation";
import type { AgentMessage, AgentTranscript, QuickAction } from "@/types";
import { MOCK_TRANSCRIPTS } from "@/data/mockData";

interface AgentContextValue {
  messages: AgentMessage[];
  status: string;
  quickActions?: QuickAction[];
  isCollapsed: boolean;
  setCollapsed: (v: boolean) => void;
  sendMessage: (text: string) => void;
}

const AgentContext = createContext<AgentContextValue | null>(null);

/** Derive transcript key from the current URL pathname */
function routeKey(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean)[0] ?? "dashboard";
  // Map plural URL segments back to transcript keys
  if (seg === "alertes") return "alertes";
  return seg;
}

function timestamp(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

const AGENT_REPLY = "Compris. Je traite votre demande et reviens vers vous avec une réponse contextuelle dans quelques instants.";

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const key = routeKey(pathname);

  const [chats, setChats] = useState<Record<string, AgentTranscript>>(MOCK_TRANSCRIPTS);
  const [isCollapsed, setCollapsed] = useState(false);

  const transcript = chats[key] ?? chats.dashboard;

  // Inject onClick handlers for suggestions that reference a target route
  const messages = useMemo(
    () =>
      (transcript.messages ?? []).map((m) => {
        if (m.suggestion?.target) {
          return {
            ...m,
            suggestion: {
              ...m.suggestion,
              // onClick is handled at the Message component level via next/navigation
            },
          };
        }
        return m;
      }),
    [transcript]
  );

  const sendMessage = useCallback(
    (text: string) => {
      const time = timestamp();
      setChats((prev) => {
        const tr = prev[key] ?? { messages: [], status: "" };
        return {
          ...prev,
          [key]: { ...tr, messages: [...tr.messages, { role: "user", content: text, time }] },
        };
      });

      // Simulated agent reply after 700 ms
      setTimeout(() => {
        setChats((prev) => {
          const tr = prev[key] ?? { messages: [], status: "" };
          return {
            ...prev,
            [key]: {
              ...tr,
              messages: [...tr.messages, { role: "agent", content: AGENT_REPLY, time }],
            },
          };
        });
      }, 700);
    },
    [key]
  );

  const value = useMemo(
    () => ({
      messages,
      status: transcript.status,
      quickActions: transcript.quickActions,
      isCollapsed,
      setCollapsed,
      sendMessage,
    }),
    [messages, transcript.status, transcript.quickActions, isCollapsed, sendMessage]
  );

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}

export function useAgent(): AgentContextValue {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error("useAgent must be used inside AgentProvider");
  return ctx;
}
