# Kabai UI — Installation Guide

Browser-based kanban client for [kabai](https://github.com/DerDaehne/kabai), operated with Docker Compose.

To make the setup complete for AI agents, also install the kabai MCP server — Kabai UI is the human-facing frontend, kabai is how agents work the same database.

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) ≥ 24
- [Docker Compose](https://docs.docker.com/compose/install/) ≥ 2.20 (usually included in Docker Desktop)
- `openssl` for generating the session secret (present on every Linux/macOS)

---

## 1. Clone the repository

```bash
git clone <repo-url> kabai-ui
cd kabai-ui
```

---

## 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and adjust at least these three values:

| Variable | Description | Example |
|---|---|---|
| `KABAI_DB_PASSWORD` | PostgreSQL password | `my-secure-password` |
| `KABAI_SESSION_SECRET` | Random key for session signing | see below |
| `KABAI_DB_USER` | PostgreSQL username | `kb_user` |

Generate a session secret:

```bash
openssl rand -hex 32
```

A complete `.env` (minimal example):

```env
KABAI_DB_USER=kb_user
KABAI_DB_PASSWORD=my-secure-password
KABAI_DB_NAME=kabai
KABAI_SESSION_SECRET=a1b2c3d4e5f6...  # output of openssl rand -hex 32
KABAI_SESSION_TTL_MINUTES=480
KABAI_PORT=3000
```

---

## 3. Start

```bash
docker compose up -d
```

Docker Compose starts:

1. **`postgres`** — PostgreSQL 16; creates the database on first start.
2. **`kabai-ui`** — pulls the published image (`ghcr.io/derdaehne/kabai-ui:latest`) and starts the app once PostgreSQL is ready. On startup the app first applies all pending schema migrations (baked into the image, tracked in the `schema_migrations` table — re-runs are no-ops), then starts the server.

Watch the logs:

```bash
docker compose logs -f
```

The app is reachable at: **http://localhost:3000** (or the port configured in `KABAI_PORT`).

---

## 4. Log in

Kabai UI has no user management of its own — you log in directly with PostgreSQL credentials.

On first start the credentials are identical to the values from `.env`:

| Field | Value |
|---|---|
| Username | value of `KABAI_DB_USER` (e.g. `kb_user`) |
| Password | value of `KABAI_DB_PASSWORD` |

Additional PostgreSQL users can be created with standard SQL commands (see section 6).

---

## 5. Stop and manage data

```bash
# Stop (data is kept)
docker compose down

# Stop and delete the database volume (data loss!)
docker compose down -v

# Update the app to the latest published image
docker compose pull kabai-ui && docker compose up -d kabai-ui
```

---

## 6. Create additional PostgreSQL users

Since every user logs in with their own PostgreSQL credentials, multiple users with different permissions can be set up.

```bash
# Open a shell into the postgres container
docker compose exec postgres psql -U kb_user -d kabai
```

```sql
-- Create a new user
CREATE USER alice WITH PASSWORD 'alice-password';

-- Read access to all tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO alice;

-- Full access (read + write)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO alice;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO alice;
```

---

## 7. Updating the database schema

The schema comes from `migrations/` (V1–V14, unmodified copies from
the kabai backend repo). The migrations are baked into the Docker image and applied by
the app itself on every startup: every migration runs exactly once; applied
versions are stored in the `schema_migrations` table.

**There is no manual migration step.** Updating means pulling the new image
and restarting — the app brings the database up to the migration level its
version ships with:

```bash
docker compose pull kabai-ui && docker compose up -d kabai-ui
```

The runner uses `KABAI_DB_USER`/`KABAI_DB_PASSWORD` from the environment.
If they are missing, the app starts with a warning and skips migrations; if
a migration fails, the app does not start.

**Existing databases** (set up before the runner existed, or with an
incomplete `schema_migrations` ledger from an interrupted run): handled
automatically on every start. The runner probes which migrations are
already present (tables/columns/triggers), records those without re-running
them, and applies only what is genuinely missing. Manual override if ever
needed:

```bash
docker compose run --rm kabai-ui node scripts/migrate.mjs --baseline V6
# marks V1..V6 as applied without executing them
```

---

## 8. Using an external PostgreSQL database

Kabai UI can also run against an existing PostgreSQL instance (e.g. a managed cloud DB). Remove the `postgres` service from `docker-compose.yml` and put the external connection data into `.env`:

```env
KABAI_DB_HOST=my-db.example.com
KABAI_DB_PORT=5432
KABAI_DB_NAME=kabai
KABAI_DB_SSL=true
```

The app applies the schema itself on startup. To run the migrations
manually instead (requires Node.js locally):

```bash
set -a; . ./.env; set +a     # load KABAI_DB_*
npm run migrate
```

---

## 9. Directory layout

```
kabai-ui/
├── migrations/                      # schema migrations V1–V14 (copies from the backend repo)
│   └── V*__*.sql
├── scripts/
│   └── migrate.mjs                  # migration runner (runs on app startup; schema_migrations tracking)
├── src/                             # SvelteKit source code
├── Dockerfile                       # multi-stage build (bakes migrations + runner into the image)
├── docker-compose.yml               # app + PostgreSQL
├── .env.example                     # template for environment variables
└── .env                             # your configuration (do not commit)
```

---

## 10. Troubleshooting

**App does not start / `KABAI_SESSION_SECRET is required`**

`.env` is missing or `KABAI_SESSION_SECRET` is empty. Repeat step 2.

**Login fails: "Connection test failed"**

PostgreSQL is not ready yet. Wait a moment and try again. Check the logs:
```bash
docker compose logs postgres
```

**App does not start / migration failure in the logs**

The startup runner refuses to start the app when a migration fails, to
avoid running against a half-migrated schema. Check
`docker compose logs kabai-ui` for the `[migrate] FAILED:` line. Existing
databases are baselined automatically (see section 7); if the automatic
detection ever misjudges your schema, override it once with
`--baseline VN`, then start again.

**Image upload fails with "403" (attachments, ticket images)**

SvelteKit's CSRF protection compares the browser's `Origin` header
against the app's own computed origin for file-upload requests.
Without `ORIGIN` set, `adapter-node` *guesses* its own origin as
`https://<Host header>` — even if the app is plain HTTP with no
reverse proxy at all (e.g. accessed over a VPN-internal hostname via
`http://`). That guess then doesn't match the browser's real
`http://` origin, and the upload is rejected. Fix: set `ORIGIN` in
`.env` to exactly the URL you type into the browser — scheme, host,
and port (see `.env.example`) — then restart (`docker compose up -d`).

**Port 3000 is already in use**

Change `KABAI_PORT` in `.env` to a free port (e.g. `3001`), then `docker compose up -d`.

**Reset the database volume**

```bash
docker compose down -v
docker compose up -d
```
