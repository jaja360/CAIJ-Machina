import { apiUploadLawFile } from "@/lib/api";

/** Result of uploading a single law file. */
export interface LawUploadResult {
  filename: string;
  status: "success" | "error";
  error?: string;
}

/**
 * Upload multiple law files sequentially to PUT /api/laws.
 *
 * The optional `onProgress` callback is invoked after each file so the UI
 * can reflect real‑time status (uploading / success / error) per file.
 *
 * Returns an array of results — one entry per input file, in the same order.
 * Callers should NOT treat failures as fatal.
 */
export async function uploadLawFiles(
  token: string,
  files: File[],
  onProgress?: (
    filename: string,
    status: "uploading" | "success" | "error",
    error?: string,
  ) => void,
): Promise<LawUploadResult[]> {
  const results: LawUploadResult[] = [];

  for (const file of files) {
    onProgress?.(file.name, "uploading");
    try {
      await apiUploadLawFile(token, file);
      results.push({ filename: file.name, status: "success" });
      onProgress?.(file.name, "success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error";
      results.push({ filename: file.name, status: "error", error: message });
      onProgress?.(file.name, "error", message);
    }
  }

  return results;
}
