-- V14__Ticket_Effort_Tracking.sql
-- Generic effort tracking on tickets (Codeberg kbai-ui#16): estimate + actual,
-- free-text unit (days, story points, tokens, ...) instead of an AI-specific
-- token/cost counter. MCP has no protocol-level usage/cost data to derive this
-- from automatically (checked against spec 2026-07-28 for kbai #688) — Sampling,
-- the one feature with any LLM-side visibility, is deprecated there in favor of
-- integrating directly with provider APIs. So this stays a manually filled
-- field, same as any other ticket estimate.
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS effort_estimate NUMERIC;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS effort_actual NUMERIC;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS effort_unit VARCHAR(50);
