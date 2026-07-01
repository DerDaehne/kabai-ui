-- V5__Notify_On_Comments_And_Tasks.sql
-- KI-Agenten aktualisieren Tickets oft nur über Kommentare oder Tasks, ohne den
-- Status zu wechseln oder das tickets-Ticket selbst per UPDATE anzufassen.
-- Diese Trigger senden dieselbe pg_notify-Nachricht wie notify_ticket_change(),
-- damit das Board auch solche Änderungen live anzeigt (Ticket 268).

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

DROP TRIGGER IF EXISTS ticket_comments_notify ON ticket_comments;
CREATE TRIGGER ticket_comments_notify
    AFTER INSERT OR UPDATE OR DELETE ON ticket_comments
    FOR EACH ROW EXECUTE FUNCTION notify_ticket_child_change();

DROP TRIGGER IF EXISTS ticket_tasks_notify ON ticket_tasks;
CREATE TRIGGER ticket_tasks_notify
    AFTER INSERT OR UPDATE OR DELETE ON ticket_tasks
    FOR EACH ROW EXECUTE FUNCTION notify_ticket_child_change();
