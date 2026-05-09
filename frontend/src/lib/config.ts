/** Shared API base URL — set via NEXT_PUBLIC_API_URL, defaults to the Go backend. */
export const API_BASE_URL: string =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
