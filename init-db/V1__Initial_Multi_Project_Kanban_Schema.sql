-- V1__Initial_Multi_Project_Kanban_Schema.sql
-- kb.ai Initiales Datenbankschema

-- ── Projekte ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
    id          SERIAL PRIMARY KEY,
    slug        VARCHAR(100) UNIQUE NOT NULL,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Board-Statuses (Kanban-Spalten) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS board_statuses (
    id                     SERIAL PRIMARY KEY,
    project_id             INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name                   VARCHAR(100) NOT NULL,
    display_name           VARCHAR(255) NOT NULL,
    position               INTEGER NOT NULL DEFAULT 0,
    agent_role_instruction TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, name)
);

-- ── Workflow-Transitionen ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS status_transitions (
    project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    from_status_id  INTEGER NOT NULL REFERENCES board_statuses(id) ON DELETE CASCADE,
    to_status_id    INTEGER NOT NULL REFERENCES board_statuses(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, from_status_id, to_status_id)
);

-- ── Tickets ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
    id          SERIAL PRIMARY KEY,
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title       VARCHAR(500) NOT NULL,
    description TEXT,
    status_id   INTEGER NOT NULL REFERENCES board_statuses(id),
    assignee    VARCHAR(255),
    model       VARCHAR(100),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Automatisches updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Ticket-Tasks (Checkliste) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_tasks (
    id           SERIAL PRIMARY KEY,
    ticket_id    INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    title        VARCHAR(500) NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Ticket-Kommentare ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_comments (
    id           SERIAL PRIMARY KEY,
    ticket_id    INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    author       VARCHAR(255) NOT NULL,
    comment_text TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Ticket-Dokumente ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_documents (
    id               SERIAL PRIMARY KEY,
    ticket_id        INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    file_path_or_url TEXT NOT NULL,
    description      TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Ticket-Abhängigkeiten ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_dependencies (
    ticket_id           INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    blocked_by_ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    PRIMARY KEY (ticket_id, blocked_by_ticket_id)
);

-- ── Workflow-Enforcement Trigger ──────────────────────────────────────────────
-- Verhindert Status-Übergänge die nicht in status_transitions definiert sind.
-- Ausnahme: Neuerstellung eines Tickets (INSERT wird nicht geprüft).
CREATE OR REPLACE FUNCTION enforce_kanban_workflow_integrity()
RETURNS TRIGGER AS $$
BEGIN
    -- Nur bei tatsächlicher Status-Änderung prüfen
    IF OLD.status_id = NEW.status_id THEN
        RETURN NEW;
    END IF;

    -- Prüfen ob Transition erlaubt ist
    IF NOT EXISTS (
        SELECT 1 FROM status_transitions
        WHERE project_id    = NEW.project_id
          AND from_status_id = OLD.status_id
          AND to_status_id   = NEW.status_id
    ) THEN
        RAISE EXCEPTION 'enforce_kanban_workflow_integrity: transition from % to % not allowed',
            OLD.status_id, NEW.status_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_kanban_workflow_integrity
    BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION enforce_kanban_workflow_integrity();
