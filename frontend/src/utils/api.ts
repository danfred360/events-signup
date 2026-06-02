import { clearLoggedIn, isLoggedIn } from './auth';

const BASE = '/api';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Only redirect on 401 when the user had an active session — that means it expired.
  // If the user isn't logged in (e.g. wrong password on the login page), fall through
  // so the caller sees the actual error message from the response body.
  if (res.status === 401 && isLoggedIn()) {
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

export function put<T>(path: string, body: unknown): Promise<T> {
  return request<T>('PUT', path, body);
}

export async function del(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE', credentials: 'include' });
  if (res.status === 401 && isLoggedIn()) {
    clearLoggedIn();
    window.location.href = '/admin/login';
    throw new Error('Session expired');
  }
}
