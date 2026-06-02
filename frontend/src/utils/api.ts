import { clearLoggedIn } from './auth';

const BASE = '/api';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    clearLoggedIn();
    window.location.href = '/admin/login';
    throw new Error('Session expired');
  }

  const json = (await res.json()) as { success: boolean; message?: string } & T;

  if (!res.ok || !json.success) {
    throw new Error(json.message ?? `Request failed with status ${res.status}`);
  }

  return json;
}

export function get<T>(path: string): Promise<T> {
  return request<T>('GET', path);
}

export function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>('POST', path, body);
}

export function patch<T>(path: string, body: unknown): Promise<T> {
  return request<T>('PATCH', path, body);
}
