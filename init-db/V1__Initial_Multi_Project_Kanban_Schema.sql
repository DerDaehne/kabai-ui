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
-- special_type: 'human_intervention' (jeder Status darf hierher wechseln, Eskalation)
--               'human_answered'     (darf zu jedem Status wechseln, nachdem der Mensch geantwortet hat)
--               NULL = normale Spalte
CREATE TABLE IF NOT EXISTS board_statuses (
    id                     SERIAL PRIMARY KEY,
    project_id             INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name                   VARCHAR(100) NOT NULL,
    display_name           VARCHAR(255) NOT NULL,
    position               INTEGER NOT NULL DEFAULT 0,
    agent_role_instruction TEXT,
    special_type           VARCHAR(50),
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
    type        VARCHAR(50) NOT NULL DEFAULT 'ticket',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Ticket-Relationen (Epics, Blockaden, Duplikate, generische Bezüge) ────────
CREATE TABLE IF NOT EXISTS ticket_relations (
    id             SERIAL PRIMARY KEY,
    from_ticket_id INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    to_ticket_id   INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    relation_type  VARCHAR(50) NOT NULL
        CHECK (relation_type IN ('parent_of', 'blocks', 'duplicate_of', 'relates_to')),
    created_at     TIMESTAMP DEFAULT NOW(),
    UNIQUE (from_ticket_id, to_ticket_id, relation_type),
    CONSTRAINT check_not_self_related CHECK (from_ticket_id <> to_ticket_id)
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
-- Ausnahme: Neuerstellung eines Tickets (INSERT wird nicht geprüft), sowie
-- Eskalation nach human_intervention (immer erlaubt) und Rückkehr aus
-- human_answered (immer erlaubt) — siehe special_type auf board_statuses.
-- Prüft außerdem, dass beim Wechsel nach "done" keine offenen Tasks bleiben.
CREATE OR REPLACE FUNCTION enforce_kanban_workflow_integrity()
RETURNS TRIGGER AS $$
DECLARE
    target_status_name  VARCHAR(50);
    target_special_type VARCHAR(50);
    source_special_type VARCHAR(50);
    open_tasks_count    INT;
    is_initial_insert   BOOLEAN := (TG_OP = 'INSERT');
BEGIN
    IF NOT is_initial_insert AND OLD.status_id = NEW.status_id THEN
        RETURN NEW;
    END IF;

    IF NOT is_initial_insert THEN
        SELECT special_type INTO target_special_type
          FROM board_statuses WHERE id = NEW.status_id;
        SELECT special_type INTO source_special_type
          FROM board_statuses WHERE id = OLD.status_id;

        IF (target_special_type IS DISTINCT FROM 'human_intervention') AND
           (source_special_type IS DISTINCT FROM 'human_answered') THEN
            IF NOT EXISTS (
                SELECT 1 FROM status_transitions
                WHERE project_id    = NEW.project_id
                  AND from_status_id = OLD.status_id
                  AND to_status_id   = NEW.status_id
            ) THEN
                RAISE EXCEPTION 'enforce_kanban_workflow_integrity: transition from % to % not allowed',
                    OLD.status_id, NEW.status_id;
            END IF;
        END IF;
    END IF;

    SELECT name INTO target_status_name
      FROM board_statuses WHERE id = NEW.status_id;

    IF target_status_name = 'done' THEN
        SELECT COUNT(*) INTO open_tasks_count
          FROM ticket_tasks
         WHERE ticket_id = NEW.id AND is_completed = FALSE;

        IF open_tasks_count > 0 THEN
            RAISE EXCEPTION 'enforce_kanban_workflow_integrity: ticket % has % unresolved task(s)',
                NEW.id, open_tasks_count;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_kanban_workflow_integrity
    BEFORE INSERT OR UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION enforce_kanban_workflow_integrity();

-- ── Auto-Erstellung der Human-Intervention-Statuses für neue Projekte ────────
CREATE OR REPLACE FUNCTION create_human_intervention_statuses()
RETURNS TRIGGER AS $$
DECLARE
    hi_id INT;
    ha_id INT;
BEGIN
    INSERT INTO board_statuses
        (project_id, name, display_name, position, special_type, agent_role_instruction)
    VALUES (
        NEW.id, 'human_intervention', 'Human Intervention', 98, 'human_intervention',
        'Dieses Ticket wartet auf menschliche Intervention. '
        'Lies alle Kommentare, beantworte die Frage des Agenten und '
        'verschiebe das Ticket danach nach "human_answered".'
    )
    RETURNING id INTO hi_id;

    INSERT INTO board_statuses
        (project_id, name, display_name, position, special_type, agent_role_instruction)
    VALUES (
        NEW.id, 'human_answered', 'Human Answered', 99, 'human_answered',
        'Der Mensch hat geantwortet. Lies die neuesten Kommentare und '
        'fahre mit der Arbeit fort. Verschiebe das Ticket in den passenden '
        'Folgestatus.'
    )
    RETURNING id INTO ha_id;

    INSERT INTO status_transitions (project_id, from_status_id, to_status_id)
    VALUES (NEW.id, hi_id, ha_id)
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_create_human_statuses
    AFTER INSERT ON projects
    FOR EACH ROW EXECUTE FUNCTION create_human_intervention_statuses();

-- ── Echtzeit-Benachrichtigungen (SSE via pg_notify) ───────────────────────────
CREATE OR REPLACE FUNCTION notify_ticket_change()
RETURNS TRIGGER AS $$
DECLARE
    rec RECORD;
BEGIN
    IF TG_OP = 'DELETE' THEN rec := OLD; ELSE rec := NEW; END IF;
    PERFORM pg_notify(
        'tickets_' || rec.project_id::text,
        json_build_object(
            'op',         TG_OP,
            'ticket_id',  rec.id,
            'status_id',  rec.status_id,
            'project_id', rec.project_id
        )::text
    );
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tickets_notify
    AFTER INSERT OR UPDATE OR DELETE ON tickets
    FOR EACH ROW EXECUTE FUNCTION notify_ticket_change();

-- Auch Kommentare/Tasks lösen eine Notification aus (KI-Agenten ändern Tickets
-- oft nur darüber, ohne die tickets-Zeile selbst per UPDATE anzufassen)
CREATE OR REPLACE FUNCTION notify_ticket_child_change()
RETURNS TRIGGER AS $$
DECLARE
    rec RECORD;
    v_ticket_id INT;
    v_project_id INT;
    v_status_id INT;
BEGIN
    IF TG_OP = 'DELETE' THEN rec := OLD; ELSE rec := NEW; END IF;
    v_ticket_id := rec.ticket_id;

    SELECT project_id, status_id INTO v_project_id, v_status_id
      FROM tickets WHERE id = v_ticket_id;

    IF v_project_id IS NOT NULL THEN
        PERFORM pg_notify(
            'tickets_' || v_project_id::text,
            json_build_object(
                'op',         'UPDATE',
                'ticket_id',  v_ticket_id,
                'status_id',  v_status_id,
                'project_id', v_project_id
            )::text
        );
    END IF;

    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ticket_comments_notify
    AFTER INSERT OR UPDATE OR DELETE ON ticket_comments
    FOR EACH ROW EXECUTE FUNCTION notify_ticket_child_change();

CREATE TRIGGER ticket_tasks_notify
    AFTER INSERT OR UPDATE OR DELETE ON ticket_tasks
    FOR EACH ROW EXECUTE FUNCTION notify_ticket_child_change();
