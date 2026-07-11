-- V4__Ticket_Relations_Epic_HumanIntervention.sql
-- Adds: ticket relations graph, epic ticket type, human-intervention workflow statuses

-- 1. special_type column on board_statuses
--    'human_intervention' = any status can transition here (escalation)
--    'human_answered'     = can transition to any status (after human replies)
--    NULL = normal column
ALTER TABLE board_statuses ADD COLUMN IF NOT EXISTS special_type VARCHAR(50);

-- 2. ticket type — 'ticket' (default) or 'epic'
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'ticket';

-- 3. ticket relations graph
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

-- 4. Update the workflow trigger to honour special statuses:
--    - Into human_intervention: always allowed (any status may escalate)
--    - Out of human_answered:   always allowed (human can resume anywhere)
--    - human_intervention → human_answered: still needs an explicit transition entry
--      (auto-created below per project via the DO block)
CREATE OR REPLACE FUNCTION verify_kanban_rules_and_transitions()
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

        -- Bypass graph check when escalating to human_intervention
        -- or when human_answered resumes normal flow
        IF (target_special_type IS DISTINCT FROM 'human_intervention') AND
           (source_special_type IS DISTINCT FROM 'human_answered') THEN
            IF NOT EXISTS (
                SELECT 1 FROM status_transitions
                WHERE project_id    = NEW.project_id
                  AND from_status_id = OLD.status_id
                  AND to_status_id   = NEW.status_id
            ) THEN
                RAISE EXCEPTION
                    'Illegaler Kanban-Move (Projekt %): Ein direkter Uebergang von '
                    'Status-ID % zu Status-ID % ist laut Workflow-Definition nicht erlaubt.',
                    NEW.project_id, OLD.status_id, NEW.status_id;
            END IF;
        END IF;
    END IF;

    -- Acceptance-criteria check when closing a ticket
    SELECT name INTO target_status_name
      FROM board_statuses WHERE id = NEW.status_id;

    IF target_status_name = 'done' THEN
        SELECT COUNT(*) INTO open_tasks_count
          FROM ticket_tasks
         WHERE ticket_id = NEW.id AND is_completed = FALSE;

        IF open_tasks_count > 0 THEN
            RAISE EXCEPTION
                'Kanban-Validierungsfehler: Ticket #% kann nicht geschlossen werden, '
                'da noch % Akzeptanzkriterium/Kriterien ungeloest sind.',
                NEW.id, open_tasks_count;
        END IF;
    END IF;

    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-register the trigger (CREATE OR REPLACE on the function suffices; trigger registration is idempotent)
DROP TRIGGER IF EXISTS enforce_kanban_workflow_integrity ON tickets;
CREATE TRIGGER enforce_kanban_workflow_integrity
BEFORE INSERT OR UPDATE ON tickets
FOR EACH ROW EXECUTE FUNCTION verify_kanban_rules_and_transitions();

-- 5. Backfill human-intervention statuses for every existing project
DO $$
DECLARE
    proj   RECORD;
    hi_id  INT;
    ha_id  INT;
BEGIN
    FOR proj IN SELECT id FROM projects LOOP
        IF NOT EXISTS (
            SELECT 1 FROM board_statuses
            WHERE project_id = proj.id AND special_type = 'human_intervention'
        ) THEN
            INSERT INTO board_statuses
                (project_id, name, display_name, position, special_type, agent_role_instruction)
            VALUES (
                proj.id,
                'human_intervention',
                'Human Intervention',
                98,
                'human_intervention',
                'Dieses Ticket wartet auf menschliche Intervention. '
                'Lies alle Kommentare, beantworte die Frage des Agenten und '
                'verschiebe das Ticket danach nach "human_answered".'
            )
            RETURNING id INTO hi_id;

            INSERT INTO board_statuses
                (project_id, name, display_name, position, special_type, agent_role_instruction)
            VALUES (
                proj.id,
                'human_answered',
                'Human Answered',
                99,
                'human_answered',
                'Der Mensch hat geantwortet. Lies die neuesten Kommentare und '
                'fahre mit der Arbeit fort. Verschiebe das Ticket in den passenden '
                'Folgestatus.'
            )
            RETURNING id INTO ha_id;

            INSERT INTO status_transitions (project_id, from_status_id, to_status_id)
            VALUES (proj.id, hi_id, ha_id)
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END $$;
