# Kabai UI

Browser-basierter Kanban-Client für [kabai](https://codeberg.com/danszek/kb.ai). Verbindet sich direkt mit einer PostgreSQL-Datenbank — kein separates Backend, kein API-Gateway.

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
git clone <repo-url> kabai-ui && cd kabai-ui

cp .env.example .env
# .env öffnen und KABAI_DB_PASSWORD + KABAI_SESSION_SECRET setzen:
#   openssl rand -hex 32   →  KABAI_SESSION_SECRET

docker compose up -d
```

App läuft unter **http://localhost:3000**.  
Login mit den in `.env` gesetzten PostgreSQL-Credentials (`KABAI_DB_USER` / `KABAI_DB_PASSWORD`).

Vollständige Anleitung: [INSTALL.md](./INSTALL.md)

## Lokale Entwicklung

Node.js ≥ 22 und eine laufende PostgreSQL-Instanz vorausgesetzt.

```bash
npm install
cp .env.example .env   # KABAI_DB_HOST, KABAI_DB_NAME, KABAI_SESSION_SECRET anpassen
npm run dev
```

## Umgebungsvariablen

| Variable | Pflicht | Default | Beschreibung |
|---|---|---|---|
| `KABAI_DB_HOST` | ja | — | PostgreSQL-Host |
| `KABAI_DB_PORT` | nein | `5432` | PostgreSQL-Port |
| `KABAI_DB_NAME` | ja | — | Datenbankname |
| `KABAI_DB_SSL` | nein | `false` | `true` für SSL/TLS |
| `KABAI_SESSION_SECRET` | ja | — | Zufälliger Schlüssel für Session-Signierung |
| `KABAI_SESSION_TTL_MINUTES` | nein | `480` | Session-Lebensdauer in Minuten |
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

Kabai UI richtet die kabai-Datenbank für Nutzer ein und hält sie aktuell. Die
Migrationen liegen in `migrations/` (aktuell **V1–V9**, inkl. Zettelkasten-Schema
und docs_required-Guard) und werden von `scripts/migrate.sh` in Versionsreihenfolge
angewendet — jede genau einmal, protokolliert in der Tabelle `schema_migrations`.
Re-Runs sind immer fehlerfrei.

**Neue Datenbank (Docker):** passiert automatisch beim ersten `docker compose up`
(der Runner ist als Init-Hook eingebunden).

**Neue Datenbank (ohne Docker):**

```bash
createdb kabai
set -a; . ./.env; set +a     # KABAI_DB_* laden
scripts/migrate.sh
```

**Bestehende Datenbank aktualisieren** (z.B. nach einem Backend-Release mit neuen
Migrationen): neue `V*.sql` nach `migrations/` übernehmen, dann

```bash
scripts/migrate.sh                  # ohne Docker
docker compose exec -T postgres sh /docker-entrypoint-initdb.d/00-migrate.sh   # mit Docker
```

**Bestands-DB, die vor Einführung des Runners aufgesetzt wurde:** einmalig den
aktuellen Stand markieren, ohne die Migrationen erneut auszuführen —
`scripts/migrate.sh --baseline V9` (bzw. den tatsächlichen Stand der DB angeben).

### Sync mit dem Backend-Repo

Die Quelle der Migrationen ist das kabai-Backend-Repo
([`migrations/`](https://codeberg.org/danszek/kb.ai)). Die Kopien hier werden
**nie editiert**, nur synchronisiert. Prozess bei jedem Backend-Release, das
Migrationen hinzufügt:

1. Neue `V*.sql` aus dem Backend-Repo unverändert nach `migrations/` kopieren
   (bestehende Dateien müssen byte-identisch bleiben — `diff -r` gegen das
   Backend-`migrations/` muss leer sein).
2. Verifizieren: frische DB + `scripts/migrate.sh` zweimal laufen lassen
   (zweiter Lauf muss „0 angewendet" melden).
3. README/INSTALL-Versionsangabe (V1–V*N*) aktualisieren, committen.

Bewusst Kopie statt Git-Submodule/-Subtree: Migrationen ändern sich selten,
Releases sind manuell, und ein Submodule würde jeden Nutzer-Checkout
verkomplizieren. Details: KB-Note `concept-kabai-ui-migrations-sync`.

## Releases

Container-Images werden automatisch bei jedem Tag-Push nach `codeberg.org/danszek/kbai-ui`
gebaut und veröffentlicht. Details und Kriterien für ein Release: [RELEASING.md](./RELEASING.md).

## Lizenz

MIT
