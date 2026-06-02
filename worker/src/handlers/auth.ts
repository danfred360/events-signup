import type { Env } from '../index';

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(':');
  if (parts.length !== 3 || parts[0] !== 'pbkdf2') return false;
  const saltBytes = hexToBytes(parts[1]);
  const expectedHashHex = parts[2];

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: 100000 },
    keyMaterial,
    256
  );
  const computedHex = bytesToHex(new Uint8Array(bits));
  return computedHex === expectedHashHex;
}

export async function handleLogin(request: Request, env: Env): Promise<Response> {
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

  const row = await env.DB.prepare('SELECT password_hash FROM admin_users WHERE username = ?')
    .bind(username)
    .first<{ password_hash: string }>();

  // Always run verifyPassword to prevent timing attacks
  const hashToCheck = row?.password_hash ?? 'pbkdf2:0000000000000000000000000000000000000000:0000000000000000000000000000000000000000000000000000000000000000';
  const valid = await verifyPassword(password, hashToCheck);

  if (!row || !valid) {
    return Response.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
  }

  const token = crypto.randomUUID();
  const SESSION_TTL = 86400; // 24 hours
  await env.SESSIONS.put(token, JSON.stringify({ username }), { expirationTtl: SESSION_TTL });

  const isSecure = env.ALLOWED_ORIGIN.startsWith('https');
  const cookieFlags = `HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL}${isSecure ? '; Secure' : ''}`;

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `session=${token}; ${cookieFlags}`,
    },
  });
}

export async function handleLogout(request: Request, env: Env): Promise<Response> {
  const cookieHeader = request.headers.get('Cookie') ?? '';
  const match = cookieHeader.match(/session=([^;]+)/);
  if (match) {
    await env.SESSIONS.delete(match[1]);
  }

  const isSecure = env.ALLOWED_ORIGIN.startsWith('https');
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${isSecure ? '; Secure' : ''}`,
    },
  });
}
