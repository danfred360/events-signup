# events.npole.org

Event signup management site. Admins can view and manage signups; each event has a public form and a printable QR code page.

## Architecture

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript, hosted on Cloudflare Pages |
| Backend | Cloudflare Worker (TypeScript) |
| Database | Cloudflare D1 (SQLite) — signups and admin users |
| Sessions | Cloudflare KV — 24-hour session tokens |
| Domain | `events.npole.org` |

The Worker handles all `/api/*` requests via a Cloudflare Worker Route. The Pages app serves everything else. During local development, the Vite dev server proxies `/api` to the worker at `localhost:8787`, so the topology matches production exactly.

## Project Structure

```
events-signup/
├── scripts/
│   ├── scaffold.js          # CLI for generating new event scaffolding
│   └── seed-admin.js        # Generates SQL to create an admin user
├── frontend/
│   ├── public/
│   │   └── _redirects       # Cloudflare Pages SPA routing
│   └── src/
│       ├── events/
│       │   ├── types.ts     # EventConfig and EventField types
│       │   ├── index.ts     # Event registry (managed by scaffold script)
│       │   └── <slug>/
│       │       ├── config.ts  # Event metadata and field definitions
│       │       └── Form.tsx   # Custom React form component
│       ├── pages/           # Route-level page components
│       ├── components/      # Shared UI components
│       └── utils/
│           ├── api.ts       # Typed fetch helpers
│           └── auth.ts      # localStorage session flag helpers
└── worker/
    └── src/
        ├── index.ts         # Router and middleware
        ├── events/
        │   └── registry.ts  # Worker-side event registry (mirrors frontend, no JSX)
        ├── handlers/
        │   ├── auth.ts      # Login / logout
        │   ├── signup.ts    # Public signup endpoint
        │   └── admin.ts     # Admin data endpoints
        └── db/
            └── schema.sql   # D1 schema
```

## First-Time Setup

### 1. Install dependencies

```bash
npm run dev:frontend  # first run will prompt — just npm install in each dir
cd worker && npm install
cd ../frontend && npm install
```

### 2. Create Cloudflare resources

```bash
cd worker
wrangler login
wrangler d1 create events-signup
```

Copy the `database_id` from the output and paste it into `worker/wrangler.toml`.

```bash
wrangler kv:namespace create sessions
```

Copy both `id` and `preview_id` from the output and paste them into `worker/wrangler.toml`.

### 3. Apply the database schema

```bash
# Local (for dev)
wrangler d1 execute events-signup --local --file src/db/schema.sql

# Remote (production)
wrangler d1 execute events-signup --remote --file src/db/schema.sql
```

### 4. Create the first admin user

```bash
cd ..  # back to repo root
node scripts/seed-admin.js --username admin --password "your-secure-password"
```

This prints a `wrangler d1 execute` command. Run it for both local and remote as needed.

## Local Development

```bash
# Terminal 1 — worker (API)
npm run dev:worker

# Terminal 2 — frontend
npm run dev:frontend
```

Frontend runs at `http://localhost:5173`. The Vite proxy forwards `/api/*` to the worker at `http://localhost:8787`, so no CORS configuration is needed in development.

The worker uses a local D1 database stored in `.wrangler/` — changes there don't affect production.

## Adding Events

Run the scaffolder with the event name:

```bash
npm run scaffold -- "Fall Festival 2026"
```

This creates:
- `frontend/src/events/fall-festival-2026/config.ts` — event metadata and form field definitions
- `frontend/src/events/fall-festival-2026/Form.tsx` — the React form component

And updates:
- `frontend/src/events/index.ts` — adds the import and entry
- `worker/src/events/registry.ts` — adds the event metadata for the worker

After scaffolding:
1. Edit `config.ts` to set the real date, description, and field definitions
2. Edit `Form.tsx` to customize layout, validation, or field rendering
3. Restart dev servers — the new routes (`/:slug` and `/:slug/qr`) appear automatically

### Field types

| Type | Rendered as |
|---|---|
| `text` | `<input type="text">` |
| `email` | `<input type="email">` |
| `tel` | `<input type="tel">` |
| `number` | `<input type="number">` |
| `textarea` | `<textarea>` |
| `select` | `<select>` (requires `options: [...]`) |
| `checkbox` | `<input type="checkbox">` |

## Routes

### Public

| Path | Description |
|---|---|
| `/` | Lists all events |
| `/:slug` | Event signup form |
| `/:slug/qr` | Printable QR code pointing to the event form |

### Admin

| Path | Description |
|---|---|
| `/admin/login` | Login page |
| `/admin` | Dashboard — all events with signup counts |
| `/admin/events/:slug` | Signups table for one event; inline note editing; full field editing via dialog |

### API

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/events/:slug/signup` | None | Submit a signup |
| `POST` | `/api/admin/login` | None | Authenticate; sets session cookie |
| `POST` | `/api/admin/logout` | Cookie | Clears session |
| `GET` | `/api/admin/events` | Cookie | Event list with signup counts |
| `GET` | `/api/admin/events/:slug/signups` | Cookie | All signups for an event |
| `PATCH` | `/api/admin/signups/:id` | Cookie | Update signup data or notes |

## Authentication

Admin authentication uses username/password stored in D1. Passwords are hashed with PBKDF2-SHA-256 (100,000 iterations, 16-byte random salt). Sessions are UUIDs stored in Cloudflare KV with a 24-hour TTL and sent as `HttpOnly; Secure; SameSite=Strict` cookies.

The frontend stores only a boolean flag in `localStorage` for redirect purposes — the actual auth check happens server-side on every API call.

## Deployment

### Worker

```bash
npm run deploy:worker
```

### Frontend (Cloudflare Pages)

Set up a Pages project in the Cloudflare dashboard:

| Setting | Value |
|---|---|
| Build command | `cd frontend && npm install && npm run build` |
| Build output directory | `frontend/dist` |
| Custom domain | `events.npole.org` |

Then add a Worker Route in the Cloudflare dashboard:

| Setting | Value |
|---|---|
| Route | `events.npole.org/api/*` |
| Worker | `events-signup-api` |

The `frontend/public/_redirects` file (`/* /index.html 200`) ensures React Router handles all client-side navigation on hard refresh.

## Database Schema

```sql
CREATE TABLE signups (
  id TEXT PRIMARY KEY,
  event_slug TEXT NOT NULL,
  data TEXT NOT NULL,       -- JSON object of form field values
  notes TEXT,               -- Admin-editable notes
  created_at TEXT,          -- ISO 8601 UTC
  ip_address TEXT
);

CREATE TABLE admin_users (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL   -- pbkdf2:{saltHex}:{hashHex}
);
```

Sessions are stored in Cloudflare KV (not D1), keyed by UUID token with a 24-hour TTL.
