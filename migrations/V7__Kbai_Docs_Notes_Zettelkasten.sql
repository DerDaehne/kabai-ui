-- V7__Kbai_Docs_Notes_Zettelkasten.sql
-- kbai-docs: zettelkasten knowledge base (Postgres as the source of truth).
-- Decisions: docs/adr/001-kbai-docs-postgres-zettelkasten.md (tickets kbai-docs #330/#331)

-- 0. pg_trgm for substring/typo search on titles (ADR D3)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- array_to_string is only STABLE — the generated tsvector column needs an
-- IMMUTABLE wrapper (tags change the result deterministically).
CREATE OR REPLACE FUNCTION immutable_array_to_string(text[], text)
RETURNS text AS $$ SELECT array_to_string($1, $2) $$ LANGUAGE sql IMMUTABLE;

-- 1. Notes: atomic knowledge units (ADR D1, D3, D4)
--    The slug is the stable, globally unique key (immutable); kind is a
--    pure filter criterion without special logic (note | adr | hub).
--    updated_by_ticket_id prepares the revision history (#339);
--    last_verified_* carries the verification metadata (#326).
CREATE TABLE IF NOT EXISTS notes (
    id                      SERIAL PRIMARY KEY,
    slug                    TEXT NOT NULL UNIQUE,
    title                   TEXT NOT NULL,
    kind                    VARCHAR(20) NOT NULL DEFAULT 'note'
        CHECK (kind IN ('note', 'adr', 'hub')),
    body                    TEXT NOT NULL DEFAULT '',
    tags                    TEXT[] NOT NULL DEFAULT '{}',
    archived                BOOLEAN NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW(),
    updated_by_ticket_id    INT REFERENCES tickets(id) ON DELETE SET NULL,
    last_verified_ticket_id INT REFERENCES tickets(id) ON DELETE SET NULL,
    last_verified_at        TIMESTAMP,
    search_tsv              tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('simple', immutable_array_to_string(tags, ' ')), 'B') ||
        setweight(to_tsvector('simple', coalesce(body, '')), 'C')
    ) STORED
);

CREATE INDEX IF NOT EXISTS idx_notes_search_tsv  ON notes USING GIN (search_tsv);
CREATE INDEX IF NOT EXISTS idx_notes_title_trgm  ON notes USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_notes_tags        ON notes USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_notes_kind        ON notes (kind);

-- Maintain updated_at automatically (mirroring the tickets trigger)
CREATE OR REPLACE FUNCTION touch_note_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notes_touch_updated_at ON notes;
CREATE TRIGGER notes_touch_updated_at
BEFORE UPDATE ON notes
FOR EACH ROW EXECUTE FUNCTION touch_note_updated_at();

-- 2. Note↔note links: directed, typed graph (ADR D2).
--    Hubs/overview pages are ordinary notes whose 'contains' links define
--    the collection — no separate structure table.
CREATE TABLE IF NOT EXISTS note_links (
    id           SERIAL PRIMARY KEY,
    from_note_id INT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    to_note_id   INT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    link_type    VARCHAR(20) NOT NULL
        CHECK (link_type IN ('references', 'contains', 'supersedes', 'contradicts')),
    created_at   TIMESTAMP DEFAULT NOW(),
    UNIQUE (from_note_id, to_note_id, link_type),
    CONSTRAINT check_note_not_self_linked CHECK (from_note_id <> to_note_id)
);

CREATE INDEX IF NOT EXISTS idx_note_links_from ON note_links (from_note_id);
CREATE INDEX IF NOT EXISTS idx_note_links_to   ON note_links (to_note_id);

-- 3. Note↔project: n:m — the zettelkasten is global, a note belongs to
--    0..n projects (ADR foundational decision 3).
CREATE TABLE IF NOT EXISTS note_projects (
    note_id    INT NOT NULL REFERENCES notes(id)    ON DELETE CASCADE,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_note_projects_project ON note_projects (project_id);

-- 4. Note↔ticket: structured, bidirectionally queryable link (#325);
--    foundation for suggestions (#327) and the docs guard (#328).
CREATE TABLE IF NOT EXISTS note_ticket_links (
    id         SERIAL PRIMARY KEY,
    note_id    INT NOT NULL REFERENCES notes(id)   ON DELETE CASCADE,
    ticket_id  INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    relation   VARCHAR(20) NOT NULL
        CHECK (relation IN ('documents', 'created_by', 'verified_by', 'references')),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (note_id, ticket_id, relation)
);

CREATE INDEX IF NOT EXISTS idx_note_ticket_links_ticket ON note_ticket_links (ticket_id);

-- 5. Legacy cleanup (ADR D7): both tables are empty and referenced by no
--    code. ticket_documents (file-path links) is replaced by
--    note_ticket_links; ticket_dependencies was superseded by
--    ticket_relations (V4).
DROP TABLE IF EXISTS ticket_documents;
DROP TABLE IF EXISTS ticket_dependencies;
