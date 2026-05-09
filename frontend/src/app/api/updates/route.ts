import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, LegalUpdate } from "@/types";

// Placeholder — replace with real backend call or DB query.
const MOCK_UPDATES: LegalUpdate[] = [
  {
    id: "1",
    title: "Loi 25 — Nouvelles obligations de transparence IA",
    summary:
      "Le gouvernement du Québec a publié de nouvelles directives concernant l'utilisation transparente des systèmes d'IA dans les entreprises.",
    source: "Légis Québec",
    sourceUrl: "https://www.legisquebec.gouv.qc.ca",
    category: "legislation",
    urgency: "high",
    affectedSectors: ["technology", "finance", "healthcare"],
    publishedAt: "2026-05-08T09:00:00Z",
    detectedAt: "2026-05-08T10:15:00Z",
    jurisdiction: "Québec",
    keyChanges: [
      "Obligation de divulguer l'usage de l'IA aux utilisateurs",
      "Mise en place d'un registre des systèmes d'IA",
      "Sanctions pouvant atteindre 25 M$ CAD",
    ],
  },
  {
    id: "2",
    title: "OpenAI Terms of Service — Data Retention Policy Update",
    summary:
      "OpenAI revised its enterprise data retention policy, reducing default retention from 30 days to 7 days for API users.",
    source: "OpenAI",
    sourceUrl: "https://openai.com/policies",
    category: "platform",
    urgency: "medium",
    affectedSectors: ["technology", "legal"],
    publishedAt: "2026-05-07T14:00:00Z",
    detectedAt: "2026-05-07T15:30:00Z",
    keyChanges: [
      "Default API data retention reduced from 30 to 7 days",
      "Zero-retention option now available without enterprise plan",
    ],
  },
];

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 20);
  const categories = searchParams.get("categories")?.split(",");
  const urgency = searchParams.get("urgency")?.split(",");

  let filtered = [...MOCK_UPDATES];
  if (categories?.length) {
    filtered = filtered.filter((u) => categories.includes(u.category));
  }
  if (urgency?.length) {
    filtered = filtered.filter((u) => urgency.includes(u.urgency));
  }

  const start = (page - 1) * pageSize;
  const paginated = filtered.slice(start, start + pageSize);

  const body: ApiResponse<LegalUpdate[]> = {
    data: paginated,
    total: filtered.length,
    page,
    pageSize,
  };

  return NextResponse.json(body);
}
