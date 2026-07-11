-- V9__Rename_Tool_Prefix_In_Guard_Message.sql
-- Product rename kb.ai -> kabai (Kanban AI #449, epic #448): the docs_required
-- guard message referenced the old tool name kb.ai_docs_link_ticket. Re-create
-- the workflow trigger function (V8 body) with the new kabai_docs_link_ticket
-- name. Idempotent via CREATE OR REPLACE; no schema changes.

CREATE OR REPLACE FUNCTION verify_kanban_rules_and_transitions()
RETURNS TRIGGER AS $$
DECLARE
    target_status_name  VARCHAR(50);
    target_special_type VARCHAR(50);
    source_special_type VARCHAR(50);
    open_tasks_count    INT;
    linked_notes_count  INT;
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

    SELECT name INTO target_status_name
      FROM board_statuses WHERE id = NEW.status_id;

    IF target_status_name = 'done' THEN
        -- Acceptance-criteria check when closing a ticket
        SELECT COUNT(*) INTO open_tasks_count
          FROM ticket_tasks
         WHERE ticket_id = NEW.id AND is_completed = FALSE;

        IF open_tasks_count > 0 THEN
            RAISE EXCEPTION
                'Kanban-Validierungsfehler: Ticket #% kann nicht geschlossen werden, '
                'da noch % Akzeptanzkriterium/Kriterien ungeloest sind.',
                NEW.id, open_tasks_count;
        END IF;

        -- Docs requirement (opt-in): a flagged ticket needs a linked note
        IF NEW.docs_required THEN
            SELECT COUNT(*) INTO linked_notes_count
              FROM note_ticket_links
             WHERE ticket_id = NEW.id;

            IF linked_notes_count = 0 THEN
                RAISE EXCEPTION
                    'Docs requirement: ticket #% cannot be closed because docs_required '
                    'is set and no knowledge-base note is linked. Link one via '
                    'kabai_docs_link_ticket or unset docs_required with a justification.',
                    NEW.id;
            END IF;
        END IF;
    END IF;

    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
