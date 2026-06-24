# kbai-ui — Planungsdokument

> **Erstellt:** 24. Juni 2026  
> **Status:** Bereit zur Implementierung  
> **Ziel-Repo:** eigenständiges Repo `kbai-ui` (getrennt von `kb.ai`)

---

## 1. Projektziel

`kbai-ui` ist ein **Browser-basierter Kanban-Client** für den `kb.ai`-Backend-Stack. Er ermöglicht einem einzelnen Nutzer, Kanban-Boards, Tickets, Board-Konfigurationen und Workflow-Übergänge grafisch zu verwalten. Die App kommuniziert **direkt mit der PostgreSQL-Datenbank** — kein MCP-Layer, kein zusätzliches Backend-Protokoll.

---

## 2. Tech-Stack

| Schicht | Technologie | Begründung |
|---|---|---|
| Framework | **SvelteKit** (latest) + TypeScript | SSR + API-Routes in einem, schlankes Bundle |
| Styling | **TailwindCSS v4** | Utility-first, kein Component-Framework-Lock-in |
| DB-Zugriff | **postgres.js** (`npm: postgres`) | Modernes PG-Client-Lib für Node.js, Pool-Support |
| Drag & Drop | **svelte-dnd-action** | Leichtgewichtig, Svelte-native |
| Workflow-Graph | **svelvet** oder **@xyflow/svelte** (Svelte Flow) | Gerichteter Graph für Transition-Editor |
| Icons | **lucide-svelte** | Konsistentes Icon-Set |
| Validierung | **zod** | Schema-Validierung für Formulare und API-Input |
| Testing | **Playwright** (E2E) + **Vitest** (Unit) | Standard für SvelteKit |

---

## 3. Architektur

```
Browser (Svelte)
      │
      │  fetch (JSON)
      ▼
SvelteKit Server (Node.js)
  ├── /api/* — REST-Endpunkte
  ├── src/lib/db.ts — postgres.js Session-Pool
  └── hooks.server.ts — Session-Auth-Middleware
      │
      │  SQL (postgres.js)
      ▼
PostgreSQL (kb.ai Schema)
```

### Schlüsselprinzip: Credential-basierte Auth

- **Host und Port** der DB kommen aus Umgebungsvariablen (`KBAI_DB_HOST`, `KBAI_DB_PORT`)
- **Username und Password** gibt der Nutzer im Browser ein (Login-Formular)
- Credentials werden **nicht persistiert** — weder in der DB, noch auf Disk, noch in `localStorage`
- Nach erfolgreichem Login legt SvelteKit eine **serverseitige In-Memory-Session** an (Map: `sessionId → {user, password}`)
- Der Browser erhält ein **httpOnly-Session-Cookie** (kein JS-Zugriff)
- Bei Server-Neustart verfallen alle Sessions — Nutzer muss sich neu anmelden
- **Die PostgreSQL-Benutzerrechte kontrollieren den Datenzugriff** — kein eigenes RBAC nötig

---

## 4. Umgebungsvariablen (Serverkonfiguration)

```env
KBAI_DB_HOST=localhost          # PG-Host (Pflicht)
KBAI_DB_PORT=5432               # PG-Port (Default: 5432)
KBAI_DB_NAME=kb_ai              # Datenbankname (Pflicht)
KBAI_SESSION_SECRET=<random>    # Schlüssel für Session-Signierung (Pflicht)
KBAI_SESSION_TTL_MINUTES=480    # Session-Lebensdauer (Default: 8h)
PORT=3000                       # HTTP-Port der App (Default: 3000)
```

---

## 5. Datenbankschema (Referenz)

Die App arbeitet auf dem bestehenden `kb.ai`-Schema (Migration `V1__Initial_Multi_Project_Kanban_Schema.sql`). Keine Schemaänderungen durch `kbai-ui`.

### Tabellen

