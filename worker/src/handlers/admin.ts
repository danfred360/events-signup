import type { Env, Session } from '../index';
import { eventRegistry, getEvent } from '../events/registry';
import { hashPassword } from './auth';

interface SignupRow {
  id: string;
  event_slug: string;
  data: string;
  notes: string | null;
  created_at: string;
  ip_address: string | null;
}

interface CountRow {
  event_slug: string;
  count: number;
}

interface UserRow {
  username: string;
  role: string;
}

interface PermissionRow {
  event_slug: string;
}

async function getAllowedSlugs(env: Env, username: string): Promise<Set<string>> {
  const rows = await env.DB.prepare(
    'SELECT event_slug FROM event_permissions WHERE username = ?'
  ).bind(username).all<PermissionRow>();
  return new Set(rows.results.map(r => r.event_slug));
}

// ── Events ────────────────────────────────────────────────────────────────────

export async function handleAdminEvents(env: Env, session: Session): Promise<Response> {
  const rows = await env.DB.prepare(
    'SELECT event_slug, COUNT(*) as count FROM signups GROUP BY event_slug'
  ).all<CountRow>();

  const countMap: Record<string, number> = {};
  for (const row of rows.results) {
    countMap[row.event_slug] = row.count;
  }

  let allowedSlugs: Set<string> | null = null;
  if (session.role === 'event_manager') {
    allowedSlugs = await getAllowedSlugs(env, session.username);
  }

  const events = eventRegistry
    .filter(e => allowedSlugs === null || allowedSlugs.has(e.slug))
    .map(e => ({
      slug: e.slug,
      name: e.name,
      date: e.date,
      description: e.description,
      signupCount: countMap[e.slug] ?? 0,
    }));

  return Response.json({ success: true, events });
}

// ── Signups ───────────────────────────────────────────────────────────────────

export async function handleAdminSignups(env: Env, slug: string, session: Session): Promise<Response> {
  const event = getEvent(slug);
  if (!event) {
    return Response.json({ success: false, message: 'Event not found' }, { status: 404 });
  }

  if (session.role === 'event_manager') {
    const allowed = await getAllowedSlugs(env, session.username);
    if (!allowed.has(slug)) {
      return Response.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }
  }

  const rows = await env.DB.prepare(
    'SELECT * FROM signups WHERE event_slug = ? ORDER BY created_at DESC'
  ).bind(slug).all<SignupRow>();

  const signups = rows.results.map(row => ({
    ...row,
    data: JSON.parse(row.data) as Record<string, unknown>,
  }));

  return Response.json({ success: true, signups, event });
}

export async function handlePatchSignup(
  request: Request,
  env: Env,
  id: string,
  session: Session
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, message: 'Invalid request body' }, { status: 400 });
  }

  const { data, notes } = body as { data?: Record<string, unknown>; notes?: string };

  const existing = await env.DB.prepare('SELECT * FROM signups WHERE id = ?')
    .bind(id)
    .first<SignupRow>();

  if (!existing) {
    return Response.json({ success: false, message: 'Signup not found' }, { status: 404 });
  }

  if (session.role === 'event_manager') {
    const allowed = await getAllowedSlugs(env, session.username);
    if (!allowed.has(existing.event_slug)) {
      return Response.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }
  }

  const event = getEvent(existing.event_slug);
  const newData = data !== undefined ? JSON.stringify(data) : existing.data;
  const newNotes = notes !== undefined ? notes : existing.notes;

  if (data !== undefined && event) {
    const knownFields = new Set(event.fields.map(f => f.name));
    for (const key of Object.keys(data)) {
      if (!knownFields.has(key)) {
        return Response.json({ success: false, message: `Unknown field: ${key}` }, { status: 400 });
      }
    }
  }

  await env.DB.prepare('UPDATE signups SET data = ?, notes = ? WHERE id = ?')
    .bind(newData, newNotes, id)
    .run();

  const updated = await env.DB.prepare('SELECT * FROM signups WHERE id = ?')
    .bind(id)
    .first<SignupRow>();

  return Response.json({
    success: true,
    signup: { ...updated, data: JSON.parse(updated!.data) },
  });
}

