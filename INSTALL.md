# kbai-ui — Installationsanleitung

Browser-basierter Kanban-Client für kb.ai, betrieben mit Docker Compose.

---

## Voraussetzungen

- [Docker](https://docs.docker.com/get-docker/) ≥ 24
- [Docker Compose](https://docs.docker.com/compose/install/) ≥ 2.20 (i.d.R. in Docker Desktop enthalten)
- `openssl` zum Erzeugen des Session-Secrets (auf jedem Linux/macOS vorhanden)

---

## 1. Repository klonen

```bash
git clone <repo-url> kbai-ui
cd kbai-ui
```

---

## 2. Umgebungsvariablen konfigurieren

```bash
cp .env.example .env
```

`.env` öffnen und mindestens diese drei Werte anpassen:

| Variable | Beschreibung | Beispiel |
|---|---|---|
| `KBAI_DB_PASSWORD` | PostgreSQL-Passwort | `mein-sicheres-passwort` |
| `KBAI_SESSION_SECRET` | Zufälliger Schlüssel für Session-Signierung | siehe unten |
| `KBAI_DB_USER` | PostgreSQL-Benutzername | `kb_user` |

Session-Secret erzeugen:

```bash
openssl rand -hex 32
```

Fertige `.env` (Minimalbeispiel):

```env
KBAI_DB_USER=kb_user
KBAI_DB_PASSWORD=mein-sicheres-passwort
KBAI_DB_NAME=kb_ai
KBAI_SESSION_SECRET=a1b2c3d4e5f6...  # Ausgabe von openssl rand -hex 32
KBAI_SESSION_TTL_MINUTES=480
KBAI_PORT=3000
```

---

## 3. Starten

```bash
docker compose up -d
```

Docker Compose startet:

1. **`postgres`** — PostgreSQL 16, legt beim ersten Start die Datenbank an und führt alle SQL-Skripte aus `init-db/` aus.
2. **`kbai-ui`** — baut das SvelteKit-Image und startet die App, sobald PostgreSQL bereit ist.

Logs beobachten:

```bash
docker compose logs -f
```

Die App ist erreichbar unter: **http://localhost:3000** (oder dem in `KBAI_PORT` konfigurierten Port).

---

## 4. Einloggen

kbai-ui verwendet keine eigene Benutzerverwaltung — die Anmeldung erfolgt direkt mit PostgreSQL-Credentials.

Beim ersten Start sind die Credentials identisch mit den Werten aus `.env`:

| Feld | Wert |
|---|---|
| Benutzername | Wert von `KBAI_DB_USER` (z.B. `kb_user`) |
| Passwort | Wert von `KBAI_DB_PASSWORD` |

Weitere PostgreSQL-Benutzer können mit Standard-SQL-Befehlen angelegt werden (siehe Abschnitt 6).

---

## 5. Stoppen und Daten verwalten

```bash
# Stoppen (Daten bleiben erhalten)
docker compose down

# Stoppen und Datenbank-Volume löschen (Datenverlust!)
docker compose down -v

# Nur die App neu starten (z.B. nach Code-Änderungen)
docker compose up -d --build kbai-ui
```

---

## 6. Weitere PostgreSQL-Benutzer anlegen

Da sich jeder Nutzer mit eigenen PostgreSQL-Credentials anmeldet, können mehrere Benutzer mit unterschiedlichen Rechten eingerichtet werden.

```bash
# Shell in den Postgres-Container öffnen
docker compose exec postgres psql -U kb_user -d kb_ai
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

Beim ersten Start führt PostgreSQL automatisch alle Skripte in `init-db/` aus.
Für spätere Migrationen SQL-Datei manuell einspielen:

```bash
# V3: Echtzeit-Benachrichtigungen (pg_notify-Trigger für Live-Board-Updates)
docker compose exec -T postgres psql -U kb_user -d kb_ai \
  < V3__Add_Ticket_Notify_Trigger.sql
```

---

## 8. Externe PostgreSQL-Datenbank verwenden

kbai-ui kann auch gegen eine bestehende PostgreSQL-Instanz betrieben werden (z.B. Managed DB in der Cloud). Dazu in `docker-compose.yml` den `postgres`-Service entfernen und in `.env` die Verbindungsdaten der externen DB eintragen:

```env
KBAI_DB_HOST=meine-db.example.com
KBAI_DB_PORT=5432
KBAI_DB_NAME=kb_ai
KBAI_DB_SSL=true
```

Das Schema muss dann manuell eingespielt werden:

```bash
psql -h meine-db.example.com -U kb_user -d kb_ai \
  -f init-db/V1__Initial_Multi_Project_Kanban_Schema.sql
```

---

## 9. Verzeichnisstruktur

```
kbai-ui/
├── init-db/                         # SQL-Skripte (werden beim DB-Start ausgeführt)
│   └── V1__Initial_Multi_Project_Kanban_Schema.sql
├── src/                             # SvelteKit-Quellcode
├── Dockerfile                       # Multi-Stage Build
├── docker-compose.yml               # App + PostgreSQL
├── .env.example                     # Vorlage für Umgebungsvariablen
└── .env                             # Eigene Konfiguration (nicht einchecken)
```

---

## 10. Troubleshooting

**App startet nicht / `KBAI_SESSION_SECRET is required`**

`.env` fehlt oder `KBAI_SESSION_SECRET` ist leer. Schritt 2 wiederholen.

**Login schlägt fehl: "Connection test failed"**

PostgreSQL ist noch nicht bereit. Kurz warten und erneut versuchen. Logs prüfen:
```bash
docker compose logs postgres
```

**Port 3000 ist belegt**

`KBAI_PORT` in `.env` auf einen freien Port ändern (z.B. `3001`), dann `docker compose up -d`.

**Datenbank-Volume zurücksetzen**

```bash
docker compose down -v
docker compose up -d
```
