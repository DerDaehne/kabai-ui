-- V12__Canvas_Schema.sql
-- Kabai Canvas: cross-project planning surface above epics (kbai-ui epic #521,
-- ticket #522). Concept: KB note concept-kabai-canvas.
-- Version gap: V11 is reserved by #502 (V11__Project_Archive.sql, not built
-- yet). The runner applies existing files in numeric order against a ledger,
-- so the temporary V10 -> V12 gap is harmless.

-- 1. Canvases: standalone entities. A canvas belongs to no project; it is
--    linked n:m below (same pattern as notes/note_projects, V7).
CREATE TABLE IF NOT EXISTS canvases (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION touch_canvas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS canvases_touch_updated_at ON canvases;
CREATE TRIGGER canvases_touch_updated_at
BEFORE UPDATE ON canvases
FOR EACH ROW EXECUTE FUNCTION touch_canvas_updated_at();

-- 2. Canvas<->project: n:m — elements may reference entities from ANY
--    project; this table only scopes discovery/listing.
CREATE TABLE IF NOT EXISTS canvas_projects (
    canvas_id  INT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    PRIMARY KEY (canvas_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_canvas_projects_project ON canvas_projects (project_id);

-- 3. Elements: everything on a canvas is an element. content is JSONB and
--    type-dependent; its shape is validated at the MCP/UI layer, not here:
--      text   {"text": "..."}                          (markdown)
--      image  {"attachment_id": ...}                   (format owned by #468)
--      sketch {"strokes": [[[x,y,pressure], ...], ...]}
--      ref    {"target_type": "ticket"|"note", "target_id": N}
--             (epics live in the tickets table, so "ticket" covers them)
--      frame  {"title": "..."}                          (grouping container,
--             replaces milestones per concept decision 5)
--    description is the alt-text that makes image/sketch elements readable
--    for non-multimodal agents (concept decision 8); the MCP layer makes it
--    mandatory for those types.
--    parent_frame_id: ON DELETE SET NULL — deleting a frame frees its
--    members instead of deleting them.
CREATE TABLE IF NOT EXISTS canvas_elements (
    id              SERIAL PRIMARY KEY,
    canvas_id       INT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    type            VARCHAR(20) NOT NULL
        CHECK (type IN ('text', 'image', 'sketch', 'ref', 'frame')),
    position_x      DOUBLE PRECISION NOT NULL DEFAULT 0,
    position_y      DOUBLE PRECISION NOT NULL DEFAULT 0,
    width           DOUBLE PRECISION,
    height          DOUBLE PRECISION,
    z_order         INT NOT NULL DEFAULT 0,
    content         JSONB NOT NULL DEFAULT '{}',
    description     TEXT,
    parent_frame_id INT REFERENCES canvas_elements(id) ON DELETE SET NULL,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_canvas_elements_canvas ON canvas_elements (canvas_id);
CREATE INDEX IF NOT EXISTS idx_canvas_elements_parent_frame ON canvas_elements (parent_frame_id);
-- Reverse lookup "which canvases reference ticket/note X" without scanning
-- all JSONB. Text comparison (no cast) so malformed content cannot break
-- index maintenance; the MCP layer guarantees well-formed refs.
CREATE INDEX IF NOT EXISTS idx_canvas_elements_ref_target
    ON canvas_elements ((content->>'target_type'), (content->>'target_id'))
    WHERE type = 'ref';

DROP TRIGGER IF EXISTS canvas_elements_touch_updated_at ON canvas_elements;
CREATE TRIGGER canvas_elements_touch_updated_at
BEFORE UPDATE ON canvas_elements
FOR EACH ROW EXECUTE FUNCTION touch_canvas_updated_at();

-- Frame integrity, server-side so it holds for every client (house style,
-- cf. verify_kanban_rules_and_transitions): a parent must be a frame element
-- on the same canvas, and an element cannot be its own parent.
CREATE OR REPLACE FUNCTION verify_canvas_element_parent()
RETURNS TRIGGER AS $$
DECLARE
    parent_type   VARCHAR(20);
    parent_canvas INT;
BEGIN
    IF NEW.parent_frame_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.parent_frame_id = NEW.id THEN
        RAISE EXCEPTION
            'Canvas integrity: element #% cannot be its own parent frame.',
            NEW.id;
    END IF;

    SELECT type, canvas_id INTO parent_type, parent_canvas
      FROM canvas_elements WHERE id = NEW.parent_frame_id;

    IF parent_type IS DISTINCT FROM 'frame' THEN
        RAISE EXCEPTION
            'Canvas integrity: parent_frame_id % of element on canvas % is not '
            'a frame element (type: %). Only frames can contain elements.',
            NEW.parent_frame_id, NEW.canvas_id, COALESCE(parent_type, 'missing');
    END IF;

    IF parent_canvas IS DISTINCT FROM NEW.canvas_id THEN
        RAISE EXCEPTION
            'Canvas integrity: parent frame #% lives on canvas %, the element '
            'on canvas %. Frames cannot span canvases.',
            NEW.parent_frame_id, parent_canvas, NEW.canvas_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS canvas_elements_verify_parent ON canvas_elements;
CREATE TRIGGER canvas_elements_verify_parent
BEFORE INSERT OR UPDATE ON canvas_elements
FOR EACH ROW EXECUTE FUNCTION verify_canvas_element_parent();

-- 4. Edges: free-form connections with an optional free-text label —
--    deliberately NO fixed taxonomy (concept decision on edges), and
--    parallel edges between the same pair are allowed.
CREATE TABLE IF NOT EXISTS canvas_edges (
    id              SERIAL PRIMARY KEY,
    canvas_id       INT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
    from_element_id INT NOT NULL REFERENCES canvas_elements(id) ON DELETE CASCADE,
    to_element_id   INT NOT NULL REFERENCES canvas_elements(id) ON DELETE CASCADE,
    label           TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    CONSTRAINT check_canvas_edge_not_self CHECK (from_element_id <> to_element_id)
);

CREATE INDEX IF NOT EXISTS idx_canvas_edges_canvas ON canvas_edges (canvas_id);
CREATE INDEX IF NOT EXISTS idx_canvas_edges_from   ON canvas_edges (from_element_id);
CREATE INDEX IF NOT EXISTS idx_canvas_edges_to     ON canvas_edges (to_element_id);

-- Edge endpoints must live on the edge's canvas.
CREATE OR REPLACE FUNCTION verify_canvas_edge_endpoints()
RETURNS TRIGGER AS $$
DECLARE
    from_canvas INT;
    to_canvas   INT;
BEGIN
    SELECT canvas_id INTO from_canvas FROM canvas_elements WHERE id = NEW.from_element_id;
    SELECT canvas_id INTO to_canvas   FROM canvas_elements WHERE id = NEW.to_element_id;

    -- IS DISTINCT FROM (not <>): a dangling id (row missing) yields NULL,
    -- and a NULL-unsafe comparison would silently skip the check, leaving
    -- the far less speaking FK violation as the only error.
    IF from_canvas IS DISTINCT FROM NEW.canvas_id OR to_canvas IS DISTINCT FROM NEW.canvas_id THEN
        RAISE EXCEPTION
            'Canvas integrity: edge on canvas % connects elements of canvas % '
            'and %. Edges cannot span canvases.',
            NEW.canvas_id, from_canvas, to_canvas;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS canvas_edges_verify_endpoints ON canvas_edges;
CREATE TRIGGER canvas_edges_verify_endpoints
BEFORE INSERT OR UPDATE ON canvas_edges
FOR EACH ROW EXECUTE FUNCTION verify_canvas_edge_endpoints();
