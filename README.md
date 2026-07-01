# kbai-ui

Browser-basierter Kanban-Client für [kb.ai](https://codeberg.com/danszek/kb.ai). Verbindet sich direkt mit einer PostgreSQL-Datenbank — kein separates Backend, kein API-Gateway.

## Features

- **Kanban-Board** mit Drag-and-Drop zwischen Spalten
- **Workflow-Enforcement** — nur erlaubte Status-Übergänge sind möglich (per DB-Trigger)
- **Workflow-Editor** — grafischer Graph-Editor für Status-Transitionen
- **Modal-basierte Navigation** — Ticket-Details, Statuses und Workflow öffnen als Overlays
- **Ticket-Verwaltung** — Inline-Bearbeitung, Tasks (Checkliste), Kommentare
- **Credential-basierte Auth** — Login direkt mit PostgreSQL-Benutzername und Passwort
- **Dark Neon Design** — responsives UI mit Animationen

## Tech-Stack

| | |
|---|---|
| Framework | SvelteKit + TypeScript |
| Styling | Tailwind CSS v4 |
| Datenbank | postgres.js (direkt gegen PostgreSQL) |
| Workflow-Graph | @xyflow/svelte |
| Icons | lucide-svelte |
| Validierung | zod |

## Schnellstart (Docker)

```bash
git clone <repo-url> kbai-ui && cd kbai-ui

cp .env.example .env
# .env öffnen und KBAI_DB_PASSWORD + KBAI_SESSION_SECRET setzen:
#   openssl rand -hex 32   →  KBAI_SESSION_SECRET

docker compose up -d
```

App läuft unter **http://localhost:3000**.  
Login mit den in `.env` gesetzten PostgreSQL-Credentials (`KBAI_DB_USER` / `KBAI_DB_PASSWORD`).

Vollständige Anleitung: [INSTALL.md](./INSTALL.md)

## Lokale Entwicklung

Node.js ≥ 22 und eine laufende PostgreSQL-Instanz vorausgesetzt.

```bash
npm install
cp .env.example .env   # KBAI_DB_HOST, KBAI_DB_NAME, KBAI_SESSION_SECRET anpassen
npm run dev
```

## Umgebungsvariablen

| Variable | Pflicht | Default | Beschreibung |
|---|---|---|---|
| `KBAI_DB_HOST` | ja | — | PostgreSQL-Host |
| `KBAI_DB_PORT` | nein | `5432` | PostgreSQL-Port |
| `KBAI_DB_NAME` | ja | — | Datenbankname |
| `KBAI_DB_SSL` | nein | `false` | `true` für SSL/TLS |
| `KBAI_SESSION_SECRET` | ja | — | Zufälliger Schlüssel für Session-Signierung |
| `KBAI_SESSION_TTL_MINUTES` | nein | `480` | Session-Lebensdauer in Minuten |
| `PORT` | nein | `3000` | HTTP-Port der App |

## Architektur

```
Browser (Svelte)
      │  fetch (JSON)
      ▼
SvelteKit Server (Node.js)
  ├── /api/*              REST-Endpunkte
  ├── src/lib/db.ts       postgres.js Session-Pool
  └── hooks.server.ts     Session-Middleware
      │  SQL
      ▼
PostgreSQL
```

**Auth-Prinzip:** Host/Port kommen aus Umgebungsvariablen. Benutzername und Passwort gibt der Nutzer im Browser ein. Credentials werden nicht persistiert — nur als serverseitige In-Memory-Session gehalten. Die PostgreSQL-Benutzerrechte steuern den Datenzugriff.

## Datenbankschema

Das Schema wird beim ersten `docker compose up` automatisch aus `init-db/` eingespielt.  
Für manuelle Migrationen:

```bash
docker compose exec -T postgres psql -U kb_user -d kb_ai \
  < init-db/V1__Initial_Multi_Project_Kanban_Schema.sql
```

## Releases

Container-Images werden automatisch bei jedem Tag-Push nach `codeberg.org/danszek/kbai-ui`
gebaut und veröffentlicht. Details und Kriterien für ein Release: [RELEASING.md](./RELEASING.md).

## Lizenz

MIT
