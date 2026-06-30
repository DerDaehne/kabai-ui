-- V3__Add_Ticket_Notify_Trigger.sql
-- Fügt pg_notify-Trigger hinzu für Echtzeit-Board-Updates via SSE

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
