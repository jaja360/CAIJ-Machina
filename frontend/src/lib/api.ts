const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export interface ApiUser {
  id: string;
  email: string;
  job_title: string;
  first_name: string;
  last_name: string;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse extends ApiUser {
  token: string;
  refresh_token: string;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export async function apiRegister(
  email: string,
  password: string,
  jobTitle: string,
  firstName: string,
  lastName: string,
): Promise<ApiUser> {
  const res = await fetch(`${BASE}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, job_title: jobTitle, first_name: firstName, last_name: lastName }),
  });
  return handleResponse<ApiUser>(res);
}

export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<LoginResponse>(res);
}

export async function apiGetMe(token: string): Promise<{ user: ApiUser; keywords: string[] }> {
  const res = await fetch(`${BASE}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<{ user: ApiUser; keywords: string[] }>(res);
}
