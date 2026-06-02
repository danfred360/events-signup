import type { Env } from '../index';
import { getEvent } from '../events/registry';

export async function handleSignup(request: Request, env: Env, slug: string): Promise<Response> {
  const event = getEvent(slug);
  if (!event) {
    return Response.json({ success: false, message: 'Event not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, message: 'Invalid request body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return Response.json({ success: false, message: 'Invalid request body' }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const errors: string[] = [];

  for (const field of event.fields) {
    if (field.required) {
      const val = data[field.name];
      if (val === undefined || val === null || val === '') {
        errors.push(`${field.label} is required`);
      }
    }
  }

  if (errors.length > 0) {
    return Response.json({ success: false, message: errors.join(', ') }, { status: 400 });
  }

  // Validate email format if present
  const emailField = event.fields.find(f => f.type === 'email');
  if (emailField) {
    const email = data[emailField.name];
    if (typeof email === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ success: false, message: 'Invalid email address' }, { status: 400 });
    }
  }

  // Only keep known fields
  const cleanData: Record<string, unknown> = {};
  for (const field of event.fields) {
    if (data[field.name] !== undefined) {
      cleanData[field.name] = data[field.name];
    }
  }

  const id = crypto.randomUUID();
  const ipAddress =
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('X-Forwarded-For') ??
    null;

  await env.DB.prepare(
    'INSERT INTO signups (id, event_slug, data, created_at, ip_address) VALUES (?, ?, ?, datetime(\'now\'), ?)'
  )
    .bind(id, slug, JSON.stringify(cleanData), ipAddress)
    .run();

  return Response.json({ success: true, id }, { status: 201 });
}
