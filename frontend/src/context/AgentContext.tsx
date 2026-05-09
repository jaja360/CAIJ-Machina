"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import { usePathname } from "next/navigation";
import type { AgentMessage, AgentTranscript, QuickAction } from "@/types";
import { MOCK_TRANSCRIPTS, MOCK_USER } from "@/data/mockData";
import { useAuth, userDisplay } from "@/context/AuthContext";
import { apiCreateConversation, apiSendAgentMessage } from "@/lib/api";

interface AgentContextValue {
  messages: AgentMessage[];
  status: string;
  quickActions?: QuickAction[];
  isCollapsed: boolean;
  isThinking: boolean;
  setCollapsed: (v: boolean) => void;
  sendMessage: (text: string) => void;
}

const AgentContext = createContext<AgentContextValue | null>(null);

const MOCK_REPLY = "Compris. Je traite votre demande et reviens vers vous avec une réponse contextuelle dans quelques instants.";

function routeKey(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean)[0] ?? "dashboard";
  if (seg === "alertes") return "alertes";
  return seg;
}

function timestamp(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const key = routeKey(pathname);
  const { user, token, isAuthenticated } = useAuth();

  const userName = isAuthenticated && user
    ? userDisplay(user, MOCK_USER.role).name
    : MOCK_USER.name;

  // Replace {{userName}} in mock transcripts with the real name
  const initialTranscripts = useMemo<Record<string, AgentTranscript>>(() => {
    const replace = (s: string) => s.replaceAll("{{userName}}", userName);
    return Object.fromEntries(
      Object.entries(MOCK_TRANSCRIPTS).map(([k, transcript]) => [
        k,
        {
          ...transcript,
          messages: transcript.messages.map((m) => ({ ...m, content: replace(m.content) })),
        },
      ])
    );
  }, [userName]);

  const [chats, setChats] = useState<Record<string, AgentTranscript>>(initialTranscripts);
  const [isCollapsed, setCollapsed] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  // convoIds: per-route conversation IDs from the backend
  const convoIds = useRef<Record<string, string>>({});

  // Re-substitute name on login/logout
  useEffect(() => { setChats(initialTranscripts); }, [initialTranscripts]);

  const transcript = chats[key] ?? chats.dashboard;

  const messages = useMemo(
    () => (transcript.messages ?? []).map((m) => m),
    [transcript]
  );

  const appendMessage = useCallback((routeKey: string, msg: AgentMessage) => {
    setChats((prev) => {
      const tr = prev[routeKey] ?? { messages: [], status: "" };
      return { ...prev, [routeKey]: { ...tr, messages: [...tr.messages, msg] } };
    });
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const time = timestamp();

    // 1. Append user message immediately
    appendMessage(key, { role: "user", content: text, time });
    setIsThinking(true);

    // 2. Try the real API if authenticated
    if (isAuthenticated && token) {
      try {
        // Lazily create a conversation for this route if we don't have one yet
        if (!convoIds.current[key]) {
          const convo = await apiCreateConversation(token);
          convoIds.current[key] = convo.id;
        }

        const data = await apiSendAgentMessage(token, convoIds.current[key], text);
        const reply = data.assistant_message?.message?.trim();

        setIsThinking(false);
        appendMessage(key, {
          role: "agent",
          content: reply || MOCK_REPLY,
          time: timestamp(),
        });
        return;
      } catch {
        // Fall through to mock reply below
      }
    }

    // 3. Fallback: mock reply after a short delay
    setTimeout(() => {
      setIsThinking(false);
      appendMessage(key, { role: "agent", content: MOCK_REPLY, time: timestamp() });
    }, 700);
  }, [key, isAuthenticated, token, appendMessage]);

  const value = useMemo(
    () => ({
      messages,
      status: transcript.status,
      quickActions: transcript.quickActions,
      isCollapsed,
      isThinking,
      setCollapsed,
      sendMessage,
    }),
    [messages, transcript.status, transcript.quickActions, isCollapsed, isThinking, sendMessage]
  );

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}

export function useAgent(): AgentContextValue {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error("useAgent must be used inside AgentProvider");
  return ctx;
}
