import { handleLogin, handleLogout } from './handlers/auth';
import { handleSignup } from './handlers/signup';
import { handleAdminEvents, handleAdminSignups, handlePatchSignup } from './handlers/admin';

export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  ALLOWED_ORIGIN: string;
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
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
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

async function getSession(request: Request, env: Env): Promise<string | null> {
  const cookieHeader = request.headers.get('Cookie') ?? '';
  const match = cookieHeader.match(/session=([^;]+)/);
  if (!match) return null;
  const session = await env.SESSIONS.get(match[1]);
  if (!session) return null;
  return (JSON.parse(session) as { username: string }).username;
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

    let response: Response;

    // Public routes
    const signupMatch = path.match(/^\/api\/events\/([^/]+)\/signup$/);
    if (method === 'POST' && signupMatch) {
      response = await handleSignup(request, env, signupMatch[1]);
      return addHeaders(response, origin);
    }

    if (method === 'POST' && path === '/api/admin/login') {
      response = await handleLogin(request, env);
      return addHeaders(response, origin);
    }

    if (method === 'POST' && path === '/api/admin/logout') {
      response = await handleLogout(request, env);
      return addHeaders(response, origin);
    }

    // Admin routes — require session
    if (path.startsWith('/api/admin/')) {
      const username = await getSession(request, env);
      if (!username) {
        return addHeaders(
          Response.json({ success: false, message: 'Unauthorized' }, { status: 401 }),
          origin
        );
      }

      if (method === 'GET' && path === '/api/admin/events') {
        response = await handleAdminEvents(env);
        return addHeaders(response, origin);
      }

      const signupsMatch = path.match(/^\/api\/admin\/events\/([^/]+)\/signups$/);
      if (method === 'GET' && signupsMatch) {
        response = await handleAdminSignups(env, signupsMatch[1]);
        return addHeaders(response, origin);
      }

      const patchMatch = path.match(/^\/api\/admin\/signups\/([^/]+)$/);
      if (method === 'PATCH' && patchMatch) {
        response = await handlePatchSignup(request, env, patchMatch[1]);
        return addHeaders(response, origin);
      }
    }

    return addHeaders(
      Response.json({ success: false, message: 'Not found' }, { status: 404 }),
      origin
    );
  },
};