```sql
projects          (id, slug, name, description, created_at)
board_statuses    (id, project_id, name, display_name, position, agent_role_instruction, created_at)
status_transitions(project_id, from_status_id, to_status_id)  -- PK: alle drei Spalten
tickets           (id, project_id, title, description, status_id, assignee, created_at, updated_at)
ticket_tasks      (id, ticket_id, title, is_completed, created_at)
ticket_comments   (id, ticket_id, author, comment_text, created_at)
ticket_documents  (id, ticket_id, file_path_or_url, description, created_at)
ticket_dependencies(ticket_id, blocked_by_ticket_id)
```

### Wichtige DB-Regeln (per Trigger)

- **Workflow-Enforcement:** `UPDATE tickets SET status_id = X` wird vom Trigger `enforce_kanban_workflow_integrity` abgelehnt, wenn kein `status_transitions`-Eintrag `(project_id, old_status_id, X)` existiert
- **Acceptance Criteria:** Ticket kann nur nach `done` verschoben werden, wenn alle `ticket_tasks.is_completed = TRUE`
- **Unique Constraints:** `board_statuses(project_id, name)` ist UNIQUE

---

## 6. Funktionale Anforderungen

### 6.1 Authentifizierung

| Feature | Beschreibung |
|---|---|
| Login-Seite | Felder: DB-Username, DB-Password. Host/Port werden vom Server angezeigt (read-only), damit der Nutzer weiß, mit welcher DB er sich verbindet |
| Login-Validierung | Verbindungsversuch mit den Credentials; bei PG-Auth-Fehler: klare Fehlermeldung |
| Logout | Session serverseitig löschen, Cookie entfernen |
| Session-Ablauf | Nach TTL automatisch zur Login-Seite umleiten |
| Kein Passwort-Speichern | Credentials nur in der serverseitigen In-Memory-Session |

### 6.2 Projekt-Verwaltung

| Feature | Beschreibung |
|---|---|
| Projektliste | Übersicht aller Projekte mit Name, Slug, Beschreibung, Ticket-Anzahl |
| Projekt anlegen | Formular: Slug (auto-sanitized), Name, Beschreibung |
| Projekt bearbeiten | Name und Beschreibung editierbar; Slug nicht änderbar (PK-Abhängigkeiten) |
| Projekt löschen | Mit Bestätigung; CASCADE löscht Statuses, Tickets etc. in der DB |
| Projekt auswählen | Klick öffnet das Board des Projekts |

### 6.3 Board-Ansicht (Kanban)

| Feature | Beschreibung |
|---|---|
| Spalten-Layout | Horizontale Spalten entsprechend `board_statuses.position`; scrollbar bei vielen Spalten |
| Ticket-Karten | Zeigen: Titel, Assignee (Avatar-Initial), Task-Fortschritt (z.B. `2/5`), Ticket-ID |
| Drag & Drop | Ticket per Drag zwischen Spalten verschieben; DB-Trigger-Fehler (ungültige Transition) als Toast-Nachricht anzeigen |
| Spalten-Header | Name + Ticket-Anzahl; Edit-Button öffnet Status-Editor |
| Neues Ticket | `+`-Button in jeder Spalte öffnet Quick-Create-Formular |

### 6.4 Board-Status-Verwaltung

| Feature | Beschreibung |
|---|---|
| Status-Liste | Alle Statuses des Projekts mit Position, Name, Display-Name |
| Status anlegen | Felder: Name (machine, z.B. `in_progress`), Display-Name, Position, Agent-Role-Instruction (Textarea) |
| Status bearbeiten | Alle Felder editierbar inkl. `agent_role_instruction` |
| Status löschen | Nur möglich wenn keine Tickets in diesem Status; Bestätigung erforderlich |
| Position ändern | Drag-to-reorder in der Statusliste; schreibt `position`-Werte zurück |

### 6.5 Workflow-Editor (Transitions)

