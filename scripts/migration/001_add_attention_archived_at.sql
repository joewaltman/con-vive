-- Add attention_archived_at column for the new needs attention queue logic
ALTER TABLE guests ADD COLUMN IF NOT EXISTS attention_archived_at TIMESTAMPTZ DEFAULT NULL;
