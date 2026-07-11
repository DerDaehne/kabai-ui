# Kabai UI — Installation Guide

Browser-based kanban client for [kabai](https://codeberg.org/danszek/kb.ai), operated with Docker Compose.

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
2. **`migrate`** — short-lived migration runner; applies all pending schema migrations from `migrations/` on **every** `docker compose up`, then exits. Applied versions are tracked in the `schema_migrations` table, so re-runs are no-ops.
3. **`kabai-ui`** — builds the SvelteKit image and starts the app once PostgreSQL is ready and migrations have completed successfully.

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

# Restart only the app (e.g. after code changes)
docker compose up -d --build kabai-ui
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

The schema comes from `migrations/` (V1–V9, unmodified copies from the kabai
backend repo) and is managed by `scripts/migrate.sh`: every migration runs
exactly once; applied versions are stored in the `schema_migrations` table.

**There is no manual migration step.** When new `V*.sql` files arrive via
`git pull`, simply run:

```bash
docker compose up -d
```

The `migrate` service applies whatever is pending before the app starts.

**Existing database that predates the runner** (no `schema_migrations`
table): mark the existing state once, without re-executing the migrations —
then normal updates as above:

```bash
docker compose run --rm migrate --baseline V6
# V6 is an example; state the actual migration level of your database
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

Apply the schema with the migration runner (requires local psql):

```bash
set -a; . ./.env; set +a     # load KABAI_DB_*
scripts/migrate.sh
```

---

## 9. Directory layout

```
kabai-ui/
├── migrations/                      # schema migrations V1–V9 (copies from the backend repo)
│   └── V*__*.sql
├── scripts/
│   └── migrate.sh                   # migration runner (schema_migrations tracking)
├── src/                             # SvelteKit source code
├── Dockerfile                       # multi-stage build
├── docker-compose.yml               # app + PostgreSQL + migration runner
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

**`migrate` service fails on an old database**

A database created before the migration runner existed has no
`schema_migrations` table, so the runner tries to apply everything from V1.
Baseline it once to the actual state of your schema (see section 7).

**Port 3000 is already in use**

Change `KABAI_PORT` in `.env` to a free port (e.g. `3001`), then `docker compose up -d`.

**Reset the database volume**

```bash
docker compose down -v
docker compose up -d
```
