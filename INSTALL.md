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

1. **`postgres`** — PostgreSQL 16, legt beim ersten Start die Datenbank an und führt alle SQL-Skripte aus `init-db/` aus.
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

Beim ersten Start führt PostgreSQL automatisch alle Skripte in `init-db/` aus.
Für spätere Migrationen SQL-Datei manuell einspielen:

```bash
# V3: Echtzeit-Benachrichtigungen (pg_notify-Trigger für Live-Board-Updates)
docker compose exec -T postgres psql -U kb_user -d kabai \
  < V3__Add_Ticket_Notify_Trigger.sql

# V4: Ticket-Relations, Epics, Human-Intervention-Workflow
docker compose exec -T postgres psql -U kb_user -d kabai \
  < init-db/V4__Ticket_Relations_Epic_HumanIntervention.sql

# V5: Live-Updates auch bei Kommentaren/Tasks (ohne Ticket-Statuswechsel)
docker compose exec -T postgres psql -U kb_user -d kabai \
  < V5__Notify_On_Comments_And_Tasks.sql

# V6: Human-Intervention/-Answered-Statuses automatisch für neue Projekte anlegen
docker compose exec -T postgres psql -U kb_user -d kabai \
  < V6__Auto_Create_Human_Statuses_For_New_Projects.sql
```

Bei einer **frischen** Installation (leeres `postgres_data`-Volume) sind alle Migrationen bis V6 bereits in `init-db/V1__Initial_Multi_Project_Kanban_Schema.sql` enthalten — es ist keine manuelle Migration nötig.

---

## 8. Externe PostgreSQL-Datenbank verwenden

Kabai UI kann auch gegen eine bestehende PostgreSQL-Instanz betrieben werden (z.B. Managed DB in der Cloud). Dazu in `docker-compose.yml` den `postgres`-Service entfernen und in `.env` die Verbindungsdaten der externen DB eintragen:

```env
KABAI_DB_HOST=meine-db.example.com
KABAI_DB_PORT=5432
KABAI_DB_NAME=kabai
KABAI_DB_SSL=true
```

Das Schema muss dann manuell eingespielt werden:

```bash
psql -h meine-db.example.com -U kb_user -d kabai \
  -f init-db/V1__Initial_Multi_Project_Kanban_Schema.sql
```

---

## 9. Verzeichnisstruktur

```
kabai-ui/
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
