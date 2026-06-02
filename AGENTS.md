# Agent Guide

This file describes the codebase for AI agents working in this repository.

## What this project does

An event signup management site at `events.npole.org`. Public visitors sign up for events via custom forms. Admins log in to view signups, add notes, and edit responses. Each event has a `/qr` page for a printable QR code.

## Tech stack

- **Frontend:** React 19 + Vite + TypeScript, hosted on Cloudflare Pages
- **Worker:** Cloudflare Worker (TypeScript), handles all `/api/*` requests
- **Database:** Cloudflare D1 (SQLite) — `signups` and `admin_users` tables
- **Sessions:** Cloudflare KV — UUID tokens with 24-hour TTL, sent as HttpOnly cookies
- **No ORM, no runtime dependencies** in the worker — all D1 calls use the `env.DB.prepare()` API

## Where things live

### Adding or editing events

Each event is a directory under `frontend/src/events/{slug}/`:
- `config.ts` — exports a typed `EventConfig` with `slug`, `name`, `date`, `description`, and `fields[]`
- `Form.tsx` — the public-facing React form; wires to `POST /api/events/{slug}/signup`

The frontend registry at `frontend/src/events/index.ts` imports all events and exports them as the `events` array. React Router in `frontend/src/App.tsx` generates `/:slug` and `/:slug/qr` routes from this array.

The worker registry at `worker/src/events/registry.ts` is a parallel list of the same event metadata (no JSX). The worker uses it to validate signup payloads and build the admin events list. **Both registries must be kept in sync.** The scaffold script handles this automatically.

To scaffold a new event:
```bash
npm run scaffold -- "Event Name"
```

To add an event manually, add entries to both `frontend/src/events/index.ts` and `worker/src/events/registry.ts`, following the existing pattern.

### Worker routing

`worker/src/index.ts` is the single entry point. It matches URL patterns with regex, applies CORS and security headers, checks the session cookie for `/api/admin/*` routes, then delegates to handler functions. There is no framework — routing is plain `if` statements on `url.pathname`.

Handler files:
- `worker/src/handlers/auth.ts` — login (PBKDF2 password verify → KV session) and logout
- `worker/src/handlers/signup.ts` — validates and inserts a signup row into D1
- `worker/src/handlers/admin.ts` — reads events/signups from D1; updates signup data or notes

### Frontend pages and components

Pages live in `frontend/src/pages/`. Each page is a React component:
- `EventPage.tsx` — wraps the event's `Form` component with header info
- `QRPage.tsx` — renders a QR code (via `qrcode` library) to a canvas; print-optimized
- `AdminLogin.tsx` — username/password form; on success sets localStorage flag and navigates to `/admin`
- `AdminDashboard.tsx` — fetches `GET /api/admin/events`; table of events with signup counts
- `AdminEventPage.tsx` — fetches signups; inline notes editing (blur to save); `<dialog>` modal for full field editing

Shared components:
- `AdminLayout.tsx` — nav bar wrapper used by all admin pages
- `ProtectedRoute.tsx` — redirects to `/admin/login` if localStorage flag is not set

API utilities:
- `frontend/src/utils/api.ts` — typed `get`, `post`, `patch` helpers; all requests use `credentials: 'include'` so the session cookie is sent; auto-redirects to login on 401
- `frontend/src/utils/auth.ts` — `setLoggedIn()`, `clearLoggedIn()`, `isLoggedIn()` wrapping localStorage

## Key conventions

### Password hashing

Format: `pbkdf2:{saltHex}:{hashHex}`
- Algorithm: PBKDF2-SHA-256
- Iterations: 100,000
- Key length: 32 bytes
- Salt: 16 random bytes

The worker uses `crypto.subtle` (Web Crypto API). The seed script (`scripts/seed-admin.js`) uses Node's `crypto.pbkdf2Sync`. Both produce the same format and are interoperable.

### Session cookies

`HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`

The `Secure` flag is set only when `ALLOWED_ORIGIN` starts with `https` (i.e., production). This allows the cookie to work over plain HTTP in local dev.

### D1 queries

Always use `env.DB.prepare(sql).bind(...args).run()` for writes, `.first<T>()` for single-row reads, `.all<T>()` for multi-row reads. Never interpolate values into SQL strings.

The `data` column in `signups` stores a JSON string. Parse it with `JSON.parse(row.data)` after reading and serialize with `JSON.stringify(data)` before writing.

### CORS

The worker allows requests from `env.ALLOWED_ORIGIN` (production URL) or `http://localhost:5173` (local Vite dev server). All responses include `Access-Control-Allow-Credentials: true` so the session cookie is accepted cross-origin during local testing.

In production, the Vite proxy is not involved — the Pages app and worker share the same origin, so CORS headers are effectively a no-op for browser requests.

### Scaffold markers

`frontend/src/events/index.ts` and `worker/src/events/registry.ts` contain `// IMPORTS_END`, `// EVENTS_START`, and `// EVENTS_END` comments that the scaffold script uses as insertion points. Do not remove or reformat these comments.

## Database schema

```sql
-- Signup submissions
CREATE TABLE signups (
  id TEXT PRIMARY KEY,          -- crypto.randomUUID()
  event_slug TEXT NOT NULL,
  data TEXT NOT NULL,           -- JSON: { fieldName: value, ... }
  notes TEXT,                   -- Admin-editable; null until set
  created_at TEXT,              -- datetime('now') in SQLite UTC
  ip_address TEXT               -- from CF-Connecting-IP header
);

-- Admin credentials
CREATE TABLE admin_users (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL   -- pbkdf2:{saltHex}:{hashHex}
);
```

Sessions are stored in KV only — no sessions table in D1.

## API reference

| Method | Path | Auth | Handler |
|---|---|---|---|
| POST | `/api/events/:slug/signup` | None | `handlers/signup.ts` |
| POST | `/api/admin/login` | None | `handlers/auth.ts` |
| POST | `/api/admin/logout` | Cookie | `handlers/auth.ts` |
| GET | `/api/admin/events` | Cookie | `handlers/admin.ts` |
| GET | `/api/admin/events/:slug/signups` | Cookie | `handlers/admin.ts` |
| PATCH | `/api/admin/signups/:id` | Cookie | `handlers/admin.ts` |

The PATCH endpoint accepts `{ data?: Record<string, unknown>, notes?: string }`. Unknown field names in `data` are rejected with a 400.

## Local dev

```bash
npm run dev:worker   # wrangler dev at :8787, uses local D1
npm run dev:frontend # vite at :5173, proxies /api to :8787
```

The local D1 database is in `.wrangler/state/` (gitignored). Apply the schema to it before first run:
```bash
cd worker && wrangler d1 execute events-signup --local --file src/db/schema.sql
```

## Things to be careful about

- **Both registries must stay in sync.** If you add an event to one, add it to both. The scaffold script does this automatically.
- **Do not add runtime dependencies to the worker.** The worker uses only `@cloudflare/workers-types` (dev) and native Web APIs. Adding npm packages to the worker can break the build or hit Worker size limits.
- **Do not remove scaffold markers.** The `// IMPORTS_END`, `// EVENTS_START`, `// EVENTS_END` comments in `index.ts` and `registry.ts` are required by `scripts/scaffold.js`.
- **SQL values must be bound, not interpolated.** Always use `.bind(...args)` with placeholders — never string-interpolate user data into SQL.
- **The `_redirects` file is load-bearing.** `frontend/public/_redirects` tells Cloudflare Pages to serve `index.html` for all paths, enabling React Router to handle client-side navigation. Do not delete it.
