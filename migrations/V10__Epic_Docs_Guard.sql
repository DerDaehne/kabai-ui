-- V10__Epic_Docs_Guard.sql
-- Server-side documentation duty for epics (Kanban AI #489, Teil B of #488):
-- 1. Epics always carry docs_required: forced TRUE on insert, normalized TRUE
--    on any update of a legacy epic, and an explicit unset attempt
--    (TRUE -> FALSE) is rejected.
-- 2. The done branch names the epic duty in its error message; the linked-note
--    check itself is the existing docs_required guard (which epics can no
--    longer escape).
-- Idempotent via CREATE OR REPLACE; no schema changes.

-- Backfill: existing epics get the flag so the guard applies uniformly.
UPDATE tickets SET docs_required = TRUE WHERE type = 'epic' AND NOT docs_required;

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
    -- Epic documentation duty: docs_required is not optional for epics.
    IF NEW.type = 'epic' AND NOT NEW.docs_required THEN
        IF NOT is_initial_insert AND OLD.docs_required THEN
            RAISE EXCEPTION
                'Epic documentation duty: docs_required cannot be unset on epic #%. '
                'An epic must not close without a linked knowledge-base note.',
                NEW.id;
        END IF;
        -- Insert without the flag, or update of a legacy epic: normalize.
        NEW.docs_required := TRUE;
    END IF;

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

        -- Docs requirement: a flagged ticket (which includes every epic)
        -- needs a linked note before it can close.
        IF NEW.docs_required THEN
            SELECT COUNT(*) INTO linked_notes_count
              FROM note_ticket_links
             WHERE ticket_id = NEW.id;

            IF linked_notes_count = 0 THEN
                IF NEW.type = 'epic' THEN
                    RAISE EXCEPTION
                        'Epic documentation duty: epic #% cannot close without at least '
                        'one knowledge-base note created or substantially updated during '
                        'its lifetime. Create/update the note and link it via '
                        'kabai_docs_link_ticket.',
                        NEW.id;
                END IF;
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
