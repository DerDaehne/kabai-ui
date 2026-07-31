-- V11__Project_Archive.sql
-- Project archiving (kbai-ui Codeberg#7, Kanban AI #502): finished projects can
-- be archived (out of default focus) and reactivated by a human for e.g. a
-- hotfix. Archiving/reactivating itself, and deleting an archived project,
-- stay allowed — only writes to the project's tickets/tasks/comments/
-- relations/note-links are blocked while archived, enforced in the DB so it
-- applies to every client (MCP tools and kbai-ui's own SQL alike).

ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;

-- Extend the existing tickets workflow trigger: archived-project check first,
-- and widen it to also fire on DELETE (previously INSERT/UPDATE only) so
-- deleting a ticket in an archived project is blocked too.
CREATE OR REPLACE FUNCTION verify_kanban_rules_and_transitions()
RETURNS TRIGGER AS $$
DECLARE
    target_status_name  VARCHAR(50);
    target_special_type VARCHAR(50);
    source_special_type VARCHAR(50);
    open_tasks_count    INT;
    linked_notes_count  INT;
    is_initial_insert   BOOLEAN := (TG_OP = 'INSERT');
    check_project_id    INT := COALESCE(NEW.project_id, OLD.project_id);
    proj_archived       BOOLEAN;
BEGIN
    SELECT archived INTO proj_archived FROM projects WHERE id = check_project_id;
    IF proj_archived THEN
        RAISE EXCEPTION
            'Project % is archived and read-only — a human can reactivate it in the UI before this ticket can be changed.',
            check_project_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    IF NEW.type = 'epic' AND NOT NEW.docs_required THEN
        IF NOT is_initial_insert AND OLD.docs_required THEN
            RAISE EXCEPTION
                'Epic documentation duty: docs_required cannot be unset on epic #%. '
                'An epic must not close without a linked knowledge-base note.',
                NEW.id;
        END IF;
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
        SELECT COUNT(*) INTO open_tasks_count
          FROM ticket_tasks
         WHERE ticket_id = NEW.id AND is_completed = FALSE;

        IF open_tasks_count > 0 THEN
            RAISE EXCEPTION
                'Kanban-Validierungsfehler: Ticket #% kann nicht geschlossen werden, '
                'da noch % Akzeptanzkriterium/Kriterien ungeloest sind.',
                NEW.id, open_tasks_count;
        END IF;

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

DROP TRIGGER IF EXISTS enforce_kanban_workflow_integrity ON tickets;
CREATE TRIGGER enforce_kanban_workflow_integrity
BEFORE INSERT OR UPDATE OR DELETE ON tickets
FOR EACH ROW EXECUTE FUNCTION verify_kanban_rules_and_transitions();

-- Child tables keyed by ticket_id: resolve the ticket's project and block
-- writes the same way.
CREATE OR REPLACE FUNCTION verify_ticket_child_project_not_archived()
RETURNS TRIGGER AS $$
DECLARE
    check_ticket_id INT := COALESCE(NEW.ticket_id, OLD.ticket_id);
    proj_archived   BOOLEAN;
BEGIN
    SELECT p.archived INTO proj_archived
      FROM tickets t JOIN projects p ON p.id = t.project_id
     WHERE t.id = check_ticket_id;

    IF proj_archived THEN
        RAISE EXCEPTION
            'Ticket #% belongs to an archived project and is read-only — a human can reactivate the project in the UI before this can be changed.',
            check_ticket_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_archived_project_guard ON ticket_tasks;
CREATE TRIGGER enforce_archived_project_guard
BEFORE INSERT OR UPDATE OR DELETE ON ticket_tasks
FOR EACH ROW EXECUTE FUNCTION verify_ticket_child_project_not_archived();

DROP TRIGGER IF EXISTS enforce_archived_project_guard ON ticket_comments;
CREATE TRIGGER enforce_archived_project_guard
BEFORE INSERT OR UPDATE OR DELETE ON ticket_comments
FOR EACH ROW EXECUTE FUNCTION verify_ticket_child_project_not_archived();

DROP TRIGGER IF EXISTS enforce_archived_project_guard ON note_ticket_links;
CREATE TRIGGER enforce_archived_project_guard
BEFORE INSERT OR UPDATE OR DELETE ON note_ticket_links
FOR EACH ROW EXECUTE FUNCTION verify_ticket_child_project_not_archived();

-- ticket_relations is keyed by two ticket ids (from/to) instead of one.
CREATE OR REPLACE FUNCTION verify_ticket_relation_project_not_archived()
RETURNS TRIGGER AS $$
DECLARE
    check_from_id INT := COALESCE(NEW.from_ticket_id, OLD.from_ticket_id);
    check_to_id   INT := COALESCE(NEW.to_ticket_id, OLD.to_ticket_id);
    proj_archived BOOLEAN;
BEGIN
    SELECT bool_or(p.archived) INTO proj_archived
      FROM tickets t JOIN projects p ON p.id = t.project_id
     WHERE t.id IN (check_from_id, check_to_id);

    IF proj_archived THEN
        RAISE EXCEPTION
            'One of the linked tickets (#%, #%) belongs to an archived project and is read-only — a human can reactivate the project in the UI before this relation can be changed.',
            check_from_id, check_to_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_archived_project_guard ON ticket_relations;
CREATE TRIGGER enforce_archived_project_guard
BEFORE INSERT OR UPDATE OR DELETE ON ticket_relations
FOR EACH ROW EXECUTE FUNCTION verify_ticket_relation_project_not_archived();
