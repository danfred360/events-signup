import type { Env } from '../index';
import { eventRegistry, getEvent } from '../events/registry';

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

export async function handleAdminEvents(env: Env): Promise<Response> {
  const rows = await env.DB.prepare(
    'SELECT event_slug, COUNT(*) as count FROM signups GROUP BY event_slug'
  ).all<CountRow>();

  const countMap: Record<string, number> = {};
  for (const row of rows.results) {
    countMap[row.event_slug] = row.count;
  }

  const events = eventRegistry.map(e => ({
    slug: e.slug,
    name: e.name,
    date: e.date,
    description: e.description,
    signupCount: countMap[e.slug] ?? 0,
  }));

  return Response.json({ success: true, events });
}

export async function handleAdminSignups(env: Env, slug: string): Promise<Response> {
  const event = getEvent(slug);
  if (!event) {
    return Response.json({ success: false, message: 'Event not found' }, { status: 404 });
  }

  const rows = await env.DB.prepare(
    'SELECT * FROM signups WHERE event_slug = ? ORDER BY created_at DESC'
  )
    .bind(slug)
    .all<SignupRow>();

  const signups = rows.results.map(row => ({
    ...row,
    data: JSON.parse(row.data) as Record<string, unknown>,
  }));

  return Response.json({ success: true, signups, event });
}

export async function handlePatchSignup(request: Request, env: Env, id: string): Promise<Response> {
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

  const event = getEvent(existing.event_slug);
  const newData = data !== undefined ? JSON.stringify(data) : existing.data;
  const newNotes = notes !== undefined ? notes : existing.notes;

  // Validate that data keys are known fields for this event
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
