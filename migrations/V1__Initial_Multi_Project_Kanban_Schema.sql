-- V1__Initial_Multi_Project_Kanban_Schema.sql
-- Description: Sets up the multi-project Kanban schema with triggers for workflow transition validation and acceptance criteria checks.

-- 1. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL,      -- Short identifier (e.g., 'robot-game', 'kb-ai')
    name VARCHAR(100) NOT NULL,            -- Clear display name
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. BOARD STATUSES (COLUMNS) TABLE
CREATE TABLE IF NOT EXISTS board_statuses (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,             -- Machine name (e.g., 'todo', 'in_progress', 'done')
    display_name VARCHAR(100) NOT NULL,   -- Human readable name (e.g., 'In Arbeit')
    position INT NOT NULL,                -- Visual column ordering index
    agent_role_instruction TEXT,          -- Dynamic persona prompt for the AI agent
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (project_id, name),             -- Status names must be unique within a single project
    UNIQUE (project_id, id)               -- Required for composite FK references from status_transitions and tickets
);

-- 3. STATUS TRANSITIONS (WORKFLOW GRAPH) TABLE
CREATE TABLE IF NOT EXISTS status_transitions (
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    from_status_id INT NOT NULL REFERENCES board_statuses(id) ON DELETE CASCADE,
    to_status_id INT NOT NULL REFERENCES board_statuses(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, from_status_id, to_status_id),
    -- Verify that both statuses belong to the exact same project
    CONSTRAINT check_same_project_from FOREIGN KEY (project_id, from_status_id) REFERENCES board_statuses(project_id, id),
    CONSTRAINT check_same_project_to FOREIGN KEY (project_id, to_status_id) REFERENCES board_statuses(project_id, id)
);

-- 4. TICKETS TABLE
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status_id INT NOT NULL REFERENCES board_statuses(id),
    assignee VARCHAR(100),                 -- Identifier for the handling AI agent or human developer
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    -- Guarantee that the assigned status actually belongs to the correct project
    CONSTRAINT check_ticket_status_project FOREIGN KEY (project_id, status_id) REFERENCES board_statuses(project_id, id)
);

-- 5. TICKET TASKS (ACCEPTANCE CRITERIA) TABLE
CREATE TABLE IF NOT EXISTS ticket_tasks (
    id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. TICKET DOCUMENTS (ARTIFACT LINKS) TABLE
CREATE TABLE IF NOT EXISTS ticket_documents (
    id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    file_path_or_url TEXT NOT NULL,       -- Local paths (e.g. 'docs/spec.md') or remote URLs
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 7. TICKET COMMENTS TABLE
CREATE TABLE IF NOT EXISTS ticket_comments (
    id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    author VARCHAR(100) NOT NULL,         -- Author identifier (e.g., 'AI-Architect', 'johndoe')
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 8. TICKET DEPENDENCIES (BLOCKERS) TABLE
CREATE TABLE IF NOT EXISTS ticket_dependencies (
    ticket_id INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    blocked_by_ticket_id INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    PRIMARY KEY (ticket_id, blocked_by_ticket_id),
    CONSTRAINT check_not_self_blocking CHECK (ticket_id <> blocked_by_ticket_id)
);


-- ============================================================================
-- VALIDATION LOGIC & AUTOMATION (TRIGGERS)
-- ============================================================================

CREATE OR REPLACE FUNCTION verify_kanban_rules_and_transitions()
RETURNS TRIGGER AS $$
DECLARE
    target_status_name VARCHAR(50);
    open_tasks_count INT;
    is_initial_insert BOOLEAN := (TG_OP = 'INSERT');
BEGIN
    -- Context Check: If it's an update and the status hasn't changed, bypass transition rules
    IF NOT is_initial_insert AND OLD.status_id = NEW.status_id THEN
        RETURN NEW;
    END IF;

    -- Rule A: If it's an update, enforce the explicit Workflow Graph state machine
    IF NOT is_initial_insert THEN
        IF NOT EXISTS (
            SELECT 1 FROM status_transitions 
            WHERE project_id = NEW.project_id 
              AND from_status_id = OLD.status_id 
              AND to_status_id = NEW.status_id
        ) THEN
            RAISE EXCEPTION 'Illegaler Kanban-Move (Projekt %): Ein direkter Uebergang von Status-ID % zu Status-ID % ist laut Workflow-Definition nicht erlaubt.', 
                NEW.project_id, OLD.status_id, NEW.status_id;
        END IF;
    END IF;

    -- Rule B: Enforce Acceptance Criteria check when a ticket heads towards any 'done' column
    SELECT name INTO target_status_name 
    FROM board_statuses 
    WHERE id = NEW.status_id;
    
    IF target_status_name = 'done' THEN
        SELECT COUNT(*) INTO open_tasks_count 
        FROM ticket_tasks 
        WHERE ticket_id = NEW.id AND is_completed = FALSE;
        
        IF open_tasks_count > 0 THEN
            RAISE EXCEPTION 'Kanban-Validierungsfehler: Ticket #% kann nicht geschlossen werden, da noch % Akzeptanzkriterium/Kriterien ungeloest sind.', 
                NEW.id, open_tasks_count;
        END IF;
    END IF;

    -- Timestamp management
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Register the validation trigger onto the tickets table
DROP TRIGGER IF EXISTS enforce_kanban_workflow_integrity ON tickets;
CREATE TRIGGER enforce_kanban_workflow_integrity
BEFORE INSERT OR UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION verify_kanban_rules_and_transitions();
