import { API_BASE_URL } from "./config";

// ── Types ───────────────────────────────────────────────────────────────────

export interface ApiUser {
  id: string;
  email: string;
  job_title: string;
  first_name: string;
  last_name: string;
  created_at: string;
  updated_at: string;
}

/** Shape of a keyword object returned by the backend (ListUserKeywordsRow). */
export interface Keyword {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  keyword: string;       // keyword UUID
  keyword_name: string;
}

/** Flat login response: backend embeds User fields directly alongside token/refresh_token. */
export interface LoginResponse extends ApiUser {
  token: string;
  refresh_token: string;
}

export interface RefreshResponse {
  token: string;
}

export interface GetMeResponse {
  user: ApiUser;
  keywords: Keyword[];
}

// ── Robust fetch wrapper ────────────────────────────────────────────────────

interface ApiFetchOptions extends RequestInit {
  /** Auth token to inject as `Authorization: Bearer <token>`. */
  token?: string | null;
}

/**
 * Thin wrapper around fetch that:
 *  - prepends `API_BASE_URL`
 *  - injects `Authorization: Bearer` when `token` is provided
 *  - defaults `Content-Type` to `application/json`
 *  - parses JSON or text responses
 *  - throws structured errors on non‑2xx
 *  - returns `undefined` for 204 No Content
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { token, headers, body, ...rest } = options;

  const hdrs = new Headers(headers);
  if (token) hdrs.set("Authorization", `Bearer ${token}`);
  if (!hdrs.has("Content-Type") && !(body instanceof FormData))
    hdrs.set("Content-Type", "application/json");

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: hdrs,
    body,
  });

  // 204 No Content — typical for revoke
  if (res.status === 204) return undefined as T;

  // Try JSON first, fall back to text
  const contentType = res.headers.get("content-type") ?? "";
  let bodyData: unknown;
  if (contentType.includes("application/json")) {
    bodyData = await res.json();
  } else {
    bodyData = await res.text();
  }

  if (!res.ok) {
    const message =
      bodyData && typeof bodyData === "object" && "error" in bodyData
        ? String((bodyData as Record<string, unknown>).error)
        : String(bodyData || `Request failed (${res.status})`);
    throw Object.assign(new Error(message), { status: res.status });
  }

  return bodyData as T;
}

// ── Backend response types (from Go models) ──────────────────────────────────

/**
 * Keyword returned by GET /api/keywords (database.Keyword).
 * {id, created_at, updated_at, name}
 */
export interface ApiKeyword {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
}

/** Client returned by GET /api/clients (database.Client). */
export interface BackendClient {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  /** sql.NullString — may be a plain string, null, or {String, Valid} object. */
  icon: string | null | { String: string; Valid: boolean };
  user_id?: string | null | { UUID: string; Valid: boolean };
}

/** KPI returned by GET /api/kpi. */
export interface KpiData {
  alerts_24h: number;
  law_changes_24h: number;
  laws_24h: number;
}

/**
 * Alert returned by GET /api/alerts (database.Alert).
 * uuid.NullUUID fields serialize as string or null.
 * sql.NullString fields may be {String, Valid} or string/null.
 */
export interface BackendAlert {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  client_id: string | null;
  contact_method: string;
  send_at: string;
  priority: string;
  law_change_id: string | null;
  message: string;
  sublaw_id: string | null;
  keywords: string | { String: string; Valid: boolean } | null;
}

// ── Auth API functions ──────────────────────────────────────────────────────

export async function apiRegister(
  email: string,
  password: string,
  jobTitle: string,
  firstName: string,
  lastName: string,
): Promise<ApiUser> {
  return apiFetch<ApiUser>("/api/users", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      job_title: jobTitle,
      first_name: firstName,
      last_name: lastName,
    }),
  });
}

export async function apiLogin(
  email: string,
  password: string,
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/api/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function apiGetMe(token: string): Promise<GetMeResponse> {
  return apiFetch<GetMeResponse>("/api/me", { token });
}

export async function apiRefresh(
  refreshToken: string,
): Promise<RefreshResponse> {
  return apiFetch<RefreshResponse>("/api/refresh", {
    method: "POST",
    token: refreshToken,
  });
}

export async function apiRevoke(refreshToken: string): Promise<void> {
  return apiFetch<void>("/api/revoke", {
    method: "POST",
    token: refreshToken,
  });
}

// ── Backend API functions (beyond auth) ──────────────────────────────────────

export async function apiGetAlerts(token: string): Promise<BackendAlert[]> {
  return apiFetch<BackendAlert[]>("/api/alerts", { token });
}

export async function apiGetKpi(token: string): Promise<KpiData> {
  return apiFetch<KpiData>("/api/kpi", { token });
}

export async function apiGetKeywords(token: string): Promise<Keyword[]> {
  return apiFetch<Keyword[]>("/api/keywords", { token });
}

export async function apiReplaceKeywords(
  token: string,
  keywords: string[],
): Promise<ApiKeyword[]> {
  return apiFetch<ApiKeyword[]>("/api/keywords", {
    method: "PUT",
    token,
    body: JSON.stringify({ keywords }),
  });
}

export async function apiGetClients(token: string): Promise<BackendClient[]> {
  return apiFetch<BackendClient[]>("/api/clients", { token });
}

// ── Law upload ───────────────────────────────────────────────────────────────

/** Response shape from PUT /api/laws. */
export interface LawUploadResponse {
  law: unknown;
  sublaws_count: number;
  law_changes_count: number;
  alerts_count: number;
}

/**
 * Upload a single HTML law file to PUT /api/laws using multipart/form-data.
 * The caller **must not** set Content-Type — the browser handles the multipart boundary.
 */
export async function apiUploadLawFile(
  token: string,
  file: File,
): Promise<LawUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<LawUploadResponse>("/api/laws", {
    method: "PUT",
    token,
    body: formData,
  });
}

// ── Agent API ────────────────────────────────────────────────────────────────

export interface AgentConversation {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface AgentMessageResponse {
  user_message:      { id: string; speaker: string; message: string };
  assistant_message: { id: string; speaker: string; message: string };
  sql_query:            string;
  sql_result_row_count: number;
}

/** Create a new agent conversation. Optional clientId scopes the conversation. */
export async function apiCreateConversation(
  token: string,
  clientId?: string,
): Promise<AgentConversation> {
  return apiFetch<AgentConversation>("/api/agent/new", {
    method: "POST",
    token,
    body: JSON.stringify({ client_id: clientId ?? "" }),
  });
}

/** Send a message to an existing conversation. Returns the assistant reply. */
export async function apiSendAgentMessage(
  token: string,
  convoId: string,
  message: string,
): Promise<AgentMessageResponse> {
  return apiFetch<AgentMessageResponse>(`/api/agent/${convoId}`, {
    method: "POST",
    token,
    body: JSON.stringify({ message }),
  });
}
