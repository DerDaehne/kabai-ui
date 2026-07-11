-- V2__Add_Model_To_Tickets.sql
-- Adds model tracking to tickets so it's visible which AI model worked on a ticket.
-- The assignee field holds the human-readable agent name (KB_AI_AGENT_NAME),
-- the model field holds the technical model identifier (KB_AI_AGENT_MODEL).

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS model VARCHAR(100);