| Feature | Beschreibung |
|---|---|
| Graph-Visualisierung | Gerichteter Graph: Knoten = Board-Statuses, Kanten = erlaubte Transitions |
| Transition hinzufügen | Kante per Drag von Quell- zu Ziel-Knoten ziehen |
| Transition entfernen | Kante anklicken, dann Delete/Entfernen-Button |
| Validierung | Selbst-Referenzen (`from == to`) werden abgelehnt; Hinweis wenn Graph unzusammenhängend |
| Lese-Modus | Graph auch in der Board-Ansicht als read-only Übersicht aufrufbar |

### 6.6 Ticket-Verwaltung

| Feature | Beschreibung |
|---|---|
| Ticket-Detailansicht | Slide-over oder Modal: alle Felder + Tasks + Comments |
| Ticket anlegen | Felder: Titel, Beschreibung, Status (Dropdown), Assignee |
| Ticket bearbeiten | Titel, Beschreibung, Assignee inline editierbar |
| Status ändern | Dropdown oder Drag & Drop; Trigger-Fehler als Fehlermeldung |
| Tasks | Checkbox-Liste; Task hinzufügen (Inline-Input); abharken |
| Work-Log / Kommentare | Chronologische Liste; neuer Eintrag per Formular (Author, Text) |
| Ticket löschen | Mit Bestätigung |

---

## 7. Nicht-funktionale Anforderungen

| Anforderung | Ziel |
|---|---|
| Performance | Board mit 100 Tickets lädt in < 500ms |
| Fehlerbehandlung | Alle DB-Fehler (Trigger, FK-Violations) als verständliche Toast-Nachrichten |
| Responsive | Mindestens ab 1280px Breite nutzbar; kein Mobile-Fokus |
| Accessibility | Keyboard-Navigation für Formulare; ARIA-Labels an interaktiven Elementen |
| Security | httpOnly-Cookies; keine Credentials im Client-JS; SQL nur über parameterisierte Queries (postgres.js tut das automatisch) |

---

## 8. API-Endpunkte (SvelteKit Server Routes)

Alle Endpunkte unter `/api/`. Auth-Check in `hooks.server.ts`.

### Auth

```
POST   /api/auth/login          { username, password } → { ok, error? }
POST   /api/auth/logout         → 200
GET    /api/auth/session        → { username, db_host, db_port, db_name }
```

### Projekte

```
GET    /api/projects            → Project[]
POST   /api/projects            { slug, name, description? } → Project
PATCH  /api/projects/[id]       { name?, description? } → Project
DELETE /api/projects/[id]       → 200
```

### Board-Statuses

```
GET    /api/projects/[id]/statuses                → BoardStatus[]
POST   /api/projects/[id]/statuses                { name, display_name, position, agent_role_instruction? } → BoardStatus
PATCH  /api/projects/[id]/statuses/[sid]          { display_name?, position?, agent_role_instruction? } → BoardStatus
DELETE /api/projects/[id]/statuses/[sid]          → 200 | 409 (Tickets vorhanden)
PUT    /api/projects/[id]/statuses/reorder        { ordered_ids: number[] } → 200
```

### Transitions

```
GET    /api/projects/[id]/transitions             → Transition[]
POST   /api/projects/[id]/transitions             { from_status_id, to_status_id } → 201 | 409
DELETE /api/projects/[id]/transitions/[from]/[to] → 200
```

### Tickets

```
GET    /api/projects/[id]/tickets                 ?status_id=&limit=&offset= → Ticket[]
POST   /api/projects/[id]/tickets                 { title, description?, status_id, assignee? } → Ticket
GET    /api/tickets/[id]                          → TicketDetailed
PATCH  /api/tickets/[id]                          { title?, description?, assignee?, status_id? } → Ticket
DELETE /api/tickets/[id]                          → 200
```

### Tasks

```
POST   /api/tickets/[id]/tasks                    { title } → Task
PATCH  /api/tasks/[id]                            { is_completed } → Task
DELETE /api/tasks/[id]                            → 200
```

