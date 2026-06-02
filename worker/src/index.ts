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
import { eventOgData } from '../../frontend/src/events/og-metadata';

export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  ALLOWED_ORIGIN: string;
  ASSETS: Fetcher;
}

export interface Session {
  username: string;
  role: 'admin' | 'event_manager';
}

const BASE_URL = 'https://events.npole.org';
const CRAWLER = /facebookexternalhit|Twitterbot|WhatsApp|LinkedInBot|Slackbot-LinkExpanding|Discordbot|TelegramBot|applebot|Googlebot/i;

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

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildOgHtml(params: { title: string; description: string; url: string; image?: string }): string {
  const t = escapeHtml(params.title);
  const d = escapeHtml(params.description);
  const u = escapeHtml(params.url);
  const card = params.image ? 'summary_large_image' : 'summary';
  return `<!doctype html><html><head>
  <meta charset="UTF-8"><title>${t}</title>
  <meta property="og:title" content="${t}">
  <meta property="og:description" content="${d}">
  <meta property="og:url" content="${u}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="events.npole.org">
  ${params.image ? `<meta property="og:image" content="${escapeHtml(params.image)}">` : ''}
  <meta name="twitter:card" content="${card}">
  <meta name="twitter:title" content="${t}">
  <meta name="twitter:description" content="${d}">
  ${params.image ? `<meta name="twitter:image" content="${escapeHtml(params.image)}">` : ''}
</head><body></body></html>`;
}

function ogResponse(pathname: string, href: string): Response | null {
  const segments = pathname.replace(/^\/+/, '').split('/').filter(Boolean);
  const slug = segments[0];
  const isQR = segments[1] === 'qr';

  if (!slug || slug === 'admin') return null;
  const meta = eventOgData[slug];
  if (!meta) return null;

  const html = isQR
    ? buildOgHtml({
        title: `QR Code — ${meta.name}`,
        description: `Scan to sign up for ${meta.name}`,
        url: href,
        image: `${BASE_URL}/qr-images/${slug}.png`,
      })
    : buildOgHtml({ title: meta.name, description: meta.description, url: href });

  return new Response(html, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handleRequest(request, env);
    } catch (err) {
      console.error(err);
      return Response.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
  },
};

async function handleRequest(request: Request, env: Env): Promise<Response> {
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

  // Non-API paths: serve OG page for crawlers, static assets for everyone else.
  // Fall back to index.html for unknown paths so React Router handles routing.
  if (!path.startsWith('/api/')) {
    // Redirect unauthenticated browser requests to admin pages to the login page.
    if (path.startsWith('/admin') && path !== '/admin/login') {
      const session = await getSession(request, env);
      if (!session) {
        return Response.redirect(new URL('/admin/login', request.url).href, 302);
      }
    }

    const ua = request.headers.get('User-Agent') ?? '';
    if (CRAWLER.test(ua)) {
      const og = ogResponse(path, url.href);
      if (og) return og;
    }
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status === 404) {
      return env.ASSETS.fetch(new Request(new URL('/index.html', request.url)));
    }
    return assetResponse;
  }

  // Public API routes
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

  // Admin routes — require session
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
}
