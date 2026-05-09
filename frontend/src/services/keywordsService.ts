import { apiGetMe, apiReplaceKeywords } from "@/lib/api";

/**
 * Fetch all keyword names from the Go backend.
 * Returns null on error.
 */
export async function fetchKeywords(
  token: string,
): Promise<string[] | null> {
  try {
    const data = await apiGetMe(token);
    return data.keywords.map((kw) => kw.keyword_name);
  } catch {
    return null;
  }
}

/**
 * Replace the authenticated user's keywords.
 * Sends {keywords: string[]} to PUT /api/keywords.
 * Returns true on success, false on error.
 */
export async function saveKeywords(
  token: string,
  keywords: string[],
): Promise<boolean> {
  try {
    await apiReplaceKeywords(token, keywords);
    return true;
  } catch {
    return false;
  }
}
