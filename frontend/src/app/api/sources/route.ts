import { NextRequest, NextResponse } from "next/server";
import type { MonitoredSource } from "@/types";

// Placeholder — replace with real persistence layer.
const MOCK_SOURCES: MonitoredSource[] = [
  {
    id: "src-1",
    name: "Légis Québec",
    url: "https://www.legisquebec.gouv.qc.ca",
    category: "legislation",
    isActive: true,
    lastCheckedAt: "2026-05-09T08:00:00Z",
  },
  {
    id: "src-2",
    name: "Justice Laws Canada",
    url: "https://laws-lois.justice.gc.ca",
    category: "legislation",
    isActive: true,
    lastCheckedAt: "2026-05-09T08:00:00Z",
  },
  {
    id: "src-3",
    name: "CanLII",
    url: "https://www.canlii.org",
    category: "jurisprudence",
    isActive: true,
    lastCheckedAt: "2026-05-09T07:45:00Z",
  },
  {
    id: "src-4",
    name: "OpenAI Policies",
    url: "https://openai.com/policies",
    category: "platform",
    isActive: true,
    lastCheckedAt: "2026-05-09T08:00:00Z",
  },
  {
    id: "src-5",
    name: "Anthropic Usage Policy",
    url: "https://www.anthropic.com/legal/usage-policy",
    category: "platform",
    isActive: true,
    lastCheckedAt: "2026-05-09T08:00:00Z",
  },
];

export async function GET() {
  return NextResponse.json(MOCK_SOURCES);
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Omit<MonitoredSource, "id" | "lastCheckedAt">;
  const newSource: MonitoredSource = {
    ...body,
    id: `src-${Date.now()}`,
    lastCheckedAt: new Date().toISOString(),
  };
  MOCK_SOURCES.push(newSource);
  return NextResponse.json(newSource, { status: 201 });
}
