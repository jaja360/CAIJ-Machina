"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { AgentPanel } from "./AgentPanel";
import { AgentProvider } from "@/context/AgentContext";

/**
 * Client wrapper for the shell layout.
 * Manages sidebar collapsed state and provides the AgentContext.
 * Kept separate from (shell)/layout.tsx so that layout.tsx can be a server component.
 */
export function ShellWrapper({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <AgentProvider>
      <div className="flex h-screen w-screen bg-ink-50/60 overflow-hidden">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
        />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-ink-50/40">
          {children}
        </main>
        <AgentPanel />
      </div>
    </AgentProvider>
  );
}
