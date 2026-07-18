-- V13__Attachments.sql
-- Generic image-attachment infrastructure: ticket attachments (kbai-ui #469)
-- and canvas images (kbai-ui #529) share one storage table instead of two
-- parallel blob stores. Design: ADR-004 (bytea over filesystem-path storage
-- — a bare filesystem path would tie the row to whichever host/volume wrote
-- it, needs its own backup/replication story next to the already-replicated
-- Postgres data, and reintroduces the classic path-vs-DB consistency problem
-- on delete; bytea keeps attachments inside the same transactional, backed-up
-- store as everything else, at the cost of DB size — acceptable at the
-- expected image sizes (see the 10 MiB cap below)).
-- Version gap: V11 is reserved by #502 (V11__Project_Archive.sql, not built
-- yet); the runner applies existing files in numeric order against a ledger,
-- so the temporary V10 -> V12 -> V13 gap is harmless (same note as V12).

-- 1. Attachments: standalone blob storage, no owner column. Ownership is
--    expressed entirely through the link tables below (ticket_attachments
--    here; canvas_elements.content->>'attachment_id' from #522/V12) so one
--    image can be referenced from several places without duplicating bytes.
--    mime_type is a CHECK whitelist, not a free-form column: SVG is
--    deliberately excluded in this phase (an SVG can embed <script> and is
--    effectively active content, not a pure image format — XSS risk if it
--    is ever rendered directly). size_bytes is redundant with octet_length
--    (data) but is checked on INSERT so oversized payloads are rejected
--    before the bytea is even written.
--    description is the alt-text that makes an attachment readable for
--    non-multimodal agents (same convention as canvas_elements.description,
--    V12); it is not NOT NULL here because enforcing "alt-text required" is
--    a per-usage-site policy (e.g. mandatory for canvas image elements,
--    optional for a quick ticket screenshot) that belongs at the MCP tool
--    layer, not baked into shared storage.
CREATE TABLE IF NOT EXISTS attachments (
    id           SERIAL PRIMARY KEY,
    filename     TEXT NOT NULL,
    mime_type    VARCHAR(50) NOT NULL
        CHECK (mime_type IN ('image/png', 'image/jpeg', 'image/webp', 'image/gif')),
    size_bytes   INT NOT NULL
        CHECK (size_bytes > 0 AND size_bytes <= 10485760),  -- 10 MiB cap
    data         BYTEA NOT NULL,
    description  TEXT,
    uploaded_by  TEXT,
    created_at   TIMESTAMP DEFAULT NOW()
);

-- 2. Ticket<->attachment: n:m (a screenshot could conceivably be attached
--    to more than one related ticket; nothing forces 1:1). ON DELETE CASCADE
--    both ways: dropping a ticket drops its links (not the attachment itself
--    if still referenced elsewhere, e.g. from a canvas), dropping an
--    attachment drops its ticket links.
CREATE TABLE IF NOT EXISTS ticket_attachments (
    ticket_id     INT NOT NULL REFERENCES tickets(id)     ON DELETE CASCADE,
    attachment_id INT NOT NULL REFERENCES attachments(id) ON DELETE CASCADE,
    created_at    TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (ticket_id, attachment_id)
);

-- The composite PK indexes (ticket_id, attachment_id) but not attachment_id
-- alone — add it explicitly for the reverse lookup ("which tickets use
-- attachment X", e.g. before deciding whether an attachment is still
-- referenced).
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_attachment ON ticket_attachments (attachment_id);

-- Note on canvas_elements (#522/V12): image elements store
-- content->>'attachment_id' as JSONB, deliberately WITHOUT a foreign key.
-- A canvas element's content is a polymorphic, MCP/UI-validated blob (see
-- the type comment on canvas_elements in V12) — adding a real FK would mean
-- either a partial/conditional constraint keyed on type = 'image', or
-- pulling attachment references out of content into a dedicated column just
-- for canvas, both more machinery than the ADR-004 scope calls for. The
-- practical consequence (known, accepted): there is no orphan garbage
-- collection here. Deleting the last reference to an attachment (the last
-- ticket_attachments row, or the last canvas element whose content points
-- at it) does NOT delete the attachment row or free its bytea storage.
-- Orphaned attachments are a deliberate non-goal of this migration; a GC
-- pass (scan attachments with zero ticket_attachments rows AND no canvas
-- reference, batch-delete) is left for a future ticket if storage growth
-- ever makes it worth building.
