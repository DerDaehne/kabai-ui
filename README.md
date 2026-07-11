# Kabai UI

Browser-based kanban client for [kabai](https://codeberg.org/danszek/kb.ai). Connects directly to a PostgreSQL database — no separate backend, no API gateway.

## How it fits together

Kabai is a two-part system sharing one PostgreSQL database:

- **[kabai](https://codeberg.org/danszek/kb.ai)** — the MCP server through which AI agents work the boards and the knowledge base (tickets, workflow transitions, zettelkasten notes). This is what makes the setup complete: without it, agents have no way to interact with the database.
- **Kabai UI** (this repo) — the web frontend for humans: watch the boards live, review and answer agent questions, browse the knowledge base. It also owns database setup: migrations are applied automatically (see [Database schema](#database-schema)).

## Features

- **Kanban board** with drag-and-drop between columns
- **Workflow enforcement** — only permitted status transitions are possible (via DB triggers)
- **Workflow editor** — graphical graph editor for status transitions
- **Modal-based navigation** — ticket details, statuses, and workflow open as overlays
- **Ticket management** — inline editing, tasks (checklist), comments
- **Knowledge base** — browse the zettelkasten notes agents maintain, with full-text search
- **Credential-based auth** — log in directly with PostgreSQL username and password
- **Dark neon design** — responsive UI with animations

## Tech stack

| | |
|---|---|
| Framework | SvelteKit + TypeScript |
| Styling | Tailwind CSS v4 |
| Database | postgres.js (directly against PostgreSQL) |
| Workflow graph | @xyflow/svelte |
| Icons | lucide-svelte |
| Validation | zod |

## Quick start (Docker)

```bash
git clone <repo-url> kabai-ui && cd kabai-ui

cp .env.example .env
# open .env and set KABAI_DB_PASSWORD + KABAI_SESSION_SECRET:
#   openssl rand -hex 32   →  KABAI_SESSION_SECRET

docker compose up -d
```

The app runs at **http://localhost:3000**.  
Log in with the PostgreSQL credentials set in `.env` (`KABAI_DB_USER` / `KABAI_DB_PASSWORD`).

Full guide: [INSTALL.md](./INSTALL.md)

## Local development

Requires Node.js ≥ 22 and a running PostgreSQL instance.

```bash
npm install
cp .env.example .env   # adjust KABAI_DB_HOST, KABAI_DB_NAME, KABAI_SESSION_SECRET
npm run dev
```

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `KABAI_DB_HOST` | yes | — | PostgreSQL host |
| `KABAI_DB_PORT` | no | `5432` | PostgreSQL port |
| `KABAI_DB_NAME` | yes | — | Database name |
| `KABAI_DB_SSL` | no | `false` | `true` for SSL/TLS |
| `KABAI_SESSION_SECRET` | yes | — | Random key for session signing |
| `KABAI_SESSION_TTL_MINUTES` | no | `480` | Session lifetime in minutes |
| `PORT` | no | `3000` | HTTP port of the app |

## Architecture

```
Browser (Svelte)                 AI agents
      │  fetch (JSON)                 │  MCP
      ▼                               ▼
SvelteKit Server (Node.js)      kabai MCP server
  ├── /api/*              REST endpoints
  ├── src/lib/db.ts       postgres.js session pool
  └── hooks.server.ts     session middleware
      │  SQL                          │  SQL
      ▼                               ▼
           PostgreSQL (shared database)
```

**Auth principle:** host/port come from environment variables. Username and password are entered by the user in the browser. Credentials are never persisted — they are held only in a server-side in-memory session. PostgreSQL user permissions govern data access.

## Database schema

Kabai UI sets up the kabai database and keeps it up to date — **no manual
migration steps required**. Migrations live in `migrations/` (currently
**V1–V9**, including the zettelkasten schema and the docs_required guard) and
are applied by `scripts/migrate.sh` in version order — each exactly once,
recorded in the `schema_migrations` table. Re-runs are always safe.

**Docker:** the `migrate` compose service runs automatically on **every**
`docker compose up` — it applies pending migrations before the app starts.
Fresh setups and updates (new `V*.sql` arriving via `git pull`) are both
covered; there is nothing to run by hand.

**Without Docker / external database:**

```bash
createdb kabai
set -a; . ./.env; set +a     # load KABAI_DB_*
scripts/migrate.sh
```

**Existing database that predates the runner** (no `schema_migrations`
table): mark the current state once, without re-executing the migrations —

```bash
docker compose run --rm migrate --baseline V6   # use the actual state of your DB
# or without Docker: scripts/migrate.sh --baseline V6
```

### Syncing with the backend repo

The source of truth for migrations is the kabai backend repo
([`migrations/`](https://codeberg.org/danszek/kb.ai)). The copies here are
**never edited**, only synced. Process for every backend release that adds
migrations:

1. Copy new `V*.sql` from the backend repo unchanged into `migrations/`
   (existing files must remain byte-identical — `diff -r` against the
   backend `migrations/` must be empty).
2. Verify: fresh database + run `scripts/migrate.sh` twice
   (the second run must report "0 applied").
3. Update the V1–V*N* range in README/INSTALL, commit.

Deliberately a copy instead of a git submodule/subtree: migrations change
rarely, releases are manual anyway, and a submodule would complicate every
user checkout. Details: knowledge-base note `concept-kabai-ui-migrations-sync`.

## Releases

Container images are built and published automatically on every tag push to
`codeberg.org/danszek/kabai-ui`. Details and release criteria: [RELEASING.md](./RELEASING.md).

## License

MIT