### Kommentare

```
GET    /api/tickets/[id]/comments                 → Comment[]
POST   /api/tickets/[id]/comments                 { author, comment_text } → Comment
```

---

## 9. Seitenstruktur (SvelteKit Routes)

```
/                          → Redirect zu /projects
/login                     → Login-Formular
/projects                  → Projektliste
/projects/new              → Projekt anlegen
/projects/[id]             → Board-Ansicht (Kanban)
/projects/[id]/settings    → Projekt-Einstellungen (Name, Desc, Löschen)
/projects/[id]/statuses    → Status-Liste + Editor
/projects/[id]/workflow    → Workflow-Graph-Editor
/projects/[id]/tickets/new → Ticket anlegen
/tickets/[id]              → Ticket-Detailansicht (Slide-over via URL)
```

---

## 10. Komponenten-Übersicht

```
src/lib/components/
├── auth/
│   └── LoginForm.svelte
├── board/
│   ├── KanbanBoard.svelte       # Outer board container
│   ├── KanbanColumn.svelte      # One status column
│   ├── TicketCard.svelte        # Draggable ticket card
│   └── QuickCreateTicket.svelte # Inline ticket creation
├── tickets/
│   ├── TicketDetail.svelte      # Full ticket view (slide-over)
│   ├── TaskList.svelte          # Checkbox task list
│   └── CommentList.svelte       # Work-log entries
├── statuses/
│   ├── StatusList.svelte        # Drag-to-reorder list
│   └── StatusForm.svelte        # Create/edit form
├── workflow/
│   └── WorkflowEditor.svelte    # svelvet/svelte-flow graph
├── projects/
│   ├── ProjectList.svelte
│   └── ProjectForm.svelte
└── ui/
    ├── Toast.svelte             # Error/success notifications
    ├── Modal.svelte
    ├── SlideOver.svelte
    └── ConfirmDialog.svelte
```

---

## 11. Session-Implementierung (Detail)

```typescript
// hooks.server.ts
const sessions = new Map<string, { username: string; password: string; expires: Date }>();

export const handle: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get('kbai_session');
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)!;
    if (session.expires > new Date()) {
      event.locals.session = session;
    } else {
      sessions.delete(sessionId);
    }
  }
  return resolve(event);
};
```

```typescript
// src/lib/db.ts
import postgres from 'postgres';

export function getDb(username: string, password: string) {
  return postgres({
    host: process.env.KBAI_DB_HOST!,
    port: parseInt(process.env.KBAI_DB_PORT ?? '5432'),
    database: process.env.KBAI_DB_NAME!,
    username,
    password,
    max: 5,  // kleine Pool-Größe, da per-Session
    idle_timeout: 60,
  });
}
```

> **Hinweis:** Für einen produktiven Einsatz sollte der DB-Pool gecacht werden (z.B. ein Pool pro Session-ID statt einem neuen Pool pro Request). Für den Single-User-Fall ist ein neuer Pool pro Request akzeptabel.

---

## 12. Fehlerbehandlung

| Fehlertyp | Behandlung |
|---|---|
| PG Auth-Fehler (falsches Passwort) | Login-Seite: Fehlermeldung unter dem Formular |
| Trigger-Fehler (ungültige Transition) | Board: Toast mit dem Fehlermeldungstext aus `RAISE EXCEPTION` |
| Trigger-Fehler (offene Tasks) | Ticket-Detailansicht: Toast "Alle Tasks müssen abgeschlossen sein" |
| FK-Violation (z.B. Status löschen mit Tickets) | Status-Editor: Toast mit konkretem Hinweis |
| Netzwerk-/DB-Verbindungsfehler | Globale Error-Boundary: "Verbindung zur Datenbank verloren" + Retry-Button |
| Session abgelaufen | Redirect zu `/login` mit Query-Param `?reason=expired` |

