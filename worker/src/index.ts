import { handleLogin, handleLogout } from './handlers/auth';
import { handleSignup } from './handlers/signup';
import {
  handleAdminEvents,
  handleAdminSignups,
  handlePatchSignup,
  handleGetUsers,
  handleCreateUser,
  handleDeleteUser,
  handleSetUserPermissions,
} from './handlers/admin';

export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  ALLOWED_ORIGIN: string;
}

export interface Session {
  username: string;
  role: 'admin' | 'event_manager';
}

function getAllowedOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get('Origin') ?? '';
  if (origin === env.ALLOWED_ORIGIN || origin === 'http://localhost:5173') {
    return origin;
  }
  return null;
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

function addHeaders(response: Response, origin: string | null): Response {
  const headers = new Headers(response.headers);
  if (origin) {
    for (const [k, v] of Object.entries(corsHeaders(origin))) {
      headers.set(k, v);
    }
  }
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    headers.set(k, v);
  }
  return new Response(response.body, { status: response.status, headers });
}

async function getSession(request: Request, env: Env): Promise<Session | null> {
  const cookieHeader = request.headers.get('Cookie') ?? '';
  const match = cookieHeader.match(/session=([^;]+)/);
  if (!match) return null;
  const raw = await env.SESSIONS.get(match[1]);
  if (!raw) return null;
  return JSON.parse(raw) as Session;
}

function adminOnly(response: Response, origin: string | null): Response {
  return addHeaders(Response.json({ success: false, message: 'Forbidden' }, { status: 403 }), origin);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const origin = getAllowedOrigin(request, env);

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: origin ? corsHeaders(origin) : {},
      });
    }

    // Public routes
    const signupMatch = path.match(/^\/api\/events\/([^/]+)\/signup$/);
    if (method === 'POST' && signupMatch) {
      return addHeaders(await handleSignup(request, env, signupMatch[1]), origin);
    }

    if (method === 'POST' && path === '/api/admin/login') {
      return addHeaders(await handleLogin(request, env), origin);
    }

    if (method === 'POST' && path === '/api/admin/logout') {
      return addHeaders(await handleLogout(request, env), origin);
    }

    // All remaining routes require a valid session
    if (!path.startsWith('/api/admin/')) {
      return addHeaders(Response.json({ success: false, message: 'Not found' }, { status: 404 }), origin);
    }

    const session = await getSession(request, env);
    if (!session) {
      return addHeaders(Response.json({ success: false, message: 'Unauthorized' }, { status: 401 }), origin);
    }

    // ── Shared admin routes (admin + event_manager) ──────────────────────────

    if (method === 'GET' && path === '/api/admin/events') {
      return addHeaders(await handleAdminEvents(env, session), origin);
    }

    const signupsMatch = path.match(/^\/api\/admin\/events\/([^/]+)\/signups$/);
    if (method === 'GET' && signupsMatch) {
      return addHeaders(await handleAdminSignups(env, signupsMatch[1], session), origin);
    }

    const patchMatch = path.match(/^\/api\/admin\/signups\/([^/]+)$/);
    if (method === 'PATCH' && patchMatch) {
      return addHeaders(await handlePatchSignup(request, env, patchMatch[1], session), origin);
    }

    // ── Admin-only routes ────────────────────────────────────────────────────

    if (method === 'GET' && path === '/api/admin/users') {
      if (session.role !== 'admin') return adminOnly(Response.json({}), origin);
      return addHeaders(await handleGetUsers(env), origin);
    }

    if (method === 'POST' && path === '/api/admin/users') {
      if (session.role !== 'admin') return adminOnly(Response.json({}), origin);
      return addHeaders(await handleCreateUser(request, env), origin);
    }

    const deleteUserMatch = path.match(/^\/api\/admin\/users\/([^/]+)$/);
    if (method === 'DELETE' && deleteUserMatch) {
      if (session.role !== 'admin') return adminOnly(Response.json({}), origin);
      return addHeaders(await handleDeleteUser(env, deleteUserMatch[1], session.username), origin);
    }

    const permissionsMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/permissions$/);
    if (method === 'PUT' && permissionsMatch) {
      if (session.role !== 'admin') return adminOnly(Response.json({}), origin);
      return addHeaders(await handleSetUserPermissions(request, env, permissionsMatch[1]), origin);
    }

    return addHeaders(Response.json({ success: false, message: 'Not found' }, { status: 404 }), origin);
  },
};