// ── User management (admin only) ──────────────────────────────────────────────

export async function handleGetUsers(env: Env): Promise<Response> {
  const users = await env.DB.prepare(
    'SELECT username, role FROM admin_users ORDER BY username'
  ).all<UserRow>();

  const permissions = await env.DB.prepare(
    'SELECT username, event_slug FROM event_permissions'
  ).all<{ username: string; event_slug: string }>();

  const permMap: Record<string, string[]> = {};
  for (const p of permissions.results) {
    (permMap[p.username] ??= []).push(p.event_slug);
  }

  const result = users.results.map(u => ({
    username: u.username,
    role: u.role,
    eventSlugs: permMap[u.username] ?? [],
  }));

  return Response.json({ success: true, users: result });
}

export async function handleCreateUser(request: Request, env: Env): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, message: 'Invalid request body' }, { status: 400 });
  }

  const { username, password } = body as Record<string, unknown>;
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    return Response.json({ success: false, message: 'Username and password are required' }, { status: 400 });
  }

  if (!/^[a-zA-Z0-9_-]{2,32}$/.test(username)) {
    return Response.json(
      { success: false, message: 'Username must be 2–32 characters: letters, numbers, hyphens, underscores' },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return Response.json({ success: false, message: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const existing = await env.DB.prepare('SELECT 1 FROM admin_users WHERE username = ?')
    .bind(username)
    .first();
  if (existing) {
    return Response.json({ success: false, message: 'Username already exists' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  await env.DB.prepare(
    "INSERT INTO admin_users (username, password_hash, role) VALUES (?, ?, 'event_manager')"
  ).bind(username, passwordHash).run();

  return Response.json({ success: true, username, role: 'event_manager' }, { status: 201 });
}

export async function handleDeleteUser(
  env: Env,
  username: string,
  currentUsername: string
): Promise<Response> {
  if (username === currentUsername) {
    return Response.json({ success: false, message: 'Cannot delete your own account' }, { status: 400 });
  }

  const row = await env.DB.prepare('SELECT role FROM admin_users WHERE username = ?')
    .bind(username)
    .first<{ role: string }>();

  if (!row) {
    return Response.json({ success: false, message: 'User not found' }, { status: 404 });
  }

  if (row.role === 'admin') {
    return Response.json({ success: false, message: 'Cannot delete admin accounts' }, { status: 403 });
  }

  await env.DB.prepare('DELETE FROM admin_users WHERE username = ?').bind(username).run();

  return Response.json({ success: true });
}

export async function handleSetUserPermissions(
  request: Request,
  env: Env,
  username: string
): Promise<Response> {
  const row = await env.DB.prepare('SELECT role FROM admin_users WHERE username = ?')
    .bind(username)
    .first<{ role: string }>();

  if (!row) {
    return Response.json({ success: false, message: 'User not found' }, { status: 404 });
  }

  if (row.role === 'admin') {
    return Response.json({ success: false, message: 'Admins have access to all events' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, message: 'Invalid request body' }, { status: 400 });
  }

  const { slugs } = body as { slugs?: unknown };
  if (!Array.isArray(slugs) || slugs.some(s => typeof s !== 'string')) {
    return Response.json({ success: false, message: 'slugs must be an array of strings' }, { status: 400 });
  }

  const validSlugs = new Set(eventRegistry.map(e => e.slug));
  for (const slug of slugs) {
    if (!validSlugs.has(slug as string)) {
      return Response.json({ success: false, message: `Unknown event: ${slug}` }, { status: 400 });
    }
  }

  // Replace all permissions atomically
  await env.DB.batch([
    env.DB.prepare('DELETE FROM event_permissions WHERE username = ?').bind(username),
    ...slugs.map(slug =>
      env.DB.prepare('INSERT INTO event_permissions (username, event_slug) VALUES (?, ?)')
        .bind(username, slug)
    ),
  ]);

  return Response.json({ success: true, username, eventSlugs: slugs });
}
