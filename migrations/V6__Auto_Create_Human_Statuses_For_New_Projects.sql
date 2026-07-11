-- V6__Auto_Create_Human_Statuses_For_New_Projects.sql
-- V4 hat human_intervention/human_answered nur einmalig per DO-Block für
-- damals bereits existierende Projekte angelegt. Neue Projekte bekamen diese
-- Statuses nie — die Inbox lief für sie ins Leere. Dieser Trigger holt das
-- für jedes künftig neu angelegte Projekt automatisch nach.

CREATE OR REPLACE FUNCTION create_human_intervention_statuses()
RETURNS TRIGGER AS $$
DECLARE
    hi_id INT;
    ha_id INT;
BEGIN
    INSERT INTO board_statuses
        (project_id, name, display_name, position, special_type, agent_role_instruction)
    VALUES (
        NEW.id,
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
        NEW.id,
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
    VALUES (NEW.id, hi_id, ha_id)
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_create_human_statuses
    AFTER INSERT ON projects
    FOR EACH ROW EXECUTE FUNCTION create_human_intervention_statuses();