---

## 13. Projektstruktur

```
kbai-ui/
├── src/
│   ├── app.html
│   ├── app.css              # Tailwind base
│   ├── hooks.server.ts      # Session-Middleware
│   ├── lib/
│   │   ├── db.ts            # postgres.js Wrapper
│   │   ├── types.ts         # Shared TypeScript-Typen
│   │   └── components/      # (siehe Abschnitt 10)
│   └── routes/
│       ├── +layout.svelte
│       ├── +layout.server.ts
│       ├── login/
│       ├── projects/
│       │   ├── +page.svelte
│       │   ├── new/
│       │   └── [id]/
│       │       ├── +page.svelte         # Board
│       │       ├── settings/
│       │       ├── statuses/
│       │       ├── workflow/
│       │       └── tickets/new/
│       ├── tickets/[id]/
│       └── api/
│           ├── auth/
│           │   ├── login/+server.ts
│           │   ├── logout/+server.ts
│           │   └── session/+server.ts
│           ├── projects/
│           │   ├── +server.ts
│           │   └── [id]/
│           │       ├── +server.ts
│           │       ├── statuses/
│           │       ├── transitions/
│           │       └── tickets/
│           └── tickets/
│               └── [id]/
│                   ├── +server.ts
│                   ├── tasks/
│                   └── comments/
├── static/
├── .env.example
├── package.json
├── svelte.config.js
├── vite.config.ts
└── tailwind.config.ts
```

---

## 14. Implementierungsreihenfolge (empfohlen)

1. **Projekt-Setup:** SvelteKit + TypeScript + Tailwind initialisieren, `.env.example` anlegen
2. **DB-Layer:** `db.ts` mit `getDb()`, Typen aus Schema ableiten (`types.ts`)
3. **Auth:** `hooks.server.ts`, `/api/auth/*`, `/login`-Seite
4. **Projekte API + UI:** CRUD-Endpunkte + Projektliste + Formular
5. **Board-Statuses API + UI:** CRUD + Reorder
6. **Board-Ansicht:** Spalten-Layout, Ticket-Karten (read-only)
7. **Ticket CRUD:** API-Endpunkte + Detailansicht + Formulare
8. **Drag & Drop:** svelte-dnd-action, Fehlerbehandlung für Trigger-Fehler
9. **Tasks + Kommentare:** API + UI in Detailansicht
10. **Workflow-Editor:** Svelte Flow Graph + Transition-CRUD
11. **Polish:** Toasts, Confirm-Dialogs, Keyboard-Navigation, Responsiveness

---

## 15. Deployment

```dockerfile
# Minimales Dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
CMD ["node", "build"]
EXPOSE 3000
```

Umgebungsvariablen werden zur Laufzeit übergeben (nicht ins Image gebacken).

---

## 16. Abgrenzung (Out of Scope)

- Kein MCP-Protokoll — die App liest/schreibt direkt in die DB
- Keine eigene Benutzertabelle — PostgreSQL-User = App-User
- Kein Mobile-Support
- Keine Echtzeit-Updates (kein WebSocket/SSE) — manuelles Reload reicht für Single-User
- Kein Dark-Mode (kann später hinzugefügt werden)
- Keine Ticket-Abhängigkeiten (ticket_dependencies) in v1

---

## 17. Referenzen

- **Backend-Repo:** `kb.ai` (Codeberg: `danszek/kb.ai`)
- **DB-Schema:** `migrations/V1__Initial_Multi_Project_Kanban_Schema.sql`
- **MCP-Server:** `src/main.c` — die 18 MCP-Tools zeigen welche Operationen die DB unterstützt
- **SvelteKit-Docs:** https://kit.svelte.dev
- **postgres.js:** https://github.com/porsager/postgres
- **Svelte Flow:** https://svelteflow.dev
- **svelte-dnd-action:** https://github.com/isaacs/svelte-dnd-action
