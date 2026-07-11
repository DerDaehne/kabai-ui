# Kabai UI — Installationsanleitung

Browser-basierter Kanban-Client für kabai, betrieben mit Docker Compose.

---

## Voraussetzungen

- [Docker](https://docs.docker.com/get-docker/) ≥ 24
- [Docker Compose](https://docs.docker.com/compose/install/) ≥ 2.20 (i.d.R. in Docker Desktop enthalten)
- `openssl` zum Erzeugen des Session-Secrets (auf jedem Linux/macOS vorhanden)

---

## 1. Repository klonen

```bash
git clone <repo-url> kabai-ui
cd kabai-ui
```

---

## 2. Umgebungsvariablen konfigurieren

```bash
cp .env.example .env
```

`.env` öffnen und mindestens diese drei Werte anpassen:

| Variable | Beschreibung | Beispiel |
|---|---|---|
| `KABAI_DB_PASSWORD` | PostgreSQL-Passwort | `mein-sicheres-passwort` |
| `KABAI_SESSION_SECRET` | Zufälliger Schlüssel für Session-Signierung | siehe unten |
| `KABAI_DB_USER` | PostgreSQL-Benutzername | `kb_user` |

Session-Secret erzeugen:

```bash
openssl rand -hex 32
```

Fertige `.env` (Minimalbeispiel):

```env
KABAI_DB_USER=kb_user
KABAI_DB_PASSWORD=mein-sicheres-passwort
KABAI_DB_NAME=kabai
KABAI_SESSION_SECRET=a1b2c3d4e5f6...  # Ausgabe von openssl rand -hex 32
KABAI_SESSION_TTL_MINUTES=480
KABAI_PORT=3000
```

---

## 3. Starten

```bash
docker compose up -d
```

Docker Compose startet:

1. **`postgres`** — PostgreSQL 16, legt beim ersten Start die Datenbank an und wendet die Migrationen aus `migrations/` über den Runner an.
2. **`kabai-ui`** — baut das SvelteKit-Image und startet die App, sobald PostgreSQL bereit ist.

Logs beobachten:

```bash
docker compose logs -f
```

Die App ist erreichbar unter: **http://localhost:3000** (oder dem in `KABAI_PORT` konfigurierten Port).

---

## 4. Einloggen

Kabai UI verwendet keine eigene Benutzerverwaltung — die Anmeldung erfolgt direkt mit PostgreSQL-Credentials.

Beim ersten Start sind die Credentials identisch mit den Werten aus `.env`:

| Feld | Wert |
|---|---|
| Benutzername | Wert von `KABAI_DB_USER` (z.B. `kb_user`) |
| Passwort | Wert von `KABAI_DB_PASSWORD` |

Weitere PostgreSQL-Benutzer können mit Standard-SQL-Befehlen angelegt werden (siehe Abschnitt 6).

---

## 5. Stoppen und Daten verwalten

```bash
# Stoppen (Daten bleiben erhalten)
docker compose down

# Stoppen und Datenbank-Volume löschen (Datenverlust!)
docker compose down -v

# Nur die App neu starten (z.B. nach Code-Änderungen)
docker compose up -d --build kabai-ui
```

---

## 6. Weitere PostgreSQL-Benutzer anlegen

Da sich jeder Nutzer mit eigenen PostgreSQL-Credentials anmeldet, können mehrere Benutzer mit unterschiedlichen Rechten eingerichtet werden.

```bash
# Shell in den Postgres-Container öffnen
docker compose exec postgres psql -U kb_user -d kabai
```

```sql
-- Neuen Benutzer anlegen
CREATE USER alice WITH PASSWORD 'alice-passwort';

-- Lesezugriff auf alle Tabellen
GRANT SELECT ON ALL TABLES IN SCHEMA public TO alice;

-- Vollzugriff (Lesen + Schreiben)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO alice;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO alice;
```

---

## 7. Datenbankschema aktualisieren

Das Schema kommt aus `migrations/` (V1–V9, unveränderte Kopien aus dem
kabai-Backend-Repo) und wird von `scripts/migrate.sh` verwaltet: jede Migration
läuft genau einmal, angewendete Versionen stehen in der Tabelle
`schema_migrations`. Re-Runs sind immer fehlerfrei.

Bei einer **frischen** Installation (leeres `postgres_data`-Volume) läuft der
Runner automatisch beim ersten Start — keine manuelle Migration nötig.

**Update einer laufenden Installation** (neue `V*.sql` sind per `git pull`
angekommen):

```bash
docker compose exec -T postgres sh /docker-entrypoint-initdb.d/00-migrate.sh
```

**Bestands-DB von vor Einführung des Runners** (kein `schema_migrations`
vorhanden): einmalig den vorhandenen Stand markieren, ohne die Migrationen
erneut auszuführen — danach normale Updates wie oben:

```bash
docker compose exec -T postgres sh /docker-entrypoint-initdb.d/00-migrate.sh --baseline V6
# V6 = Beispiel; den tatsächlichen Migrationsstand der DB angeben
```

---

## 8. Externe PostgreSQL-Datenbank verwenden

Kabai UI kann auch gegen eine bestehende PostgreSQL-Instanz betrieben werden (z.B. Managed DB in der Cloud). Dazu in `docker-compose.yml` den `postgres`-Service entfernen und in `.env` die Verbindungsdaten der externen DB eintragen:

```env
KABAI_DB_HOST=meine-db.example.com
KABAI_DB_PORT=5432
KABAI_DB_NAME=kabai
KABAI_DB_SSL=true
```

Das Schema wird dann mit dem Migrations-Runner eingespielt (psql lokal
vorausgesetzt):

```bash
set -a; . ./.env; set +a     # KABAI_DB_* laden
scripts/migrate.sh
```

---

## 9. Verzeichnisstruktur

```
kabai-ui/
├── migrations/                      # Schema-Migrationen V1–V9 (Kopien aus dem Backend-Repo)
│   └── V*__*.sql
├── scripts/
│   └── migrate.sh                   # Migrations-Runner (schema_migrations-Tracking)
├── src/                             # SvelteKit-Quellcode
├── Dockerfile                       # Multi-Stage Build
├── docker-compose.yml               # App + PostgreSQL
├── .env.example                     # Vorlage für Umgebungsvariablen
└── .env                             # Eigene Konfiguration (nicht einchecken)
```

---

## 10. Troubleshooting

**App startet nicht / `KABAI_SESSION_SECRET is required`**

`.env` fehlt oder `KABAI_SESSION_SECRET` ist leer. Schritt 2 wiederholen.

**Login schlägt fehl: "Connection test failed"**

PostgreSQL ist noch nicht bereit. Kurz warten und erneut versuchen. Logs prüfen:
```bash
docker compose logs postgres
```

**Port 3000 ist belegt**

`KABAI_PORT` in `.env` auf einen freien Port ändern (z.B. `3001`), dann `docker compose up -d`.

**Datenbank-Volume zurücksetzen**

```bash
docker compose down -v
docker compose up -d
```
